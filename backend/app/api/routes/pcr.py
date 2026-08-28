import asyncio
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_optional_user
from app.db.models.jobs import PrimerJob
from app.db.session import get_db
from app.schemas.pcr import PCRDesignRequest, PCRDesignResponse
from app.services.pcr_design import design_pcr_primers


router = APIRouter(prefix="/pcr", tags=["PCR primer design"])
_executor = ThreadPoolExecutor(max_workers=4)


@router.post("/design", response_model=PCRDesignResponse)
async def design_pcr(
    req: PCRDesignRequest,
    current_user=Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(_executor, design_pcr_primers, req)
    if current_user and result.success:
        job = PrimerJob(
            user_id=current_user.id,
            gene_name=req.label or "",
            sequence_snippet=req.sequence[:100],
            mode="pcr",
            result_json=result.model_dump(),
        )
        db.add(job)
        await db.commit()
    return result
