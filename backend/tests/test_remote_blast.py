import asyncio
from types import SimpleNamespace

import httpx
import pytest

from app.services import remote_blast

SUBMITTED = "QBlastInfoBegin\n RID = TEST12345678\n RTOE = 5\nQBlastInfoEnd"
NO_HITS_XML = """<?xml version="1.0"?>
<BlastXML2><BlastOutput2><report><Report>
<program>blastn</program><version>BLASTN 2.17.0+</version><reference>Test</reference>
<search-target><Target><db>refseq_rna</db></Target></search-target>
<params><Parameters><expect>1000</expect></Parameters></params>
<results><Results><search><Search><query-id>Query_1</query-id>
<query-title>Test sequence</query-title><query-len>20</query-len><hits/>
</Search></search></Results></results></Report></report></BlastOutput2></BlastXML2>"""
REQUEST = {"program": "blastn", "database": "refseq_rna", "sequence": "GATTTGGTCGTATTGGGCGC"}


def mock_network(monkeypatch, outcomes):
    state = SimpleNamespace(now=0.0, calls=[])
    values = iter(outcomes)

    async def sleep_until(when, deadline):
        if state.now >= deadline or when >= deadline:
            raise remote_blast.RemoteBlastTimeout("Deadline")
        state.now = max(state.now, when)

    class Client:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            pass

        async def request(self, method, url, **kwargs):
            state.calls.append((method, state.now, kwargs))
            value = next(values)
            if isinstance(value, Exception):
                raise value
            if callable(value):
                return await value()
            status, body = value if isinstance(value, tuple) else (200, value)
            return httpx.Response(status, text=body)

    monkeypatch.setattr(remote_blast, "time", SimpleNamespace(monotonic=lambda: state.now))
    monkeypatch.setattr(remote_blast, "_sleep_until", sleep_until)
    monkeypatch.setattr(remote_blast, "_next_contact_at", 0.0)
    monkeypatch.setattr(remote_blast.httpx, "AsyncClient", Client)
    return state


def test_valid_xml2_no_hits_is_a_real_query_record_with_length(monkeypatch):
    state = mock_network(monkeypatch, [SUBMITTED, NO_HITS_XML])

    records = remote_blast.run_remote_blast(**REQUEST, format_type="XML", word_size=7, expect=1000)

    assert len(records) == 1
    assert records[0].query_letters == 20
    assert records[0].query_length == 20
    assert records[0].alignments == []
    assert [call[0] for call in state.calls] == ["POST", "GET"]
    assert state.calls[1][1] >= 20
    assert state.calls[0][2]["data"]["QUERY"] == REQUEST["sequence"]
    assert state.calls[0][2]["data"]["WORD_SIZE"] == 7
    assert state.calls[1][2]["params"]["FORMAT_TYPE"] == "XML2_S"
    assert state.calls[0][2]["data"]["tool"]
    assert state.calls[0][2]["data"]["email"]
    assert all(call[2]["timeout"] <= 25 for call in state.calls)


def test_polling_waits_sixty_seconds_for_same_rid(monkeypatch):
    state = mock_network(monkeypatch, [SUBMITTED, "Status=WAITING", "Status=WAITING", NO_HITS_XML])

    remote_blast.run_remote_blast(**REQUEST)

    assert [call[1] for call in state.calls] == [0, 20, 80, 140]
    assert {call[2]["params"]["RID"] for call in state.calls[1:]} == {"TEST12345678"}


@pytest.mark.parametrize("failure", [httpx.ConnectError("offline"), httpx.ReadTimeout("slow"), (503, "unavailable")])
def test_submission_is_never_retried(monkeypatch, failure):
    state = mock_network(monkeypatch, [failure])

    with pytest.raises(remote_blast.RemoteBlastError):
        remote_blast.run_remote_blast(**REQUEST)

    assert len(state.calls) == 1
    assert state.calls[0][0] == "POST"


