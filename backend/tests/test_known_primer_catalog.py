import sqlite3

from app.core.config import settings
from app.schemas.gene_primer import Species
from app.services.known_primer_catalog import _connect, _transcript_match, query_known_primers
from scripts.build_qpcr_catalog import (
    SCHEMA,
    build_manifest,
    normalized_primer_row,
    reference_url,
)


def test_seed_catalog_remains_available_without_full_index(monkeypatch):
    monkeypatch.setattr(settings, "QPCR_CATALOG_DB", "")

    result = query_known_primers("tp53", Species.human)

    assert result.gene_index_available is False
    assert result.computed_design_available is True
    assert result.resolved_gene_symbol == "TP53"
    assert [record.source_name for record in result.records] == ["OriGene qSTAR", "PrimerBank"]
    assert [record.evidence_code for record in result.records] == ["S-V", "S-D"]
    assert all(record.transcript_match.value == "not_assessed" for record in result.records)


def test_catalog_connection_is_read_only_and_immutable(tmp_path, monkeypatch):
    original_connect = sqlite3.connect
    observed = {}

    def capture_connect(database, **kwargs):
        observed["database"] = database
        observed.update(kwargs)
        return original_connect(":memory:")

    monkeypatch.setattr("app.services.known_primer_catalog.sqlite3.connect", capture_connect)

    connection = _connect(tmp_path / "catalog.sqlite3")
    connection.close()

    assert observed["database"].endswith("?mode=ro&immutable=1")
    assert observed["uri"] is True


def test_catalog_resolves_alias_and_returns_versioned_record(tmp_path, monkeypatch):
    path = tmp_path / "catalog.sqlite3"
    db = sqlite3.connect(path)
    db.executescript(SCHEMA)
    cursor = db.execute(
        """
        INSERT INTO genes(species, tax_id, ncbi_gene_id, symbol, symbol_norm)
        VALUES ('human', '9606', '7157', 'TP53', 'TP53')
        """
    )
    gene_id = cursor.lastrowid
    db.execute(
        "INSERT INTO gene_aliases(gene_id, alias, alias_norm) VALUES (?, 'P53', 'P53')",
        (gene_id,),
    )
    db.execute(
        """
        INSERT INTO primer_pairs(
            record_id, gene_id, gene_symbol, species, target_accession,
            target_accession_root, forward_primer, reverse_primer, source_name,
            source_record_id, source_url, evidence, retrieved_on
        ) VALUES (
            'qprimerdb-test', ?, 'TP53', 'human', 'NM_000546.6', 'NM_000546',
            'AACCTCAGCATCTTATCCGAGT', 'CTGGATGGTGGTACAGTCAGAG',
            'qPrimerDB 2.0', 'test-pair', 'https://qprimerdb.biodb.org/browse',
            'computed_database', '2026-09-04'
        )
        """,
        (gene_id,),
    )
    db.execute(
        """
        INSERT INTO catalog_snapshots(source_name, release, imported_at, source_url, record_count)
        VALUES ('NCBI Gene (human)', '2026-09-04', '2026-09-04T00:00:00+00:00',
                'https://ftp.ncbi.nlm.nih.gov/gene/', 1)
        """
    )
    db.commit()
    db.close()
    monkeypatch.setattr(settings, "QPCR_CATALOG_DB", str(path))

    result = query_known_primers("p53", Species.human, "NM_000546.6")

    assert result.gene_index_available is True
    assert result.gene_index_match is True
    assert result.resolved_gene_symbol == "TP53"
    assert result.ncbi_gene_id == "7157"
    assert result.catalog_gene_count == 1
    assert result.catalog_pair_count == 1
    assert result.target_transcript == "NM_000546.6"
    assert result.records[0].evidence.value == "computed_database"
    assert result.records[0].transcript_match.value == "exact_accession"
    assert result.records[1].evidence.value == "vendor_tested"
    assert result.records[1].transcript_match.value == "accession_root"
    assert any(record.transcript_match.value == "different_transcript" for record in result.records)
    assert result.source_summaries[0].source_name == "qPrimerDB 2.0"
    assert result.source_summaries[0].record_count == 1
    assert result.snapshots[0].record_count == 1
    assert result.catalog_updated_at == "2026-09-04T00:00:00+00:00"


