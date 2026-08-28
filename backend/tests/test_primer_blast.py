from types import SimpleNamespace

from app.schemas.gene_primer import BlastValidationStatus
from app.services import primer_blast


def test_blast_primers_batch_submits_one_multi_fasta_query(monkeypatch):
    calls = []

    hsp = SimpleNamespace(align_length=20, identities=20)
    alignment = SimpleNamespace(title="TP53 transcript", hsps=[hsp])
    records = [
        SimpleNamespace(alignments=[alignment]),
        SimpleNamespace(alignments=[]),
    ]

    def fake_qblast(**kwargs):
        calls.append(kwargs)
        return records

    monkeypatch.setattr(primer_blast, "run_qblast", fake_qblast)

    result = primer_blast.blast_primers_batch(
        ["ACGTACGTACGTACGTACGT", "TGCATGCATGCATGCATGCA"],
        "human",
    )

    assert len(calls) == 1
    assert calls[0]["sequence"].count(">primer_") == 2
    assert len(result) == 2
    assert result[0].status == BlastValidationStatus.validated
    assert result[0].top_hit_identity == 100.0
    assert result[1].status == BlastValidationStatus.no_hits


def test_blast_primers_batch_degrades_to_error_results(monkeypatch):
    def failing_qblast(**kwargs):
        raise TimeoutError("NCBI unavailable")

    monkeypatch.setattr(primer_blast, "run_qblast", failing_qblast)

    result = primer_blast.blast_primers_batch(
        ["AAAAAAAAAAAAAAAAAAAA", "CCCCCCCCCCCCCCCCCCCC"],
        "mouse",
    )

    assert len(result) == 2
    assert all(item.status == BlastValidationStatus.error for item in result)
