import shutil
from pathlib import Path

from app.schemas.grna import OffTargetReadinessStatus
from app.services import grna_genome_offtarget


def test_get_grna_offtarget_readiness_reports_ready(monkeypatch):
    fixture_dir = Path(__file__).with_name("_grna_readiness_fixture")
    if fixture_dir.exists():
        shutil.rmtree(fixture_dir)
    fixture_dir.mkdir()

    executable = fixture_dir / "bowtie2.exe"
    executable.write_text("", encoding="utf-8")

    index_prefix = fixture_dir / "human_index"
    (fixture_dir / "human_index.1.bt2").write_text("", encoding="utf-8")
    fasta_path = fixture_dir / "human.fa"
    fasta_path.write_text(">chr1\nACGT\n", encoding="utf-8")

    try:
        monkeypatch.setattr(grna_genome_offtarget.settings, "GRNA_OFFTARGET_BACKEND", "auto")
        monkeypatch.setattr(grna_genome_offtarget.settings, "GRNA_ENABLE_NT_BLAST_FALLBACK", True)
        monkeypatch.setattr(grna_genome_offtarget.settings, "GRNA_BOWTIE2_PATH", str(executable))
        monkeypatch.setattr(grna_genome_offtarget.settings, "GRNA_BOWTIE2_INDEX_HUMAN", str(index_prefix))
        monkeypatch.setattr(grna_genome_offtarget.settings, "GRNA_GENOME_FASTA_HUMAN", str(fasta_path))

        readiness = grna_genome_offtarget.get_grna_offtarget_readiness("human")

        assert readiness.readiness_status == OffTargetReadinessStatus.ready
        assert readiness.genome_backend_ready is True
        assert readiness.target_locus_anchor_ready is True
        assert readiness.active_engine == "bowtie2_local_index"
        assert readiness.missing_requirements == []
        assert readiness.missing_env_vars == []
    finally:
        shutil.rmtree(fixture_dir, ignore_errors=True)


def test_get_grna_offtarget_readiness_reports_missing_configuration(monkeypatch):
    monkeypatch.setattr(grna_genome_offtarget.settings, "GRNA_OFFTARGET_BACKEND", "auto")
    monkeypatch.setattr(grna_genome_offtarget.settings, "GRNA_ENABLE_NT_BLAST_FALLBACK", True)
    monkeypatch.setattr(grna_genome_offtarget.settings, "GRNA_BOWTIE2_PATH", "bowtie2")
    monkeypatch.setattr(grna_genome_offtarget.settings, "GRNA_BOWTIE2_INDEX_HUMAN", "")
    monkeypatch.setattr(grna_genome_offtarget.settings, "GRNA_GENOME_FASTA_HUMAN", "")

    readiness = grna_genome_offtarget.get_grna_offtarget_readiness("human")

    assert readiness.readiness_status == OffTargetReadinessStatus.fallback
    assert readiness.genome_backend_ready is False
    assert readiness.target_locus_anchor_ready is False
    assert readiness.active_engine == "ncbi_nt_blast"
    assert "GRNA_BOWTIE2_INDEX_HUMAN" in readiness.missing_env_vars
    assert "GRNA_GENOME_FASTA_HUMAN" in readiness.missing_env_vars
    assert len(readiness.missing_requirements) >= 2
