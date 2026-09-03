#!/usr/bin/env python3
"""Build PrimerCat's local, versioned qPCR source catalog.

The gene index is streamed from NCBI's organism-specific ``gene_info`` files.
Optional qPrimerDB/PrimerBank exports are normalized into the same SQLite
schema.  The builder never labels a computational database record as
experimentally validated.

Example:
    python scripts/build_qpcr_catalog.py \
      --output ../reference-data/qpcr-catalog.sqlite3 \
      --species human --species mouse \
      --qprimerdb ~/Downloads/qprimerdb-human-best.tsv
"""

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import io
import json
import sqlite3
import sys
import time
import urllib.error
import urllib.request
import zipfile
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Iterator


SPECIES = {
    "human": {
        "tax_id": "9606",
        "url": "https://ftp.ncbi.nlm.nih.gov/gene/DATA/GENE_INFO/Mammalia/Homo_sapiens.gene_info.gz",
    },
    "mouse": {
        "tax_id": "10090",
        "url": "https://ftp.ncbi.nlm.nih.gov/gene/DATA/GENE_INFO/Mammalia/Mus_musculus.gene_info.gz",
    },
}

SCHEMA = """
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
CREATE TABLE genes (
    id INTEGER PRIMARY KEY,
    species TEXT NOT NULL,
    tax_id TEXT NOT NULL,
    ncbi_gene_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    symbol_norm TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    gene_type TEXT NOT NULL DEFAULT '',
    nomenclature_status TEXT NOT NULL DEFAULT '',
    modified_on TEXT NOT NULL DEFAULT '',
    UNIQUE(species, ncbi_gene_id)
);
CREATE INDEX ix_genes_species_symbol ON genes(species, symbol_norm);

CREATE TABLE gene_aliases (
    gene_id INTEGER NOT NULL REFERENCES genes(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    alias_norm TEXT NOT NULL,
    PRIMARY KEY(gene_id, alias_norm)
);
CREATE INDEX ix_gene_aliases_norm ON gene_aliases(alias_norm, gene_id);

CREATE TABLE primer_pairs (
    id INTEGER PRIMARY KEY,
    record_id TEXT NOT NULL UNIQUE,
    gene_id INTEGER REFERENCES genes(id) ON DELETE SET NULL,
    gene_symbol TEXT NOT NULL DEFAULT '',
    species TEXT NOT NULL,
    target_accession TEXT NOT NULL,
    target_accession_root TEXT NOT NULL,
    forward_primer TEXT NOT NULL,
    reverse_primer TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_record_id TEXT NOT NULL,
    source_url TEXT NOT NULL,
    evidence TEXT NOT NULL,
    evidence_url TEXT,
    source_amplicon_size_bp INTEGER,
    source_forward_tm_c REAL,
    source_reverse_tm_c REAL,
    retrieved_on TEXT NOT NULL,
    source_reference TEXT
);
CREATE INDEX ix_primer_pairs_gene ON primer_pairs(species, gene_id);
CREATE INDEX ix_primer_pairs_accession ON primer_pairs(species, target_accession_root);

CREATE TABLE catalog_snapshots (
    source_name TEXT PRIMARY KEY,
    release TEXT NOT NULL,
    imported_at TEXT NOT NULL
);
"""


def normalized(value: str | None) -> str:
    return (value or "").strip().upper()


def accession_root(value: str | None) -> str:
    return normalized(value).split(".", 1)[0]


def first(row: dict, *keys: str) -> str:
    lowered = {str(key).strip().lower(): value for key, value in row.items()}
    for key in keys:
        value = lowered.get(key.lower())
        if value is not None and str(value).strip() not in {"", "-", "None", "null"}:
            return str(value).strip()
    return ""


def optional_int(value: str) -> int | None:
    try:
        return int(float(value)) if value else None
    except ValueError:
        return None


def optional_float(value: str) -> float | None:
    try:
        return float(value) if value else None
    except ValueError:
        return None


def sequence(value: str) -> str:
    cleaned = "".join(value.split()).upper()
    return cleaned if 15 <= len(cleaned) <= 40 and set(cleaned) <= set("ACGT") else ""


