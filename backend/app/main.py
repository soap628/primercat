from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import primer, grna, blast, gene_primer
from app.api.routes import auth, jobs
from app.core.config import settings

app = FastAPI(
    title="PrimerCat API",
    description="qPCR 引物设计 & CRISPR gRNA 设计 & BLAST 序列比对平台",
    version="0.1.0",
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


@app.get("/")
def root():
    return {"status": "ok", "message": "BioDesign API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}
