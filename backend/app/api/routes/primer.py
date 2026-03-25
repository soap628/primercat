from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.primer import PrimerDesignRequest, PrimerDesignResponse
from app.services.primer_design import design_qpcr_primers
from app.db.session import get_db
from app.db.models.jobs import PrimerJob
from app.core.security import get_optional_user

router = APIRouter(prefix="/primer", tags=["qPCR 引物设计"])


@router.post("/design", response_model=PrimerDesignResponse)
async def design_primers(
    req: PrimerDesignRequest,
    current_user=Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    result = design_qpcr_primers(req)
    if current_user and result.success:
        job = PrimerJob(
            user_id=current_user.id,
            gene_name=req.gene_name or "",
            sequence_snippet=req.sequence[:100],
            mode="sequence",
            result_json=result.model_dump(),
        )
        db.add(job)
        await db.commit()
    return result
