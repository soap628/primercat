import hashlib
import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_PATH = ROOT / "frontend" / "src" / "data" / "qpcr-transcriptome-benchmark-v0.5.json"
SOURCE_PATH = ROOT / "frontend" / "src" / "data" / "qpcr-genome-benchmark-v0.4.json"


def _sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _sha256_json(value) -> str:
    return _sha256_bytes(json.dumps(value, sort_keys=True, separators=(",", ":")).encode())


def test_v0_5_snapshot_is_bound_to_frozen_v0_4_source_and_code():
    snapshot = json.loads(SNAPSHOT_PATH.read_text())
    source = json.loads(SOURCE_PATH.read_text())
    assert snapshot["schema_version"] == "5.0"
    assert snapshot["source_benchmark"]["benchmark_id"] == source["benchmark_id"]
    assert snapshot["source_benchmark"]["file_sha256"] == _sha256_bytes(SOURCE_PATH.read_bytes())
    assert snapshot["source_benchmark"]["case_payload_sha256"] == source["case_payload_sha256"]
    assert snapshot["case_payload_sha256"] == _sha256_json(snapshot["cases"])
    for relative_path, expected in snapshot["runtime"]["source_code_sha256"].items():
        assert _sha256_bytes((ROOT / relative_path).read_bytes()) == expected


def test_v0_5_summary_is_recomputable_from_candidate_payloads():
    snapshot = json.loads(SNAPSHOT_PATH.read_text())
    candidates = [candidate for case in snapshot["cases"] for candidate in case["candidates"]]
    screens = [candidate["transcriptome_pair_screen"] for candidate in candidates]
    results = snapshot["results"]
    assert results["source_records"] == len(snapshot["cases"]) == 100
    assert results["candidate_pairs_screened"] == len(candidates) == 1000
    assert results["combined_computational_pass_pairs"] == sum(candidate["combined_computational_pass"] for candidate in candidates)
    assert results["records_with_at_least_one_combined_pass"] == sum(case["combined_pass_pairs"] > 0 for case in snapshot["cases"])
    assert results["transcript_gene_specific_pairs"] == sum(screen["gene_specific"] for screen in screens)
    assert results["transcript_isoform_specific_pairs"] == sum(screen["isoform_specific"] for screen in screens)
    assert results["pairs_amplifying_same_gene_isoform"] == sum(screen["same_gene_isoform_amplicon_count"] > 0 for screen in screens)
    assert results["pairs_with_cross_gene_product"] == sum(screen["other_gene_amplicon_count"] > 0 for screen in screens)
    assert results["transcript_status_counts"] == dict(sorted(Counter(screen["status"] for screen in screens).items()))


def test_v0_5_pass_rule_and_class_counts_are_consistent():
    snapshot = json.loads(SNAPSHOT_PATH.read_text())
    for case in snapshot["cases"]:
        assert case["combined_pass_pairs"] == sum(candidate["combined_computational_pass"] for candidate in case["candidates"])
        for candidate in case["candidates"]:
            genome = candidate["genome_pair_screen"]
            transcript = candidate["transcriptome_pair_screen"]
            class_counts = Counter(hit["classification"] for hit in transcript["top_amplicons"])
            if transcript["paired_amplicon_count"] <= len(transcript["top_amplicons"]):
                assert transcript["target_transcript_amplicon_count"] == class_counts["target_transcript"]
                assert transcript["same_gene_isoform_amplicon_count"] == class_counts["same_gene_isoform"]
                assert transcript["other_gene_amplicon_count"] == class_counts["other_gene"]
                assert transcript["unclassified_amplicon_count"] == class_counts["unclassified"]
            genome_compatible = (
                genome["checked"]
                and bool(genome["target_locus_accession"])
                and not genome["hit_limit_reached"]
                and genome["off_target_amplicon_count"] == 0
                and genome["unclassified_amplicon_count"] == 0
                and (
                    (genome["target_amplicon_count"] == 1 and genome["paired_amplicon_count"] == 1)
                    or genome["paired_amplicon_count"] == 0
                )
            )
            assert candidate["combined_computational_pass"] == (
                genome_compatible and transcript["checked"] and transcript["gene_specific"]
            )
