"""Build an expanded, deterministic fixed-reference qPCR screen.

This benchmark deliberately measures computational coverage, not wet-lab
accuracy. It samples one accessioned NM_ transcript per mouse gene from the
version-pinned RefSeq RNA FASTA, generates ten Primer3 candidates per record,
and applies the same paired genome/transcriptome rules used by the product.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import sys
from collections import Counter
from pathlib import Path

import Bio
import primer3
from Bio import SeqIO


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
from app.services.primer_bowtie2 import validate_primer_pairs_for_targets_batch  # noqa: E402
from app.services.primer_transcriptome import (  # noqa: E402
    combined_computational_specificity_pass,
    validate_transcriptome_pairs_for_targets_batch,
)


DEFAULT_OUTPUT = (
    REPOSITORY_ROOT
    / "frontend"
    / "src"
    / "data"
    / "qpcr-reference-cohort-mouse-v0.6.json"
)
SAMPLE_SEED = "primercat-fixed-refseq-mouse-v0.6"
COHORT_SIZE = 200
PAIRS_PER_RECORD = 10
SCREEN_BATCH_SIZE = 500
MIN_TRANSCRIPT_BP = 250
MAX_TRANSCRIPT_BP = 5_000


def _sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _sha256_json(value) -> str:
    return _sha256_bytes(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    )


def _configure_reference(manifest_path: Path) -> tuple[dict, Path, Path]:
    manifest_bytes = manifest_path.read_bytes()
    manifest = json.loads(manifest_bytes)
    if manifest.get("species") != "mouse":
        raise RuntimeError("The v0.6 cohort requires a mouse reference manifest.")
    if manifest.get("assembly_accession") != "GCF_000001635.27":
        raise RuntimeError("The v0.6 cohort is pinned to GRCm39 / GCF_000001635.27.")

    environment = manifest["environment"]
    settings.GRNA_BOWTIE2_INDEX_MOUSE = environment["GRNA_BOWTIE2_INDEX_MOUSE"]
    settings.GRNA_GENOME_FASTA_MOUSE = environment["GRNA_GENOME_FASTA_MOUSE"]
    settings.GRNA_ANNOTATION_GTF_MOUSE = environment["GRNA_ANNOTATION_GTF_MOUSE"]
    settings.QPCR_TRANSCRIPT_LOCUS_DB_MOUSE = environment["QPCR_TRANSCRIPT_LOCUS_DB_MOUSE"]
    settings.QPCR_TRANSCRIPTOME_BOWTIE2_INDEX_MOUSE = environment[
        "QPCR_TRANSCRIPTOME_BOWTIE2_INDEX_MOUSE"
    ]
    settings.QPCR_TRANSCRIPTOME_FASTA_MOUSE = environment[
        "QPCR_TRANSCRIPTOME_FASTA_MOUSE"
    ]
    settings.GENOME_REFERENCE_ASSEMBLY_MOUSE = manifest["assembly_accession"]

    transcriptome_fasta = Path(settings.QPCR_TRANSCRIPTOME_FASTA_MOUSE)
    locus_db = Path(settings.QPCR_TRANSCRIPT_LOCUS_DB_MOUSE)
    required = [
        Path(settings.GRNA_GENOME_FASTA_MOUSE),
        Path(settings.GRNA_ANNOTATION_GTF_MOUSE),
        transcriptome_fasta,
        locus_db,
        *(Path(item["path"]) for item in manifest["bowtie2_index"]["files"]),
        *(Path(item["path"]) for item in manifest["bowtie2_transcriptome_index"]["files"]),
    ]
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise RuntimeError(f"Reference manifest points to missing files: {missing}")

    reference = {
        "manifest_sha256": _sha256_bytes(manifest_bytes),
        "assembly_accession": manifest["assembly_accession"],
        "assembly_name": manifest["assembly_name"],
        "annotation_release": manifest["annotation_release"],
        "source": manifest["source"],
        "base_url": manifest["base_url"],
        "genome_fasta_sha256": manifest["expanded"]["genome_fasta"]["sha256"],
        "transcriptome_fasta_sha256": manifest["expanded"]["transcriptome_fasta"]["sha256"],
        "transcript_locus_database_sha256": manifest["transcript_locus_database"]["sha256"],
        "bowtie2_build_version": manifest["bowtie2_build_version"],
    }
    return reference, transcriptome_fasta, locus_db


def _locus_metadata(locus_db: Path) -> dict[str, tuple[str, str]]:
    metadata: dict[str, tuple[str, str]] = {}
    with sqlite3.connect(locus_db) as connection:
        rows = connection.execute(
            "SELECT transcript_id, gene_id, gene_name FROM transcript_loci "
            "ORDER BY transcript_id, accession"
        )
        for transcript_id, gene_id, gene_name in rows:
            metadata.setdefault(transcript_id, (gene_id, gene_name))
    return metadata


def _select_cohort(
    transcriptome_fasta: Path,
    locus_db: Path,
    cohort_size: int,
) -> list[dict]:
    loci = _locus_metadata(locus_db)
    eligible: list[tuple[str, str, str, str, str, int]] = []
    for record in SeqIO.parse(transcriptome_fasta, "fasta"):
        accession = record.id
        if not accession.startswith("NM_") or accession not in loci:
            continue
        sequence = str(record.seq).upper()
        if not MIN_TRANSCRIPT_BP <= len(sequence) <= MAX_TRANSCRIPT_BP:
            continue
        if set(sequence) - set("ACGT"):
            continue
        gene_id, gene_name = loci[accession]
        gene_key = gene_id or gene_name
        if not gene_key:
            continue
        sample_hash = _sha256_bytes(f"{SAMPLE_SEED}:{accession}".encode())
        eligible.append((sample_hash, accession, gene_key, gene_id, gene_name, len(sequence)))

    selected_metadata: list[tuple[str, str, str, str, str, int]] = []
    seen_genes: set[str] = set()
    for item in sorted(eligible):
        gene_key = item[2]
        if gene_key in seen_genes:
            continue
        selected_metadata.append(item)
        seen_genes.add(gene_key)
        if len(selected_metadata) == cohort_size:
            break
    if len(selected_metadata) != cohort_size:
        raise RuntimeError(
            f"Only {len(selected_metadata)} eligible one-transcript-per-gene records were available"
        )

    selected_ids = {item[1] for item in selected_metadata}
    sequences = {
        record.id: str(record.seq).upper()
        for record in SeqIO.parse(transcriptome_fasta, "fasta")
        if record.id in selected_ids
    }
    cohort = []
    for sample_hash, accession, _gene_key, gene_id, gene_name, length in selected_metadata:
        sequence = sequences.get(accession)
        if sequence is None:
            raise RuntimeError(f"Selected transcript disappeared during second FASTA pass: {accession}")
        cohort.append({
            "sample_hash": sample_hash,
            "target_transcript": accession,
            "gene_id": gene_id,
            "gene_name": gene_name,
            "sequence_length_bp": length,
            "sequence_sha256": _sha256_bytes(sequence.encode()),
            "sequence": sequence,
        })
    return cohort


def build_snapshot(manifest_path: Path, cohort_size: int = COHORT_SIZE) -> dict:
    reference, transcriptome_fasta, locus_db = _configure_reference(manifest_path)
    cohort = _select_cohort(transcriptome_fasta, locus_db, cohort_size)

    all_pairs: list[tuple[str, str]] = []
    all_targets: list[str] = []
    pair_locations: list[tuple[int, int]] = []
    case_candidates: list[list[dict]] = []
    for case_index, case in enumerate(cohort):
        candidates = sorted(
            _design_primers(case["sequence"], DEFAULT_NUM_CANDIDATES),
            key=lambda candidate: candidate["penalty"],
        )[:PAIRS_PER_RECORD]
        serialized = []
        for candidate_index, candidate in enumerate(candidates):
            all_pairs.append((candidate["left"], candidate["right"]))
            all_targets.append(case["target_transcript"])
            pair_locations.append((case_index, candidate_index))
            serialized.append({
                "rank": candidate_index + 1,
                "left": candidate["left"],
                "right": candidate["right"],
                "product_size_bp": candidate["product_size"],
                "primer3_penalty": candidate["penalty"],
            })
        case_candidates.append(serialized)

    genome_screens = []
    transcript_screens = []
    for offset in range(0, len(all_pairs), SCREEN_BATCH_SIZE):
        pairs = all_pairs[offset:offset + SCREEN_BATCH_SIZE]
        targets = all_targets[offset:offset + SCREEN_BATCH_SIZE]
        genome_screens.extend(
            validate_primer_pairs_for_targets_batch(pairs, "mouse", targets)
        )
        transcript_screens.extend(
            validate_transcriptome_pairs_for_targets_batch(pairs, "mouse", targets)
        )
        print(f"screened {len(genome_screens)}/{len(all_pairs)} candidate pairs", flush=True)
    if len(genome_screens) != len(all_pairs) or len(transcript_screens) != len(all_pairs):
        raise RuntimeError("A paired screen returned an unexpected result count.")

    for index, (case_index, candidate_index) in enumerate(pair_locations):
        genome = genome_screens[index].pair
        transcript = transcript_screens[index]
        case_candidates[case_index][candidate_index].update({
            "genome_pair_screen": genome.model_dump(mode="json"),
            "transcriptome_pair_screen": transcript.model_dump(mode="json"),
            "combined_computational_pass": combined_computational_specificity_pass(
                genome, transcript
            ),
        })

    cases = []
    for source, candidates in zip(cohort, case_candidates):
        cases.append({
            "sample_hash": source["sample_hash"],
            "target_transcript": source["target_transcript"],
            "gene_id": source["gene_id"],
            "gene_name": source["gene_name"],
            "sequence_length_bp": source["sequence_length_bp"],
            "sequence_sha256": source["sequence_sha256"],
            "candidate_pairs_screened": len(candidates),
            "combined_pass_pairs": sum(
                candidate["combined_computational_pass"] for candidate in candidates
            ),
            "candidates": candidates,
        })

    candidates = [candidate for case in cases for candidate in case["candidates"]]
    transcript_payloads = [candidate["transcriptome_pair_screen"] for candidate in candidates]
    genome_payloads = [candidate["genome_pair_screen"] for candidate in candidates]
    transcript_statuses = Counter(item["status"] for item in transcript_payloads)
    genome_statuses = Counter(item["status"] for item in genome_payloads)
    results = {
        "cohort_records": len(cases),
        "design_success_records": sum(bool(case["candidates"]) for case in cases),
        "candidate_pairs_screened": len(candidates),
        "combined_computational_pass_pairs": sum(
            candidate["combined_computational_pass"] for candidate in candidates
        ),
        "records_with_at_least_one_combined_pass": sum(
            case["combined_pass_pairs"] > 0 for case in cases
        ),
        "transcript_gene_specific_pairs": sum(item["gene_specific"] for item in transcript_payloads),
        "transcript_isoform_specific_pairs": sum(item["isoform_specific"] for item in transcript_payloads),
        "pairs_with_one_target_transcript_product": sum(
            item["target_transcript_amplicon_count"] == 1
            for item in transcript_payloads
        ),
        "pairs_amplifying_same_gene_isoform": sum(
            item["same_gene_isoform_amplicon_count"] > 0
            for item in transcript_payloads
        ),
        "pairs_with_cross_gene_product": sum(
            item["other_gene_amplicon_count"] > 0
            for item in transcript_payloads
        ),
        "pairs_with_unclassified_transcript_product": sum(
            item["unclassified_amplicon_count"] > 0
            for item in transcript_payloads
        ),
        "pairs_with_no_transcript_product": sum(
            item["paired_amplicon_count"] == 0
            for item in transcript_payloads
        ),
        "genome_specific_pairs": sum(item["specific"] for item in genome_payloads),
        "no_contiguous_genomic_product_resolved_by_transcript_evidence": sum(
            candidate["combined_computational_pass"]
            and candidate["genome_pair_screen"]["paired_amplicon_count"] == 0
            for candidate in candidates
        ),
        "genome_hit_cap_reached_pairs": sum(item["hit_limit_reached"] for item in genome_payloads),
        "transcript_hit_cap_reached_pairs": sum(item["hit_limit_reached"] for item in transcript_payloads),
        "genome_status_counts": dict(sorted(genome_statuses.items())),
        "transcript_status_counts": dict(sorted(transcript_statuses.items())),
    }
    source_files = [
        "backend/app/services/gene_primer_service.py",
        "backend/app/services/primer_bowtie2.py",
        "backend/app/services/primer_transcriptome.py",
        "backend/app/services/qpcr_target_locus.py",
        "backend/benchmarks/build_qpcr_reference_cohort_v0_6.py",
    ]
    snapshot = {
        "schema_version": "6.0",
        "benchmark_id": "qpcr-fixed-refseq-mouse-cohort-v0.6",
        "snapshot_date": "2026-09-03",
        "scope": "Deterministic 200-gene fixed-GRCm39 genome and matched RefSeq RNA paired-amplicon screen",
        "reference": reference,
        "sampling": {
            "frame": "Accessioned NM_ transcripts in the pinned RefSeq RNA FASTA with a pinned GTF locus, unambiguous A/C/G/T sequence, and length 250-5000 bp",
            "method": "Rank SHA-256(seed:accession), retain the first accession per gene, then take the first 200 genes",
            "seed": SAMPLE_SEED,
            "requested_records": cohort_size,
            "selected_records": len(cases),
            "one_transcript_per_gene": True,
        },
        "runtime": {
            "primer3_py": primer3.__version__,
            "biopython": Bio.__version__,
            "primer3_settings_sha256": _sha256_json(PRIMER3_SETTINGS),
            "candidate_pairs_per_record": PAIRS_PER_RECORD,
            "screen_batch_size": SCREEN_BATCH_SIZE,
            "genome_max_alignments_per_primer": settings.QPCR_GENOME_MAX_ALIGNMENTS_PER_PRIMER,
            "transcriptome_max_alignments_per_primer": settings.QPCR_TRANSCRIPTOME_MAX_ALIGNMENTS_PER_PRIMER,
            "max_mismatches_per_primer": 2,
            "source_code_sha256": {
                path: _sha256_bytes((REPOSITORY_ROOT / path).read_bytes())
                for path in source_files
            },
        },
        "decision_rule": (
            "A gene-level pass requires exactly one product on the selected RefSeq transcript, "
            "no product assigned to another gene or an unclassified transcript, no hit-cap "
            "truncation, and a compatible genomic result: either one target-locus product with "
            "no additional product or no contiguous genomic product."
        ),
        "limitations": [
            "This is a deterministic reference-sequence cohort, not a random sample of genes, patients, tissues, or experiments.",
            "It measures pipeline coverage and fixed-reference screening outcomes, not sensitivity, specificity, accuracy, or wet-lab success.",
            "The cohort contains one accessioned transcript per gene and therefore does not represent transcript abundance or biological prevalence.",
            "The fixed references omit sample-specific variants, structural variation, unannotated transcripts, and reaction chemistry.",
            "No PrimerBank experiment or other published wet-lab record validates the newly generated PrimerCat candidates in this cohort.",
        ],
        "results": results,
        "cases": cases,
    }
    snapshot["case_payload_sha256"] = _sha256_json(cases)
    return snapshot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--cohort-size", type=int, default=COHORT_SIZE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    snapshot = build_snapshot(args.manifest, args.cohort_size)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"output": str(args.output), "results": snapshot["results"]}, indent=2))


if __name__ == "__main__":
    main()
