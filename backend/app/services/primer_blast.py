from hashlib import sha1
import re

from app.schemas.gene_primer import BlastValidation, BlastTopHit, BlastValidationStatus
from app.services.ncbi_client import cached_call, run_qblast

SPECIES_ENTREZ_FILTER = {
    "human": "txid9606[Organism]",
    "mouse": "txid10090[Organism]",
}
BLAST_HITLIST_SIZE = 10
QUALIFIED_IDENTITY_THRESHOLD = 80.0


def _accession_base(value: str | None) -> str:
    if not value:
        return ""
    match = re.search(r"\b([NX][MR]_\d+)(?:\.\d+)?\b", value.upper())
    return match.group(1) if match else value.upper().split(".", 1)[0]


def _title_matches_gene(title: str, target_gene: str | None) -> bool:
    """Return whether an NCBI hit title identifies the requested gene symbol."""
    gene = (target_gene or "").strip()
    if not gene:
        return False
    return bool(re.search(rf"\({re.escape(gene)}\)(?:\s*[,;]|\s|$)", title, re.IGNORECASE))


def _gene_symbol_from_title(title: str) -> str:
    """Extract the RefSeq title's parenthesized gene symbol when present."""
    matches = re.findall(r"\(([A-Za-z][A-Za-z0-9._-]{0,30})\)", title)
    return matches[-1] if matches else ""


def _summarize_record(
    record,
    query_length: int,
    target_accession: str | None = None,
    target_gene: str | None = None,
) -> BlastValidation:
    target_base = _accession_base(target_accession)
    if record is None or not record.alignments:
        return BlastValidation(
            specific=False,
            top_hit_identity=0.0,
            off_target_count=0,
            top_hits=[],
            status=BlastValidationStatus.no_hits,
            message="No matching transcript hits were found in RefSeq RNA.",
            target_accession=target_accession,
        )

    qualified_hits: list[dict] = []

    for alignment in record.alignments:
        best_identity = 0.0
        for hsp in alignment.hsps:
            # 只统计覆盖引物长度 ≥85% 的 HSP，忽略短片段偶然命中
            coverage = hsp.align_length / query_length
            if coverage < 0.85:
                continue
            identity_pct = hsp.identities / hsp.align_length * 100
            if identity_pct > best_identity:
                best_identity = identity_pct
        if best_identity <= QUALIFIED_IDENTITY_THRESHOLD:
            continue
        alignment_accession = _accession_base(
            getattr(alignment, "accession", None) or alignment.title
        )
        is_target = bool(target_base and alignment_accession == target_base)
        qualified_hits.append({
            "title": alignment.title,
            "identity": best_identity,
            "is_target": is_target,
            "gene_symbol": _gene_symbol_from_title(alignment.title),
        })

    effective_target_gene = (target_gene or "").strip()
    if not effective_target_gene:
        effective_target_gene = next(
            (hit["gene_symbol"] for hit in qualified_hits if hit["is_target"] and hit["gene_symbol"]),
            "",
        )
    for hit in qualified_hits:
        hit["is_same_gene"] = bool(
            not hit["is_target"]
            and effective_target_gene
            and _title_matches_gene(hit["title"], effective_target_gene)
        )

    qualified_hits.sort(
        key=lambda hit: (
            not hit["is_target"],
            not hit["is_same_gene"],
            -hit["identity"],
            hit["title"],
        )
    )
    target_found = any(
        hit["is_target"] and hit["identity"] >= 99.0 for hit in qualified_hits
    )
    off_target_count = sum(
        not hit["is_target"] and not hit["is_same_gene"] for hit in qualified_hits
    )
    hit_limit_reached = len(record.alignments) >= BLAST_HITLIST_SIZE
    top_identity = max((hit["identity"] for hit in qualified_hits), default=0.0)
    top_hits: list[BlastTopHit] = []
    for hit in qualified_hits[:3]:
        title = hit["title"]
        if len(title) > 80:
            title = title[:77] + "..."
        top_hits.append(BlastTopHit(
            rank=len(top_hits) + 1,
            title=title,
            identity=round(hit["identity"], 1),
            is_off_target=not hit["is_target"] and not hit["is_same_gene"],
            is_target=hit["is_target"],
            is_same_gene=hit["is_same_gene"],
        ))

    if not target_accession:
        message = "No target accession was supplied; transcript specificity was not scored."
    elif not target_found:
        message = "The expected target accession was not found in the returned RefSeq RNA hits."
    elif hit_limit_reached:
        message = "The BLAST hit limit was reached; additional transcript hits may exist."
    elif off_target_count:
        message = "Additional qualified RefSeq RNA transcript hits were returned."
    elif any(hit["is_same_gene"] for hit in qualified_hits):
        message = "The target and same-gene transcript variants were found with no qualified hit outside the requested gene."
    else:
        message = "The target transcript was found with no additional qualified returned hit."

    return BlastValidation(
        specific=(
            bool(target_accession)
            and target_found
            and off_target_count == 0
            and not hit_limit_reached
        ),
        top_hit_identity=round(top_identity, 1),
        off_target_count=off_target_count,
        top_hits=top_hits,
        status=BlastValidationStatus.validated,
        message=message,
        target_accession=target_accession,
        target_found=target_found,
        qualified_hit_count=len(qualified_hits),
        hit_limit_reached=hit_limit_reached,
    )


