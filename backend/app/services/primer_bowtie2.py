"""
Bowtie2-based primer specificity screening.

Replaces NCBI BLAST calls in gene_primer_service.py with local genome alignment
for near-instant primer validation.

Key difference from the gRNA off-target screen:
- Primers are short (18–25 bp), so we use --end-to-end --sensitive with a
  tighter mismatch threshold (≤ 2 mismatches) rather than the gRNA's ≤ 3.
- A primer hit in an INTRON counts as a genomic hit; at the caller level this
  is treated conservatively (genome ≠ transcriptome), which is fine for
  gDNA-level qPCR and slightly over-penalises cDNA-only cases.
- validate_primers_batch() runs ALL primers in ONE Bowtie2 subprocess call,
  reducing overhead from N×3s to ~3s total regardless of primer count.
"""

from __future__ import annotations

import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from hashlib import sha1
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.schemas.gene_primer import (
    BlastTopHit,
    BlastValidation,
    BlastValidationStatus,
    GenomeAmpliconHit,
    GenomePairScreenStatus,
    GenomePairValidation,
)
from app.services.grna_genome_offtarget import (
    _bowtie_index_exists,
)
from app.services.ncbi_client import cached_call
from app.services.qpcr_target_locus import TranscriptGenomeLocus, resolve_qpcr_target_locus

PRIMER_MAX_MISMATCHES = 2
PRIMER_MIN_COVERAGE = 0.85


@dataclass(frozen=True)
class PrimerPairGenomeResult:
    left: BlastValidation
    right: BlastValidation
    pair: GenomePairValidation


def _resolve_primer_bowtie2_backend(species: str) -> tuple[str, str, str, str]:
    """
    Return (executable, index_prefix, fasta_path, error_msg).
    error_msg is empty string on success.
    """
    index_map = {
        "human": settings.GRNA_BOWTIE2_INDEX_HUMAN,
        "mouse": settings.GRNA_BOWTIE2_INDEX_MOUSE,
    }
    fasta_map = {
        "human": settings.GRNA_GENOME_FASTA_HUMAN,
        "mouse": settings.GRNA_GENOME_FASTA_MOUSE,
    }

    index_prefix = index_map.get(species, "").strip()
    fasta_path = fasta_map.get(species, "").strip()
    executable = settings.GRNA_BOWTIE2_PATH.strip() or "bowtie2"
    resolved_exe = shutil.which(executable) or (executable if Path(executable).exists() else "")

    if not resolved_exe:
        return "", "", "", f"Bowtie2 executable not found: {executable}"
    if not index_prefix or not _bowtie_index_exists(index_prefix):
        return "", "", "", f"Bowtie2 index not available for species '{species}'"
    if not fasta_path or not Path(fasta_path).exists():
        return "", "", "", f"Genome FASTA not available for species '{species}'"

    return resolved_exe, index_prefix, fasta_path, ""


def _parse_bowtie2_primer_hits(
    stdout: str,
    primer_names: list[str],
    primer_lengths: dict[str, int],
    fasta_index: Any,
) -> dict[str, list[dict]]:
    """Parse SAM output and return per-primer hit lists (genomic positions)."""
    hits: dict[str, list[dict]] = {name: [] for name in primer_names}
    seen: dict[str, set[tuple[str, int, str]]] = {name: set() for name in primer_names}

    for raw_line in stdout.splitlines():
        if not raw_line or raw_line.startswith("@"):
            continue
        fields = raw_line.split("\t")
        if len(fields) < 11:
            continue

        query_name = fields[0]
        if query_name not in hits:
            continue

        flag = int(fields[1])
        if flag & 4:
            continue

        plen = primer_lengths.get(query_name, 20)
        cigar = fields[5]
        if not re.fullmatch(r"\d+M", cigar):
            continue
        aligned_len = int(cigar[:-1])
        if aligned_len / plen < PRIMER_MIN_COVERAGE:
            continue

        nm_val: int | None = None
        for opt in fields[11:]:
            if opt.startswith("NM:i:"):
                try:
                    nm_val = int(opt.split(":")[-1])
                except ValueError:
                    pass
                break
        if nm_val is None or nm_val > PRIMER_MAX_MISMATCHES:
            continue

        accession = fields[2]
        position = int(fields[3])
        strand = "-" if (flag & 16) else "+"
        identity = round((aligned_len - nm_val) / aligned_len * 100, 1)

        dedupe_key = (accession, position, strand)
        if dedupe_key in seen[query_name]:
            continue
        seen[query_name].add(dedupe_key)

        hits[query_name].append({
            "accession": accession,
            "position": position,
            "end": position + aligned_len - 1,
            "strand": strand,
            "mismatches": nm_val,
            "identity": identity,
            "title": f"{accession}:{position} ({strand}) id={identity:.1f}%",
        })

    return hits


