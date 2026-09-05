"""Bounded NCBI BLAST submission and polling for the interactive BLAST tool.

NCBI requires at least 10 seconds between contacts and 60 seconds between polls
for one RID: https://blast.ncbi.nlm.nih.gov/doc/blast-help/developerinfo.html
Parameter reference: https://blast.ncbi.nlm.nih.gov/doc/blast-help/urlapi.html
"""

import asyncio
from io import StringIO
import re
from threading import Lock
import time
from typing import Any

import httpx
from Bio.Blast import NCBIXML

from app.core.config import settings

BLAST_URL = "https://blast.ncbi.nlm.nih.gov/Blast.cgi"
TOTAL_TIMEOUT_SECONDS = 240.0
HTTP_TIMEOUT_SECONDS = 25.0
CONTACT_INTERVAL_SECONDS = 10.0
POLL_INTERVAL_SECONDS = 60.0
INITIAL_WAIT_SECONDS = 20.0
GET_ATTEMPTS = 3
_contact_lock = Lock()
_next_contact_at = 0.0


class RemoteBlastError(RuntimeError):
    """NCBI did not provide a usable completed BLAST result."""


class RemoteBlastTimeout(RemoteBlastError, TimeoutError):
    """The HTTP request or total search deadline expired."""


class RemoteBlastUnavailable(RemoteBlastError):
    """NCBI could not be reached or returned an unsuccessful HTTP response."""


class RemoteBlastResponseError(RemoteBlastError, ValueError):
    """NCBI returned an empty, failed, or malformed response, not zero hits."""


async def _sleep_until(when: float, deadline: float) -> None:
    now = time.monotonic()
    if now >= deadline or when >= deadline:
        raise RemoteBlastTimeout("NCBI BLAST did not finish within the search time limit.")
    if when > now:
        await asyncio.sleep(when - now)


async def _wait_for_contact(not_before: float, deadline: float) -> None:
    # A distant poll must not reserve a future slot before a new submission can
    # use the server now. Join the shared contact queue only when this RID is due.
    await _sleep_until(not_before, deadline)
    # Reserve a slot before sleeping so concurrent BLAST tool requests in this
    # worker obey the global contact interval as well as the per-RID interval.
    global _next_contact_at
    with _contact_lock:
        when = max(time.monotonic(), _next_contact_at)
        if when >= deadline:
            raise RemoteBlastTimeout("NCBI BLAST could not run within the search time limit.")
        _next_contact_at = when + CONTACT_INTERVAL_SECONDS
    await _sleep_until(when, deadline)


async def _request(
    client: httpx.AsyncClient,
    method: str,
    parameters: dict[str, Any],
    deadline: float,
    not_before: float,
) -> tuple[str, float]:
    # Never repeat Put: a failed response may follow a successful submission.
    attempts = GET_ATTEMPTS if method == "GET" else 1
    for attempt in range(attempts):
        await _wait_for_contact(not_before, deadline)
        started = time.monotonic()
        timeout = min(HTTP_TIMEOUT_SECONDS, deadline - started)
        if timeout <= 0:
            raise RemoteBlastTimeout("NCBI BLAST search time limit expired.")
        try:
            options = {"params": parameters} if method == "GET" else {"data": parameters}
            # wait_for also bounds the complete response download; httpx's
            # socket timeouts alone apply separately to network operations.
            response = await asyncio.wait_for(
                client.request(method, BLAST_URL, timeout=timeout, **options),
                timeout=timeout,
            )
        except (httpx.TimeoutException, asyncio.TimeoutError) as exc:
            if attempt + 1 == attempts:
                raise RemoteBlastTimeout("NCBI BLAST response timed out.") from exc
        except httpx.TransportError as exc:
            if attempt + 1 == attempts:
                raise RemoteBlastUnavailable("NCBI BLAST could not be reached.") from exc
        else:
            if response.is_success:
                text = response.text.strip()
                if not text:
                    raise RemoteBlastResponseError("NCBI BLAST returned an empty response.")
                return text, started
            if not (500 <= response.status_code < 600) or attempt + 1 == attempts:
                raise RemoteBlastUnavailable(f"NCBI BLAST returned HTTP {response.status_code}.")
        # A retry is still a poll of the same RID and must wait one minute.
        not_before = started + POLL_INTERVAL_SECONDS
    raise RemoteBlastUnavailable("NCBI BLAST result retrieval failed.")


