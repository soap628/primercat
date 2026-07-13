import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.grna import GrnaDesignRequest, GrnaDesignResponse, GrnaOffTargetReadinessResponse, Species
from app.services.grna_design import design_grna
from app.services.grna_genome_offtarget import get_grna_offtarget_readiness
from app.db.session import get_db
from app.db.models.jobs import GrnaJob
from app.core.security import get_optional_user
from app.core.rate_limit import rate_limit_dependency

logger = logging.getLogger("primercat")
router = APIRouter(prefix="/grna", tags=["CRISPR gRNA Design"])
_executor = ThreadPoolExecutor(max_workers=4)


@router.post("/design", response_model=GrnaDesignResponse)
async def design_guide_rna(
    req: GrnaDesignRequest,
    current_user=Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit_dependency(rpm=10),
):
    try:
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(_executor, design_grna, req)
    except Exception as exc:
        logger.exception("design_grna failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if current_user and result.success:
        try:
            job = GrnaJob(
                user_id=current_user.id,
                gene_name=req.gene_name or "",
                sequence_snippet=(req.sequence or "")[:100],
                cas_type=req.cas_type or "SpCas9",
                species=req.species or "human",
                result_json=result.model_dump(),
            )
            db.add(job)
            await db.commit()
        except Exception as exc:
            logger.exception("Failed to save GrnaJob: %s", exc)
            try:
                await db.rollback()
            except Exception:
                pass

    return result


@router.get("/offtarget-readiness", response_model=GrnaOffTargetReadinessResponse)
def grna_offtarget_readiness(species: Species = Query(Species.human)):
    return get_grna_offtarget_readiness(species.value)
