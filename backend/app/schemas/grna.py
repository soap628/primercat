from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class CasType(str, Enum):
    cas9 = "SpCas9"
    cas12a = "Cas12a"
    cas9_ng = "SpCas9-NG"


class Species(str, Enum):
    human = "human"
    mouse = "mouse"


class GrnaRiskLevel(str, Enum):
    low = "Low"
    medium = "Medium"
    high = "High"


class OffTargetStatus(str, Enum):
    validated = "validated"
    no_hits = "no_hits"
    anchor_missing = "anchor_missing"
    error = "error"
    skipped = "skipped"


class OffTargetReadinessStatus(str, Enum):
    ready = "ready"
    fallback = "fallback"
    unavailable = "unavailable"
    disabled = "disabled"


class TargetLocusAnchorStatus(str, Enum):
    not_provided = "not_provided"
    matched = "matched"
    partial = "partial"
    no_match = "no_match"
    unavailable = "unavailable"


class GrnaHitAnnotationStatus(str, Enum):
    annotated = "annotated"
    unavailable = "unavailable"


class GrnaHitRegion(str, Enum):
    cds = "cds"
    exon = "exon"
    intron = "intron"
    promoter = "promoter"
    intergenic = "intergenic"


class TargetLocus(BaseModel):
    accession: str = Field(..., description="Reference contig/accession name used by the configured genome index.")
    start: int = Field(..., description="1-based inclusive start coordinate.", ge=1)
    end: int = Field(..., description="1-based inclusive end coordinate.", ge=1)
    strand: Optional[str] = Field(None, description="Optional strand constraint (+ or -).")


class GrnaHitAnnotation(BaseModel):
    status: GrnaHitAnnotationStatus = GrnaHitAnnotationStatus.annotated
    region: Optional[GrnaHitRegion] = None
    gene_symbol: Optional[str] = None
    gene_id: Optional[str] = None
    transcript_id: Optional[str] = None
    gene_biotype: Optional[str] = None
    distance_to_tss: Optional[int] = None


class GrnaDesignRequest(BaseModel):
    sequence: str = Field(..., description="Target DNA sequence (5'->3').", min_length=23)
    cas_type: CasType = Field(CasType.cas9, description="Cas nuclease.")
    species: Species = Field(Species.human, description="Reference species for off-target screening.")
    num_return: int = Field(10, description="Number of candidate guides to return.", ge=1, le=50)
    gene_name: Optional[str] = Field(None, description="Optional gene label shown in the result.")
    target_locus: Optional[TargetLocus] = Field(
        None,
        description="Optional expected genomic locus used to anchor the intended on-target site.",
    )


class GrnaOffTargetHit(BaseModel):
    rank: int
    accession: str
    title: str
    identity: float
    align_length: int
    mismatches: int
    position: int = 0
    strand: str = "+"
    pam: str = ""
    is_target_locus: bool = False
    annotation: Optional[GrnaHitAnnotation] = None


class GrnaResult(BaseModel):
    rank: int
    grna_sequence: str
    pam: str
    position: int
    strand: str
    gc_content: float
    on_target_score: float
    heuristic_risk: GrnaRiskLevel = Field(..., description="Sequence-feature activity tier.")
    off_target_risk: Optional[GrnaRiskLevel] = Field(
        None,
        description="Species-filtered BLAST off-target tier.",
    )
    off_target_status: OffTargetStatus = OffTargetStatus.skipped
    potential_off_target_hits: int = 0
    best_non_target_identity: float = 0.0
    guide_with_pam: str = ""
    top_off_target_hits: list[GrnaOffTargetHit] = Field(default_factory=list)
    off_target_message: str = ""
    target_locus_status: TargetLocusAnchorStatus = TargetLocusAnchorStatus.not_provided
    target_locus_message: str = ""


class GrnaDesignResponse(BaseModel):
    success: bool
    gene_name: Optional[str]
    cas_type: str
    species: str
    sequence_length: int
    grna_list: list[GrnaResult]
    risk_model: str = "heuristic_sequence_features"
    off_target_model: str = "species_filtered_nt_blast_short"
    off_target_scope: str = "species_filtered_nt"
    off_target_engine: str = "ncbi_nt_blast"
    genome_wide_offtarget_checked: bool = False
    off_target_fallback_reason: str = ""
    target_locus: Optional[TargetLocus] = None
    target_locus_anchor_used: bool = False
    target_locus_anchor_status: TargetLocusAnchorStatus = TargetLocusAnchorStatus.not_provided
    target_locus_matched_guides: int = 0
    target_locus_unmatched_guides: int = 0
    target_locus_summary: str = ""
    hit_annotation_ready: bool = False
    hit_annotation_source: str = "none"
    hit_annotation_summary: str = ""
    message: str = ""


class GrnaOffTargetReadinessResponse(BaseModel):
    species: str
    backend_mode: str
    readiness_status: OffTargetReadinessStatus
    genome_backend_ready: bool = False
    target_locus_anchor_ready: bool = False
    fallback_enabled: bool = False
    active_engine: str = "none"
    summary: str = ""
    missing_requirements: list[str] = Field(default_factory=list)
    missing_env_vars: list[str] = Field(default_factory=list)
