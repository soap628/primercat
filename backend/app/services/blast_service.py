import asyncio
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha1

from app.schemas.blast import BlastRequest, BlastResponse, BlastHit, BlastHsp
from app.services.ncbi_client import cached_call, run_qblast

_executor = ThreadPoolExecutor(max_workers=4)


def _run_blast(req: BlastRequest) -> BlastResponse:
    """同步 BLAST 查询，运行在线程池中避免阻塞事件循环。"""
    sequence = req.sequence.strip()
    sequence_hash = sha1(sequence.encode("utf-8")).hexdigest()

    def _load() -> BlastResponse:
        try:
            blast_records = run_qblast(
                program=req.program.value,
                database=req.database.value,
                sequence=sequence,
                hitlist_size=req.hitlist_size,
                expect=req.expect,
                format_type="XML",
            )
        except Exception as e:
            return BlastResponse(
                success=False,
                program=req.program.value,
                database=req.database.value,
                query_length=len(req.sequence),
                hits=[],
                message=f"NCBI BLAST 请求失败: {str(e)}",
            )

        if not blast_records:
            return BlastResponse(
                success=True,
                program=req.program.value,
                database=req.database.value,
                query_length=len(req.sequence),
                hits=[],
                message="未找到相似序列",
            )

        record = blast_records[0]
        hits = []

        for rank, alignment in enumerate(record.alignments, start=1):
            if not alignment.hsps:
                continue
            hsp = alignment.hsps[0]  # 取最优 HSP
            identity_pct = round(hsp.identities / hsp.align_length * 100, 1)
            gaps_pct = round((hsp.gaps or 0) / hsp.align_length * 100, 1)

            hits.append(
                BlastHit(
                    rank=rank,
                    accession=alignment.accession,
                    title=alignment.title[:120],  # 截断过长的标题
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
                        query_seq=str(hsp.query)[:120],
                        subject_seq=str(hsp.sbjct)[:120],
                        midline=str(hsp.match)[:120],
                    ),
                )
            )

        return BlastResponse(
            success=True,
            program=req.program.value,
            database=req.database.value,
            query_length=len(req.sequence),
            hits=hits,
            message=f"找到 {len(hits)} 个相似序列",
        )

    return cached_call(
        "blast_sequence",
        req.program.value,
        req.database.value,
        req.hitlist_size,
        req.expect,
        sequence_hash,
        loader=_load,
        should_cache=lambda response: response.success,
    )


async def blast_sequence(req: BlastRequest) -> BlastResponse:
    """异步入口，将同步 BLAST 查询投入线程池。"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _run_blast, req)
