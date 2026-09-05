from hashlib import sha1
import re

from app.schemas.gene_primer import (
    BlastValidation,
    BlastTopHit,
    BlastValidationStatus,
    TranscriptAmpliconClass,
    TranscriptAmpliconHit,
    TranscriptomePairScreenStatus,
    TranscriptomePairValidation,
)
from app.services.ncbi_client import cached_call, run_qblast

SPECIES_ENTREZ_FILTER = {
    "human": "txid9606[Organism]",
    "mouse": "txid10090[Organism]",
}
BLAST_HITLIST_SIZE = 10
REMOTE_PAIR_HITLIST_SIZE = 50
QUALIFIED_IDENTITY_THRESHOLD = 80.0
REMOTE_PAIR_MIN_AMPLICON_SIZE = 50
REMOTE_PAIR_MAX_AMPLICON_SIZE = 5000
REMOTE_PAIR_MAX_MISMATCHES = 3
REMOTE_PAIR_REQUIRED_THREE_PRIME_MATCHES = 3


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
    hitlist_size: int = BLAST_HITLIST_SIZE,
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
    hit_limit_reached = len(record.alignments) >= hitlist_size
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


def _three_prime_mismatches(hsp, query_length: int) -> int:
    query_position = int(hsp.query_start) - 1
    observed = 0
    mismatches = 0
    threshold = query_length - REMOTE_PAIR_REQUIRED_THREE_PRIME_MATCHES

    for query_base, subject_base in zip(str(hsp.query), str(hsp.sbjct)):
        if query_base == "-":
            continue
        query_position += 1
        if query_position <= threshold:
            continue
        observed += 1
        if subject_base == "-" or query_base.upper() != subject_base.upper():
            mismatches += 1

    return mismatches + max(0, REMOTE_PAIR_REQUIRED_THREE_PRIME_MATCHES - observed)


def _extract_remote_binding_hits(record, primer_sequence: str) -> list[dict]:
    if record is None:
        return []

    query_length = len(primer_sequence)
    hits: list[dict] = []
    seen: set[tuple[str, int, int, str]] = set()
    for alignment in getattr(record, "alignments", []):
        accession = str(getattr(alignment, "accession", "") or "").strip()
        if not accession:
            hit_id = str(getattr(alignment, "hit_id", "") or "")
            accession = hit_id.split("|")[-1] if hit_id else "unknown"
        title = str(getattr(alignment, "title", accession) or accession)

        for hsp in getattr(alignment, "hsps", []):
            query_text = str(getattr(hsp, "query", ""))
            subject_text = str(getattr(hsp, "sbjct", ""))
            covered_query_bases = sum(base != "-" for base in query_text)
            coverage = covered_query_bases / query_length if query_length else 0.0
            if coverage < 0.85:
                continue
            aligned_nonmatches = sum(
                query_base != "-"
                and (subject_base == "-" or query_base.upper() != subject_base.upper())
                for query_base, subject_base in zip(query_text, subject_text)
            )
            mismatches = query_length - covered_query_bases + aligned_nonmatches
            if (
                mismatches > REMOTE_PAIR_MAX_MISMATCHES
                or _three_prime_mismatches(hsp, query_length) > 0
            ):
                continue

            subject_start = int(hsp.sbjct_start)
            subject_end = int(hsp.sbjct_end)
            strand = "+" if subject_start <= subject_end else "-"
            start = min(subject_start, subject_end)
            end = max(subject_start, subject_end)
            key = (_accession_base(accession), start, end, strand)
            if key in seen:
                continue
            seen.add(key)
            hits.append({
                "accession": _accession_base(accession),
                "title": title,
                "start": start,
                "end": end,
                "strand": strand,
                "mismatches": mismatches,
            })

    return hits


def _remote_result_may_be_truncated(record, primer_sequence: str) -> bool:
    alignments = list(getattr(record, "alignments", [])) if record is not None else []
    if len(alignments) < REMOTE_PAIR_HITLIST_SIZE:
        return False

    class LastRecord:
        def __init__(self, alignment):
            self.alignments = [alignment]

    # BLAST orders alignments by score. If the last returned alignment cannot
    # bind under the qPCR mismatch rules, omitted lower-scoring records cannot
    # change the paired-amplicon decision.
    return bool(_extract_remote_binding_hits(LastRecord(alignments[-1]), primer_sequence))


