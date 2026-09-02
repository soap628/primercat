from app.core.config import settings
from Bio import SeqIO

from scripts.prepare_reference_genome import ASSEMBLIES, _build_fasta_index_db


def test_human_reference_is_pinned_to_current_grch38_refseq_release():
    human = ASSEMBLIES["human"]
    assert human["assembly_accession"] == "GCF_000001405.40"
    assert human["assembly_name"] == "GRCh38.p14"
    assert human["annotation_release"] == "GCF_000001405.40-RS_2025_08"
    assert human["base_url"].endswith("GCF_000001405.40_GRCh38.p14")
    assert human["files"] == {
        "genome_fasta_gz": {
            "name": "GCF_000001405.40_GRCh38.p14_genomic.fna.gz",
            "md5": "c30471567037b2b2389d43c908c653e1",
            "expand_to": "GCF_000001405.40_GRCh38.p14_genomic.fna",
        },
        "annotation_gtf_gz": {
            "name": "GCF_000001405.40_GRCh38.p14_genomic.gtf.gz",
            "md5": "a561524a1ac438a2a95aed54d00e490e",
            "expand_to": "GCF_000001405.40_GRCh38.p14_genomic.gtf",
        },
        "transcriptome_fasta_gz": {
            "name": "GCF_000001405.40_GRCh38.p14_rna.fna.gz",
            "md5": "b4a2ce202c90c0f24f22850c6bc7d774",
            "expand_to": "GCF_000001405.40_GRCh38.p14_rna.fna",
        },
        "assembly_report": {
            "name": "GCF_000001405.40_GRCh38.p14_assembly_report.txt",
            "md5": "21f3ac4aa8245a99eb874082051b9dde",
        },
    }


def test_each_reference_declares_complete_checksum_pinned_inputs():
    for species, reference in ASSEMBLIES.items():
        assert reference["assembly_accession"].startswith("GCF_")
        assert reference["annotation_release"].startswith(reference["assembly_accession"])
        assert set(reference["files"]) == {
            "genome_fasta_gz",
            "annotation_gtf_gz",
            "transcriptome_fasta_gz",
            "assembly_report",
        }
        for metadata in reference["files"].values():
            assert len(metadata["md5"]) == 32
            int(metadata["md5"], 16)


def test_default_assembly_labels_match_the_pinned_references():
    assert settings.GENOME_REFERENCE_ASSEMBLY_HUMAN == ASSEMBLIES["human"]["assembly_accession"]
    assert settings.GENOME_REFERENCE_ASSEMBLY_MOUSE == ASSEMBLIES["mouse"]["assembly_accession"]


def test_prebuilt_genome_fasta_index_survives_directory_move(tmp_path):
    reference_dir = tmp_path / "reference-a"
    reference_dir.mkdir()
    fasta_path = reference_dir / "mini.fna"
    fasta_path.write_text(">chr1\nAACCGGTTAACC\n>chr2\nTTTTGGGG\n", encoding="utf-8")
    _build_fasta_index_db(fasta_path)

    moved_dir = tmp_path / "reference-b"
    reference_dir.rename(moved_dir)
    moved_fasta = moved_dir / "mini.fna"
    moved_database = moved_dir / "mini.fna.idx.db"
    index = SeqIO.index_db(str(moved_database), str(moved_fasta), "fasta")
    try:
        assert str(index["chr1"].seq[2:8]) == "CCGGTT"
        assert str(index["chr2"].seq) == "TTTTGGGG"
    finally:
        index.close()