def _hits_to_blast_validation(
    hit_list: list[dict],
    *,
    hit_limit: int = 10,
    raw_alignment_count: int | None = None,
    target_locus: TranscriptGenomeLocus | None = None,
) -> BlastValidation:
    """Convert Bowtie2 hit list into a BlastValidation (same schema as before)."""
    if not hit_list:
        return BlastValidation(
            specific=False,
            top_hit_identity=0.0,
            off_target_count=0,
            top_hits=[],
            status=BlastValidationStatus.no_hits,
            message="No genomic hits found for this primer.",
            target_accession=target_locus.transcript_id if target_locus else None,
            target_found=False,
        )

    def _is_target(hit: dict) -> bool:
        if target_locus is None:
            return False
        if not (_accession_tokens(hit["accession"]) & _accession_tokens(target_locus.accession)):
            return False
        return hit["position"] >= target_locus.start and hit.get("end", hit["position"]) <= target_locus.end

    hit_list_sorted = sorted(
        hit_list,
        key=lambda hit: (
            not _is_target(hit) if target_locus else False,
            -hit["identity"],
            hit["accession"],
            hit["position"],
        ),
    )
    top_identity = hit_list_sorted[0]["identity"] if hit_list_sorted else 0.0
    # The candidate was derived from the target template, but this primer-level
    # genome screen does not carry a target locus. Conservatively treat the
    # highest-identity locus as the presumed target and every other qualified
    # genomic alignment—including another 100% match—as a potential non-target.
    target_found = any(_is_target(hit) for hit in hit_list_sorted) if target_locus else False
    off_target_count = (
        sum(not _is_target(hit) for hit in hit_list_sorted)
        if target_locus
        else max(0, len(hit_list_sorted) - 1)
    )
    hit_limit_reached = (
        len(hit_list_sorted) >= hit_limit
        if raw_alignment_count is None
        else raw_alignment_count > hit_limit
    )

    top_hits: list[BlastTopHit] = []
    for index, h in enumerate(hit_list_sorted[:3]):
        title = h["title"]
        if len(title) > 80:
            title = title[:77] + "..."
        top_hits.append(BlastTopHit(
            rank=len(top_hits) + 1,
            title=title,
            identity=round(h["identity"], 1),
            is_off_target=(not _is_target(h)) if target_locus else index > 0,
            is_target=_is_target(h),
        ))

    specific = (
        top_identity >= 99.0
        and (target_found if target_locus else True)
        and off_target_count == 0
        and not hit_limit_reached
    )

    return BlastValidation(
        specific=specific,
        top_hit_identity=round(top_identity, 1),
        off_target_count=off_target_count,
        top_hits=top_hits,
        status=BlastValidationStatus.validated,
        message=(
            "One qualified genomic alignment was returned."
            if specific
            else "Additional qualified genomic alignments were returned."
        ),
        qualified_hit_count=len(hit_list_sorted),
        hit_limit_reached=hit_limit_reached,
        target_accession=target_locus.transcript_id if target_locus else None,
        target_found=target_found,
    )


