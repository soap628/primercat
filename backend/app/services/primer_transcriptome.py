"""Version-pinned transcriptome screening for qPCR primer pairs.

Both primers are aligned to accessioned RefSeq RNA products. Opposing hits on
the same transcript are joined into candidate amplicons, then classified as
the selected transcript, another isoform of the selected gene, another gene,
or unclassified. The screen reports gene-level and isoform-level conclusions
separately; it does not treat either as experimental validation.
"""

from __future__ import annotations

import shutil
import subprocess
import tempfile
from hashlib import sha1
from pathlib import Path

from app.core.config import settings
from app.schemas.gene_primer import (
    GenomePairValidation,
    TranscriptAmpliconClass,
    TranscriptAmpliconHit,
    TranscriptomePairScreenStatus,
    TranscriptomePairValidation,
)
from app.services.grna_genome_offtarget import _bowtie_index_exists
from app.services.ncbi_client import cached_call
from app.services.primer_bowtie2 import _parse_bowtie2_primer_hits
from app.services.qpcr_target_locus import TranscriptGenomeLocus, resolve_qpcr_target_locus


def _accession_base(value: str | None) -> str:
    return (value or "").strip().upper().split(".", 1)[0]


def _resolve_backend(species: str) -> tuple[str, str, str, str]:
    executable = settings.GRNA_BOWTIE2_PATH.strip() or "bowtie2"
    resolved_executable = shutil.which(executable) or (
        executable if Path(executable).exists() else ""
    )
    index_prefix = settings.qpcr_transcriptome_bowtie2_index_by_species.get(species, "").strip()
    fasta_path = settings.qpcr_transcriptome_fasta_by_species.get(species, "").strip()
    if not resolved_executable:
        return "", "", "", f"Bowtie2 executable not found: {executable}"
    if not index_prefix or not _bowtie_index_exists(index_prefix):
        return "", "", "", f"Transcriptome Bowtie2 index not available for species '{species}'"
    if not fasta_path or not Path(fasta_path).exists():
        return "", "", "", f"Transcriptome FASTA not available for species '{species}'"
    return resolved_executable, index_prefix, fasta_path, ""


def _classify_transcript(
    transcript_accession: str,
    target_transcript: str | None,
    target_locus: TranscriptGenomeLocus | None,
    species: str,
) -> tuple[TranscriptAmpliconClass, TranscriptGenomeLocus | None]:
    if _accession_base(transcript_accession) == _accession_base(target_transcript):
        return TranscriptAmpliconClass.target_transcript, target_locus

    locus, _ = resolve_qpcr_target_locus(species, transcript_accession)
    if locus is None:
        return TranscriptAmpliconClass.unclassified, None
    if target_locus is not None:
        same_gene_id = bool(target_locus.gene_id and locus.gene_id == target_locus.gene_id)
        same_gene_name = bool(
            target_locus.gene_name
            and locus.gene_name
            and locus.gene_name.casefold() == target_locus.gene_name.casefold()
        )
        if same_gene_id or same_gene_name:
            return TranscriptAmpliconClass.same_gene_isoform, locus
    return TranscriptAmpliconClass.other_gene, locus


def _pair_transcript_hits(
    left_hits: list[dict],
    right_hits: list[dict],
    *,
    target_transcript: str | None,
    target_locus: TranscriptGenomeLocus | None,
    species: str,
    min_amplicon_size: int,
    max_amplicon_size: int,
) -> list[TranscriptAmpliconHit]:
    right_by_transcript: dict[str, list[dict]] = {}
    for hit in right_hits:
        right_by_transcript.setdefault(hit["accession"], []).append(hit)

    products: list[TranscriptAmpliconHit] = []
    seen: set[tuple[str, int, int, str]] = set()
    for left in left_hits:
        for right in right_by_transcript.get(left["accession"], []):
            if left["strand"] == "+" and right["strand"] == "-" and left["end"] < right["position"]:
                start, end = left["position"], right["end"]
                orientation = "left_plus_right_minus"
            elif left["strand"] == "-" and right["strand"] == "+" and right["end"] < left["position"]:
                start, end = right["position"], left["end"]
                orientation = "right_plus_left_minus"
            else:
                continue
            product_size = end - start + 1
            if not min_amplicon_size <= product_size <= max_amplicon_size:
                continue
            key = (left["accession"], start, end, orientation)
            if key in seen:
                continue
            seen.add(key)
            classification, locus = _classify_transcript(
                left["accession"], target_transcript, target_locus, species
            )
            products.append(TranscriptAmpliconHit(
                transcript_accession=left["accession"],
                start=start,
                end=end,
                product_size=product_size,
                orientation=orientation,
                left_mismatches=left["mismatches"],
                right_mismatches=right["mismatches"],
                classification=classification,
                gene_id=locus.gene_id or None if locus else None,
                gene_name=locus.gene_name or None if locus else None,
            ))

    class_order = {
        TranscriptAmpliconClass.target_transcript: 0,
        TranscriptAmpliconClass.same_gene_isoform: 1,
        TranscriptAmpliconClass.other_gene: 2,
        TranscriptAmpliconClass.unclassified: 3,
    }
    return sorted(products, key=lambda product: (
        class_order[product.classification],
        product.left_mismatches + product.right_mismatches,
        product.product_size,
        product.transcript_accession,
        product.start,
    ))


