import hashlib
import json
from pathlib import Path

import primer3
import pytest

from app.services.gene_primer_service import PRIMER3_SETTINGS, _design_primers


DATASET_PATH = (
    Path(__file__).resolve().parents[2]
    / "frontend"
    / "src"
    / "data"
    / "qpcr-primerbank-benchmark-v0.2.json"
)


@pytest.fixture(scope="module")
def benchmark() -> dict:
    return json.loads(DATASET_PATH.read_text(encoding="utf-8"))


def _sha256_json(value) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(payload).hexdigest()


def _reverse_complement(sequence: str) -> str:
    return sequence.translate(str.maketrans("ACGT", "TGCA"))[::-1]


def _evaluate_design(case: dict) -> dict:
    candidates = _design_primers(
        case["template_sequence"],
        num_candidates=30,
    )
    reference_start = case["forward_location_1_based"][0] - 1
    reference_end = case["reverse_location_1_based"][0]
    reference_length = reference_end - reference_start
    best_overlap = 0.0

    for candidate in candidates:
        candidate_start = candidate["left_props"].pos
        candidate_end = candidate["right_props"].pos + 1
        overlap = max(
            0,
            min(reference_end, candidate_end) - max(reference_start, candidate_start),
        )
        best_overlap = max(best_overlap, overlap / reference_length)

    return {
        "design_success": bool(candidates),
        "candidate_pairs_returned": len(candidates),
        "reference_amplicon_80pct_covered": best_overlap >= 0.8,
        "best_reference_amplicon_overlap_fraction": round(best_overlap, 4),
        "exact_reference_pair_returned": any(
            candidate["left"] == case["forward"]
            and candidate["right"] == case["reverse"]
            for candidate in candidates
        ),
    }


@pytest.fixture(scope="module")
def current_design_results(benchmark) -> list[dict]:
    return [_evaluate_design(case) for case in benchmark["cases"]]


def test_snapshot_identity_and_sampling_rule_are_frozen(benchmark):
    cases = benchmark["cases"]
    sampling = benchmark["sampling"]

    assert benchmark["schema_version"] == "2.0"
    assert benchmark["benchmark_id"] == "qpcr-primerbank-mouse-v0.2"
    assert benchmark["source_frame"]["unique_validated_records_in_frame"] == 242
    assert sampling["requested_records"] == sampling["selected_records"] == 100
    assert sampling["source_failures_before_sample_complete"] == {}
    assert len(cases) == 100
    assert len({case["primerbank_id"] for case in cases}) == 100

    expected_hashes = [
        hashlib.sha256(
            f"{sampling['seed']}:{case['primerbank_id']}".encode()
        ).hexdigest()
        for case in cases
    ]
    assert [case["sample_hash"] for case in cases] == expected_hashes
    assert expected_hashes == sorted(expected_hashes)
    assert _sha256_json(cases) == sampling["case_payload_sha256"]


@pytest.mark.parametrize("case_index", range(100))
def test_reference_primers_and_coordinates_match_the_frozen_template(
    benchmark, case_index
):
    case = benchmark["cases"][case_index]
    template = case["template_sequence"]
    forward_start, forward_end = case["forward_location_1_based"]
    reverse_end, reverse_start = case["reverse_location_1_based"]

    assert set(template) <= set("ACGT")
    assert len(template) == case["coding_dna_length"]
    assert template[forward_start - 1 : forward_end] == case["forward"]
    assert (
        _reverse_complement(template[reverse_start - 1 : reverse_end])
        == case["reverse"]
    )
    assert reverse_end - forward_start + 1 == case["amplicon_size_bp"]
    assert case["source_url"].startswith("https://pga.mgh.harvard.edu/")
    assert case["validation_url"].startswith("https://pga.mgh.harvard.edu/")


def test_design_engine_and_settings_match_the_current_service(benchmark):
    engine = benchmark["design_engine"]

    assert engine["engine"] == "primer3-py"
    assert engine["engine_version"] == primer3.__version__
    assert engine["candidate_limit_per_template"] == 30
    assert engine["settings"] == PRIMER3_SETTINGS
    assert engine["settings_sha256"] == _sha256_json(PRIMER3_SETTINGS)


def test_all_frozen_design_results_are_reproducible(
    benchmark, current_design_results
):
    assert current_design_results == [
        case["design_evaluation"] for case in benchmark["cases"]
    ]


def test_published_design_summary_matches_the_case_results(
    benchmark, current_design_results
):
    results = benchmark["results"]
    candidate_counts = sorted(
        result["candidate_pairs_returned"] for result in current_design_results
    )
    median_candidate_count = (
        candidate_counts[49] + candidate_counts[50]
    ) / 2
    design_successes = sum(
        result["design_success"] for result in current_design_results
    )
    coverage_successes = sum(
        result["reference_amplicon_80pct_covered"]
        for result in current_design_results
    )
    exact_matches = sum(
        result["exact_reference_pair_returned"]
        for result in current_design_results
    )

    assert results["records"] == len(current_design_results) == 100
    assert results["design_successes"] == design_successes
    assert results["design_failures"] == 100 - design_successes
    assert results["design_success_fraction"] == design_successes / 100
    assert results["median_candidate_pairs"] == median_candidate_count
    assert results["reference_amplicon_80pct_covered"] == coverage_successes
    assert results["reference_amplicon_80pct_coverage_fraction"] == (
        coverage_successes / 100
    )
    assert results["exact_reference_pairs_returned"] == exact_matches