def _parameters(kwargs: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    options = dict(kwargs)
    program = options.pop("program")
    database = options.pop("database")
    sequence = options.pop("sequence")
    if program not in {"blastn", "blastp", "blastx", "tblastn", "tblastx"}:
        raise ValueError("Unsupported BLAST program.")
    output_format = options.pop("format_type", "XML")
    if output_format not in {"XML", "XML2", "XML2_S"}:
        raise ValueError("The BLAST tool requires XML results.")
    identity = {"email": settings.NCBI_EMAIL or "primercat@example.com", "tool": settings.NCBI_TOOL}
    put: dict[str, Any] = {
        "CMD": "Put", "PROGRAM": program, "DATABASE": database, "QUERY": sequence,
        "EXPECT": 10, "HITLIST_SIZE": 50, **identity,
    }
    # XML2_S is a single uncompressed XML document, supported by NCBIXML.
    get: dict[str, Any] = {"CMD": "Get", "FORMAT_TYPE": "XML2_S", **identity}
    get_keys = {"alignments", "descriptions", "ncbi_gi"}
    put_keys = {
        "expect", "hitlist_size", "filter", "gapcosts", "nucl_penalty", "nucl_reward",
        "word_size", "entrez_query", "composition_based_statistics", "megablast",
        "matrix_name", "short_query",
    }
    names = {"matrix_name": "MATRIX", "short_query": "SHORT_QUERY_ADJUST"}
    for key, value in options.items():
        if key not in get_keys | put_keys:
            raise ValueError(f"Unsupported BLAST option: {key}")
        if value is not None:
            target = get if key in get_keys else put
            target[names.get(key, key.upper())] = str(value).lower() if isinstance(value, bool) else value
    return put, get


def _parse_result(text: str) -> list[Any]:
    if not text.lstrip("\ufeff").startswith("<?xml"):
        raise RemoteBlastResponseError("NCBI BLAST returned a non-XML result.")
    try:
        stream = StringIO(text.lstrip("\ufeff"))
        records = list(NCBIXML.parse(stream))
    except Exception as exc:
        raise RemoteBlastResponseError("NCBI BLAST returned an invalid or incomplete XML result.") from exc
    if not records:
        raise RemoteBlastResponseError("NCBI BLAST returned no query result records.")
    return records


async def _run_remote_blast(kwargs: dict[str, Any]) -> list[Any]:
    deadline = time.monotonic() + TOTAL_TIMEOUT_SECONDS
    put, get = _parameters(kwargs)
    async with httpx.AsyncClient(
        follow_redirects=False,
        headers={"User-Agent": f"{settings.NCBI_TOOL}/remote-blast"},
    ) as client:
        submitted, _ = await _request(client, "POST", put, deadline, time.monotonic())
        rid_match = re.search(r"\bRID\s*=\s*([A-Z0-9-]{8,40})\b", submitted)
        if not rid_match:
            raise RemoteBlastResponseError("NCBI BLAST did not return a search request ID.")
        get["RID"] = rid_match.group(1)
        rtoe_match = re.search(r"\bRTOE\s*=\s*(\d+)\b", submitted)
        initial_wait = max(INITIAL_WAIT_SECONDS, float(rtoe_match.group(1)) if rtoe_match else 0)
        next_poll_at = time.monotonic() + initial_wait
        while True:
            result, started = await _request(client, "GET", get, deadline, next_poll_at)
            status = re.search(r"\bStatus\s*=\s*(\w+)", result, re.I)
            if status:
                value = status.group(1).upper()
                if value == "WAITING":
                    next_poll_at = started + POLL_INTERVAL_SECONDS
                    continue
                if value in {"FAILED", "UNKNOWN"}:
                    raise RemoteBlastResponseError(f"NCBI BLAST search status is {value}.")
            records = _parse_result(result)
            if time.monotonic() >= deadline:
                raise RemoteBlastTimeout("NCBI BLAST search time limit expired.")
            return records


def run_remote_blast(**kwargs: Any) -> list[Any]:
    """Submit exactly once and retrieve parsed records within 240 seconds.

Called from the BLAST worker thread. A valid query record with no alignments
represents zero hits; an empty response or missing query record is an error.
"""
    async def bounded() -> list[Any]:
        return await asyncio.wait_for(_run_remote_blast(kwargs), timeout=TOTAL_TIMEOUT_SECONDS)

    try:
        return asyncio.run(bounded())
    except asyncio.TimeoutError as exc:
        raise RemoteBlastTimeout("NCBI BLAST did not finish within the search time limit.") from exc
