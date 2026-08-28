from __future__ import annotations

import logging
from dataclasses import dataclass
from hashlib import sha1

from app.schemas.pcr import (
    PCRPairSpecificityRequest,
    PCRPairSpecificityResponse,
    PCRPairedRecord,
    PCRSpecificityStatus,
    PCRSpecificityVerdict,
)
from app.services.ncbi_client import cached_call, run_qblast


logger = logging.getLogger("primercat.pcr_specificity")

SPECIES_ENTREZ_FILTER = {
    "human": "txid9606[Organism] AND biomol_genomic[PROP] AND srcdb_refseq[PROP]",
    "mouse": "txid10090[Organism] AND biomol_genomic[PROP] AND srcdb_refseq[PROP]",
}

SEARCH_HIT_LIMIT = 100
RETURNED_RECORD_LIMIT = 10
MIN_QUERY_COVERAGE = 0.85
MAX_TOTAL_MISMATCHES = 3
REQUIRED_THREE_PRIME_MATCHES = 3


@dataclass(frozen=True)
class PrimerBindingHit:
    accession: str
    title: str
    start: int
    end: int
    strand: str
    identity: float
    mismatches: int
    three_prime_mismatches: int


def _error_response(req: PCRPairSpecificityRequest, message: str) -> PCRPairSpecificityResponse:
    return PCRPairSpecificityResponse(
        success=False,
        specificity_checked=False,
        status=PCRSpecificityStatus.error,
        verdict=PCRSpecificityVerdict.not_checked,
        pair_index=req.pair_index,
        species=req.species,
        message=message,
    )


def _three_prime_mismatches(hsp, query_length: int) -> int:
    query_pos = int(hsp.query_start) - 1
    observed = 0
    mismatches = 0
    threshold = query_length - REQUIRED_THREE_PRIME_MATCHES

    for query_base, subject_base in zip(str(hsp.query), str(hsp.sbjct)):
        if query_base == "-":
            continue
        query_pos += 1
        if query_pos <= threshold:
            continue
        observed += 1
        if subject_base == "-" or query_base.upper() != subject_base.upper():
            mismatches += 1

    return mismatches + max(0, REQUIRED_THREE_PRIME_MATCHES - observed)


def _extract_binding_hits(record, primer_sequence: str) -> list[PrimerBindingHit]:
    if record is None:
        return []

    query_length = len(primer_sequence)
    hits: list[PrimerBindingHit] = []
    seen: set[tuple[str, int, int, str]] = set()

    for alignment in getattr(record, "alignments", []):
        accession = str(getattr(alignment, "accession", "") or "").strip()
        if not accession:
            hit_id = str(getattr(alignment, "hit_id", "") or "")
            accession = hit_id.split("|")[-1] if hit_id else "unknown"
        title = str(getattr(alignment, "title", accession) or accession)
        if len(title) > 160:
            title = title[:157] + "..."

        for hsp in getattr(alignment, "hsps", []):
            query_text = str(getattr(hsp, "query", ""))
            covered_query_bases = sum(1 for base in query_text if base != "-")
            coverage = covered_query_bases / query_length if query_length else 0.0
            if coverage < MIN_QUERY_COVERAGE:
                continue

            aligned_nonmatches = sum(
                1
                for query_base, subject_base in zip(query_text, str(getattr(hsp, "sbjct", "")))
                if query_base != "-" and (subject_base == "-" or query_base.upper() != subject_base.upper())
            )
            total_mismatches = (query_length - covered_query_bases) + aligned_nonmatches
            three_prime_mismatches = _three_prime_mismatches(hsp, query_length)
            if total_mismatches > MAX_TOTAL_MISMATCHES or three_prime_mismatches > 0:
                continue

            subject_start = int(hsp.sbjct_start)
            subject_end = int(hsp.sbjct_end)
            strand = "+" if subject_start <= subject_end else "-"
            start = min(subject_start, subject_end)
            end = max(subject_start, subject_end)
            dedupe_key = (accession, start, end, strand)
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)

            align_length = max(1, int(getattr(hsp, "align_length", covered_query_bases)))
            identities = int(getattr(hsp, "identities", align_length - aligned_nonmatches))
            hits.append(
                PrimerBindingHit(
                    accession=accession,
                    title=title,
                    start=start,
                    end=end,
                    strand=strand,
                    identity=round(identities / align_length * 100, 1),
                    mismatches=total_mismatches,
                    three_prime_mismatches=three_prime_mismatches,
                )
            )

    return sorted(hits, key=lambda hit: (hit.mismatches, -hit.identity, hit.accession, hit.start))


def _matches_expected_size(product_size: int, expected_product_size: int | None) -> bool:
    if expected_product_size is None:
        return False
    tolerance = max(5, round(expected_product_size * 0.02))
    return abs(product_size - expected_product_size) <= tolerance


