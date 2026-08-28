from types import SimpleNamespace

from app.schemas.pcr import PCRPairSpecificityRequest, PCRSpecificityVerdict
from app.services import pcr_specificity


def _hsp(start: int, end: int, query: str, subject: str | None = None):
    subject = subject or query
    return SimpleNamespace(
        query_start=1,
        query_end=len(query),
        query=query,
        sbjct=subject,
        sbjct_start=start,
        sbjct_end=end,
        align_length=len(query),
        identities=sum(1 for left, right in zip(query, subject) if left == right),
    )


def _record(accession: str, title: str, hsps: list):
    return SimpleNamespace(
        alignments=[SimpleNamespace(accession=accession, title=title, hsps=hsps)]
    )


def _request(**overrides):
    payload = {
        "pair_index": 1,
        "left_primer": "AACCGGTTAACCGGTTAACC",
        "right_primer": "TTGGCCAATTGGCCAATTGG",
        "species": "human",
        "min_amplicon_size": 50,
        "max_amplicon_size": 1000,
        "expected_product_size": 221,
    }
    payload.update(overrides)
    return PCRPairSpecificityRequest(**payload)


def test_extract_binding_hits_rejects_three_prime_mismatch():
    primer = "AACCGGTTAACCGGTTAACC"
    subject = primer[:-1] + "T"
    record = _record("NC_TEST", "test", [_hsp(100, 119, primer, subject)])

    assert pcr_specificity._extract_binding_hits(record, primer) == []


def test_pair_binding_hits_supports_both_database_orientations():
    left = "AACCGGTTAACCGGTTAACC"
    right = "TTGGCCAATTGGCCAATTGG"
    req = _request()

    plus_left = pcr_specificity._extract_binding_hits(
        _record("NC_1", "plus", [_hsp(100, 119, left)]), left
    )
    minus_right = pcr_specificity._extract_binding_hits(
        _record("NC_1", "plus", [_hsp(320, 301, right)]), right
    )
    forward_amplicons = pcr_specificity._pair_binding_hits(plus_left, minus_right, req)

    minus_left = pcr_specificity._extract_binding_hits(
        _record("NC_2", "reverse", [_hsp(520, 501, left)]), left
    )
    plus_right = pcr_specificity._extract_binding_hits(
        _record("NC_2", "reverse", [_hsp(300, 319, right)]), right
    )
    reverse_amplicons = pcr_specificity._pair_binding_hits(minus_left, plus_right, req)

    assert forward_amplicons[0].product_size == 221
    assert forward_amplicons[0].orientation == "left_plus_right_minus"
    assert reverse_amplicons[0].product_size == 221
    assert reverse_amplicons[0].orientation == "right_plus_left_minus"


def test_screen_classifies_multiple_paired_records(monkeypatch):
    left = "AACCGGTTAACCGGTTAACC"
    right = "TTGGCCAATTGGCCAATTGG"
    left_record = SimpleNamespace(alignments=[
        SimpleNamespace(accession="NC_1", title="one", hsps=[_hsp(100, 119, left)]),
        SimpleNamespace(accession="NC_2", title="two", hsps=[_hsp(200, 219, left)]),
    ])
    right_record = SimpleNamespace(alignments=[
        SimpleNamespace(accession="NC_1", title="one", hsps=[_hsp(320, 301, right)]),
        SimpleNamespace(accession="NC_2", title="two", hsps=[_hsp(500, 481, right)]),
    ])
    captured = {}

    def fake_qblast(**kwargs):
        captured.update(kwargs)
        return [left_record, right_record]

    monkeypatch.setattr(pcr_specificity, "run_qblast", fake_qblast)

    response = pcr_specificity._screen_uncached(_request())

    assert response.success is True
    assert response.specificity_checked is True
    assert response.verdict == PCRSpecificityVerdict.multiple_paired_records
    assert response.paired_record_count == 2
    assert response.paired_records[0].matches_expected_size is True
    assert captured["database"] == "nt"
    assert "biomol_genomic[PROP]" in captured["entrez_query"]
    assert "srcdb_refseq[PROP]" in captured["entrez_query"]


def test_screen_returns_checked_no_hits(monkeypatch):
    monkeypatch.setattr(
        pcr_specificity,
        "run_qblast",
        lambda **kwargs: [SimpleNamespace(alignments=[]), SimpleNamespace(alignments=[])],
    )

    response = pcr_specificity._screen_uncached(_request())

    assert response.success is True
    assert response.specificity_checked is True
    assert response.verdict == PCRSpecificityVerdict.no_paired_records
    assert response.paired_record_count == 0


def test_screen_does_not_claim_validation_when_ncbi_fails(monkeypatch):
    def fail(**kwargs):
        raise RuntimeError("temporary")

    monkeypatch.setattr(pcr_specificity, "run_qblast", fail)
    response = pcr_specificity._screen_uncached(_request())

    assert response.success is False
    assert response.specificity_checked is False
    assert response.verdict == PCRSpecificityVerdict.not_checked
    assert response.message == "ncbi_blast_unavailable"
