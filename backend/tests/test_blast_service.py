import pytest
import asyncio
from types import SimpleNamespace
from pydantic import ValidationError

from app.schemas.blast import BlastRequest
from app.services import blast_service


def empty_record(length=20):
    return SimpleNamespace(query_letters=length, alignments=[])


def test_short_primer_blast_applies_sensitive_parameters_and_species(monkeypatch):
    calls = []
    monkeypatch.setattr(blast_service, "run_qblast", lambda **kwargs: calls.append(kwargs) or [empty_record()])
    response = blast_service._run_blast(BlastRequest(
        sequence=">source_reverse\nacgtacgt acgtacgtacgt", database="refseq_rna",
        short_query=True, species="human", expect=1000, hitlist_size=50,
    ))
    assert response.success
    assert response.query_length == 20
    assert calls[0] == {
        "program": "blastn", "database": "refseq_rna", "sequence": "ACGTACGTACGTACGTACGT",
        "hitlist_size": 50, "expect": 1000, "format_type": "XML",
        "word_size": 7, "nucl_reward": 1, "nucl_penalty": -3,
        "gapcosts": "5 2", "filter": "F", "entrez_query": "txid9606[Organism:exp]",
    }


def test_generic_blast_parameters_remain_unchanged(monkeypatch):
    calls = []
    monkeypatch.setattr(blast_service, "run_qblast", lambda **kwargs: calls.append(kwargs) or [empty_record(18)])
    blast_service._run_blast(BlastRequest(sequence="MKWVTFISLLFLFSSAYS", program="blastp", database="nr"))
    assert calls[0]["expect"] == 0.001
    assert "word_size" not in calls[0]
    assert "entrez_query" not in calls[0]


def test_short_mode_and_species_are_part_of_cache_key(monkeypatch):
    calls = []
    monkeypatch.setattr(blast_service, "run_qblast", lambda **kwargs: calls.append(kwargs) or [empty_record()])
    base = {"sequence": "ACGTACGTACGTACGTACGT", "database": "refseq_rna", "expect": 1000}
    for extra in [{"short_query": False}, {"short_query": True}, {"short_query": True, "species": "human"}, {"short_query": True, "species": "mouse"}]:
        blast_service._run_blast(BlastRequest(**base, **extra))
        blast_service._run_blast(BlastRequest(**base, **extra))
    assert len(calls) == 4
    assert calls[-1]["entrez_query"] == "txid10090[Organism:exp]"


@pytest.mark.parametrize("overrides", [
    {"sequence": "A" * 9}, {"sequence": "A" * 51}, {"sequence": "AAAAAAQAAAA"},
    {"sequence": ">forward\nACGTACGTACGT\n>reverse\nACGTACGTACGT"},
    {"program": "blastp"}, {"database": "nr"}, {"species": "other"},
    {"expect": float("nan")}, {"expect": 0},
])
def test_short_mode_rejects_invalid_or_ambiguous_input(overrides):
    payload = {"sequence": "ACGTACGTACGTACGTACGT", "short_query": True, **overrides}
    with pytest.raises(ValidationError):
        BlastRequest(**payload)


def test_species_cannot_be_silently_ignored_without_short_mode():
    with pytest.raises(ValidationError):
        BlastRequest(sequence="ACGTACGTACGTACGTACGT", short_query=False, species="human")


def test_automatic_short_dna_defaults_and_explicit_settings():
    req = BlastRequest(sequence=">primer\nacgtacgt acgtacgtacgt")
    assert req.sequence == "ACGTACGTACGTACGTACGT"
    assert req.short_query and req.expect == 1000 and req.hitlist_size == 50
    assert BlastRequest(sequence=req.sequence, expect=0.001).expect == 0.001
    disabled = BlastRequest(sequence=req.sequence, short_query=False)
    assert not disabled.short_query and disabled.expect == 0.001
    long = BlastRequest(sequence="A" * 51)
    assert not long.short_query and long.expect == 0.001


def test_multiple_fasta_records_rejected_even_in_general_mode():
    with pytest.raises(ValidationError):
        BlastRequest(sequence=">F\nACGTACGTACGT\n>R\nACGTACGTACGT", short_query=False)


@pytest.mark.parametrize("records", [[], [empty_record(21)], [empty_record(), empty_record()]])
def test_invalid_records_are_errors_and_not_cached(monkeypatch, records):
    calls = []
    monkeypatch.setattr(blast_service, "run_qblast", lambda **kwargs: calls.append(kwargs) or records)
    req = BlastRequest(sequence="ACGTACGTACGTACGTACGT")
    for _ in range(2):
        res = blast_service._run_blast(req)
        assert not res.success and res.error_code == "invalid_response"
    assert len(calls) == 2


def test_real_zero_hit_record_is_success_with_search_provenance(monkeypatch):
    monkeypatch.setattr(blast_service, "run_qblast", lambda **kwargs: [empty_record()])
    req = BlastRequest(sequence="ACGTACGTACGTACGTACGT", species="mouse", database="refseq_rna")
    res = blast_service._run_blast(req)
    assert res.success and res.hits == [] and res.error_code is None
    assert res.query_sequence == req.sequence
    assert res.search_parameters.model_dump() == {
        "short_query": True, "expect": 1000, "word_size": 7, "species": "mouse", "hitlist_size": 50,
    }


@pytest.mark.parametrize("error,code", [(TimeoutError(), "timeout"), (ValueError(), "invalid_response"), (OSError(), "unavailable")])
def test_service_failures_are_not_biological_negatives(monkeypatch, error, code):
    def fail(**kwargs):
        raise error
    monkeypatch.setattr(blast_service, "run_qblast", fail)
    res = blast_service._run_blast(BlastRequest(sequence="ACGTACGTACGTACGTACGT"))
    assert not res.success and res.error_code == code and not res.hits


def test_duplicate_requests_share_inflight_work(monkeypatch):
    from threading import Event
    release = Event()
    calls = []
    req = BlastRequest(sequence="ACGTACGTACGTACGTACGT")
    def run(request):
        calls.append(request)
        release.wait(timeout=2)
        return blast_service._response(request, success=True, hits=[])
    monkeypatch.setattr(blast_service, "_run_blast", run)
    async def exercise():
        tasks = [asyncio.create_task(blast_service.blast_sequence(req)) for _ in range(3)]
        try:
            await asyncio.sleep(0.05)
            assert len(calls) == 1
            tasks[0].cancel()
            release.set()
            with pytest.raises(asyncio.CancelledError):
                await tasks[0]
            assert all(res.success for res in await asyncio.gather(*tasks[1:]))
        finally:
            release.set()
            await asyncio.gather(*tasks, return_exceptions=True)
    asyncio.run(exercise())


def test_capacity_is_bounded(monkeypatch):
    monkeypatch.setattr(blast_service, "_pending", {str(i): object() for i in range(4)})
    res = asyncio.run(blast_service.blast_sequence(BlastRequest(sequence="ACGTACGTACGTACGTACGT")))
    assert not res.success and res.error_code == "busy"