def blast_primer(
    primer_seq: str,
    species: str,
    target_accession: str | None = None,
    target_gene: str | None = None,
) -> BlastValidation:
    """对单条引物做 BLAST，检查特异性，返回 top 3 命中。"""
    entrez_filter = SPECIES_ENTREZ_FILTER.get(species, "txid9606[Organism]")
    primer_hash = sha1(primer_seq.upper().encode("utf-8")).hexdigest()
    query_length = len(primer_seq)

    def _load() -> BlastValidation:
        try:
            records = run_qblast(
                program="blastn",
                database="refseq_rna",   # 比 nt 快 3-5x，引物验证足够
                sequence=primer_seq,
                entrez_query=entrez_filter,
                hitlist_size=BLAST_HITLIST_SIZE,
                expect=1000,
                word_size=7,
                format_type="XML",
            )
        except Exception:
            return BlastValidation(
                specific=False,
                top_hit_identity=0.0,
                off_target_count=0,
                top_hits=[],
                status=BlastValidationStatus.error,
                message="BLAST validation is temporarily unavailable.",
                target_accession=target_accession,
            )

        return _summarize_record(
            records[0] if records else None,
            query_length,
            target_accession,
            target_gene,
        )

    return cached_call(
        "primer_blast_gene_aware_v3",
        species,
        primer_hash,
        _accession_base(target_accession),
        (target_gene or "").strip().upper(),
        loader=_load,
        should_cache=lambda response: response.status != BlastValidationStatus.error,
    )


def blast_primers_batch(
    primer_seqs: list[str],
    species: str,
    target_accession: str | list[str | None] | None = None,
    target_gene: str | None = None,
) -> list[BlastValidation]:
    """一次 QBlast 请求验证全部候选引物，避免并发提交大量远程任务。"""
    if not primer_seqs:
        return []

    normalized = [seq.upper().strip() for seq in primer_seqs]
    if isinstance(target_accession, list):
        if len(target_accession) != len(normalized):
            raise ValueError("target_accession list must match primer_seqs length")
        target_accessions = target_accession
    else:
        target_accessions = [target_accession] * len(normalized)
    entrez_filter = SPECIES_ENTREZ_FILTER.get(species, "txid9606[Organism]")
    fasta = "\n".join(f">primer_{idx + 1}\n{seq}" for idx, seq in enumerate(normalized))
    batch_hash = sha1(
        f"gene-aware-v3:{(target_gene or '').strip().upper()}:{'|'.join(_accession_base(item) for item in target_accessions)}:{fasta}".encode("utf-8")
    ).hexdigest()

    def _load() -> list[BlastValidation]:
        try:
            records = run_qblast(
                program="blastn",
                database="refseq_rna",
                sequence=fasta,
                entrez_query=entrez_filter,
                hitlist_size=BLAST_HITLIST_SIZE,
                expect=1000,
                word_size=7,
                short_query=True,
                format_type="XML",
            )
        except Exception:
            return [
                BlastValidation(
                    specific=False,
                    top_hit_identity=0.0,
                    off_target_count=0,
                    top_hits=[],
                    status=BlastValidationStatus.error,
                    message="BLAST validation is temporarily unavailable.",
                    target_accession=target_accessions[index],
                )
                for index, _ in enumerate(normalized)
            ]

        return [
            _summarize_record(
                records[idx] if idx < len(records) else None,
                len(seq),
                target_accessions[idx],
                target_gene,
            )
            for idx, seq in enumerate(normalized)
        ]

    return cached_call(
        "primer_blast_batch_gene_aware_v3",
        species,
        batch_hash,
        loader=_load,
        should_cache=lambda responses: all(
            response.status != BlastValidationStatus.error for response in responses
        ),
    )
