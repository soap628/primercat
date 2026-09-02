import hashlib
import json
from pathlib import Path

import pytest

from app.services.gene_primer_service import _design_primers
from app.services.ncbi_fetch import ExonInfo
from app.services.primer_scoring import detect_exon_span


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
DATASET_PATH = (
    REPOSITORY_ROOT
    / "frontend"
    / "src"
    / "data"
    / "qpcr-pipeline-benchmark-v0.3.json"
)
SOURCE_PATH = (
    REPOSITORY_ROOT
    / "frontend"
    / "src"
    / "data"
    / "qpcr-primerbank-benchmark-v0.2.json"
)


@pytest.fixture(scope="module")
def benchmark() -> dict:
    return json.loads(DATASET_PATH.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def source_benchmark() -> dict:
    return json.loads(SOURCE_PATH.read_text(encoding="utf-8"))


def _sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _sha256_json(value) -> str:
    return _sha256_bytes(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    )


def _reverse_complement(sequence: str) -> str:
    return sequence.translate(str.maketrans("ACGT", "TGCA"))[::-1]


def _all_occurrences(sequence: str, query: str) -> list[int]:
    starts = []
    offset = 0
    while True:
        start = sequence.find(query, offset)
        if start < 0:
            return starts
        starts.append(start)
        offset = start + 1


def test_snapshot_is_bound_to_the_v0_2_sample_and_records_historical_provenance(
    benchmark, source_benchmark
):
    assert benchmark["schema_version"] == "3.0"
    assert benchmark["benchmark_id"] == "qpcr-primerbank-mouse-pipeline-v0.3"
    assert benchmark["source_benchmark"]["benchmark_id"] == source_benchmark[
        "benchmark_id"
    ]
    assert benchmark["source_benchmark"]["case_payload_sha256"] == (
        source_benchmark["sampling"]["case_payload_sha256"]
    )
    assert benchmark["source_benchmark"]["file_sha256"] == _sha256_bytes(
        SOURCE_PATH.read_bytes()
    )
    assert [case["primerbank_id"] for case in benchmark["cases"]] == [
        case["primerbank_id"] for case in source_benchmark["cases"]
    ]
    assert benchmark["case_payload_sha256"] == _sha256_json(benchmark["cases"])
    assert benchmark["runtime"]["primer3_py"] == "2.3.0"
    assert len(benchmark["runtime"]["primer3_settings_sha256"]) == 64

    for relative_path, historical_hash in benchmark["runtime"][
        "source_code_sha256"
    ].items():
        assert (REPOSITORY_ROOT / relative_path).exists()
        assert len(historical_hash) == 64
        int(historical_hash, 16)


@pytest.mark.parametrize("case_index", range(100))
def test_frozen_refseq_templates_and_reference_mapping_are_consistent(
    benchmark, source_benchmark, case_index
):
    case = benchmark["cases"][case_index]
    source = source_benchmark["cases"][case_index]
    sequence = case["template_sequence"]

    assert case["primerbank_id"] == source["primerbank_id"]
    assert case["gene"] == source["gene"]
    assert len(sequence) == case["template_length_bp"]
    assert set(sequence) <= set("ACGT")
    assert _sha256_bytes(sequence.encode()) == case["template_sha256"]
    assert 0 <= case["cds_start_0_based"] < case["cds_end_exclusive_0_based"]
    assert case["cds_end_exclusive_0_based"] <= len(sequence)

    exons = case["exons"]
    assert exons
    assert [exon["index"] for exon in exons] == list(range(len(exons)))
    assert all(0 <= exon["start"] < exon["end"] <= len(sequence) for exon in exons)

    expected_forward = _all_occurrences(sequence, source["forward"])
    expected_reverse = _all_occurrences(
        sequence,
        _reverse_complement(source["reverse"]),
    )
    assert case["reference_forward_occurrences"] == expected_forward
    assert case["reference_reverse_binding_occurrences"] == expected_reverse

    expected_amplicons = [
        {
            "start_0_based": forward_start,
            "end_exclusive_0_based": reverse_start + len(source["reverse"]),
            "size_bp": reverse_start + len(source["reverse"]) - forward_start,
        }
        for forward_start in expected_forward
        for reverse_start in expected_reverse
        if reverse_start >= forward_start + len(source["forward"])
    ]
    assert case["mapped_reference_amplicons"] == expected_amplicons
    assert case["unambiguous_reference_amplicon_mapped"] == (
        len(expected_amplicons) == 1
    )


@pytest.fixture(scope="module")
def rerun_design_results(benchmark, source_benchmark) -> list[dict]:
    results = []
    for case, source in zip(benchmark["cases"], source_benchmark["cases"]):
        candidates = sorted(
            _design_primers(case["template_sequence"], 30),
            key=lambda candidate: candidate["penalty"],
        )
        top_candidates = candidates[:10]
        exons = [ExonInfo(**exon) for exon in case["exons"]]
        exon_results = [
            detect_exon_span(
                candidate["left_props"].pos,
                candidate["left_props"].length,
                candidate["right_props"].pos,
                candidate["right_props"].length,
                exons,
            )
            for candidate in top_candidates
        ]
        first = top_candidates[0] if top_candidates else None
        mapped_reference = (
            case["mapped_reference_amplicons"][0]
            if case["unambiguous_reference_amplicon_mapped"]
            else None
        )
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
        results.append({
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
            "exact_reference_pair_returned": any(
                candidate["left"] == source["forward"]
                and candidate["right"] == source["reverse"]
                for candidate in candidates
            ),
            "first_ranked_candidate": (
                {
                    "left": first["left"],
                    "right": first["right"],
                    "product_size": first["product_size"],
                    "penalty": first["penalty"],
                    "exon_span": exon_results[0].model_dump(),
                }
                if first
                else None
            ),
        })
    return results


def test_primer3_and_exon_classification_rerun_exactly(
    benchmark, rerun_design_results
):
    for case, rerun in zip(benchmark["cases"], rerun_design_results):
        for key, value in rerun.items():
            assert case[key] == value


def test_published_pipeline_summary_matches_case_results(benchmark):
    cases = benchmark["cases"]
    results = benchmark["results"]
    exon_counts = sorted(
        case["site_screening_set_exon_spanning_pairs"] for case in cases
    )

    assert results["source_records"] == 100
    assert results["transcript_resolution_successes"] == len(cases) == 100
    assert results["transcript_resolution_failures"] == len(
        benchmark["transcript_failures"]
    ) == 0
    assert results["selected_accession_matches_primerbank_base"] == sum(
        case["selected_accession_matches_primerbank_base"] for case in cases
    )
    assert results["unambiguous_reference_amplicons_mapped"] == sum(
        case["unambiguous_reference_amplicon_mapped"] for case in cases
    )
    assert results["design_successes"] == sum(
        case["design_success"] for case in cases
    )
    assert results["site_screening_sets_with_exon_spanning_pair"] == sum(
        case["site_screening_set_has_exon_spanning_pair"] for case in cases
    )
    assert results["median_exon_spanning_pairs_per_site_screening_set"] == (
        exon_counts[49] + exon_counts[50]
    ) / 2
    assert results["reference_amplicon_80pct_covered"] == sum(
        case["reference_amplicon_80pct_covered"] for case in cases
    )
    assert results["exact_reference_pairs_returned"] == sum(
        case["exact_reference_pair_returned"] for case in cases
    )


def test_specificity_pilot_is_bounded_target_anchored_and_self_consistent(
    benchmark
):
    pilot = benchmark["specificity_pilot"]
    cases = pilot["cases"]

    assert pilot["attempted_pairs"] == len(cases) == 20
    assert [case["primerbank_id"] for case in cases] == [
        case["primerbank_id"] for case in benchmark["cases"][:20]
    ]
    for case in cases:
        for screen in (case["left"], case["right"]):
            assert screen["target_accession"] == case["target_accession"]
            assert screen["status"] in {"validated", "no_hits", "error"}
            assert screen["qualified_hit_count"] >= screen["off_target_count"]
            if screen["target_found"]:
                assert screen["qualified_hit_count"] == screen["off_target_count"] + 1
                assert any(hit["is_target"] for hit in screen["top_hits"])
            else:
                assert screen["qualified_hit_count"] == screen["off_target_count"]
            if screen["specific"]:
                assert screen["target_found"] is True
                assert screen["off_target_count"] == 0
                assert screen["hit_limit_reached"] is False

    assert pilot["screen_completed_pairs"] == sum(
        case["screen_completed"] for case in cases
    )
    assert pilot["both_primers_target_anchored_pairs"] == sum(
        case["both_target_anchored"] for case in cases
    )
    assert pilot["hit_limit_reached_pairs"] == sum(
        case["hit_limit_reached"] for case in cases
    )
    assert pilot["no_additional_returned_hit_pairs"] == sum(
        case["no_additional_returned_hit"] for case in cases
    )