def _classify_remote_transcript(
    accession: str,
    title: str,
    target_accession: str,
    target_gene: str,
) -> TranscriptAmpliconClass:
    if _accession_base(accession) == _accession_base(target_accession):
        return TranscriptAmpliconClass.target_transcript
    if _title_matches_gene(title, target_gene):
        return TranscriptAmpliconClass.same_gene_isoform
    if _gene_symbol_from_title(title):
        return TranscriptAmpliconClass.other_gene
    return TranscriptAmpliconClass.unclassified


def _build_remote_pair_validation(
    left_record,
    right_record,
    left_primer: str,
    right_primer: str,
    target_accession: str,
    target_gene: str,
) -> TranscriptomePairValidation:
    left_hits = _extract_remote_binding_hits(left_record, left_primer)
    right_hits = _extract_remote_binding_hits(right_record, right_primer)
    right_by_accession: dict[str, list[dict]] = {}
    for hit in right_hits:
        right_by_accession.setdefault(hit["accession"], []).append(hit)

    products: list[TranscriptAmpliconHit] = []
    seen: set[tuple[str, int, int, str]] = set()
    for left in left_hits:
        for right in right_by_accession.get(left["accession"], []):
            if left["strand"] == "+" and right["strand"] == "-" and left["end"] < right["start"]:
                start, end = left["start"], right["end"]
                orientation = "left_plus_right_minus"
            elif left["strand"] == "-" and right["strand"] == "+" and right["end"] < left["start"]:
                start, end = right["start"], left["end"]
                orientation = "right_plus_left_minus"
            else:
                continue
            product_size = end - start + 1
            if not REMOTE_PAIR_MIN_AMPLICON_SIZE <= product_size <= REMOTE_PAIR_MAX_AMPLICON_SIZE:
                continue
            key = (left["accession"], start, end, orientation)
            if key in seen:
                continue
            seen.add(key)
            classification = _classify_remote_transcript(
                left["accession"],
                left["title"] or right["title"],
                target_accession,
                target_gene,
            )
            products.append(TranscriptAmpliconHit(
                transcript_accession=left["accession"],
                start=start,
                end=end,
                product_size=product_size,
                orientation=orientation,
                left_mismatches=left["mismatches"],
                right_mismatches=right["mismatches"],
                classification=classification,
                gene_name=(
                    target_gene
                    if classification in {
                        TranscriptAmpliconClass.target_transcript,
                        TranscriptAmpliconClass.same_gene_isoform,
                    }
                    else _gene_symbol_from_title(left["title"] or right["title"]) or None
                ),
            ))

    order = {
        TranscriptAmpliconClass.target_transcript: 0,
        TranscriptAmpliconClass.same_gene_isoform: 1,
        TranscriptAmpliconClass.other_gene: 2,
        TranscriptAmpliconClass.unclassified: 3,
    }
    products.sort(key=lambda product: (
        order[product.classification],
        product.left_mismatches + product.right_mismatches,
        product.product_size,
        product.transcript_accession,
    ))
    counts = {
        classification: sum(product.classification == classification for product in products)
        for classification in TranscriptAmpliconClass
    }
    target_count = counts[TranscriptAmpliconClass.target_transcript]
    same_gene_count = counts[TranscriptAmpliconClass.same_gene_isoform]
    other_gene_count = counts[TranscriptAmpliconClass.other_gene]
    unclassified_count = counts[TranscriptAmpliconClass.unclassified]
    hit_limit_reached = (
        _remote_result_may_be_truncated(left_record, left_primer)
        or _remote_result_may_be_truncated(right_record, right_primer)
    )

    if hit_limit_reached:
        status = TranscriptomePairScreenStatus.truncated
        message = "The relevant RefSeq RNA BLAST return limit was reached; no pass can be assigned."
    elif not products:
        status = TranscriptomePairScreenStatus.no_paired_amplicons
        message = "No paired RefSeq RNA amplicon was found in the configured product window."
    elif target_count == 0:
        status = TranscriptomePairScreenStatus.target_not_found
        message = "Paired transcript products were found, but not on the selected transcript."
    elif target_count != 1:
        status = TranscriptomePairScreenStatus.ambiguous_target
        message = "More than one amplifiable product was found on the selected transcript."
    else:
        status = TranscriptomePairScreenStatus.validated
        message = (
            "The selected transcript is amplifiable and no paired product from another gene was found in the returned RefSeq RNA records."
            if other_gene_count == 0 and unclassified_count == 0
            else "The selected transcript is amplifiable, but an additional cross-gene or unclassified paired product was found."
        )

    gene_specific = (
        status == TranscriptomePairScreenStatus.validated
        and other_gene_count == 0
        and unclassified_count == 0
        and not hit_limit_reached
    )
    return TranscriptomePairValidation(
        checked=True,
        gene_specific=gene_specific,
        isoform_specific=gene_specific and same_gene_count == 0,
        status=status,
        engine="ncbi_blast_refseq_rna_paired_amplicon",
        target_transcript=target_accession,
        target_gene_name=target_gene,
        left_hit_count=len(left_hits),
        right_hit_count=len(right_hits),
        paired_amplicon_count=len(products),
        target_transcript_amplicon_count=target_count,
        same_gene_isoform_amplicon_count=same_gene_count,
        other_gene_amplicon_count=other_gene_count,
        unclassified_amplicon_count=unclassified_count,
        hit_limit_reached=hit_limit_reached,
        min_amplicon_size=REMOTE_PAIR_MIN_AMPLICON_SIZE,
        max_amplicon_size=REMOTE_PAIR_MAX_AMPLICON_SIZE,
        top_amplicons=products[:12],
        message=message,
    )