def _accession_tokens(value: str) -> set[str]:
    token = value.strip().lower()
    core = token.split(".", 1)[0]
    candidates = {token, core}
    for candidate in (token, core):
        if candidate.startswith("chr"):
            candidates.add(candidate[3:])
        else:
            candidates.add(f"chr{candidate}")
    return {candidate for candidate in candidates if candidate}


def _amplicon_is_target(hit: GenomeAmpliconHit, locus: TranscriptGenomeLocus | None) -> bool:
    if locus is None:
        return False
    if not (_accession_tokens(hit.accession) & _accession_tokens(locus.accession)):
        return False
    return hit.start >= locus.start and hit.end <= locus.end


def _pair_primer_hits(
    left_hits: list[dict],
    right_hits: list[dict],
    locus: TranscriptGenomeLocus | None,
    min_amplicon_size: int,
    max_amplicon_size: int,
) -> list[GenomeAmpliconHit]:
    right_by_accession: dict[str, list[dict]] = {}
    for hit in right_hits:
        right_by_accession.setdefault(hit["accession"], []).append(hit)

    amplicons: list[GenomeAmpliconHit] = []
    seen: set[tuple[str, int, int, str]] = set()
    for left in left_hits:
        for right in right_by_accession.get(left["accession"], []):
            if left["strand"] == "+" and right["strand"] == "-" and left["end"] < right["position"]:
                start = left["position"]
                end = right["end"]
                orientation = "left_plus_right_minus"
            elif left["strand"] == "-" and right["strand"] == "+" and right["end"] < left["position"]:
                start = right["position"]
                end = left["end"]
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
            candidate = GenomeAmpliconHit(
                accession=left["accession"],
                start=start,
                end=end,
                product_size=product_size,
                orientation=orientation,
                left_mismatches=left["mismatches"],
                right_mismatches=right["mismatches"],
            )
            candidate.is_target = _amplicon_is_target(candidate, locus)
            amplicons.append(candidate)

    return sorted(
        amplicons,
        key=lambda hit: (
            not hit.is_target,
            hit.left_mismatches + hit.right_mismatches,
            hit.product_size,
            hit.accession,
            hit.start,
        ),
    )


def _build_pair_validation(
    left_hits: list[dict],
    right_hits: list[dict],
    *,
    locus: TranscriptGenomeLocus | None,
    target_transcript: str | None,
    locus_error: str,
    left_raw_count: int,
    right_raw_count: int,
    hit_limit: int,
    min_amplicon_size: int,
    max_amplicon_size: int,
    species: str,
) -> GenomePairValidation:
    amplicons = _pair_primer_hits(
        left_hits,
        right_hits,
        locus,
        min_amplicon_size,
        max_amplicon_size,
    )
    target_count = sum(hit.is_target for hit in amplicons)
    off_target_count = len(amplicons) - target_count if locus else 0
    unclassified_count = len(amplicons) if locus is None else 0
    hit_limit_reached = left_raw_count > hit_limit or right_raw_count > hit_limit

    if hit_limit_reached:
        status = GenomePairScreenStatus.truncated
        message = "The alignment return limit was reached; no specificity pass can be assigned."
    elif locus is None:
        status = GenomePairScreenStatus.target_not_anchored
        message = locus_error or "The intended transcript could not be anchored to the genome annotation."
    elif not amplicons:
        status = GenomePairScreenStatus.no_paired_amplicons
        message = (
            f"No opposing primer hits formed a {min_amplicon_size}–{max_amplicon_size} bp "
            "genomic product."
        )
    elif target_count == 0:
        status = GenomePairScreenStatus.target_not_anchored
        message = "Paired genomic products were found, but none fell within the annotated target locus."
    else:
        status = GenomePairScreenStatus.validated
        message = (
            "Exactly one target-locus product and no additional genomic product were found."
            if target_count == 1 and off_target_count == 0
            else "The paired-genome screen found additional or ambiguous amplifiable products."
        )

    return GenomePairValidation(
        checked=True,
        specific=(
            status == GenomePairScreenStatus.validated
            and target_count == 1
            and off_target_count == 0
            and not hit_limit_reached
        ),
        status=status,
        reference_assembly=settings.genome_reference_assembly_by_species.get(species) or None,
        target_transcript=target_transcript,
        target_locus_accession=locus.accession if locus else None,
        target_locus_start=locus.start if locus else None,
        target_locus_end=locus.end if locus else None,
        target_locus_strand=locus.strand if locus else None,
        left_hit_count=len(left_hits),
        right_hit_count=len(right_hits),
        paired_amplicon_count=len(amplicons),
        target_amplicon_count=target_count,
        off_target_amplicon_count=off_target_count,
        unclassified_amplicon_count=unclassified_count,
        hit_limit_reached=hit_limit_reached,
        min_amplicon_size=min_amplicon_size,
        max_amplicon_size=max_amplicon_size,
        top_amplicons=amplicons[:10],
        message=message,
    )


