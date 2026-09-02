from app.services import grna_hit_annotation
from scripts.prepare_reference_genome import _build_grna_annotation_db


def test_disk_backed_grna_annotation_preserves_feature_priority(tmp_path, monkeypatch):
    gtf_path = tmp_path / "mini.gtf"
    database_path = tmp_path / "grna-annotations.sqlite3"
    gtf_path.write_text(
        "\n".join(
            [
                'chr1\tTest\tgene\t2000\t2600\t.\t+\t.\tgene_id "GENE1"; gene_name "TP53"; gene_biotype "protein_coding";',
                'chr1\tTest\ttranscript\t2000\t2600\t.\t+\t.\tgene_id "GENE1"; transcript_id "NM_000546"; gene_name "TP53"; gene_biotype "protein_coding";',
                'chr1\tTest\texon\t2000\t2200\t.\t+\t.\tgene_id "GENE1"; transcript_id "NM_000546"; gene_name "TP53"; gene_biotype "protein_coding";',
                'chr1\tTest\tCDS\t2050\t2150\t.\t+\t0\tgene_id "GENE1"; transcript_id "NM_000546"; gene_name "TP53"; gene_biotype "protein_coding";',
            ]
        ),
        encoding="utf-8",
    )
    _build_grna_annotation_db(gtf_path, database_path)
    monkeypatch.setattr(
        grna_hit_annotation.settings,
        "GRNA_ANNOTATION_DB_HUMAN",
        str(database_path),
    )
    monkeypatch.setattr(grna_hit_annotation.settings, "GRNA_ANNOTATION_GTF_HUMAN", "")
    grna_hit_annotation._annotate_with_database.cache_clear()

    cds = grna_hit_annotation.annotate_genome_hit("human", "chr1", 2070, 2089)
    promoter = grna_hit_annotation.annotate_genome_hit("human", "chr1", 1700, 1719)
    intergenic = grna_hit_annotation.annotate_genome_hit("human", "chr1", 5000, 5019)

    assert cds is not None
    assert cds.region == "cds"
    assert cds.gene_symbol == "TP53"
    assert cds.transcript_id == "NM_000546"
    assert promoter is not None
    assert promoter.region == "promoter"
    assert promoter.distance_to_tss == 281
    assert intergenic is not None
    assert intergenic.region == "intergenic"
    assert intergenic.gene_symbol == "TP53"
    assert intergenic.distance_to_tss == 3000


def test_grna_annotation_database_is_preferred_over_gtf(tmp_path, monkeypatch):
    gtf_path = tmp_path / "mini.gtf"
    database_path = tmp_path / "grna-annotations.sqlite3"
    gtf_path.write_text(
        'chr1\tTest\tgene\t1\t10\t.\t+\t.\tgene_id "GENE1"; gene_name "A";\n',
        encoding="utf-8",
    )
    _build_grna_annotation_db(gtf_path, database_path)
    monkeypatch.setattr(
        grna_hit_annotation.settings,
        "GRNA_ANNOTATION_DB_HUMAN",
        str(database_path),
    )
    monkeypatch.setattr(
        grna_hit_annotation.settings,
        "GRNA_ANNOTATION_GTF_HUMAN",
        str(tmp_path / "missing.gtf"),
    )

    backend, reason = grna_hit_annotation.resolve_grna_hit_annotation_backend("human")

    assert reason == ""
    assert backend is not None
    assert backend.database_path == str(database_path)
    assert backend.gtf_path == ""
