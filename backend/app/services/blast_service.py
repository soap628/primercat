import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha1

from app.schemas.blast import BlastRequest, BlastResponse, BlastHit, BlastHsp, BlastSearchParameters
from app.services.ncbi_client import cached_call
from app.services.remote_blast import run_remote_blast as run_qblast

_executor = ThreadPoolExecutor(max_workers=4)
_pending: dict[str, asyncio.Future] = {}
_logger = logging.getLogger(__name__)


def _response(req: BlastRequest, **values) -> BlastResponse:
    return BlastResponse(
        program=req.program.value, database=req.database.value,
        query_length=len(req.sequence), query_sequence=req.sequence,
        search_parameters=BlastSearchParameters(
            short_query=bool(req.short_query), expect=req.expect,
            word_size=7 if req.short_query else None,
            species=req.species, hitlist_size=req.hitlist_size,
        ), **values,
    )


def _failure(req: BlastRequest, code: str, message: str) -> BlastResponse:
    return _response(req, success=False, hits=[], error_code=code, message=message)


def _run_blast(req: BlastRequest) -> BlastResponse:
    """同步 BLAST 查询，运行在线程池中避免阻塞事件循环。"""
    sequence = req.sequence.strip()
    sequence_hash = sha1(sequence.encode("utf-8")).hexdigest()

    def _load() -> BlastResponse:
        try:
            short_options = {}
            if req.short_query:
                # NCBI short nucleotide settings; E-value remains visible/editable in the UI.
                # https://www.ncbi.nlm.nih.gov/books/NBK279684/table/appendices.T.blastn_application_options/
                short_options = {
                    "word_size": 7,
                    "nucl_reward": 1,
                    "nucl_penalty": -3,
                    "gapcosts": "5 2",
                    "filter": "F",
                }
                if req.species:
                    taxid = {"human": "9606", "mouse": "10090"}[req.species]
                    short_options["entrez_query"] = f"txid{taxid}[Organism:exp]"
            blast_records = run_qblast(
                program=req.program.value,
                database=req.database.value,
                sequence=sequence,
                hitlist_size=req.hitlist_size,
                expect=req.expect,
                format_type="XML",
                **short_options,
            )
        except TimeoutError:
            return _failure(req, "timeout", "NCBI BLAST timed out; no completed result was received.")
        except ValueError:
            return _failure(req, "invalid_response", "NCBI BLAST returned an invalid or incomplete response.")
        except Exception:
            _logger.exception("Remote BLAST request failed")
            return _failure(req, "unavailable", "NCBI BLAST is temporarily unavailable. Please try again later.")

        # A real no-hit report still contains one query record. Empty/multiple
        # records are not scientific negative evidence and must not be cached.
        if len(blast_records) != 1:
            return _failure(req, "invalid_response", "NCBI BLAST did not return one complete query record.")

        record = blast_records[0]
        if getattr(record, "query_letters", None) != len(sequence):
            return _failure(req, "invalid_response", "NCBI BLAST returned an unexpected query length.")
        hits = []

        for rank, alignment in enumerate(record.alignments, start=1):
            if not alignment.hsps:
                continue
            hsp = max(alignment.hsps, key=lambda h: h.bits)
            if hsp.align_length <= 0:
                return _failure(req, "invalid_response", "NCBI BLAST returned an invalid alignment length.")
            identity_pct = round(hsp.identities / hsp.align_length * 100, 1)
            gaps_pct = round((hsp.gaps or 0) / hsp.align_length * 100, 1)

            hits.append(
                BlastHit(
                    rank=rank,
                    accession=alignment.accession,
                    title=alignment.title[:300],  # Display truncation; full title not needed for UI
                    length=alignment.length,
                    best_hsp=BlastHsp(
                        score=hsp.score,
                        bits=round(hsp.bits, 1),
                        expect=hsp.expect,
                        identity_pct=identity_pct,
                        gaps_pct=gaps_pct,
                        align_length=hsp.align_length,
                        query_start=hsp.query_start,
                        query_end=hsp.query_end,
                        subject_start=hsp.sbjct_start,
                        subject_end=hsp.sbjct_end,
                        query_seq=str(hsp.query)[:300],      # Display truncation
                        subject_seq=str(hsp.sbjct)[:300],    # Display truncation
                        midline=str(hsp.match)[:300],        # Display truncation
                    ),
                )
            )

        return _response(
            req,
            success=True,
            hits=hits,
            message=f"Returned {len(hits)} matching sequences under the selected search settings.",
        )

    return cached_call(
        "blast_sequence_short_v2",
        req.program.value,
        req.database.value,
        req.hitlist_size,
        req.expect,
        req.short_query,
        req.species,
        sequence_hash,
        loader=_load,
        should_cache=lambda response: response.success,
    )


async def blast_sequence(req: BlastRequest) -> BlastResponse:
    """Share identical in-flight work; keep the per-worker queue bounded."""
    loop = asyncio.get_running_loop()
    key = sha1(req.model_dump_json().encode()).hexdigest()
    future = _pending.get(key)
    if future is None:
        if len(_pending) >= 4:
            return _failure(req, "busy", "BLAST capacity is busy. Please try again shortly.")
        future = loop.run_in_executor(_executor, _run_blast, req)
        _pending[key] = future
        future.add_done_callback(lambda done: _pending.pop(key, None) if _pending.get(key) is done else None)
    try:
        # Cancellation of one HTTP client must not abandon the shared worker.
        return await asyncio.wait_for(asyncio.shield(future), timeout=250)
    except TimeoutError:
        return _failure(req, "timeout", "NCBI BLAST timed out; no completed result was received.")
