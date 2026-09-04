import asyncio
import json
import logging
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.schemas.gene_primer import (
    GeneLiteratureResponse,
    GenePrimerRequest,
    KnownPrimerCatalogResponse,
    KnownPrimerValidationRequest,
    KnownPrimerValidationResponse,
    Species,
)
from app.services.gene_literature import query_gene_literature
from app.services.gene_primer_service import gene_primer_stream
from app.services.known_primer_catalog import query_known_primers
from app.services.known_primer_validation import validate_known_primer_pair
from app.db.session import AsyncSessionLocal
from app.db.models.jobs import PrimerJob
from app.core.security import get_optional_user
from app.core.rate_limit import rate_limit_dependency

router = APIRouter(prefix="/gene-primer", tags=["qPCR 引物设计（智能模式）"])
logger = logging.getLogger("uvicorn")


async def _save_primer_job(user_id: str, req: GenePrimerRequest, result_data: dict):
    try:
        async with AsyncSessionLocal() as db:
            job = PrimerJob(
                user_id=user_id,
                gene_name=result_data.get("gene_name") or getattr(req, "gene_name", "") or "",
                sequence_snippet=(getattr(req, "sequence", "") or "")[:100],
                mode=str(getattr(req, "mode", "gene") or "gene"),
                result_json=result_data,
            )
            db.add(job)
            await db.commit()
            logger.info(f"[gene_primer] job saved for user {user_id}")
    except Exception as e:
        logger.error(f"[gene_primer] save failed: {e}")


async def _stream_and_save(req: GenePrimerRequest, user):
    logger.info(f"[gene_primer] stream start | user={getattr(user, 'id', None)}")
    async for chunk in gene_primer_stream(req):
        yield chunk
        # 一拿到 result 立刻发起独立保存任务，不等 generator 结束
        if chunk.startswith("event: result\n"):
            logger.info(f"[gene_primer] result chunk | user={getattr(user, 'id', None)}")
        if user and chunk.startswith("event: result\n"):
            try:
                data_line = chunk.split("data: ", 1)[1].strip()
                result_data = json.loads(data_line)
                if result_data.get("success"):
                    asyncio.create_task(_save_primer_job(user.id, req, result_data))
                    logger.info(f"[gene_primer] save task created for user {user.id}")
            except Exception as e:
                logger.error(f"[gene_primer] parse result failed: {e}")


@router.post("/design")
async def design_gene_primers(
    req: GenePrimerRequest,
    current_user=Depends(get_optional_user),
    _rl: None = rate_limit_dependency(rpm=3),
):
    return StreamingResponse(
        _stream_and_save(req, current_user),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/validate-known", response_model=KnownPrimerValidationResponse)
async def validate_known_primers(
    req: KnownPrimerValidationRequest,
    _rl: None = rate_limit_dependency(rpm=10),
):
    return await validate_known_primer_pair(req)


@router.get("/known", response_model=KnownPrimerCatalogResponse)
async def get_known_primers(
    gene: str = Query(..., min_length=1, max_length=100),
    species: Species = Query(...),
    target_transcript: str | None = Query(None, max_length=32),
    limit: int = Query(5, ge=1, le=10),
    _rl: None = rate_limit_dependency(rpm=30),
):
    return await asyncio.to_thread(
        query_known_primers,
        gene,
        species,
        target_transcript,
        limit,
    )


@router.get("/literature", response_model=GeneLiteratureResponse)
async def get_gene_literature(
    gene: str = Query(..., min_length=1, max_length=100, pattern=r"^[\w.-]+$"),
    species: Species = Query(...),
    limit: int = Query(6, ge=1, le=10),
    _rl: None = rate_limit_dependency(rpm=20),
):
    return await asyncio.to_thread(query_gene_literature, gene, species, limit)
