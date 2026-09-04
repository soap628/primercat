from types import SimpleNamespace

from app.schemas.gene_primer import BlastValidationStatus
from app.services import primer_blast


def test_blast_primers_batch_submits_one_multi_fasta_query(monkeypatch):
    calls = []

    hsp = SimpleNamespace(align_length=20, identities=20)
    alignment = SimpleNamespace(
        title="ref|NM_000546.6| TP53 transcript",
        accession="NM_000546",
        hsps=[hsp],
    )
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
        "NM_000546.6",
    )

    assert len(calls) == 1
    assert calls[0]["sequence"].count(">primer_") == 2
    assert len(result) == 2
    assert result[0].status == BlastValidationStatus.validated
    assert result[0].top_hit_identity == 100.0
    assert result[0].target_found is True
    assert result[0].specific is True
    assert result[0].off_target_count == 0
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


def test_exact_matches_to_other_transcripts_are_counted_as_non_targets():
    hsp = SimpleNamespace(align_length=20, identities=20)
    record = SimpleNamespace(alignments=[
        SimpleNamespace(
            title="ref|NM_000546.6| intended TP53 transcript",
            accession="NM_000546",
            hsps=[hsp],
        ),
        SimpleNamespace(
            title="ref|XM_999999.1| another gene with an exact match",
            accession="XM_999999",
            hsps=[hsp],
        ),
    ])

    result = primer_blast._summarize_record(
        record,
        query_length=20,
        target_accession="NM_000546.6",
    )

    assert result.status == BlastValidationStatus.validated
    assert result.target_found is True
    assert result.qualified_hit_count == 2
    assert result.off_target_count == 1
    assert result.specific is False
    assert result.top_hits[0].is_target is True
    assert result.top_hits[1].is_off_target is True


def test_same_gene_transcript_variants_are_not_counted_as_off_targets():
    hsp = SimpleNamespace(align_length=20, identities=20)
    record = SimpleNamespace(alignments=[
        SimpleNamespace(
            title="ref|NM_001289745.3| Homo sapiens GAPDH (GAPDH), transcript variant 3, mRNA",
            accession="NM_001289745",
            hsps=[hsp],
        ),
        SimpleNamespace(
            title="ref|NM_002046.7| Homo sapiens GAPDH (GAPDH), transcript variant 1, mRNA",
            accession="NM_002046",
            hsps=[hsp],
        ),
    ])

    result = primer_blast._summarize_record(
        record,
        query_length=20,
        target_accession="NM_001289745.3",
    )

    assert result.target_found is True
    assert result.off_target_count == 0
    assert result.specific is True
    assert result.top_hits[0].is_target is True
    assert result.top_hits[1].is_same_gene is True
    assert result.top_hits[1].is_off_target is False


def test_missing_target_or_hit_limit_prevents_specificity_pass():
    hsp = SimpleNamespace(align_length=20, identities=20)
    alignments = [
        SimpleNamespace(
            title=f"ref|XM_{index:06d}.1| returned transcript",
            accession=f"XM_{index:06d}",
            hsps=[hsp],
        )
        for index in range(primer_blast.BLAST_HITLIST_SIZE)
    ]

    result = primer_blast._summarize_record(
        SimpleNamespace(alignments=alignments),
        query_length=20,
        target_accession="NM_000546.6",
    )

    assert result.target_found is False
    assert result.hit_limit_reached is True
    assert result.specific is False
    assert result.off_target_count == primer_blast.BLAST_HITLIST_SIZE


def test_target_accession_is_required_for_transcript_specificity():
    hsp = SimpleNamespace(align_length=20, identities=20)
    alignment = SimpleNamespace(
        title="ref|NM_000546.6| TP53 transcript",
        accession="NM_000546",
        hsps=[hsp],
    )

    result = primer_blast._summarize_record(
        SimpleNamespace(alignments=[alignment]),
        query_length=20,
    )

    assert result.status == BlastValidationStatus.validated
    assert result.target_found is False
    assert result.specific is False
    assert result.off_target_count == 1


def test_batch_accepts_one_target_accession_per_primer(monkeypatch):
    hsp = SimpleNamespace(align_length=20, identities=20)
    records = [
        SimpleNamespace(alignments=[SimpleNamespace(
            title="ref|NM_111111.1| first target",
            accession="NM_111111",
            hsps=[hsp],
        )]),
        SimpleNamespace(alignments=[SimpleNamespace(
            title="ref|NM_222222.3| second target",
            accession="NM_222222",
            hsps=[hsp],
        )]),
    ]
    monkeypatch.setattr(primer_blast, "run_qblast", lambda **kwargs: records)

    result = primer_blast.blast_primers_batch(
        ["AAAACCCCGGGGTTTTAAAA", "CCCCAAAATTTTGGGGCCCC"],
        "mouse",
        ["NM_111111.1", "NM_222222.3"],
    )

    assert [item.target_accession for item in result] == [
        "NM_111111.1",
        "NM_222222.3",
    ]
    assert all(item.target_found for item in result)
    assert all(item.specific for item in result)
