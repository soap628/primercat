import hashlib
import json
from collections import Counter
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
DATASET_PATH = (
    REPOSITORY_ROOT / "frontend" / "src" / "data" / "qpcr-genome-benchmark-v0.4.json"
)
SOURCE_PATH = (
    REPOSITORY_ROOT / "frontend" / "src" / "data" / "qpcr-pipeline-benchmark-v0.3.json"
)


def _sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _sha256_json(value) -> str:
    return _sha256_bytes(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    )


def test_v0_4_snapshot_is_versioned_and_records_historical_screen_code():
    benchmark = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    source = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))

    assert benchmark["schema_version"] == "4.0"
    assert benchmark["benchmark_id"] == "qpcr-primerbank-mouse-genome-v0.4"
    assert benchmark["source_benchmark"]["benchmark_id"] == source["benchmark_id"]
    assert benchmark["source_benchmark"]["file_sha256"] == _sha256_bytes(SOURCE_PATH.read_bytes())
    assert benchmark["source_benchmark"]["case_payload_sha256"] == source["case_payload_sha256"]
    assert benchmark["case_payload_sha256"] == _sha256_json(benchmark["cases"])
    assert benchmark["reference"]["assembly_accession"] == "GCF_000001635.27"
    assert benchmark["reference"]["assembly_name"] == "GRCm39"
    assert benchmark["reference"]["annotation_release"] == "GCF_000001635.27-RS_2024_02"
    assert benchmark["reference"]["source"] == "NCBI RefSeq"

    for relative_path, historical_hash in benchmark["runtime"]["source_code_sha256"].items():
        assert (REPOSITORY_ROOT / relative_path).exists()
        assert len(historical_hash) == 64
        int(historical_hash, 16)


def test_v0_4_pair_decisions_and_summary_are_self_consistent():
    benchmark = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    cases = benchmark["cases"]
    screens = [
        candidate["genome_pair_screen"]
        for case in cases
        for candidate in case["candidates"]
    ]
    results = benchmark["results"]

    assert len(cases) == results["source_records"] == 100
    assert all(case["candidate_pairs_screened"] == len(case["candidates"]) == 10 for case in cases)
    assert len(screens) == results["candidate_pairs_screened"] == 1000
    assert results["target_locus_anchored_pairs"] == sum(bool(screen["target_locus_accession"]) for screen in screens)
    assert results["pairs_with_one_target_amplicon"] == sum(screen["target_amplicon_count"] == 1 for screen in screens)
    assert results["pairs_with_additional_amplicon"] == sum(screen["off_target_amplicon_count"] > 0 for screen in screens)
    assert results["pairs_with_unclassified_amplicon"] == sum(screen["unclassified_amplicon_count"] > 0 for screen in screens)
    assert results["pairs_with_no_genomic_amplicon"] == sum(screen["paired_amplicon_count"] == 0 for screen in screens)
    assert results["truncated_pairs"] == sum(screen["hit_limit_reached"] for screen in screens)
    assert results["specific_pairs"] == sum(screen["specific"] for screen in screens)
    assert results["records_with_at_least_one_specific_pair"] == sum(
        case["specific_pairs"] > 0 for case in cases
    )
    assert results["status_counts"] == dict(sorted(Counter(screen["status"] for screen in screens).items()))

    for screen in screens:
        assert screen["engine"] == "bowtie2_paired_amplicon"
        assert screen["reference_assembly"] == "GCF_000001635.27"
        assert screen["min_amplicon_size"] == 50
        assert screen["max_amplicon_size"] == 5000
        assert screen["paired_amplicon_count"] == sum((
            screen["target_amplicon_count"],
            screen["off_target_amplicon_count"],
            screen["unclassified_amplicon_count"],
        ))
        if screen["specific"]:
            assert screen["status"] == "validated"
            assert screen["target_locus_accession"]
            assert screen["target_amplicon_count"] == 1
            assert screen["off_target_amplicon_count"] == 0
            assert screen["hit_limit_reached"] is False
        if screen["hit_limit_reached"]:
            assert screen["specific"] is False
            assert screen["status"] == "truncated"