def open_ncbi_gene_info(url: str) -> Iterator[dict[str, str]]:
    last_error: Exception | None = None
    for attempt in range(1, 4):
        request = urllib.request.Request(
            url,
            headers={"User-Agent": "PrimerCat catalog builder (support@primercat.com)"},
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                expected = int(response.headers.get("Content-Length", "0") or 0)
                payload = response.read()
            if expected and len(payload) != expected:
                raise EOFError(f"downloaded {len(payload)} of {expected} compressed bytes")
            decompressed = gzip.decompress(payload).decode("utf-8", errors="replace")
            yield from csv.DictReader(io.StringIO(decompressed), delimiter="\t")
            return
        except (EOFError, OSError, TimeoutError, urllib.error.URLError) as exc:
            last_error = exc
            if attempt < 3:
                print(f"  incomplete NCBI download; retrying ({attempt}/3): {exc}", file=sys.stderr)
                time.sleep(attempt)
    raise RuntimeError(f"Could not download a complete NCBI gene_info snapshot: {last_error}")


def import_gene_index(db: sqlite3.Connection, species: str) -> tuple[int, int]:
    config = SPECIES[species]
    gene_count = 0
    alias_count = 0
    for row in open_ncbi_gene_info(config["url"]):
        if row.get("#tax_id") != config["tax_id"]:
            continue
        symbol = row.get("Symbol", "").strip()
        gene_id = row.get("GeneID", "").strip()
        if not symbol or not gene_id:
            continue
        cursor = db.execute(
            """
            INSERT INTO genes(
                species, tax_id, ncbi_gene_id, symbol, symbol_norm, description,
                gene_type, nomenclature_status, modified_on
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                species,
                config["tax_id"],
                gene_id,
                symbol,
                normalized(symbol),
                row.get("description", ""),
                row.get("type_of_gene", ""),
                row.get("Nomenclature_status", ""),
                row.get("Modification_date", ""),
            ),
        )
        local_gene_id = cursor.lastrowid
        aliases = {symbol}
        aliases.update(alias for alias in row.get("Synonyms", "").split("|") if alias != "-")
        authority_symbol = row.get("Symbol_from_nomenclature_authority", "")
        if authority_symbol and authority_symbol != "-":
            aliases.add(authority_symbol)
        db.executemany(
            "INSERT OR IGNORE INTO gene_aliases(gene_id, alias, alias_norm) VALUES (?, ?, ?)",
            ((local_gene_id, alias, normalized(alias)) for alias in aliases if alias.strip()),
        )
        gene_count += 1
        alias_count += len(aliases)
        if gene_count % 10_000 == 0:
            print(f"  {species}: {gene_count:,} genes", file=sys.stderr)

    imported_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    db.execute(
        "INSERT OR REPLACE INTO catalog_snapshots(source_name, release, imported_at) VALUES (?, ?, ?)",
        (f"NCBI Gene ({species})", date.today().isoformat(), imported_at),
    )
    return gene_count, alias_count


def delimited_rows(handle) -> Iterator[dict]:
    sample = handle.read(8192)
    handle.seek(0)
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters="\t,;")
    except csv.Error:
        dialect = csv.excel_tab
    yield from csv.DictReader(handle, dialect=dialect)


def rows_from_file(path: Path) -> Iterator[dict]:
    if path.suffix.lower() == ".zip":
        with zipfile.ZipFile(path) as archive:
            members = [name for name in archive.namelist() if not name.endswith("/")]
            if not members:
                raise ValueError(f"No data file found in {path}")
            with archive.open(members[0]) as binary:
                with io.TextIOWrapper(binary, encoding="utf-8-sig", errors="replace", newline="") as text:
                    yield from delimited_rows(text)
        return

    if path.suffix.lower() == ".json":
        payload = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(payload, dict):
            payload = payload.get("list", payload.get("records", []))
        if not isinstance(payload, list):
            raise ValueError(f"Expected a JSON array in {path}")
        yield from payload
        return

    with path.open("r", encoding="utf-8-sig", errors="replace", newline="") as handle:
        yield from delimited_rows(handle)


def find_gene_id(db: sqlite3.Connection, species: str, symbol: str) -> int | None:
    if not symbol:
        return None
    row = db.execute(
        """
        SELECT DISTINCT g.id
        FROM genes AS g
        LEFT JOIN gene_aliases AS a ON a.gene_id = g.id
        WHERE g.species = ? AND (g.symbol_norm = ? OR a.alias_norm = ?)
        ORDER BY CASE WHEN g.symbol_norm = ? THEN 0 ELSE 1 END, g.id
        LIMIT 1
        """,
        (species, normalized(symbol), normalized(symbol), normalized(symbol)),
    ).fetchone()
    return row[0] if row else None


def normalized_primer_row(row: dict, source: str, species: str) -> dict | None:
    source_defaults = {
        "qprimerdb": (
            "qPrimerDB 2.0",
            "computed_database",
            "https://qprimerdb.biodb.org/browse",
            "https://doi.org/10.1093/nar/gkae684",
        ),
        "primerbank": (
            "PrimerBank",
            "database_record",
            "https://pga.mgh.harvard.edu/primerbank/",
            "https://doi.org/10.1093/nar/gkr1013",
        ),
    }
    source_name, evidence, source_url, source_reference = source_defaults[source]

    # qPrimerDB's JSON API represents primer sequences as [id, sequence] and
    # identifiers as [display value, related id].  Delimited exports use scalars.
    def item(key: str, list_index: int = 0):
        value = row.get(key, "")
        if isinstance(value, list):
            return value[list_index] if len(value) > list_index else ""
        return value

    flat = {key: (value[0] if isinstance(value, list) and value else value) for key, value in row.items()}
    forward = sequence(
        str(item("fp_seq", 1))
        if isinstance(row.get("fp_seq"), list)
        else first(flat, "forward_primer", "forward_primer_seq", "fp_seq", "forward", "left_primer")
    )
    reverse = sequence(
        str(item("rp_seq", 1))
        if isinstance(row.get("rp_seq"), list)
        else first(flat, "reverse_primer", "reverse_primer_seq", "rp_seq", "reverse", "right_primer")
    )
    target = first(flat, "target_accession", "cds_id", "transcript_id", "refseq")
    record_id = first(flat, "source_record_id", "primer_name", "primer_id", "id")
    gene_symbol = first(flat, "gene_symbol", "symbol", "gene")
    if not forward or not reverse or not target or not record_id:
        return None
    digest = hashlib.sha256(f"{source}:{species}:{record_id}".encode()).hexdigest()[:20]
    return {
        "record_id": f"{source}-{digest}",
        "gene_symbol": gene_symbol,
        "species": species,
        "target_accession": target,
        "target_accession_root": accession_root(target),
        "forward_primer": forward,
        "reverse_primer": reverse,
        "source_name": source_name,
        "source_record_id": record_id,
        "source_url": first(flat, "source_url") or source_url,
        "evidence": evidence,
        "evidence_url": first(flat, "evidence_url") or None,
        "source_amplicon_size_bp": optional_int(first(flat, "source_amplicon_size_bp", "product_size", "amplicon_size")),
        "source_forward_tm_c": optional_float(first(flat, "source_forward_tm_c", "forward_primer_tm", "fp_tm", "forward_tm")),
        "source_reverse_tm_c": optional_float(first(flat, "source_reverse_tm_c", "reverse_primer_tm", "rp_tm", "reverse_tm")),
        "retrieved_on": date.today().isoformat(),
        "source_reference": first(flat, "source_reference", "reference", "doi", "pmid") or source_reference,
    }


def insert_primer(db: sqlite3.Connection, record: dict) -> bool:
    gene_id = find_gene_id(db, record["species"], record.get("gene_symbol", ""))
    cursor = db.execute(
        """
        INSERT OR IGNORE INTO primer_pairs(
            record_id, gene_id, gene_symbol, species, target_accession,
            target_accession_root, forward_primer, reverse_primer, source_name,
            source_record_id, source_url, evidence, evidence_url,
            source_amplicon_size_bp, source_forward_tm_c, source_reverse_tm_c,
            retrieved_on, source_reference
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            record["record_id"], gene_id, record.get("gene_symbol", ""), record["species"],
            record["target_accession"], record["target_accession_root"],
            record["forward_primer"], record["reverse_primer"], record["source_name"],
            record["source_record_id"], record["source_url"], record["evidence"],
            record.get("evidence_url"), record.get("source_amplicon_size_bp"),
            record.get("source_forward_tm_c"), record.get("source_reverse_tm_c"),
            record["retrieved_on"], record.get("source_reference"),
        ),
    )
    return cursor.rowcount > 0


def import_primer_file(
    db: sqlite3.Connection,
    path: Path,
    source: str,
    species: str,
    max_pairs_per_target: int,
) -> tuple[int, int]:
    inserted = 0
    skipped = 0
    target_counts: dict[str, int] = {}
    for row in rows_from_file(path):
        record = normalized_primer_row(row, source, species)
        if not record:
            skipped += 1
            continue
        target = record["target_accession_root"]
        if target_counts.get(target, 0) >= max_pairs_per_target:
            skipped += 1
            continue
        inserted += int(insert_primer(db, record))
        target_counts[target] = target_counts.get(target, 0) + 1
    db.execute(
        "INSERT OR REPLACE INTO catalog_snapshots(source_name, release, imported_at) VALUES (?, ?, ?)",
        (
            f"qPrimerDB 2.0 ({species})" if source == "qprimerdb" else f"PrimerBank ({species})",
            path.name,
            datetime.now(timezone.utc).isoformat(timespec="seconds"),
        ),
    )
    return inserted, skipped


def import_seed_records(db: sqlite3.Connection, path: Path) -> int:
    inserted = 0
    for row in json.loads(path.read_text(encoding="utf-8")):
        record = {
            "record_id": row["id"],
            "gene_symbol": row["gene_symbol"],
            "species": row["species"],
            "target_accession": row["target_accession"],
            "target_accession_root": accession_root(row["target_accession"]),
            **{key: value for key, value in row.items() if key != "id"},
        }
        inserted += int(insert_primer(db, record))
    db.execute(
        "INSERT OR REPLACE INTO catalog_snapshots(source_name, release, imported_at) VALUES (?, ?, ?)",
        ("PrimerCat reviewed seed", date.today().isoformat(), datetime.now(timezone.utc).isoformat(timespec="seconds")),
    )
    return inserted


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--species", action="append", choices=sorted(SPECIES), dest="species_list")
    parser.add_argument("--qprimerdb", action="append", default=[], metavar="[SPECIES=]FILE")
    parser.add_argument("--primerbank", action="append", default=[], metavar="[SPECIES=]FILE")
    parser.add_argument("--primer-species", choices=sorted(SPECIES), default="human")
    parser.add_argument("--max-pairs-per-target", type=int, default=3)
    return parser.parse_args()


def parse_primer_file(value: str, default_species: str) -> tuple[str, Path]:
    prefix, separator, remainder = value.partition("=")
    if separator and prefix in SPECIES:
        return prefix, Path(remainder)
    return default_species, Path(value)


def main() -> int:
    args = parse_args()
    species_list = args.species_list or ["human", "mouse"]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    if args.output.exists():
        raise SystemExit(f"Refusing to overwrite existing catalog: {args.output}")

    seed_path = Path(__file__).resolve().parents[1] / "app" / "data" / "known_qpcr_primers.json"
    db = sqlite3.connect(args.output)
    try:
        db.executescript(SCHEMA)
        for species in species_list:
            genes, aliases = import_gene_index(db, species)
            print(f"Imported {genes:,} {species} genes and {aliases:,} aliases")
        seed_count = import_seed_records(db, seed_path)
        print(f"Imported {seed_count:,} reviewed seed primer pairs")
        for value in args.qprimerdb:
            primer_species, path = parse_primer_file(value, args.primer_species)
            inserted, skipped = import_primer_file(
                db, path, "qprimerdb", primer_species, args.max_pairs_per_target
            )
            print(f"Imported {inserted:,} qPrimerDB {primer_species} pairs from {path}; skipped {skipped:,}")
        for value in args.primerbank:
            primer_species, path = parse_primer_file(value, args.primer_species)
            inserted, skipped = import_primer_file(
                db, path, "primerbank", primer_species, args.max_pairs_per_target
            )
            print(f"Imported {inserted:,} PrimerBank {primer_species} pairs from {path}; skipped {skipped:,}")
        db.commit()
        db.execute("PRAGMA optimize")
    except Exception:
        db.close()
        args.output.unlink(missing_ok=True)
        raise
    finally:
        try:
            db.close()
        except sqlite3.Error:
            pass
    print(f"Catalog ready: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
