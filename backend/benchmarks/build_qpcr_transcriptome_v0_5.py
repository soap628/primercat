"""Build the PrimerCat joint genome/transcriptome qPCR snapshot v0.5."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

import Bio


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPOSITORY_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import settings  # noqa: E402
from app.schemas.gene_primer import GenomePairValidation  # noqa: E402
from app.services.primer_transcriptome import (  # noqa: E402
    combined_computational_specificity_pass,
    validate_transcriptome_pairs_for_targets_batch,
)


SOURCE_SNAPSHOT = REPOSITORY_ROOT / "frontend" / "src" / "data" / "qpcr-genome-benchmark-v0.4.json"
DEFAULT_OUTPUT = REPOSITORY_ROOT / "frontend" / "src" / "data" / "qpcr-transcriptome-benchmark-v0.5.json"
SCREEN_BATCH_SIZE = 100


def _sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _sha256_json(value) -> str:
    return _sha256_bytes(json.dumps(value, sort_keys=True, separators=(",", ":")).encode())


def _configure_reference(manifest_path: Path) -> dict:
    manifest_bytes = manifest_path.read_bytes()
    manifest = json.loads(manifest_bytes)
    if manifest.get("species") != "mouse" or manifest.get("assembly_accession") != "GCF_000001635.27":
        raise RuntimeError("The v0.5 benchmark is pinned to mouse GRCm39 / GCF_000001635.27.")
    environment = manifest["environment"]
    settings.QPCR_TRANSCRIPT_LOCUS_DB_MOUSE = environment["QPCR_TRANSCRIPT_LOCUS_DB_MOUSE"]
    settings.QPCR_TRANSCRIPTOME_BOWTIE2_INDEX_MOUSE = environment["QPCR_TRANSCRIPTOME_BOWTIE2_INDEX_MOUSE"]
    settings.QPCR_TRANSCRIPTOME_FASTA_MOUSE = environment["QPCR_TRANSCRIPTOME_FASTA_MOUSE"]
    settings.GENOME_REFERENCE_ASSEMBLY_MOUSE = manifest["assembly_accession"]
    required = [
        Path(settings.QPCR_TRANSCRIPT_LOCUS_DB_MOUSE),
        Path(settings.QPCR_TRANSCRIPTOME_FASTA_MOUSE),
        *(Path(item["path"]) for item in manifest["bowtie2_transcriptome_index"]["files"]),
    ]
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise RuntimeError(f"Reference manifest points to missing transcriptome files: {missing}")
    return {
        "path": str(manifest_path.resolve()),
        "sha256": _sha256_bytes(manifest_bytes),
        "assembly_accession": manifest["assembly_accession"],
        "assembly_name": manifest["assembly_name"],
        "annotation_release": manifest["annotation_release"],
        "source": manifest["source"],
        "base_url": manifest["base_url"],
        "bowtie2_build_version": manifest["bowtie2_build_version"],
        "transcriptome_fasta_source_md5": manifest["files"]["transcriptome_fasta_gz"]["md5"],
        "transcriptome_fasta_sha256": manifest["expanded"]["transcriptome_fasta"]["sha256"],
        "transcript_locus_database_sha256": manifest["transcript_locus_database"]["sha256"],
    }


def build_snapshot(manifest_path: Path) -> dict:
    reference = _configure_reference(manifest_path)
    source_bytes = SOURCE_SNAPSHOT.read_bytes()
    source = json.loads(source_bytes)
    pairs = [
        (candidate["left"], candidate["right"])
        for case in source["cases"]
        for candidate in case["candidates"]
    ]
    targets = [
        case["target_transcript"]
        for case in source["cases"]
        for _candidate in case["candidates"]
    ]
    transcript_screens = []
    for offset in range(0, len(pairs), SCREEN_BATCH_SIZE):
        transcript_screens.extend(validate_transcriptome_pairs_for_targets_batch(
            pairs[offset:offset + SCREEN_BATCH_SIZE],
            "mouse",
            targets[offset:offset + SCREEN_BATCH_SIZE],
        ))
        print(f"screened {len(transcript_screens)}/{len(pairs)} candidate pairs", flush=True)
    if len(transcript_screens) != len(pairs):
        raise RuntimeError("Transcriptome screen returned an unexpected result count.")

    cases: list[dict] = []
    cursor = 0
    for source_case in source["cases"]:
        candidates = []
        for source_candidate in source_case["candidates"]:
            transcript_screen = transcript_screens[cursor]
            cursor += 1
            genome_screen = GenomePairValidation(**source_candidate["genome_pair_screen"])
            combined_pass = combined_computational_specificity_pass(genome_screen, transcript_screen)
            candidates.append({
                **source_candidate,
                "transcriptome_pair_screen": transcript_screen.model_dump(mode="json"),
                "combined_computational_pass": combined_pass,
            })
        cases.append({
            "primerbank_id": source_case["primerbank_id"],
            "gene": source_case["gene"],
            "target_transcript": source_case["target_transcript"],
            "candidate_pairs_screened": len(candidates),
            "combined_pass_pairs": sum(candidate["combined_computational_pass"] for candidate in candidates),
            "transcript_gene_specific_pairs": sum(candidate["transcriptome_pair_screen"]["gene_specific"] for candidate in candidates),
            "transcript_isoform_specific_pairs": sum(candidate["transcriptome_pair_screen"]["isoform_specific"] for candidate in candidates),
            "candidates": candidates,
        })

    candidates = [candidate for case in cases for candidate in case["candidates"]]
    transcript_screens_payload = [candidate["transcriptome_pair_screen"] for candidate in candidates]
    status_counts = Counter(screen["status"] for screen in transcript_screens_payload)
    results = {
        "source_records": len(cases),
        "candidate_pairs_screened": len(candidates),
        "records_with_at_least_one_combined_pass": sum(case["combined_pass_pairs"] > 0 for case in cases),
        "combined_computational_pass_pairs": sum(candidate["combined_computational_pass"] for candidate in candidates),
        "transcript_gene_specific_pairs": sum(screen["gene_specific"] for screen in transcript_screens_payload),
        "transcript_isoform_specific_pairs": sum(screen["isoform_specific"] for screen in transcript_screens_payload),
        "pairs_with_one_target_transcript_product": sum(screen["target_transcript_amplicon_count"] == 1 for screen in transcript_screens_payload),
        "pairs_amplifying_same_gene_isoform": sum(screen["same_gene_isoform_amplicon_count"] > 0 for screen in transcript_screens_payload),
        "pairs_with_cross_gene_product": sum(screen["other_gene_amplicon_count"] > 0 for screen in transcript_screens_payload),
        "pairs_with_unclassified_transcript_product": sum(screen["unclassified_amplicon_count"] > 0 for screen in transcript_screens_payload),
        "pairs_with_no_transcript_product": sum(screen["paired_amplicon_count"] == 0 for screen in transcript_screens_payload),
        "transcript_hit_cap_reached_pairs": sum(screen["hit_limit_reached"] for screen in transcript_screens_payload),
        "no_contiguous_genomic_product_rescued_by_transcript_evidence": sum(
            candidate["combined_computational_pass"]
            and candidate["genome_pair_screen"]["paired_amplicon_count"] == 0
            for candidate in candidates
        ),
        "v0_4_genome_pass_rejected_by_transcript_evidence": sum(
            candidate["genome_pair_screen"]["specific"]
            and not candidate["combined_computational_pass"]
            for candidate in candidates
        ),
        "transcript_status_counts": dict(sorted(status_counts.items())),
    }
    source_files = [
        "backend/app/services/primer_transcriptome.py",
        "backend/app/services/primer_bowtie2.py",
        "backend/app/services/qpcr_target_locus.py",
        "backend/app/services/gene_primer_service.py",
        "backend/app/services/primer_scoring.py",
        "backend/benchmarks/build_qpcr_transcriptome_v0_5.py",
    ]
    snapshot = {
        "schema_version": "5.0",
        "benchmark_id": "qpcr-primerbank-mouse-transcriptome-v0.5",
        "snapshot_date": "2026-09-02",
        "scope": "Joint fixed-GRCm39 genomic and accessioned RefSeq RNA paired-amplicon screen",
        "source_benchmark": {
            "benchmark_id": source["benchmark_id"],
            "file_sha256": _sha256_bytes(source_bytes),
            "case_payload_sha256": source["case_payload_sha256"],
        },
        "reference": reference,
        "runtime": {
            "biopython": Bio.__version__,
            "max_transcript_alignments_per_primer": settings.QPCR_TRANSCRIPTOME_MAX_ALIGNMENTS_PER_PRIMER,
            "transcript_amplicon_size_range_bp": [
                settings.QPCR_TRANSCRIPTOME_MIN_AMPLICON_BP,
                settings.QPCR_TRANSCRIPTOME_MAX_AMPLICON_BP,
            ],
            "max_mismatches_per_primer": 2,
            "source_code_sha256": {
                path: _sha256_bytes((REPOSITORY_ROOT / path).read_bytes()) for path in source_files
            },
        },
        "decision_rule": (
            "A gene-level joint pass requires exactly one product on the selected RefSeq transcript, "
            "no product assigned to another gene or an unclassified transcript, no transcript hit-cap "
            "truncation, and a compatible genomic result: either exactly one target-locus product with "
            "no additional genomic product, or no contiguous genomic product at all. Same-gene isoform "
            "products are reported separately and prevent only the isoform-specific flag."
        ),
        "limitations": [
            "The fixed RNA FASTA contains accessioned products annotated on this assembly release; it is not a sample-specific expressed transcriptome.",
            "Gene-level and isoform-level conclusions depend on the fixed RefSeq annotation and may change with another release.",
            "The reference does not represent sample-specific variants, structural variation, or unannotated transcripts.",
            "A computational pass does not establish qPCR efficiency, linearity, sensitivity, or a single wet-lab product.",
        ],
        "results": results,
        "cases": cases,
    }
    snapshot["case_payload_sha256"] = _sha256_json(cases)
    return snapshot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    snapshot = build_snapshot(args.manifest)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(args.output), "results": snapshot["results"]}, indent=2))


if __name__ == "__main__":
    main()
