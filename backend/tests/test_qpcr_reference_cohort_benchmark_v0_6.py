import hashlib
import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_PATH = ROOT / "frontend" / "src" / "data" / "qpcr-reference-cohort-mouse-v0.6.json"


def _sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _sha256_json(value) -> str:
    return _sha256_bytes(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    )


def _snapshot() -> dict:
    return json.loads(SNAPSHOT_PATH.read_text())


def test_v0_6_cohort_is_fixed_unique_and_reproducible():
    snapshot = _snapshot()
    cases = snapshot["cases"]
    assert snapshot["schema_version"] == "6.0"
    assert snapshot["benchmark_id"] == "qpcr-fixed-refseq-mouse-cohort-v0.6"
    assert snapshot["reference"]["assembly_accession"] == "GCF_000001635.27"
    assert snapshot["sampling"]["selected_records"] == len(cases) == 200
    assert snapshot["sampling"]["one_transcript_per_gene"] is True
    assert len({case["gene_id"] or case["gene_name"] for case in cases}) == len(cases)
    assert [case["sample_hash"] for case in cases] == sorted(
        case["sample_hash"] for case in cases
    )
    assert snapshot["case_payload_sha256"] == _sha256_json(cases)
    for relative_path, expected in snapshot["runtime"]["source_code_sha256"].items():
        assert _sha256_bytes((ROOT / relative_path).read_bytes()) == expected


def test_v0_6_summary_is_recomputed_from_candidate_records():
    snapshot = _snapshot()
    cases = snapshot["cases"]
    candidates = [candidate for case in cases for candidate in case["candidates"]]
    genome = [candidate["genome_pair_screen"] for candidate in candidates]
    transcript = [candidate["transcriptome_pair_screen"] for candidate in candidates]
    results = snapshot["results"]

    assert results["cohort_records"] == len(cases)
    assert results["design_success_records"] == sum(bool(case["candidates"]) for case in cases)
    assert results["candidate_pairs_screened"] == len(candidates)
    assert results["combined_computational_pass_pairs"] == sum(
        candidate["combined_computational_pass"] for candidate in candidates
    )
    assert results["records_with_at_least_one_combined_pass"] == sum(
        case["combined_pass_pairs"] > 0 for case in cases
    )
    assert results["transcript_gene_specific_pairs"] == sum(
        item["gene_specific"] for item in transcript
    )
    assert results["transcript_isoform_specific_pairs"] == sum(
        item["isoform_specific"] for item in transcript
    )
    assert results["pairs_with_one_target_transcript_product"] == sum(
        item["target_transcript_amplicon_count"] == 1 for item in transcript
    )
    assert results["pairs_amplifying_same_gene_isoform"] == sum(
        item["same_gene_isoform_amplicon_count"] > 0 for item in transcript
    )
    assert results["pairs_with_cross_gene_product"] == sum(
        item["other_gene_amplicon_count"] > 0 for item in transcript
    )
    assert results["pairs_with_unclassified_transcript_product"] == sum(
        item["unclassified_amplicon_count"] > 0 for item in transcript
    )
    assert results["pairs_with_no_transcript_product"] == sum(
        item["paired_amplicon_count"] == 0 for item in transcript
    )
    assert results["genome_specific_pairs"] == sum(item["specific"] for item in genome)
    assert results["no_contiguous_genomic_product_resolved_by_transcript_evidence"] == sum(
        candidate["combined_computational_pass"]
        and candidate["genome_pair_screen"]["paired_amplicon_count"] == 0
        for candidate in candidates
    )
    assert results["genome_status_counts"] == dict(
        sorted(Counter(item["status"] for item in genome).items())
    )
    assert results["transcript_status_counts"] == dict(
        sorted(Counter(item["status"] for item in transcript).items())
    )


def test_v0_6_is_explicitly_not_a_wet_lab_accuracy_claim():
    limitations = " ".join(_snapshot()["limitations"]).lower()
    assert "not sensitivity" in limitations
    assert "wet-lab success" in limitations
    assert "no primerbank experiment" in limitations
