from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_
from typing import Literal

from app.db.session import get_db
from app.db.models.user import User
from app.db.models.jobs import PrimerJob, GrnaJob, BlastJob
from app.core.security import get_current_user

router = APIRouter(prefix="/jobs", tags=["History"])

_JOB_MODELS = {"primer": PrimerJob, "grna": GrnaJob, "blast": BlastJob}


@router.get("/primer")
async def list_primer_jobs(skip: int = 0, limit: int = 20, q: str = Query(""), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(PrimerJob).where(PrimerJob.user_id == current_user.id)
    if q:
        stmt = stmt.where(or_(PrimerJob.gene_name.ilike(f"%{q}%"), PrimerJob.sequence_snippet.ilike(f"%{q}%")))
    result = await db.execute(stmt.order_by(desc(PrimerJob.created_at)).offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/grna")
async def list_grna_jobs(skip: int = 0, limit: int = 20, q: str = Query(""), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(GrnaJob).where(GrnaJob.user_id == current_user.id)
    if q:
        stmt = stmt.where(or_(GrnaJob.gene_name.ilike(f"%{q}%"), GrnaJob.sequence_snippet.ilike(f"%{q}%")))
    result = await db.execute(stmt.order_by(desc(GrnaJob.created_at)).offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/blast")
async def list_blast_jobs(skip: int = 0, limit: int = 20, q: str = Query(""), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(BlastJob).where(BlastJob.user_id == current_user.id)
    if q:
        stmt = stmt.where(BlastJob.sequence_snippet.ilike(f"%{q}%"))
    result = await db.execute(stmt.order_by(desc(BlastJob.created_at)).offset(skip).limit(limit))
    return result.scalars().all()


@router.delete("/{job_type}/{job_id}", status_code=204)
async def delete_job(job_type: Literal["primer", "grna", "blast"], job_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    Model = _JOB_MODELS.get(job_type)
    if not Model:
        raise HTTPException(status_code=400, detail="Invalid job type")
    result = await db.execute(select(Model).where(Model.id == job_id, Model.user_id == current_user.id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    await db.delete(job)
    await db.commit()