def _build_validation(
    left_hits: list[dict],
    right_hits: list[dict],
    *,
    target_transcript: str | None,
    species: str,
    left_raw_count: int,
    right_raw_count: int,
    hit_limit: int,
    min_amplicon_size: int,
    max_amplicon_size: int,
) -> TranscriptomePairValidation:
    target_locus, target_error = resolve_qpcr_target_locus(species, target_transcript)
    products = _pair_transcript_hits(
        left_hits,
        right_hits,
        target_transcript=target_transcript,
        target_locus=target_locus,
        species=species,
        min_amplicon_size=min_amplicon_size,
        max_amplicon_size=max_amplicon_size,
    )
    counts = {
        classification: sum(product.classification == classification for product in products)
        for classification in TranscriptAmpliconClass
    }
    target_count = counts[TranscriptAmpliconClass.target_transcript]
    same_gene_count = counts[TranscriptAmpliconClass.same_gene_isoform]
    other_gene_count = counts[TranscriptAmpliconClass.other_gene]
    unclassified_count = counts[TranscriptAmpliconClass.unclassified]
    hit_limit_reached = left_raw_count > hit_limit or right_raw_count > hit_limit

    if hit_limit_reached:
        status = TranscriptomePairScreenStatus.truncated
        message = "The transcript alignment return limit was reached; no pass can be assigned."
    elif target_locus is None:
        status = TranscriptomePairScreenStatus.target_not_found
        message = target_error or "The selected transcript was absent from the fixed annotation."
    elif not products:
        status = TranscriptomePairScreenStatus.no_paired_amplicons
        message = "No paired transcript amplicon was found in the configured product window."
    elif target_count == 0:
        status = TranscriptomePairScreenStatus.target_not_found
        message = "Paired transcript products were found, but not on the selected transcript."
    elif target_count != 1:
        status = TranscriptomePairScreenStatus.ambiguous_target
        message = "More than one amplifiable product was found on the selected transcript."
    else:
        status = TranscriptomePairScreenStatus.validated
        message = (
            "The selected transcript is amplifiable and no other gene product was found."
            if other_gene_count == 0 and unclassified_count == 0
            else "The selected transcript is amplifiable, but additional cross-gene or unclassified products were found."
        )

    gene_specific = (
        status == TranscriptomePairScreenStatus.validated
        and other_gene_count == 0
        and unclassified_count == 0
        and not hit_limit_reached
    )
    return TranscriptomePairValidation(
        checked=True,
        gene_specific=gene_specific,
        isoform_specific=gene_specific and same_gene_count == 0,
        status=status,
        reference_assembly=settings.genome_reference_assembly_by_species.get(species) or None,
        target_transcript=target_transcript,
        target_gene_id=target_locus.gene_id or None if target_locus else None,
        target_gene_name=target_locus.gene_name or None if target_locus else None,
        left_hit_count=len(left_hits),
        right_hit_count=len(right_hits),
        paired_amplicon_count=len(products),
        target_transcript_amplicon_count=target_count,
        same_gene_isoform_amplicon_count=same_gene_count,
        other_gene_amplicon_count=other_gene_count,
        unclassified_amplicon_count=unclassified_count,
        hit_limit_reached=hit_limit_reached,
        min_amplicon_size=min_amplicon_size,
        max_amplicon_size=max_amplicon_size,
        top_amplicons=products[:12],
        message=message,
    )


def _error_validation(message: str, species: str, target_transcript: str | None) -> TranscriptomePairValidation:
    return TranscriptomePairValidation(
        checked=False,
        gene_specific=False,
        isoform_specific=False,
        status=TranscriptomePairScreenStatus.error,
        reference_assembly=settings.genome_reference_assembly_by_species.get(species) or None,
        target_transcript=target_transcript,
        message=message,
    )


