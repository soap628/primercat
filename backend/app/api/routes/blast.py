from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.blast import BlastRequest, BlastResponse
from app.services.blast_service import blast_sequence
from app.db.session import get_db
from app.db.models.jobs import BlastJob
from app.core.security import get_optional_user
from app.core.rate_limit import rate_limit_dependency

router = APIRouter(prefix="/blast", tags=["BLAST 序列比对"])


@router.post("/search", response_model=BlastResponse)
async def blast_search(
    req: BlastRequest,
    current_user=Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit_dependency(rpm=10),
):
    result = await blast_sequence(req)
    if current_user and result.success:
        job = BlastJob(
            user_id=current_user.id,
            sequence_snippet=req.sequence[:100],
            program=req.program or "blastn",
            database=req.database or "nt",
            result_json=result.model_dump(),
        )
        db.add(job)
        await db.commit()
    return result
