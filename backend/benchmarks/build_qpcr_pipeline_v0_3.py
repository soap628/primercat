"""Build the PrimerCat qPCR pipeline evidence snapshot v0.3.

The run extends the frozen PrimerBank v0.2 sample through PrimerCat's current
RefSeq transcript-selection, exon-classification, and Primer3 stages. A smaller
deterministic subset also runs the current NCBI RefSeq RNA screen. The remote
screen is reported as a bounded returned-hit audit, never as genome-wide or
wet-lab specificity validation.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import statistics
import sys
import time
from pathlib import Path

import Bio
import primer3


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPOSITORY_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import settings  # noqa: E402
from app.services.gene_primer_service import (  # noqa: E402
    DEFAULT_NUM_CANDIDATES,
    PRIMER3_SETTINGS,
    _design_primers,
)
from app.services.ncbi_fetch import TranscriptInfo, fetch_transcript  # noqa: E402
from app.services.primer_blast import (  # noqa: E402
    BLAST_HITLIST_SIZE,
    QUALIFIED_IDENTITY_THRESHOLD,
    blast_primers_batch,
)
from app.services.primer_scoring import detect_exon_span  # noqa: E402


SOURCE_SNAPSHOT = (
    REPOSITORY_ROOT
    / "frontend"
    / "src"
    / "data"
    / "qpcr-primerbank-benchmark-v0.2.json"
)
DEFAULT_OUTPUT = (
    REPOSITORY_ROOT
    / "frontend"
    / "src"
    / "data"
    / "qpcr-pipeline-benchmark-v0.3.json"
)
SPECIFICITY_PILOT_SIZE = 20
TOP_CANDIDATE_PAIRS_SCREENED_BY_SITE = 10


def _sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _sha256_json(value) -> str:
    return _sha256_bytes(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    )


def _accession_base(value: str) -> str:
    return value.upper().split(".", 1)[0]


def _reverse_complement(sequence: str) -> str:
    return sequence.translate(str.maketrans("ACGT", "TGCA"))[::-1]


def _all_occurrences(sequence: str, query: str) -> list[int]:
    starts: list[int] = []
    offset = 0
    while True:
        start = sequence.find(query, offset)
        if start < 0:
            return starts
        starts.append(start)
        offset = start + 1


def _fetch_with_retries(case: dict) -> tuple[dict, TranscriptInfo | None, str | None]:
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            return case, fetch_transcript(case["gene"], "mouse"), None
        except Exception as exc:  # network/source failures are retained by class
            last_error = exc
            if attempt < 2:
                time.sleep(1.0 * (2**attempt))
    assert last_error is not None
    return case, None, f"{type(last_error).__name__}: {last_error}"


def _evaluate_case(case: dict, transcript: TranscriptInfo) -> dict:
    sequence = transcript.sequence
    forward_starts = _all_occurrences(sequence, case["forward"])
    reverse_binding = _reverse_complement(case["reverse"])
    reverse_starts = _all_occurrences(sequence, reverse_binding)
    mapped_amplicons = [
        {
            "start_0_based": forward_start,
            "end_exclusive_0_based": reverse_start + len(reverse_binding),
            "size_bp": reverse_start + len(reverse_binding) - forward_start,
        }
        for forward_start in forward_starts
        for reverse_start in reverse_starts
        if reverse_start >= forward_start + len(case["forward"])
    ]

    candidates = sorted(
        _design_primers(sequence, DEFAULT_NUM_CANDIDATES),
        key=lambda candidate: candidate["penalty"],
    )
    top_candidates = candidates[:TOP_CANDIDATE_PAIRS_SCREENED_BY_SITE]
    exon_results = [
        detect_exon_span(
            candidate["left_props"].pos,
            candidate["left_props"].length,
            candidate["right_props"].pos,
            candidate["right_props"].length,
            transcript.exons,
        )
        for candidate in top_candidates
    ]
    exact_pair_returned = any(
        candidate["left"] == case["forward"]
        and candidate["right"] == case["reverse"]
        for candidate in candidates
    )

    mapped_reference = mapped_amplicons[0] if len(mapped_amplicons) == 1 else None
    best_reference_overlap = 0.0
    if mapped_reference:
        reference_start = mapped_reference["start_0_based"]
        reference_end = mapped_reference["end_exclusive_0_based"]
        reference_length = reference_end - reference_start
        for candidate in candidates:
            candidate_start = candidate["left_props"].pos
            candidate_end = candidate["right_props"].pos + 1
            overlap = max(
                0,
                min(reference_end, candidate_end)
                - max(reference_start, candidate_start),
            )
            best_reference_overlap = max(
                best_reference_overlap,
                overlap / reference_length,
            )

    first_candidate = top_candidates[0] if top_candidates else None
    return {
        "primerbank_id": case["primerbank_id"],
        "gene": case["gene"],
        "primerbank_accession": case["accession"],
        "selected_refseq_accession": transcript.transcript_id,
        "selected_accession_matches_primerbank_base": (
            _accession_base(transcript.transcript_id)
            == _accession_base(case["accession"])
        ),
        "selection_reason": transcript.selection_reason,
        "template_length_bp": len(sequence),
        "template_sequence": sequence,
        "template_sha256": _sha256_bytes(sequence.encode()),
        "cds_start_0_based": transcript.cds_start,
        "cds_end_exclusive_0_based": transcript.cds_end,
        "cds_length_bp": transcript.cds_length,
        "exons": [
            {"index": exon.index, "start": exon.start, "end": exon.end}
            for exon in transcript.exons
        ],
        "reference_forward_occurrences": forward_starts,
        "reference_reverse_binding_occurrences": reverse_starts,
        "unambiguous_reference_amplicon_mapped": len(mapped_amplicons) == 1,
        "mapped_reference_amplicons": mapped_amplicons,
        "design_success": bool(candidates),
        "candidate_pairs_returned": len(candidates),
        "candidate_pairs_in_site_screening_set": len(top_candidates),
        "site_screening_set_exon_spanning_pairs": sum(
            result.spans_junction for result in exon_results
        ),
        "site_screening_set_has_exon_spanning_pair": any(
            result.spans_junction for result in exon_results
        ),
        "reference_amplicon_80pct_covered": (
            mapped_reference is not None and best_reference_overlap >= 0.8
        ),
        "best_reference_amplicon_overlap_fraction": round(
            best_reference_overlap,
            4,
        ),
        "exact_reference_pair_returned": exact_pair_returned,
        "first_ranked_candidate": (
            {
                "left": first_candidate["left"],
                "right": first_candidate["right"],
                "product_size": first_candidate["product_size"],
                "penalty": first_candidate["penalty"],
                "exon_span": exon_results[0].model_dump(),
            }
            if first_candidate
            else None
        ),
    }


def _run_specificity_pilot(cases: list[dict]) -> dict:
    eligible = [case for case in cases if case["first_ranked_candidate"]][
        :SPECIFICITY_PILOT_SIZE
    ]
    primers: list[str] = []
    targets: list[str] = []
    for case in eligible:
        candidate = case["first_ranked_candidate"]
        primers.extend([candidate["left"], candidate["right"]])
        targets.extend([case["selected_refseq_accession"]] * 2)

    screens = blast_primers_batch(primers, "mouse", targets)
    case_results = []
    for index, case in enumerate(eligible):
        left = screens[index * 2]
        right = screens[index * 2 + 1]
        left_payload = left.model_dump(mode="json")
        right_payload = right.model_dump(mode="json")
        case_results.append({
            "primerbank_id": case["primerbank_id"],
            "gene": case["gene"],
            "target_accession": case["selected_refseq_accession"],
            "left": left_payload,
            "right": right_payload,
            "screen_completed": (
                left.status.value == "validated"
                and right.status.value == "validated"
            ),
            "both_target_anchored": left.target_found and right.target_found,
            "hit_limit_reached": left.hit_limit_reached or right.hit_limit_reached,
            "no_additional_returned_hit": left.specific and right.specific,
        })

    return {
        "attempted_pairs": len(case_results),
        "screen_completed_pairs": sum(
            result["screen_completed"] for result in case_results
        ),
        "both_primers_target_anchored_pairs": sum(
            result["both_target_anchored"] for result in case_results
        ),
        "hit_limit_reached_pairs": sum(
            result["hit_limit_reached"] for result in case_results
        ),
        "no_additional_returned_hit_pairs": sum(
            result["no_additional_returned_hit"] for result in case_results
        ),
        "cases": case_results,
    }


def build_snapshot(run_specificity: bool) -> dict:
    source_bytes = SOURCE_SNAPSHOT.read_bytes()
    source = json.loads(source_bytes)
    fetched: list[tuple[dict, TranscriptInfo | None, str | None]] = []
    with ThreadPoolExecutor(max_workers=3) as executor:
        for item in executor.map(_fetch_with_retries, source["cases"]):
            fetched.append(item)
            print(f"resolved {len(fetched)}/{len(source['cases'])}", flush=True)

    cases: list[dict] = []
    failures: list[dict] = []
    for case, transcript, error in fetched:
        if transcript is None:
            failures.append({
                "primerbank_id": case["primerbank_id"],
                "gene": case["gene"],
                "error": error,
            })
            continue
        cases.append(_evaluate_case(case, transcript))

    specificity = (
        _run_specificity_pilot(cases)
        if run_specificity
        else {
            "attempted_pairs": 0,
            "status": "not_run",
            "reason": "Generator was run without --run-specificity.",
            "cases": [],
        }
    )
    exon_pair_counts = [
        case["site_screening_set_exon_spanning_pairs"] for case in cases
    ]
    results = {
        "source_records": len(source["cases"]),
        "transcript_resolution_successes": len(cases),
        "transcript_resolution_failures": len(failures),
        "selected_accession_matches_primerbank_base": sum(
            case["selected_accession_matches_primerbank_base"] for case in cases
        ),
        "unambiguous_reference_amplicons_mapped": sum(
            case["unambiguous_reference_amplicon_mapped"] for case in cases
        ),
        "design_successes": sum(case["design_success"] for case in cases),
        "site_screening_sets_with_exon_spanning_pair": sum(
            case["site_screening_set_has_exon_spanning_pair"] for case in cases
        ),
        "median_exon_spanning_pairs_per_site_screening_set": (
            statistics.median(exon_pair_counts) if exon_pair_counts else 0
        ),
        "reference_amplicon_80pct_covered": sum(
            case["reference_amplicon_80pct_covered"] for case in cases
        ),
        "exact_reference_pairs_returned": sum(
            case["exact_reference_pair_returned"] for case in cases
        ),
    }
    source_files = [
        "backend/app/services/ncbi_fetch.py",
        "backend/app/services/gene_primer_service.py",
        "backend/app/services/primer_scoring.py",
        "backend/app/services/primer_blast.py",
    ]
    snapshot = {
        "schema_version": "3.0",
        "benchmark_id": "qpcr-primerbank-mouse-pipeline-v0.3",
        "snapshot_date": "2026-09-02",
        "scope": "RefSeq transcript, exon, Primer3, and bounded RefSeq RNA returned-hit audit",
        "source_benchmark": {
            "benchmark_id": source["benchmark_id"],
            "case_payload_sha256": source["sampling"]["case_payload_sha256"],
            "file_sha256": _sha256_bytes(source_bytes),
        },
        "runtime": {
            "primer3_py": primer3.__version__,
            "biopython": Bio.__version__,
            "primer3_settings_sha256": _sha256_json(PRIMER3_SETTINGS),
            "source_code_sha256": {
                path: _sha256_bytes((REPOSITORY_ROOT / path).read_bytes())
                for path in source_files
            },
        },
        "transcript_rule": (
            "Current PrimerCat fetch_transcript rule: prefer MANE Select; otherwise "
            "choose the longest-CDS NM_ RefSeq record among returned records."
        ),
        "specificity_scope": {
            "database": "NCBI refseq_rna",
            "species_filter": "Mus musculus (txid10090)",
            "qualified_identity_threshold_percent": QUALIFIED_IDENTITY_THRESHOLD,
            "hitlist_size_per_primer": BLAST_HITLIST_SIZE,
            "pair_pass_rule": (
                "Both primers must find the expected target accession at >=99% "
                "identity, return no other >80% qualified transcript hit, and not "
                "reach the BLAST hit cap."
            ),
            "not_tested": [
                "complete reference-genome specificity",
                "paired genomic amplicon formation",
                "sample variants",
                "wet-lab efficiency or single-product formation",
            ],
        },
        "results": results,
        "transcript_failures": failures,
        "specificity_pilot": specificity,
        "cases": cases,
    }
    snapshot["case_payload_sha256"] = _sha256_json(cases)
    return snapshot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--run-specificity", action="store_true")
    args = parser.parse_args()
    if args.run_specificity and settings.NCBI_EMAIL in {
        "",
        "admin@example.com",
        "your@email.com",
    }:
        raise RuntimeError("Set a real NCBI_EMAIL before running the remote pilot")

    snapshot = build_snapshot(args.run_specificity)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({
        "output": str(args.output),
        "results": snapshot["results"],
        "specificity": {
            key: value
            for key, value in snapshot["specificity_pilot"].items()
            if key != "cases"
        },
    }, indent=2))


if __name__ == "__main__":
    main()
