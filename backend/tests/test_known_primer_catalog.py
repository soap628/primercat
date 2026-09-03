import sqlite3

from app.core.config import settings
from app.schemas.gene_primer import Species
from app.services.known_primer_catalog import query_known_primers
from scripts.build_qpcr_catalog import SCHEMA, normalized_primer_row


def test_seed_catalog_remains_available_without_full_index(monkeypatch):
    monkeypatch.setattr(settings, "QPCR_CATALOG_DB", "")

    result = query_known_primers("tp53", Species.human)

    assert result.gene_index_available is False
    assert result.computed_design_available is True
    assert result.resolved_gene_symbol == "TP53"
    assert [record.source_name for record in result.records] == ["OriGene qSTAR", "PrimerBank"]


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
        "INSERT INTO catalog_snapshots VALUES ('NCBI Gene (human)', '2026-09-04', '2026-09-04T00:00:00+00:00')"
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
    assert result.records[0].evidence.value == "vendor_tested"
    assert any(record.evidence.value == "computed_database" for record in result.records)


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