def test_transient_get_retries_same_rid_without_new_submission(monkeypatch):
    state = mock_network(monkeypatch, [SUBMITTED, (503, "busy"), httpx.ConnectError("offline"), NO_HITS_XML])

    remote_blast.run_remote_blast(**REQUEST)

    assert [call[0] for call in state.calls] == ["POST", "GET", "GET", "GET"]
    assert [call[1] for call in state.calls] == [0, 20, 80, 140]


def test_get_retries_are_finite_and_do_not_retry_client_error(monkeypatch):
    state = mock_network(monkeypatch, [SUBMITTED, (400, "invalid request")])

    with pytest.raises(remote_blast.RemoteBlastUnavailable):
        remote_blast.run_remote_blast(**REQUEST)

    assert len(state.calls) == 2


def test_repeated_server_errors_stop_after_three_get_attempts(monkeypatch):
    state = mock_network(monkeypatch, [SUBMITTED, (503, "busy"), (502, "busy"), (503, "busy")])

    with pytest.raises(remote_blast.RemoteBlastUnavailable):
        remote_blast.run_remote_blast(**REQUEST)

    assert [call[0] for call in state.calls] == ["POST", "GET", "GET", "GET"]


def test_waiting_until_deadline_is_timeout_not_zero_hits(monkeypatch):
    state = mock_network(monkeypatch, [SUBMITTED, *("Status=WAITING" for _ in range(4))])

    with pytest.raises(TimeoutError):
        remote_blast.run_remote_blast(**REQUEST)

    assert [call[1] for call in state.calls] == [0, 20, 80, 140, 200]
    assert state.now < 240


@pytest.mark.parametrize("body", ["", "\n\n", "<html>Service unavailable</html>", "<?xml version='1.0'?><broken>", "Status=FAILED", "Status=UNKNOWN"])
def test_invalid_response_is_never_reported_as_success(monkeypatch, body):
    state = mock_network(monkeypatch, [SUBMITTED, body])

    with pytest.raises(ValueError):
        remote_blast.run_remote_blast(**REQUEST)

    assert len(state.calls) == 2


def test_empty_parser_result_is_invalid_response(monkeypatch):
    mock_network(monkeypatch, [SUBMITTED, NO_HITS_XML])
    monkeypatch.setattr(remote_blast.NCBIXML, "parse", lambda _stream: iter([]))

    with pytest.raises(remote_blast.RemoteBlastResponseError, match="no query result"):
        remote_blast.run_remote_blast(**REQUEST)


def test_total_deadline_cancels_a_slow_http_request(monkeypatch):
    async def slow_response():
        await asyncio.sleep(1)
        return httpx.Response(200, text=SUBMITTED)

    state = mock_network(monkeypatch, [slow_response])
    monkeypatch.setattr(remote_blast, "TOTAL_TIMEOUT_SECONDS", 0.02)

    with pytest.raises(remote_blast.RemoteBlastTimeout):
        remote_blast.run_remote_blast(**REQUEST)

    assert len(state.calls) == 1


def test_future_poll_does_not_block_an_immediate_submission(monkeypatch):
    state = SimpleNamespace(now=0.0)
    monkeypatch.setattr(remote_blast, "time", SimpleNamespace(monotonic=lambda: state.now))
    monkeypatch.setattr(remote_blast, "_next_contact_at", 0.0)

    async def scenario():
        release_poll = asyncio.Event()

        async def controlled_sleep(when, _deadline):
            if when == 60 and state.now < 60:
                await release_poll.wait()
            state.now = max(state.now, when)

        monkeypatch.setattr(remote_blast, "_sleep_until", controlled_sleep)
        poll = asyncio.create_task(remote_blast._wait_for_contact(60, 240))
        await asyncio.sleep(0)
        await remote_blast._wait_for_contact(0, 240)
        assert state.now == 0
        assert remote_blast._next_contact_at == 10
        release_poll.set()
        await poll
        assert remote_blast._next_contact_at == 70

    asyncio.run(scenario())
