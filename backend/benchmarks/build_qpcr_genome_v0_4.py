"""Build the PrimerCat qPCR fixed-genome paired-amplicon snapshot v0.4."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import Counter
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
from app.services.ncbi_fetch import ExonInfo  # noqa: E402
from app.services.primer_bowtie2 import validate_primer_pairs_for_targets_batch  # noqa: E402
from app.services.primer_scoring import detect_exon_span  # noqa: E402


SOURCE_SNAPSHOT = (
    REPOSITORY_ROOT / "frontend" / "src" / "data" / "qpcr-pipeline-benchmark-v0.3.json"
)
DEFAULT_OUTPUT = (
    REPOSITORY_ROOT / "frontend" / "src" / "data" / "qpcr-genome-benchmark-v0.4.json"
)
PAIRS_PER_RECORD = 10
SCREEN_BATCH_SIZE = 100


def _sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _sha256_json(value) -> str:
    return _sha256_bytes(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    )


def _configure_reference(manifest_path: Path) -> dict:
    manifest_bytes = manifest_path.read_bytes()
    manifest = json.loads(manifest_bytes)
    if manifest.get("species") != "mouse":
        raise RuntimeError("The v0.4 benchmark requires a mouse reference manifest.")
    if manifest.get("assembly_accession") != "GCF_000001635.27":
        raise RuntimeError("The v0.4 benchmark is pinned to mouse GRCm39 / GCF_000001635.27.")

    environment = manifest["environment"]
    settings.GRNA_BOWTIE2_INDEX_MOUSE = environment["GRNA_BOWTIE2_INDEX_MOUSE"]
    settings.GRNA_GENOME_FASTA_MOUSE = environment["GRNA_GENOME_FASTA_MOUSE"]
    settings.GRNA_ANNOTATION_GTF_MOUSE = environment["GRNA_ANNOTATION_GTF_MOUSE"]
    settings.QPCR_TRANSCRIPT_LOCUS_DB_MOUSE = environment["QPCR_TRANSCRIPT_LOCUS_DB_MOUSE"]
    settings.GENOME_REFERENCE_ASSEMBLY_MOUSE = manifest["assembly_accession"]

    required = [
        Path(settings.GRNA_GENOME_FASTA_MOUSE),
        Path(settings.GRNA_ANNOTATION_GTF_MOUSE),
        Path(settings.QPCR_TRANSCRIPT_LOCUS_DB_MOUSE),
    ]
    required.extend(Path(item["path"]) for item in manifest["bowtie2_index"]["files"])
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise RuntimeError(f"Reference manifest points to missing files: {missing}")

    return {
        "path": str(manifest_path.resolve()),
        "sha256": _sha256_bytes(manifest_bytes),
        "assembly_accession": manifest["assembly_accession"],
        "assembly_name": manifest["assembly_name"],
        "annotation_release": manifest["annotation_release"],
        "source": manifest["source"],
        "base_url": manifest["base_url"],
        "bowtie2_build_version": manifest["bowtie2_build_version"],
        "genome_fasta_sha256": manifest["expanded"]["genome_fasta"]["sha256"],
        "annotation_gtf_sha256": manifest["expanded"]["annotation_gtf"]["sha256"],
        "transcript_locus_database_sha256": manifest["transcript_locus_database"]["sha256"],
    }


def build_snapshot(manifest_path: Path) -> dict:
    reference = _configure_reference(manifest_path)
    source_bytes = SOURCE_SNAPSHOT.read_bytes()
    source = json.loads(source_bytes)

    all_pairs: list[tuple[str, str]] = []
    targets: list[str] = []
    pair_metadata: list[dict] = []
    case_candidates: list[list[dict]] = []
    for case_index, case in enumerate(source["cases"]):
        candidates = sorted(
            _design_primers(case["template_sequence"], DEFAULT_NUM_CANDIDATES),
            key=lambda candidate: candidate["penalty"],
        )[:PAIRS_PER_RECORD]
        serialized: list[dict] = []
        exons = [ExonInfo(**exon) for exon in case["exons"]]
        for candidate_index, candidate in enumerate(candidates):
            exon_span = detect_exon_span(
                candidate["left_props"].pos,
                candidate["left_props"].length,
                candidate["right_props"].pos,
                candidate["right_props"].length,
                exons,
            )
            all_pairs.append((candidate["left"], candidate["right"]))
            targets.append(case["selected_refseq_accession"])
            pair_metadata.append({
                "case_index": case_index,
                "candidate_rank": candidate_index + 1,
            })
            serialized.append({
                "rank": candidate_index + 1,
                "left": candidate["left"],
                "right": candidate["right"],
                "transcript_product_size_bp": candidate["product_size"],
                "primer3_penalty": candidate["penalty"],
                "exon_span": exon_span.model_dump(mode="json"),
            })
        case_candidates.append(serialized)

    screens = []
    for offset in range(0, len(all_pairs), SCREEN_BATCH_SIZE):
        batch_pairs = all_pairs[offset:offset + SCREEN_BATCH_SIZE]
        batch_targets = targets[offset:offset + SCREEN_BATCH_SIZE]
        screens.extend(
            validate_primer_pairs_for_targets_batch(batch_pairs, "mouse", batch_targets)
        )
        print(f"screened {len(screens)}/{len(all_pairs)} candidate pairs", flush=True)
    if len(screens) != len(all_pairs):
        raise RuntimeError("Paired-genome screen returned an unexpected result count.")

    by_case: list[list] = [[] for _ in source["cases"]]
    for metadata, screen in zip(pair_metadata, screens):
        by_case[metadata["case_index"]].append(screen)

    cases: list[dict] = []
    for index, source_case in enumerate(source["cases"]):
        candidate_payloads: list[dict] = []
        for candidate, screen in zip(case_candidates[index], by_case[index]):
            candidate_payloads.append({
                **candidate,
                "genome_pair_screen": screen.pair.model_dump(mode="json"),
            })
        statuses = Counter(item["genome_pair_screen"]["status"] for item in candidate_payloads)
        cases.append({
            "primerbank_id": source_case["primerbank_id"],
            "gene": source_case["gene"],
            "target_transcript": source_case["selected_refseq_accession"],
            "candidate_pairs_screened": len(candidate_payloads),
            "target_locus_anchored_pairs": sum(
                bool(item["genome_pair_screen"]["target_locus_accession"])
                for item in candidate_payloads
            ),
            "specific_pairs": sum(
                item["genome_pair_screen"]["specific"] for item in candidate_payloads
            ),
            "status_counts": dict(sorted(statuses.items())),
            "candidates": candidate_payloads,
        })

    pair_screens = [
        candidate["genome_pair_screen"]
        for case in cases
        for candidate in case["candidates"]
    ]
    status_counts = Counter(screen["status"] for screen in pair_screens)
    results = {
        "source_records": len(cases),
        "candidate_pairs_screened": len(pair_screens),
        "records_with_at_least_one_specific_pair": sum(case["specific_pairs"] > 0 for case in cases),
        "specific_pairs": sum(screen["specific"] for screen in pair_screens),
        "target_locus_anchored_pairs": sum(bool(screen["target_locus_accession"]) for screen in pair_screens),
        "pairs_with_one_target_amplicon": sum(screen["target_amplicon_count"] == 1 for screen in pair_screens),
        "pairs_with_additional_amplicon": sum(screen["off_target_amplicon_count"] > 0 for screen in pair_screens),
        "pairs_with_unclassified_amplicon": sum(screen["unclassified_amplicon_count"] > 0 for screen in pair_screens),
        "pairs_with_no_genomic_amplicon": sum(screen["paired_amplicon_count"] == 0 for screen in pair_screens),
        "truncated_pairs": sum(screen["hit_limit_reached"] for screen in pair_screens),
        "status_counts": dict(sorted(status_counts.items())),
    }
    source_files = [
        "backend/app/services/primer_bowtie2.py",
        "backend/app/services/qpcr_target_locus.py",
        "backend/app/services/gene_primer_service.py",
        "backend/app/services/primer_scoring.py",
        "backend/benchmarks/build_qpcr_genome_v0_4.py",
    ]
    snapshot = {
        "schema_version": "4.0",
        "benchmark_id": "qpcr-primerbank-mouse-genome-v0.4",
        "snapshot_date": "2026-09-02",
        "scope": "Version-pinned GRCm39 Bowtie2 paired-amplicon screen with RefSeq GTF target-locus anchoring",
        "source_benchmark": {
            "benchmark_id": source["benchmark_id"],
            "file_sha256": _sha256_bytes(source_bytes),
            "case_payload_sha256": source["case_payload_sha256"],
        },
        "reference": reference,
        "runtime": {
            "primer3_py": primer3.__version__,
            "biopython": Bio.__version__,
            "primer3_settings_sha256": _sha256_json(PRIMER3_SETTINGS),
            "max_alignments_per_primer": settings.QPCR_GENOME_MAX_ALIGNMENTS_PER_PRIMER,
            "amplicon_size_range_bp": [
                settings.QPCR_GENOME_MIN_AMPLICON_BP,
                settings.QPCR_GENOME_MAX_AMPLICON_BP,
            ],
            "max_mismatches_per_primer": 2,
            "source_code_sha256": {
                path: _sha256_bytes((REPOSITORY_ROOT / path).read_bytes())
                for path in source_files
            },
        },
        "decision_rule": (
            "A pair passes only when exactly one opposing 50–5000 bp product falls entirely "
            "inside the selected RefSeq transcript locus, no additional paired genomic product "
            "is found, and neither primer reaches the 64-alignment decision limit."
        ),
        "limitations": [
            "This genome screen does not test transcript-isoform specificity.",
            "The reference assembly does not represent sample-specific variants or structural variation.",
            "A computational pass does not establish qPCR efficiency, linearity, sensitivity, or a single wet-lab product.",
            "Junction-spanning cDNA primers may have no contiguous genomic alignment and therefore cannot receive a target-genomic-product pass under this rule.",
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
    args.output.write_text(
        json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"output": str(args.output), "results": snapshot["results"]}, indent=2))


if __name__ == "__main__":
    main()