def _run_bowtie2_batch(
    primers: list[str],
    species: str,
    executable: str,
    index_prefix: str,
    fasta_path: str,
) -> list[BlastValidation]:
    """
    Run all primers in a single Bowtie2 subprocess and return one
    BlastValidation per primer in the same order.
    """
    del fasta_path  # Index validation happens in _resolve_primer_bowtie2_backend.
    primer_names = [f"primer_{i}" for i in range(len(primers))]
    primer_lengths = {name: len(seq) for name, seq in zip(primer_names, primers)}
    fasta_payload = "\n".join(
        f">{name}\n{seq.upper()}" for name, seq in zip(primer_names, primers)
    )

    with tempfile.NamedTemporaryFile("w", suffix=".fa", delete=False, encoding="utf-8") as fh:
        fh.write(fasta_payload)
        tmp_fasta = fh.name

    try:
        command = [
            executable,
            "-x", index_prefix,
            "--mm",
            "-f", "-U", tmp_fasta,
            "--end-to-end",
            "--sensitive",
            "--no-unal",
            "--quiet",
            "--no-hd",
            "--no-sq",
            "-N", "1",
            "-L", "10",
            "-k", "10",
        ]
        completed = subprocess.run(
            command,
            capture_output=True,
            check=True,
            text=True,
            timeout=60,
        )
    except subprocess.TimeoutExpired:
        return [BlastValidation(
            specific=False, top_hit_identity=0.0, off_target_count=0, top_hits=[],
            status=BlastValidationStatus.error,
            message="Bowtie2 alignment timed out.",
        )] * len(primers)
    except subprocess.CalledProcessError as exc:
        return [BlastValidation(
            specific=False, top_hit_identity=0.0, off_target_count=0, top_hits=[],
            status=BlastValidationStatus.error,
            message=f"Bowtie2 error (exit {exc.returncode}).",
        )] * len(primers)
    finally:
        Path(tmp_fasta).unlink(missing_ok=True)

    hits_map = _parse_bowtie2_primer_hits(
        completed.stdout, primer_names, primer_lengths, None
    )
    return [_hits_to_blast_validation(hits_map[name]) for name in primer_names]


def _error_pair_result(message: str, species: str, target_transcript: str | None) -> PrimerPairGenomeResult:
    primer_error = BlastValidation(
        specific=False,
        top_hit_identity=0.0,
        off_target_count=0,
        top_hits=[],
        status=BlastValidationStatus.error,
        message=message,
    )
    pair_error = GenomePairValidation(
        checked=False,
        specific=False,
        status=GenomePairScreenStatus.error,
        reference_assembly=settings.genome_reference_assembly_by_species.get(species) or None,
        target_transcript=target_transcript,
        message=message,
    )
    return PrimerPairGenomeResult(left=primer_error, right=primer_error.model_copy(), pair=pair_error)


