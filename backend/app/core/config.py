from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:pass@localhost:5432/primercat"
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    NCBI_API_KEY: str = ""
    NCBI_EMAIL: str = "admin@example.com"
    NCBI_TOOL: str = "primercat"
    NCBI_REQUEST_INTERVAL_SECONDS: float = 0.34
    NCBI_REQUEST_INTERVAL_WITH_API_KEY_SECONDS: float = 0.11
    NCBI_CACHE_TTL_SECONDS: int = 3600
    NCBI_CACHE_MAXSIZE: int = 256
    NCBI_CACHE_DIR: str = ""  # set to a writable path to enable shared diskcache (multi-worker)
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    GRNA_OFFTARGET_BACKEND: str = "auto"
    GRNA_ENABLE_NT_BLAST_FALLBACK: bool = True
    GRNA_MAX_OFFTARGET_MISMATCHES: int = 3
    GRNA_BOWTIE2_PATH: str = "bowtie2"
    GRNA_BOWTIE2_MAX_ALIGNMENTS: int = 32
    GRNA_BOWTIE2_INDEX_HUMAN: str = ""
    GRNA_BOWTIE2_INDEX_MOUSE: str = ""
    GRNA_GENOME_FASTA_HUMAN: str = ""
    GRNA_GENOME_FASTA_MOUSE: str = ""
    GRNA_ANNOTATION_GTF_HUMAN: str = ""
    GRNA_ANNOTATION_GTF_MOUSE: str = ""
    GRNA_ANNOTATION_DB_HUMAN: str = ""
    GRNA_ANNOTATION_DB_MOUSE: str = ""
    GRNA_PROMOTER_WINDOW_BP: int = 2000
    QPCR_GENOME_MAX_ALIGNMENTS_PER_PRIMER: int = 64
    QPCR_GENOME_MIN_AMPLICON_BP: int = 50
    QPCR_GENOME_MAX_AMPLICON_BP: int = 5000
    GENOME_REFERENCE_ASSEMBLY_HUMAN: str = "GCF_000001405.40"
    GENOME_REFERENCE_ASSEMBLY_MOUSE: str = "GCF_000001635.27"
    QPCR_TRANSCRIPT_LOCUS_DB_HUMAN: str = ""
    QPCR_TRANSCRIPT_LOCUS_DB_MOUSE: str = ""
    QPCR_TRANSCRIPTOME_BOWTIE2_INDEX_HUMAN: str = ""
    QPCR_TRANSCRIPTOME_BOWTIE2_INDEX_MOUSE: str = ""
    QPCR_TRANSCRIPTOME_FASTA_HUMAN: str = ""
    QPCR_TRANSCRIPTOME_FASTA_MOUSE: str = ""
    QPCR_TRANSCRIPTOME_MAX_ALIGNMENTS_PER_PRIMER: int = 128
    QPCR_TRANSCRIPTOME_MIN_AMPLICON_BP: int = 50
    QPCR_TRANSCRIPTOME_MAX_AMPLICON_BP: int = 5000
    DEBUG: bool = False
    COOKIE_SECURE: bool = False  # Set to True in production (HTTPS required)
    COOKIE_SAMESITE: str = "lax"

    @property
    def cors_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",") if origin.strip()]
        return origins or ["http://localhost:3000"]

    @property
    def ncbi_request_interval_seconds(self) -> float:
        if self.NCBI_API_KEY:
            return self.NCBI_REQUEST_INTERVAL_WITH_API_KEY_SECONDS
        return self.NCBI_REQUEST_INTERVAL_SECONDS

    @property
    def grna_bowtie2_index_by_species(self) -> dict[str, str]:
        return {
            "human": self.GRNA_BOWTIE2_INDEX_HUMAN,
            "mouse": self.GRNA_BOWTIE2_INDEX_MOUSE,
        }

    @property
    def grna_genome_fasta_by_species(self) -> dict[str, str]:
        return {
            "human": self.GRNA_GENOME_FASTA_HUMAN,
            "mouse": self.GRNA_GENOME_FASTA_MOUSE,
        }

    @property
    def grna_annotation_gtf_by_species(self) -> dict[str, str]:
        return {
            "human": self.GRNA_ANNOTATION_GTF_HUMAN,
            "mouse": self.GRNA_ANNOTATION_GTF_MOUSE,
        }

    @property
    def grna_annotation_db_by_species(self) -> dict[str, str]:
        return {
            "human": self.GRNA_ANNOTATION_DB_HUMAN,
            "mouse": self.GRNA_ANNOTATION_DB_MOUSE,
        }

    @property
    def genome_reference_assembly_by_species(self) -> dict[str, str]:
        return {
            "human": self.GENOME_REFERENCE_ASSEMBLY_HUMAN,
            "mouse": self.GENOME_REFERENCE_ASSEMBLY_MOUSE,
        }

    @property
    def qpcr_transcript_locus_db_by_species(self) -> dict[str, str]:
        return {
            "human": self.QPCR_TRANSCRIPT_LOCUS_DB_HUMAN,
            "mouse": self.QPCR_TRANSCRIPT_LOCUS_DB_MOUSE,
        }

    @property
    def qpcr_transcriptome_bowtie2_index_by_species(self) -> dict[str, str]:
        return {
            "human": self.QPCR_TRANSCRIPTOME_BOWTIE2_INDEX_HUMAN,
            "mouse": self.QPCR_TRANSCRIPTOME_BOWTIE2_INDEX_MOUSE,
        }

    @property
    def qpcr_transcriptome_fasta_by_species(self) -> dict[str, str]:
        return {
            "human": self.QPCR_TRANSCRIPTOME_FASTA_HUMAN,
            "mouse": self.QPCR_TRANSCRIPTOME_FASTA_MOUSE,
        }

    class Config:
        env_file = ".env"


settings = Settings()
