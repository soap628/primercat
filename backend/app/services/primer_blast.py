from hashlib import sha1

from app.schemas.gene_primer import BlastValidation, BlastTopHit, BlastValidationStatus
from app.services.ncbi_client import cached_call, run_qblast

SPECIES_ENTREZ_FILTER = {
    "human": "txid9606[Organism]",
    "mouse": "txid10090[Organism]",
}


def blast_primer(primer_seq: str, species: str) -> BlastValidation:
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
                hitlist_size=5,           # top 3 够用，减少传输量
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
            )

        if not records or not records[0].alignments:
            return BlastValidation(
                specific=False,
                top_hit_identity=0.0,
                off_target_count=0,
                top_hits=[],
                status=BlastValidationStatus.no_hits,
                message="No matching transcript hits were found in RefSeq RNA.",
            )

        record = records[0]
        top_identity = 0.0
        off_target_count = 0
        top_hits: list[BlastTopHit] = []

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
                if identity_pct > top_identity:
                    top_identity = identity_pct
                if 80 < identity_pct < 100:
                    off_target_count += 1

            if len(top_hits) < 3:
                title = alignment.title
                if len(title) > 80:
                    title = title[:77] + "..."
                is_off = 80 < best_identity < 100
                top_hits.append(BlastTopHit(
                    rank=len(top_hits) + 1,
                    title=title,
                    identity=round(best_identity, 1),
                    is_off_target=is_off,
                ))

        specific = top_identity >= 99.0 and off_target_count <= 2

        return BlastValidation(
            specific=specific,
            top_hit_identity=round(top_identity, 1),
            off_target_count=off_target_count,
            top_hits=top_hits,
            status=BlastValidationStatus.validated,
            message="",
        )

    return cached_call(
        "primer_blast",
        species,
        primer_hash,
        loader=_load,
        should_cache=lambda response: response.status != BlastValidationStatus.error,
    )
