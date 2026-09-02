from __future__ import annotations

import gzip
import sqlite3
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import TextIO

from app.core.config import settings
from app.services.grna_hit_annotation import _parse_attributes


@dataclass(frozen=True)
class TranscriptGenomeLocus:
    transcript_id: str
    accession: str
    start: int
    end: int
    strand: str
    gene_id: str = ""
    gene_name: str = ""


def _accession_base(value: str) -> str:
    return value.strip().upper().split(".", 1)[0]


def _open_gtf(path: Path) -> TextIO:
    if path.suffix == ".gz":
        return gzip.open(path, "rt", encoding="utf-8")
    return path.open("r", encoding="utf-8")


@lru_cache(maxsize=4)
def _load_transcript_loci(gtf_path: str) -> dict[str, tuple[TranscriptGenomeLocus, ...]]:
    merged: dict[tuple[str, str], dict[str, str | int]] = {}
    path = Path(gtf_path)
    with _open_gtf(path) as handle:
        for raw_line in handle:
            if not raw_line or raw_line.startswith("#"):
                continue
            fields = raw_line.rstrip("\n").split("\t")
            if len(fields) < 9:
                continue
            accession, _, feature_type, start_raw, end_raw, _, strand, _, attrs_raw = fields[:9]
            if feature_type.lower() not in {"transcript", "exon", "cds"}:
                continue
            attrs = _parse_attributes(attrs_raw)
            transcript_id = attrs.get("transcript_id", "").strip()
            if not transcript_id:
                continue
            try:
                start = int(start_raw)
                end = int(end_raw)
            except ValueError:
                continue
            key = (accession, transcript_id)
            current = merged.get(key)
            if current is None:
                merged[key] = {
                    "transcript_id": transcript_id,
                    "accession": accession,
                    "start": start,
                    "end": end,
                    "strand": strand,
                    "gene_id": attrs.get("gene_id", ""),
                    "gene_name": attrs.get("gene_name", "") or attrs.get("gene", ""),
                }
                continue
            current["start"] = min(int(current["start"]), start)
            current["end"] = max(int(current["end"]), end)

    by_transcript: dict[str, list[TranscriptGenomeLocus]] = {}
    for values in merged.values():
        locus = TranscriptGenomeLocus(
            transcript_id=str(values["transcript_id"]),
            accession=str(values["accession"]),
            start=int(values["start"]),
            end=int(values["end"]),
            strand=str(values["strand"]),
            gene_id=str(values["gene_id"]),
            gene_name=str(values["gene_name"]),
        )
        exact = locus.transcript_id.upper()
        for token in {exact, _accession_base(exact)}:
            by_transcript.setdefault(token, []).append(locus)

    return {
        token: tuple(sorted(loci, key=lambda locus: (locus.accession, locus.start, locus.end)))
        for token, loci in by_transcript.items()
    }


@lru_cache(maxsize=4096)
def _query_transcript_locus_db(
    database_path: str,
    transcript_id: str,
) -> tuple[TranscriptGenomeLocus, ...]:
    exact = transcript_id.strip().upper()
    base = _accession_base(exact)
    with sqlite3.connect(f"file:{database_path}?mode=ro", uri=True) as connection:
        rows = connection.execute(
            """
            SELECT transcript_id, accession, start, end, strand, gene_id, gene_name
            FROM transcript_loci
            WHERE transcript_id = ?
            ORDER BY accession, start, end
            """,
            (exact,),
        ).fetchall()
        if not rows:
            rows = connection.execute(
                """
                SELECT transcript_id, accession, start, end, strand, gene_id, gene_name
                FROM transcript_loci
                WHERE transcript_base = ?
                ORDER BY accession, start, end
                """,
                (base,),
            ).fetchall()
    return tuple(TranscriptGenomeLocus(*row) for row in rows)


def resolve_qpcr_target_locus(
    species: str,
    transcript_id: str | None,
) -> tuple[TranscriptGenomeLocus | None, str]:
    if not transcript_id:
        return None, "No target transcript accession was provided."
    locus_db_path = settings.qpcr_transcript_locus_db_by_species.get(species, "").strip()
    if locus_db_path:
        database = Path(locus_db_path)
        if not database.exists():
            return None, f"Configured transcript locus database was not found: {locus_db_path}"
        try:
            candidates = _query_transcript_locus_db(str(database.resolve()), transcript_id)
        except sqlite3.DatabaseError as exc:
            return None, f"Transcript locus database could not be read: {exc}"
        if not candidates:
            return None, f"Transcript '{transcript_id}' was not present in the transcript locus database."
        if len(candidates) > 1:
            return None, (
                f"Transcript '{transcript_id}' resolved to {len(candidates)} genomic loci; "
                "the target locus is ambiguous."
            )
        return candidates[0], ""

    gtf_path = settings.grna_annotation_gtf_by_species.get(species, "").strip()
    if not gtf_path:
        return None, f"No GTF annotation is configured for species '{species}'."
    path = Path(gtf_path)
    if not path.exists():
        return None, f"Configured GTF annotation was not found: {gtf_path}"

    loci_by_transcript = _load_transcript_loci(str(path.resolve()))
    exact = loci_by_transcript.get(transcript_id.strip().upper(), ())
    candidates = exact or loci_by_transcript.get(_accession_base(transcript_id), ())
    if not candidates:
        return None, f"Transcript '{transcript_id}' was not present in the configured GTF annotation."
    if len(candidates) > 1:
        return None, (
            f"Transcript '{transcript_id}' resolved to {len(candidates)} genomic loci; "
            "the target locus is ambiguous."
        )
    return candidates[0], ""