def _remote_pair_error(target_accession: str, target_gene: str) -> TranscriptomePairValidation:
    return TranscriptomePairValidation(
        checked=False,
        gene_specific=False,
        isoform_specific=False,
        status=TranscriptomePairScreenStatus.error,
        engine="ncbi_blast_refseq_rna_paired_amplicon",
        target_transcript=target_accession,
        target_gene_name=target_gene,
        message="NCBI RefSeq RNA paired screening is temporarily unavailable.",
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


def blast_primer_pairs_batch(
    primer_pairs: list[tuple[str, str]],
    species: str,
    target_accession: str,
    target_gene: str,
) -> tuple[list[BlastValidation], list[TranscriptomePairValidation]]:
    """Screen qPCR pairs in one RefSeq RNA BLAST request.

    Individual-hit summaries remain available for audit, while the primary
    decision is made from opposing primer hits that can form an amplicon on
    the same transcript. This avoids treating every single-primer match to a
    pseudogene or unrelated transcript as an amplifiable off-target product.
    """
    if not primer_pairs:
        return [], []

    sequences = [sequence.upper().strip() for pair in primer_pairs for sequence in pair]
    entrez_filter = SPECIES_ENTREZ_FILTER.get(species, "txid9606[Organism]")
    fasta = "\n".join(
        f">pair_{index // 2 + 1}_{'left' if index % 2 == 0 else 'right'}\n{sequence}"
        for index, sequence in enumerate(sequences)
    )
    batch_hash = sha1(
        (
            f"remote-pair-v1:{species}:{_accession_base(target_accession)}:"
            f"{target_gene.strip().upper()}:{fasta}"
        ).encode("utf-8")
    ).hexdigest()

    def _load() -> tuple[list[BlastValidation], list[TranscriptomePairValidation]]:
        try:
            records = run_qblast(
                program="blastn",
                database="refseq_rna",
                sequence=fasta,
                entrez_query=entrez_filter,
                hitlist_size=REMOTE_PAIR_HITLIST_SIZE,
                expect=1000,
                word_size=7,
                short_query=True,
                format_type="XML",
            )
        except Exception:
            blast_errors = [
                BlastValidation(
                    specific=False,
                    top_hit_identity=0.0,
                    off_target_count=0,
                    top_hits=[],
                    status=BlastValidationStatus.error,
                    message="NCBI BLAST validation is temporarily unavailable.",
                    target_accession=target_accession,
                )
                for _ in sequences
            ]
            return blast_errors, [
                _remote_pair_error(target_accession, target_gene)
                for _ in primer_pairs
            ]

        blast_results = [
            _summarize_record(
                records[index] if index < len(records) else None,
                len(sequence),
                target_accession,
                target_gene,
                hitlist_size=REMOTE_PAIR_HITLIST_SIZE,
            )
            for index, sequence in enumerate(sequences)
        ]
        pair_results = [
            _build_remote_pair_validation(
                records[index * 2] if index * 2 < len(records) else None,
                records[index * 2 + 1] if index * 2 + 1 < len(records) else None,
                pair[0],
                pair[1],
                target_accession,
                target_gene,
            )
            for index, pair in enumerate(primer_pairs)
        ]
        return blast_results, pair_results

    return cached_call(
        "primer_blast_pair_batch_gene_aware_v1",
        batch_hash,
        loader=_load,
        should_cache=lambda result: (
            all(item.status != BlastValidationStatus.error for item in result[0])
            and all(item.status != TranscriptomePairScreenStatus.error for item in result[1])
        ),
    )