def _pair_binding_hits(
    left_hits: list[PrimerBindingHit],
    right_hits: list[PrimerBindingHit],
    req: PCRPairSpecificityRequest,
) -> list[PCRPairedRecord]:
    right_by_accession: dict[str, list[PrimerBindingHit]] = {}
    for hit in right_hits:
        right_by_accession.setdefault(hit.accession, []).append(hit)

    amplicons: list[PCRPairedRecord] = []
    seen: set[tuple[str, int, int, str]] = set()

    for left in left_hits:
        for right in right_by_accession.get(left.accession, []):
            orientation = ""
            start = 0
            end = 0

            if left.strand == "+" and right.strand == "-" and left.end < right.start:
                orientation = "left_plus_right_minus"
                start = left.start
                end = right.end
            elif left.strand == "-" and right.strand == "+" and right.end < left.start:
                orientation = "right_plus_left_minus"
                start = right.start
                end = left.end
            else:
                continue

            product_size = end - start + 1
            if not (req.min_amplicon_size <= product_size <= req.max_amplicon_size):
                continue

            dedupe_key = (left.accession, start, end, orientation)
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)

            amplicons.append(
                PCRPairedRecord(
                    accession=left.accession,
                    title=left.title or right.title,
                    start=start,
                    end=end,
                    product_size=product_size,
                    orientation=orientation,
                    left_identity=left.identity,
                    right_identity=right.identity,
                    left_mismatches=left.mismatches,
                    right_mismatches=right.mismatches,
                    matches_expected_size=_matches_expected_size(product_size, req.expected_product_size),
                )
            )

    expected = req.expected_product_size
    return sorted(
        amplicons,
        key=lambda item: (
            not item.matches_expected_size,
            item.left_mismatches + item.right_mismatches,
            abs(item.product_size - expected) if expected is not None else item.product_size,
            item.accession,
        ),
    )


def _screen_uncached(req: PCRPairSpecificityRequest) -> PCRPairSpecificityResponse:
    if req.min_amplicon_size >= req.max_amplicon_size:
        return _error_response(req, "invalid_amplicon_range")

    fasta = (
        f">pair_{req.pair_index}_left\n{req.left_primer.upper()}\n"
        f">pair_{req.pair_index}_right\n{req.right_primer.upper()}"
    )
    try:
        records = run_qblast(
            program="blastn",
            database="nt",
            sequence=fasta,
            entrez_query=SPECIES_ENTREZ_FILTER[req.species.value],
            hitlist_size=SEARCH_HIT_LIMIT,
            expect=1000,
            word_size=7,
            short_query=True,
            format_type="XML",
        )
    except Exception as exc:
        logger.warning("PCR pair specificity BLAST failed: %s", exc)
        return _error_response(req, "ncbi_blast_unavailable")

    left_record = records[0] if records else None
    right_record = records[1] if len(records) > 1 else None
    left_hits = _extract_binding_hits(left_record, req.left_primer.upper())
    right_hits = _extract_binding_hits(right_record, req.right_primer.upper())
    amplicons = _pair_binding_hits(left_hits, right_hits, req)
    amplicon_count = len(amplicons)

    if amplicon_count == 1:
        verdict = PCRSpecificityVerdict.one_paired_record
        status = PCRSpecificityStatus.completed
        message = "one_paired_record"
    elif amplicon_count > 1:
        verdict = PCRSpecificityVerdict.multiple_paired_records
        status = PCRSpecificityStatus.completed
        message = "multiple_paired_records"
    else:
        verdict = PCRSpecificityVerdict.no_paired_records
        status = PCRSpecificityStatus.no_paired_records
        message = "no_paired_records"

    left_alignment_count = len(getattr(left_record, "alignments", [])) if left_record else 0
    right_alignment_count = len(getattr(right_record, "alignments", [])) if right_record else 0
    returned = amplicons[:RETURNED_RECORD_LIMIT]

    return PCRPairSpecificityResponse(
        success=True,
        specificity_checked=True,
        status=status,
        verdict=verdict,
        pair_index=req.pair_index,
        species=req.species,
        left_hit_count=len(left_hits),
        right_hit_count=len(right_hits),
        paired_record_count=amplicon_count,
        returned_record_count=len(returned),
        search_hit_limit=SEARCH_HIT_LIMIT,
        results_may_be_truncated=(
            left_alignment_count >= SEARCH_HIT_LIMIT or right_alignment_count >= SEARCH_HIT_LIMIT
        ),
        paired_records=returned,
        message=message,
    )


def screen_pcr_pair_specificity(req: PCRPairSpecificityRequest) -> PCRPairSpecificityResponse:
    cache_key = sha1(
        (
            f"{req.species.value}:{req.left_primer.upper()}:{req.right_primer.upper()}:"
            f"{req.min_amplicon_size}:{req.max_amplicon_size}:{req.expected_product_size}"
        ).encode("utf-8")
    ).hexdigest()

    return cached_call(
        "pcr_pair_specificity_v2_refseq_genomic",
        cache_key,
        loader=lambda: _screen_uncached(req),
        should_cache=lambda response: response.success and response.specificity_checked,
    )
