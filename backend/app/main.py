import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.routes import primer, grna, blast, gene_primer
from app.api.routes import auth, jobs
from app.core.config import settings
import app.db.models  # noqa: F401 — ensure all ORM models are registered in Base.metadata

logger = logging.getLogger("primercat")

app = FastAPI(
    title="PrimerCat API",
    description="qPCR 引物设计 & CRISPR gRNA 设计 & BLAST 序列比对平台",
    version="0.1.0",
)


@app.on_event("startup")
async def _check_secret_key() -> None:
    if settings.SECRET_KEY == "change-me-in-production":
        raise RuntimeError(
            "SECRET_KEY is still set to the default placeholder value. "
            "Set a strong random value in your .env file before starting the server."
        )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "Authorization"],
)

app.include_router(primer.router, prefix="/api/v1")
app.include_router(grna.router, prefix="/api/v1")
app.include_router(blast.router, prefix="/api/v1")
app.include_router(gene_primer.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "Unhandled exception | %s %s",
        request.method,
        request.url.path,
        exc_info=exc,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "服务器内部错误，请稍后重试"},
    )


@app.get("/")
def root():
    return {"status": "ok", "message": "BioDesign API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}
