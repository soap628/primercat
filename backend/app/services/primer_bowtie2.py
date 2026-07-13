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
from hashlib import sha1
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.schemas.gene_primer import BlastValidation, BlastTopHit, BlastValidationStatus
from app.services.grna_genome_offtarget import (
    _bowtie_index_exists,
    _load_genome_index,
)
from app.services.ncbi_client import cached_call

PRIMER_MAX_MISMATCHES = 2
PRIMER_MIN_COVERAGE = 0.85
PRIMER_OFFTARGET_IDENTITY_THRESHOLD = 80.0


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
            "strand": strand,
            "mismatches": nm_val,
            "identity": identity,
            "title": f"{accession}:{position} ({strand}) id={identity:.1f}%",
        })

    return hits


def _hits_to_blast_validation(hit_list: list[dict]) -> BlastValidation:
    """Convert Bowtie2 hit list into a BlastValidation (same schema as before)."""
    if not hit_list:
        return BlastValidation(
            specific=False,
            top_hit_identity=0.0,
            off_target_count=0,
            top_hits=[],
            status=BlastValidationStatus.no_hits,
            message="No genomic hits found for this primer.",
        )

    hit_list_sorted = sorted(hit_list, key=lambda h: (-h["identity"], h["accession"]))
    top_identity = hit_list_sorted[0]["identity"] if hit_list_sorted else 0.0
    off_target_count = sum(
        1 for h in hit_list_sorted
        if PRIMER_OFFTARGET_IDENTITY_THRESHOLD < h["identity"] < 100.0
    )

    top_hits: list[BlastTopHit] = []
    for h in hit_list_sorted[:3]:
        title = h["title"]
        if len(title) > 80:
            title = title[:77] + "..."
        top_hits.append(BlastTopHit(
            rank=len(top_hits) + 1,
            title=title,
            identity=round(h["identity"], 1),
            is_off_target=PRIMER_OFFTARGET_IDENTITY_THRESHOLD < h["identity"] < 100.0,
        ))

    specific = top_identity >= 99.0 and off_target_count <= 2

    return BlastValidation(
        specific=specific,
        top_hit_identity=round(top_identity, 1),
        off_target_count=off_target_count,
        top_hits=top_hits,
        status=BlastValidationStatus.validated,
        message="",
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

    fasta_index = _load_genome_index(fasta_path)
    hits_map = _parse_bowtie2_primer_hits(
        completed.stdout, primer_names, primer_lengths, fasta_index
    )
    return [_hits_to_blast_validation(hits_map[name]) for name in primer_names]


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