def _run_bowtie2_pair_batch(
    primer_pairs: list[tuple[str, str]],
    species: str,
    target_transcripts: list[str | None],
    executable: str,
    index_prefix: str,
    fasta_path: str,
) -> list[PrimerPairGenomeResult]:
    del fasta_path  # Index validation happens in _resolve_primer_bowtie2_backend.
    hit_limit = max(1, min(1000, settings.QPCR_GENOME_MAX_ALIGNMENTS_PER_PRIMER))
    min_amplicon_size = settings.QPCR_GENOME_MIN_AMPLICON_BP
    max_amplicon_size = settings.QPCR_GENOME_MAX_AMPLICON_BP
    primer_names: list[str] = []
    primers: list[str] = []
    for index, (left, right) in enumerate(primer_pairs):
        primer_names.extend([f"pair_{index}_left", f"pair_{index}_right"])
        primers.extend([left, right])
    primer_lengths = {
        name: len(sequence)
        for name, sequence in zip(primer_names, primers)
    }
    fasta_payload = "\n".join(
        f">{name}\n{sequence.upper()}"
        for name, sequence in zip(primer_names, primers)
    )

    with tempfile.NamedTemporaryFile("w", suffix=".fa", delete=False, encoding="utf-8") as handle:
        handle.write(fasta_payload)
        tmp_fasta = handle.name

    try:
        completed = subprocess.run(
            [
                executable,
                "-x", index_prefix,
                "--mm",
                "-f", "-U", tmp_fasta,
                "--end-to-end",
                "--sensitive",
                "--no-unal",
                "--quiet",
                "--no-hd",
                "--no-sq",
                "-N", "1",
                "-L", "10",
                "-k", str(hit_limit + 1),
            ],
            capture_output=True,
            check=True,
            text=True,
            timeout=180,
        )
    except subprocess.TimeoutExpired:
        return [
            _error_pair_result("Bowtie2 paired-primer alignment timed out.", species, target_transcripts[index])
            for index in range(len(primer_pairs))
        ]
    except subprocess.CalledProcessError as exc:
        return [
            _error_pair_result(
                f"Bowtie2 paired-primer alignment failed (exit {exc.returncode}).",
                species,
                target_transcripts[index],
            )
            for index in range(len(primer_pairs))
        ]
    finally:
        Path(tmp_fasta).unlink(missing_ok=True)

    raw_counts = {name: 0 for name in primer_names}
    for raw_line in completed.stdout.splitlines():
        if not raw_line or raw_line.startswith("@"):
            continue
        query_name = raw_line.split("\t", 1)[0]
        if query_name in raw_counts:
            raw_counts[query_name] += 1
    hits_map = _parse_bowtie2_primer_hits(
        completed.stdout,
        primer_names,
        primer_lengths,
        None,
    )
    results: list[PrimerPairGenomeResult] = []
    for index in range(len(primer_pairs)):
        target_transcript = target_transcripts[index]
        locus, locus_error = resolve_qpcr_target_locus(species, target_transcript)
        left_name = f"pair_{index}_left"
        right_name = f"pair_{index}_right"
        left_hits = hits_map[left_name]
        right_hits = hits_map[right_name]
        results.append(PrimerPairGenomeResult(
            left=_hits_to_blast_validation(
                left_hits,
                hit_limit=hit_limit,
                raw_alignment_count=raw_counts[left_name],
                target_locus=locus,
            ),
            right=_hits_to_blast_validation(
                right_hits,
                hit_limit=hit_limit,
                raw_alignment_count=raw_counts[right_name],
                target_locus=locus,
            ),
            pair=_build_pair_validation(
                left_hits,
                right_hits,
                locus=locus,
                target_transcript=target_transcript,
                locus_error=locus_error,
                left_raw_count=raw_counts[left_name],
                right_raw_count=raw_counts[right_name],
                hit_limit=hit_limit,
                min_amplicon_size=min_amplicon_size,
                max_amplicon_size=max_amplicon_size,
                species=species,
            ),
        ))
    return results