def _run_pair_batch(
    primer_pairs: list[tuple[str, str]],
    species: str,
    target_transcripts: list[str | None],
    executable: str,
    index_prefix: str,
) -> list[TranscriptomePairValidation]:
    hit_limit = max(1, min(2000, settings.QPCR_TRANSCRIPTOME_MAX_ALIGNMENTS_PER_PRIMER))
    min_amplicon_size = settings.QPCR_TRANSCRIPTOME_MIN_AMPLICON_BP
    max_amplicon_size = settings.QPCR_TRANSCRIPTOME_MAX_AMPLICON_BP
    names: list[str] = []
    sequences: list[str] = []
    for index, (left, right) in enumerate(primer_pairs):
        names.extend([f"pair_{index}_left", f"pair_{index}_right"])
        sequences.extend([left, right])
    lengths = {name: len(sequence) for name, sequence in zip(names, sequences)}
    payload = "\n".join(
        f">{name}\n{sequence.upper()}" for name, sequence in zip(names, sequences)
    )
    with tempfile.NamedTemporaryFile("w", suffix=".fa", delete=False, encoding="utf-8") as handle:
        handle.write(payload)
        temporary_fasta = handle.name
    try:
        completed = subprocess.run(
            [
                executable,
                "-x", index_prefix,
                "--mm",
                "-f", "-U", temporary_fasta,
                "--end-to-end", "--sensitive", "--no-unal", "--quiet", "--no-hd", "--no-sq",
                "-N", "1", "-L", "10", "-k", str(hit_limit + 1),
            ],
            capture_output=True,
            check=True,
            text=True,
            timeout=180,
        )
    except subprocess.TimeoutExpired:
        return [_error_validation("Bowtie2 transcriptome alignment timed out.", species, target) for target in target_transcripts]
    except subprocess.CalledProcessError as exc:
        return [_error_validation(f"Bowtie2 transcriptome alignment failed (exit {exc.returncode}).", species, target) for target in target_transcripts]
    finally:
        Path(temporary_fasta).unlink(missing_ok=True)

    raw_counts = {name: 0 for name in names}
    for line in completed.stdout.splitlines():
        if line and not line.startswith("@"):
            query_name = line.split("\t", 1)[0]
            if query_name in raw_counts:
                raw_counts[query_name] += 1
    hits = _parse_bowtie2_primer_hits(completed.stdout, names, lengths, None)
    return [
        _build_validation(
            hits[f"pair_{index}_left"],
            hits[f"pair_{index}_right"],
            target_transcript=target_transcripts[index],
            species=species,
            left_raw_count=raw_counts[f"pair_{index}_left"],
            right_raw_count=raw_counts[f"pair_{index}_right"],
            hit_limit=hit_limit,
            min_amplicon_size=min_amplicon_size,
            max_amplicon_size=max_amplicon_size,
        )
        for index in range(len(primer_pairs))
    ]


def validate_transcriptome_pairs_for_targets_batch(
    primer_pairs: list[tuple[str, str]],
    species: str,
    target_transcripts: list[str | None],
) -> list[TranscriptomePairValidation]:
    if not primer_pairs:
        return []
    if len(primer_pairs) != len(target_transcripts):
        raise ValueError("Each primer pair requires one target transcript entry.")
    executable, index_prefix, _fasta_path, error = _resolve_backend(species)
    if error:
        return [_error_validation(f"Transcriptome screen unavailable: {error}", species, target) for target in target_transcripts]
    batch_hash = sha1((
        f"v1:{species}:{_settings_fingerprint()}:"
        + "|".join(
            f"{left.upper()}:{right.upper()}:{target or ''}"
            for (left, right), target in zip(primer_pairs, target_transcripts)
        )
    ).encode("utf-8")).hexdigest()
    return cached_call(
        "primer_transcriptome_pair_batch_v1",
        species,
        batch_hash,
        loader=lambda: _run_pair_batch(primer_pairs, species, target_transcripts, executable, index_prefix),
        should_cache=lambda results: all(result.status != TranscriptomePairScreenStatus.error for result in results),
    )


def validate_transcriptome_primer_pairs_batch(
    primer_pairs: list[tuple[str, str]],
    species: str,
    target_transcript: str | None,
) -> list[TranscriptomePairValidation]:
    return validate_transcriptome_pairs_for_targets_batch(
        primer_pairs,
        species,
        [target_transcript] * len(primer_pairs),
    )


def _settings_fingerprint() -> str:
    return ":".join(str(value) for value in (
        settings.QPCR_TRANSCRIPTOME_MAX_ALIGNMENTS_PER_PRIMER,
        settings.QPCR_TRANSCRIPTOME_MIN_AMPLICON_BP,
        settings.QPCR_TRANSCRIPTOME_MAX_AMPLICON_BP,
        settings.genome_reference_assembly_by_species,
        settings.qpcr_transcriptome_bowtie2_index_by_species,
    ))


def transcriptome_bowtie2_available(species: str) -> bool:
    return not _resolve_backend(species)[3]


def combined_computational_specificity_pass(
    genome: GenomePairValidation,
    transcriptome: TranscriptomePairValidation,
) -> bool:
    """Conservative gene-level pass across genomic and transcript evidence.

    A junction-spanning pair may legitimately form no contiguous genomic
    product. It can pass only after the fixed transcriptome confirms one
    intended-transcript product and no cross-gene or unclassified product.
    """
    genome_compatible = (
        genome.checked
        and bool(genome.target_locus_accession)
        and not genome.hit_limit_reached
        and genome.off_target_amplicon_count == 0
        and genome.unclassified_amplicon_count == 0
        and (
            (genome.target_amplicon_count == 1 and genome.paired_amplicon_count == 1)
            or genome.paired_amplicon_count == 0
        )
    )
    return genome_compatible and transcriptome.checked and transcriptome.gene_specific
