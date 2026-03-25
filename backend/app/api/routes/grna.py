from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.grna import GrnaDesignRequest, GrnaDesignResponse, GrnaOffTargetReadinessResponse, Species
from app.services.grna_design import design_grna
from app.services.grna_genome_offtarget import get_grna_offtarget_readiness
from app.db.session import get_db
from app.db.models.jobs import GrnaJob
from app.core.security import get_optional_user

router = APIRouter(prefix="/grna", tags=["CRISPR gRNA Design"])


@router.post("/design", response_model=GrnaDesignResponse)
async def design_guide_rna(
    req: GrnaDesignRequest,
    current_user=Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    result = design_grna(req)
    if current_user and result.success:
        job = GrnaJob(
            user_id=current_user.id,
            gene_name=req.gene_name or "",
            sequence_snippet=req.sequence[:100],
            cas_type=req.cas_type or "SpCas9",
            species=req.species or "human",
            result_json=result.model_dump(),
        )
        db.add(job)
        await db.commit()
    return result


@router.get("/offtarget-readiness", response_model=GrnaOffTargetReadinessResponse)
def grna_offtarget_readiness(species: Species = Query(Species.human)):
    return get_grna_offtarget_readiness(species.value)