def test_qprimerdb_json_shape_is_normalized_without_swapping_identifiers():
    row = {
        "primer_name": ["NM_000546.6.P000001.117", "NM_000546.6", "117"],
        "cds_id": ["NM_000546.6", "Homo_sapiens___assembly"],
        "fp_seq": ["pair.f", "CCTCAGCATCTTATCCGAGTGG"],
        "rp_seq": ["pair.r", "TGGATGGTGGTACAGTCAGAGC"],
        "fp_tm": "60.1",
        "rp_tm": "60.2",
        "product_size": "123",
    }

    record = normalized_primer_row(row, "qprimerdb", "human")

    assert record is not None
    assert record["source_record_id"] == "NM_000546.6.P000001.117"
    assert record["target_accession"] == "NM_000546.6"
    assert record["forward_primer"] == "CCTCAGCATCTTATCCGAGTGG"
    assert record["reverse_primer"] == "TGGATGGTGGTACAGTCAGAGC"
    assert record["evidence"] == "computed_database"


def test_transcript_match_distinguishes_versions_and_isoforms():
    assert _transcript_match("NM_000546.6", "NM_000546.6").value == "exact_accession"
    assert _transcript_match("NM_000546", "NM_000546.6").value == "accession_root"
    assert _transcript_match("NM_001126118", "NM_000546.6").value == "different_transcript"
    assert _transcript_match("NM_000546.6", None).value == "not_assessed"


def test_publication_rows_require_a_traceable_reference():
    base = {
        "id": "paper-1",
        "gene": "TP53",
        "target_accession": "NM_000546.6",
        "forward": "CCTCAGCATCTTATCCGAGTGG",
        "reverse": "TGGATGGTGGTACAGTCAGAGC",
    }

    assert normalized_primer_row(base, "publication", "human") is None

    record = normalized_primer_row({**base, "doi": "10.1093/nar/gkr1013"}, "publication", "human")
    assert record is not None
    assert record["evidence"] == "published_record"
    assert record["source_url"] == "https://doi.org/10.1093/nar/gkr1013"
    assert record["source_reference"] == "https://doi.org/10.1093/nar/gkr1013"
    assert reference_url("PMID: 22086960") == "https://pubmed.ncbi.nlm.nih.gov/22086960/"
    assert reference_url("citation unavailable") == ""


def test_catalog_reader_accepts_legacy_snapshot_table(tmp_path, monkeypatch):
    path = tmp_path / "legacy.sqlite3"
    db = sqlite3.connect(path)
    db.executescript(SCHEMA)
    db.execute("DROP TABLE catalog_snapshots")
    db.execute(
        """
        CREATE TABLE catalog_snapshots (
            source_name TEXT PRIMARY KEY,
            release TEXT NOT NULL,
            imported_at TEXT NOT NULL
        )
        """
    )
    db.execute(
        "INSERT INTO catalog_snapshots VALUES ('legacy', 'v1', '2026-09-01T00:00:00+00:00')"
    )
    db.commit()
    db.close()
    monkeypatch.setattr(settings, "QPCR_CATALOG_DB", str(path))

    result = query_known_primers("unknown", Species.human)

    assert result.gene_index_available is True
    assert result.snapshots[0].source_name == "legacy"
    assert result.snapshots[0].record_count is None


def test_manifest_records_database_hash_and_evidence_counts(tmp_path):
    path = tmp_path / "catalog.sqlite3"
    db = sqlite3.connect(path)
    db.executescript(SCHEMA)
    db.executemany(
        "INSERT INTO catalog_metadata(key, value) VALUES (?, ?)",
        (("schema_version", "2"), ("built_at", "2026-09-04T00:00:00+00:00")),
    )
    gene_id = db.execute(
        """
        INSERT INTO genes(species, tax_id, ncbi_gene_id, symbol, symbol_norm)
        VALUES ('human', '9606', '7157', 'TP53', 'TP53')
        """
    ).lastrowid
    db.execute(
        """
        INSERT INTO primer_pairs(
            record_id, gene_id, gene_symbol, species, target_accession,
            target_accession_root, forward_primer, reverse_primer, source_name,
            source_record_id, source_url, evidence, retrieved_on
        ) VALUES (
            'record-1', ?, 'TP53', 'human', 'NM_000546.6', 'NM_000546',
            'CCTCAGCATCTTATCCGAGTGG', 'TGGATGGTGGTACAGTCAGAGC',
            'Example', 'example-1', 'https://example.org/record-1',
            'published_record', '2026-09-04'
        )
        """,
        (gene_id,),
    )
    db.execute(
        """
        INSERT INTO catalog_snapshots(source_name, release, imported_at, source_url, record_count)
        VALUES ('Example (human)', 'v1', '2026-09-04T00:00:00+00:00',
                'https://example.org/', 1)
        """
    )
    db.commit()
    db.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    db.close()

    manifest = build_manifest(path)

    assert manifest["schema_version"] == "2"
    assert manifest["gene_records_by_species"] == {"human": 1}
    assert manifest["primer_pairs_by_species"] == {"human": 1}
    assert manifest["evidence_counts"][0]["evidence"] == "published_record"
    assert len(manifest["database"]["sha256"]) == 64
