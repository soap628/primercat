import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class PrimerJob(Base):
    __tablename__ = "primer_jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    gene_name: Mapped[str] = mapped_column(String, nullable=False, default="")
    sequence_snippet: Mapped[str] = mapped_column(String, nullable=False, default="")
    mode: Mapped[str] = mapped_column(String, nullable=False, default="sequence")
    result_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class GrnaJob(Base):
    __tablename__ = "grna_jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    gene_name: Mapped[str] = mapped_column(String, nullable=False, default="")
    sequence_snippet: Mapped[str] = mapped_column(String, nullable=False, default="")
    cas_type: Mapped[str] = mapped_column(String, nullable=False, default="SpCas9")
    species: Mapped[str] = mapped_column(String, nullable=False, default="human")
    result_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class BlastJob(Base):
    __tablename__ = "blast_jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    sequence_snippet: Mapped[str] = mapped_column(String, nullable=False, default="")
    program: Mapped[str] = mapped_column(String, nullable=False, default="blastn")
    database: Mapped[str] = mapped_column(String, nullable=False, default="nt")
    result_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
