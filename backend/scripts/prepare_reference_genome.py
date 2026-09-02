#!/usr/bin/env python3
"""Prepare version-pinned genome and transcriptome references for PrimerCat.

The script downloads the NCBI RefSeq assembly FASTA, accessioned RNA FASTA,
annotation GTF, and assembly report, verifies the published MD5 checksums,
expands the compressed files, builds Bowtie2 indexes, and records a
machine-readable manifest.

Large reference assets intentionally live outside the repository. Example:

    python backend/scripts/prepare_reference_genome.py \
        --species mouse \
        --data-root /Volumes/本地磁盘/primercat-reference
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import UTC, datetime
from pathlib import Path


ASSEMBLIES = {
    "mouse": {
        "assembly_accession": "GCF_000001635.27",
        "assembly_name": "GRCm39",
        "annotation_release": "GCF_000001635.27-RS_2024_02",
        "base_url": (
            "https://ftp.ncbi.nlm.nih.gov/genomes/all/GCF/000/001/635/"
            "GCF_000001635.27_GRCm39"
        ),
        "files": {
            "genome_fasta_gz": {
                "name": "GCF_000001635.27_GRCm39_genomic.fna.gz",
                "md5": "c0b0c4c3f54d2b480efe68a18bf7e42b",
                "expand_to": "GCF_000001635.27_GRCm39_genomic.fna",
            },
            "annotation_gtf_gz": {
                "name": "GCF_000001635.27_GRCm39_genomic.gtf.gz",
                "md5": "3577fe95ea5c4d68212ef7ad55d6c5fb",
                "expand_to": "GCF_000001635.27_GRCm39_genomic.gtf",
            },
            "transcriptome_fasta_gz": {
                "name": "GCF_000001635.27_GRCm39_rna.fna.gz",
                "md5": "232bb68742e56492ce7b0f22b63800cd",
                "expand_to": "GCF_000001635.27_GRCm39_rna.fna",
            },
            "assembly_report": {
                "name": "GCF_000001635.27_GRCm39_assembly_report.txt",
                "md5": "1fd6ffdf5da458e9d4f4e5b82d482601",
            },
        },
    },
}

CHUNK_SIZE = 8 * 1024 * 1024


def _gtf_attributes(raw: str) -> dict[str, str]:
    attributes: dict[str, str] = {}
    for item in raw.strip().strip(";").split(";"):
        parts = item.strip().split(" ", 1)
        if len(parts) == 2:
            attributes[parts[0]] = parts[1].strip().strip('"')
    return attributes


def _digest(path: Path, algorithm: str) -> str:
    hasher = hashlib.new(algorithm)
    with path.open("rb") as handle:
        while chunk := handle.read(CHUNK_SIZE):
            hasher.update(chunk)
    return hasher.hexdigest()


def _download_with_resume(url: str, destination: Path) -> None:
    partial = destination.with_suffix(destination.suffix + ".part")
    if destination.exists() and not partial.exists():
        destination.replace(partial)
    offset = partial.stat().st_size if partial.exists() else 0
    headers = {"User-Agent": "PrimerCat-reference-builder/1.0"}
    if offset:
        headers["Range"] = f"bytes={offset}-"

    request = urllib.request.Request(url, headers=headers)
    try:
        response = urllib.request.urlopen(request, timeout=120)
    except urllib.error.HTTPError as exc:
        if exc.code == 416 and partial.exists():
            partial.replace(destination)
            return
        raise

    status = getattr(response, "status", 200)
    mode = "ab" if offset and status == 206 else "wb"
    if mode == "wb":
        offset = 0

    total_header = response.headers.get("Content-Length")
    total = offset + int(total_header) if total_header else None
    received = offset
    next_report = received + 128 * 1024 * 1024

    with response, partial.open(mode) as handle:
        while chunk := response.read(CHUNK_SIZE):
            handle.write(chunk)
            received += len(chunk)
            if received >= next_report:
                suffix = f" / {total:,}" if total else ""
                print(f"  downloaded {received:,}{suffix} bytes", flush=True)
                next_report = received + 128 * 1024 * 1024

    if total is not None and received != total:
        raise RuntimeError(
            f"Download ended early for {destination.name}: received {received:,} of {total:,} bytes. "
            "Run the same command again to resume."
        )
    partial.replace(destination)


def _ensure_download(base_url: str, metadata: dict[str, str], output_dir: Path) -> Path:
    path = output_dir / metadata["name"]
    if path.exists() and _digest(path, "md5") == metadata["md5"]:
        print(f"verified existing {path.name}", flush=True)
        return path

    print(f"downloading {path.name}", flush=True)
    _download_with_resume(f"{base_url}/{metadata['name']}", path)
    observed = _digest(path, "md5")
    if observed != metadata["md5"]:
        raise RuntimeError(
            f"MD5 mismatch for {path}: expected {metadata['md5']}, got {observed}. "
            "The file was preserved for inspection."
        )
    print(f"verified {path.name}", flush=True)
    return path


def _ensure_expanded(compressed: Path, destination: Path) -> Path:
    if destination.exists() and destination.stat().st_mtime >= compressed.stat().st_mtime:
        print(f"using existing {destination.name}", flush=True)
        return destination

    partial = destination.with_suffix(destination.suffix + ".part")
    print(f"expanding {compressed.name}", flush=True)
    with gzip.open(compressed, "rb") as source, partial.open("wb") as target:
        shutil.copyfileobj(source, target, length=CHUNK_SIZE)
    os.replace(partial, destination)
    return destination


def _index_files(prefix: Path) -> list[Path]:
    small = [Path(f"{prefix}.{number}.bt2") for number in (1, 2, 3, 4)]
    small.extend(Path(f"{prefix}.rev.{number}.bt2") for number in (1, 2))
    large = [Path(f"{prefix}.{number}.bt2l") for number in (1, 2, 3, 4)]
    large.extend(Path(f"{prefix}.rev.{number}.bt2l") for number in (1, 2))
    if all(path.exists() for path in small):
        return small
    if all(path.exists() for path in large):
        return large
    return []


def _build_index(fasta_path: Path, prefix: Path, executable: str) -> list[Path]:
    existing = _index_files(prefix)
    if existing:
        print(f"using existing Bowtie2 index {prefix.name}", flush=True)
        return existing

    prefix.parent.mkdir(parents=True, exist_ok=True)
    print(f"building Bowtie2 index {prefix}", flush=True)
    subprocess.run(
        [executable, "--threads", str(max(1, min(8, os.cpu_count() or 1))), str(fasta_path), str(prefix)],
        check=True,
    )
    built = _index_files(prefix)
    if not built:
        raise RuntimeError(f"Bowtie2 did not produce a complete index at {prefix}")
    return built


def _build_transcript_locus_db(gtf_path: Path, destination: Path) -> Path:
    if destination.exists() and destination.stat().st_mtime >= gtf_path.stat().st_mtime:
        try:
            with sqlite3.connect(destination) as connection:
                count = connection.execute("SELECT COUNT(*) FROM transcript_loci").fetchone()[0]
            if count:
                print(f"using existing transcript locus database ({count:,} rows)", flush=True)
                return destination
        except (sqlite3.DatabaseError, OSError):
            pass

    partial = destination.with_suffix(destination.suffix + ".part")
    if partial.exists():
        partial.unlink()
    print(f"building transcript locus database {destination.name}", flush=True)
    with sqlite3.connect(partial) as connection:
        connection.executescript(
            """
            PRAGMA journal_mode=OFF;
            PRAGMA synchronous=OFF;
            CREATE TABLE transcript_loci (
                transcript_id TEXT NOT NULL,
                transcript_base TEXT NOT NULL,
                accession TEXT NOT NULL,
                start INTEGER NOT NULL,
                end INTEGER NOT NULL,
                strand TEXT NOT NULL,
                gene_id TEXT NOT NULL DEFAULT '',
                gene_name TEXT NOT NULL DEFAULT '',
                PRIMARY KEY (transcript_id, accession)
            );
            """
        )
        sql = """
            INSERT INTO transcript_loci (
                transcript_id, transcript_base, accession, start, end, strand, gene_id, gene_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(transcript_id, accession) DO UPDATE SET
                start = MIN(start, excluded.start),
                end = MAX(end, excluded.end),
                gene_id = CASE WHEN gene_id = '' THEN excluded.gene_id ELSE gene_id END,
                gene_name = CASE WHEN gene_name = '' THEN excluded.gene_name ELSE gene_name END
        """
        batch: list[tuple[str, str, str, int, int, str, str, str]] = []
        with gtf_path.open("r", encoding="utf-8") as handle:
            for raw_line in handle:
                if not raw_line or raw_line.startswith("#"):
                    continue
                fields = raw_line.rstrip("\n").split("\t")
                if len(fields) < 9 or fields[2].lower() not in {"transcript", "exon", "cds"}:
                    continue
                attributes = _gtf_attributes(fields[8])
                transcript_id = attributes.get("transcript_id", "").strip()
                if not transcript_id:
                    continue
                try:
                    start = int(fields[3])
                    end = int(fields[4])
                except ValueError:
                    continue
                batch.append((
                    transcript_id,
                    transcript_id.split(".", 1)[0],
                    fields[0],
                    start,
                    end,
                    fields[6],
                    attributes.get("gene_id", ""),
                    attributes.get("gene_name", "") or attributes.get("gene", ""),
                ))
                if len(batch) >= 10_000:
                    connection.executemany(sql, batch)
                    batch.clear()
        if batch:
            connection.executemany(sql, batch)
        connection.execute("CREATE INDEX transcript_loci_base_idx ON transcript_loci(transcript_base)")
        connection.execute("CREATE INDEX transcript_loci_exact_idx ON transcript_loci(transcript_id)")
        count = connection.execute("SELECT COUNT(*) FROM transcript_loci").fetchone()[0]
        connection.commit()
    os.replace(partial, destination)
    print(f"indexed {count:,} transcript loci", flush=True)
    return destination


def _tool_version(executable: str) -> str:
    result = subprocess.run(
        [executable, "--version"],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.splitlines()[0].strip()


def prepare(species: str, data_root: Path, bowtie2_build: str) -> Path:
    assembly = ASSEMBLIES[species]
    executable = shutil.which(bowtie2_build) or (
        bowtie2_build if Path(bowtie2_build).exists() else ""
    )
    if not executable:
        raise RuntimeError(f"Bowtie2 build executable was not found: {bowtie2_build}")

    label = f"{assembly['assembly_accession']}_{assembly['assembly_name']}"
    output_dir = data_root.expanduser().resolve() / label
    output_dir.mkdir(parents=True, exist_ok=True)

    downloaded: dict[str, Path] = {}
    for role, metadata in assembly["files"].items():
        downloaded[role] = _ensure_download(assembly["base_url"], metadata, output_dir)

    fasta = _ensure_expanded(
        downloaded["genome_fasta_gz"],
        output_dir / assembly["files"]["genome_fasta_gz"]["expand_to"],
    )
    gtf = _ensure_expanded(
        downloaded["annotation_gtf_gz"],
        output_dir / assembly["files"]["annotation_gtf_gz"]["expand_to"],
    )
    transcriptome_fasta = _ensure_expanded(
        downloaded["transcriptome_fasta_gz"],
        output_dir / assembly["files"]["transcriptome_fasta_gz"]["expand_to"],
    )
    locus_db = _build_transcript_locus_db(gtf, output_dir / "qpcr-transcript-loci.sqlite3")
    index_prefix = output_dir / "bowtie2" / label
    index_files = _build_index(fasta, index_prefix, executable)
    transcriptome_index_prefix = output_dir / "bowtie2-transcriptome" / f"{label}_rna"
    transcriptome_index_files = _build_index(
        transcriptome_fasta,
        transcriptome_index_prefix,
        executable,
    )

    manifest = {
        "schema_version": "1.0",
        "species": species,
        "assembly_accession": assembly["assembly_accession"],
        "assembly_name": assembly["assembly_name"],
        "annotation_release": assembly["annotation_release"],
        "source": "NCBI RefSeq",
        "base_url": assembly["base_url"],
        "prepared_at_utc": datetime.now(UTC).isoformat(),
        "bowtie2_build_version": _tool_version(executable),
        "files": {
            role: {
                "path": str(path),
                "url": f"{assembly['base_url']}/{assembly['files'][role]['name']}",
                "md5": assembly["files"][role]["md5"],
                "size_bytes": path.stat().st_size,
            }
            for role, path in downloaded.items()
        },
        "expanded": {
            "genome_fasta": {
                "path": str(fasta),
                "sha256": _digest(fasta, "sha256"),
                "size_bytes": fasta.stat().st_size,
            },
            "annotation_gtf": {
                "path": str(gtf),
                "sha256": _digest(gtf, "sha256"),
                "size_bytes": gtf.stat().st_size,
            },
            "transcriptome_fasta": {
                "path": str(transcriptome_fasta),
                "sha256": _digest(transcriptome_fasta, "sha256"),
                "size_bytes": transcriptome_fasta.stat().st_size,
            },
        },
        "bowtie2_index": {
            "prefix": str(index_prefix),
            "files": [
                {
                    "path": str(path),
                    "sha256": _digest(path, "sha256"),
                    "size_bytes": path.stat().st_size,
                }
                for path in index_files
            ],
        },
        "bowtie2_transcriptome_index": {
            "prefix": str(transcriptome_index_prefix),
            "files": [
                {
                    "path": str(path),
                    "sha256": _digest(path, "sha256"),
                    "size_bytes": path.stat().st_size,
                }
                for path in transcriptome_index_files
            ],
        },
        "transcript_locus_database": {
            "path": str(locus_db),
            "sha256": _digest(locus_db, "sha256"),
            "size_bytes": locus_db.stat().st_size,
        },
        "environment": {
            "GRNA_BOWTIE2_INDEX_MOUSE": str(index_prefix),
            "GRNA_GENOME_FASTA_MOUSE": str(fasta),
            "GRNA_ANNOTATION_GTF_MOUSE": str(gtf),
            "QPCR_TRANSCRIPT_LOCUS_DB_MOUSE": str(locus_db),
            "QPCR_TRANSCRIPTOME_BOWTIE2_INDEX_MOUSE": str(transcriptome_index_prefix),
            "QPCR_TRANSCRIPTOME_FASTA_MOUSE": str(transcriptome_fasta),
        },
    }
    manifest_path = output_dir / "primercat-reference-manifest.json"
    partial_manifest = manifest_path.with_suffix(".json.part")
    partial_manifest.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    os.replace(partial_manifest, manifest_path)
    print(json.dumps({
        "manifest": str(manifest_path),
        "environment": manifest["environment"],
    }, indent=2), flush=True)
    return manifest_path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--species", choices=sorted(ASSEMBLIES), default="mouse")
    parser.add_argument(
        "--data-root",
        type=Path,
        default=Path(os.environ.get("PRIMERCAT_REFERENCE_ROOT", "/var/lib/primercat/reference")),
    )
    parser.add_argument("--bowtie2-build", default="bowtie2-build")
    args = parser.parse_args()
    prepare(args.species, args.data_root, args.bowtie2_build)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"reference preparation failed: {exc}", file=sys.stderr)
        raise