def validate_primer_pairs_batch(
    primer_pairs: list[tuple[str, str]],
    species: str,
    target_transcript: str | None = None,
) -> list[PrimerPairGenomeResult]:
    """Screen primer pairs as amplifiable products on a fixed local genome."""
    return validate_primer_pairs_for_targets_batch(
        primer_pairs,
        species,
        [target_transcript] * len(primer_pairs),
    )


def validate_primer_pairs_for_targets_batch(
    primer_pairs: list[tuple[str, str]],
    species: str,
    target_transcripts: list[str | None],
) -> list[PrimerPairGenomeResult]:
    """Screen multiple pairs and independently anchor each intended transcript."""
    if not primer_pairs:
        return []
    if len(primer_pairs) != len(target_transcripts):
        raise ValueError("Each primer pair requires one target transcript entry.")
    executable, index_prefix, fasta_path, error = _resolve_primer_bowtie2_backend(species)
    if error:
        return [
            _error_pair_result(f"Bowtie2 unavailable: {error}", species, target_transcripts[index])
            for index in range(len(primer_pairs))
        ]

    payload = "|".join(
        f"{left.upper()}:{right.upper()}:{target or ''}"
        for (left, right), target in zip(primer_pairs, target_transcripts)
    )
    batch_hash = sha1(
        (
            f"v2:{species}:{hit_limit_settings()}:{payload}"
        ).encode("utf-8")
    ).hexdigest()

    return cached_call(
        "primer_bowtie2_pair_batch_v2",
        species,
        batch_hash,
        loader=lambda: _run_bowtie2_pair_batch(
            primer_pairs,
            species,
            target_transcripts,
            executable,
            index_prefix,
            fasta_path,
        ),
        should_cache=lambda results: all(result.pair.status != GenomePairScreenStatus.error for result in results),
    )


def hit_limit_settings() -> str:
    return ":".join(str(value) for value in (
        settings.QPCR_GENOME_MAX_ALIGNMENTS_PER_PRIMER,
        settings.QPCR_GENOME_MIN_AMPLICON_BP,
        settings.QPCR_GENOME_MAX_AMPLICON_BP,
        settings.genome_reference_assembly_by_species,
    ))


def validate_primers_batch(
    primers: list[str],
    species: str,
) -> list[BlastValidation]:
    """
    Validate a list of primers in ONE Bowtie2 subprocess call.

    Returns a BlastValidation for each primer in the same order.
    Falls back gracefully (status=error) if Bowtie2 is unavailable.
    """
    executable, index_prefix, fasta_path, err = _resolve_primer_bowtie2_backend(species)
    if err:
        return [BlastValidation(
            specific=False, top_hit_identity=0.0, off_target_count=0, top_hits=[],
            status=BlastValidationStatus.error,
            message=f"Bowtie2 unavailable: {err}",
        )] * len(primers)

    batch_hash = sha1(
        f"{species}:{'|'.join(p.upper() for p in primers)}".encode("utf-8")
    ).hexdigest()

    def _load() -> list[BlastValidation]:
        return _run_bowtie2_batch(primers, species, executable, index_prefix, fasta_path)

    return cached_call(
        "primer_bowtie2_batch",
        species,
        batch_hash,
        loader=_load,
        should_cache=lambda results: all(
            r.status != BlastValidationStatus.error for r in results
        ),
    )


def blast_primer_bowtie2(primer_seq: str, species: str) -> BlastValidation:
    """
    Single-primer convenience wrapper around validate_primers_batch.
    Drop-in replacement for blast_primer() for backwards compatibility.
    """
    results = validate_primers_batch([primer_seq], species)
    return results[0]


def primer_bowtie2_available(species: str) -> bool:
    """Quick check — returns True if Bowtie2 primer screening can run for this species."""
    _, _, _, err = _resolve_primer_bowtie2_backend(species)
    return not err
