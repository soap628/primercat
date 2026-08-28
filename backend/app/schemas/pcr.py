from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class PCRPreset(str, Enum):
    standard = "standard"
    colony = "colony"
    high_fidelity = "high_fidelity"


class PCRSpecificitySpecies(str, Enum):
    human = "human"
    mouse = "mouse"


class PCRSpecificityStatus(str, Enum):
    completed = "completed"
    no_paired_records = "no_paired_records"
    error = "error"


class PCRSpecificityVerdict(str, Enum):
    one_paired_record = "one_paired_record"
    multiple_paired_records = "multiple_paired_records"
    no_paired_records = "no_paired_records"
    not_checked = "not_checked"


class PCRDesignRequest(BaseModel):
    sequence: str = Field(
        ...,
        description="DNA template in plain text or single-record FASTA format",
        min_length=50,
        max_length=200_000,
    )
    label: Optional[str] = Field(None, description="Optional sample or target label", max_length=120)
    preset: PCRPreset = Field(PCRPreset.standard, description="PCR design preset")
    product_size_min: int = Field(150, description="Minimum amplicon length (bp)", ge=50, le=10_000)
    product_size_max: int = Field(800, description="Maximum amplicon length (bp)", ge=60, le=10_000)
    primer_tm_min: float = Field(57.0, description="Minimum primer Tm (°C)", ge=40.0, le=80.0)
    primer_tm_opt: float = Field(60.0, description="Optimal primer Tm (°C)", ge=40.0, le=80.0)
    primer_tm_max: float = Field(63.0, description="Maximum primer Tm (°C)", ge=40.0, le=80.0)
    primer_gc_min: float = Field(40.0, description="Minimum primer GC%", ge=10.0, le=90.0)
    primer_gc_max: float = Field(60.0, description="Maximum primer GC%", ge=10.0, le=90.0)
    num_return: int = Field(5, description="Number of primer pairs to return", ge=1, le=20)
    target_start: Optional[int] = Field(
        None,
        description="Optional 1-based inclusive start of the region the amplicon must contain",
        ge=1,
    )
    target_end: Optional[int] = Field(
        None,
        description="Optional 1-based inclusive end of the region the amplicon must contain",
        ge=1,
    )


class PCRPrimerPair(BaseModel):
    pair_index: int
    left_primer: str
    right_primer: str
    left_tm: float
    right_tm: float
    left_gc: float
    right_gc: float
    tm_difference: float
    product_size: int
    penalty: float

    left_start: int
    left_end: int
    right_start: int
    right_end: int
    amplicon_start: int
    amplicon_end: int
    amplicon_sequence: str

    left_self_any_th: float
    left_self_end_th: float
    left_hairpin_th: float
    right_self_any_th: float
    right_self_end_th: float
    right_hairpin_th: float
    pair_compl_any_th: float
    pair_compl_end_th: float
    left_gc_clamp: int
    right_gc_clamp: int

    annealing_temp_estimate: float
    annealing_gradient_low: float
    annealing_gradient_high: float
    target_included: bool


class PCRDesignResponse(BaseModel):
    success: bool
    label: Optional[str]
    preset: PCRPreset
    sequence_length: int
    product_size_min: int
    product_size_max: int
    target_start: Optional[int] = None
    target_end: Optional[int] = None
    primer_pairs: list[PCRPrimerPair]
    specificity_checked: bool = False
    primer3_pair_explain: str = ""
    message: str = ""


class PCRPairSpecificityRequest(BaseModel):
    pair_index: int = Field(..., ge=1, le=100)
    left_primer: str = Field(..., min_length=15, max_length=40, pattern=r"^[ACGTacgt]+$")
    right_primer: str = Field(..., min_length=15, max_length=40, pattern=r"^[ACGTacgt]+$")
    species: PCRSpecificitySpecies = PCRSpecificitySpecies.human
    min_amplicon_size: int = Field(50, ge=20, le=100_000)
    max_amplicon_size: int = Field(5_000, ge=50, le=100_000)
    expected_product_size: Optional[int] = Field(None, ge=20, le=100_000)


class PCRPairedRecord(BaseModel):
    accession: str
    title: str
    start: int
    end: int
    product_size: int
    orientation: str
    left_identity: float
    right_identity: float
    left_mismatches: int
    right_mismatches: int
    matches_expected_size: bool = False


class PCRPairSpecificityResponse(BaseModel):
    success: bool
    specificity_checked: bool
    status: PCRSpecificityStatus
    verdict: PCRSpecificityVerdict
    pair_index: int
    species: PCRSpecificitySpecies
    engine: str = "ncbi_blast_refseq_genomic_pair_screen"
    database: str = "nt"
    specificity_scope: str = "species_filtered_refseq_genomic_records_in_ncbi_nt"
    genome_wide_specificity_checked: bool = False
    left_hit_count: int = 0
    right_hit_count: int = 0
    paired_record_count: int = 0
    returned_record_count: int = 0
    search_hit_limit: int = 100
    results_may_be_truncated: bool = False
    paired_records: list[PCRPairedRecord] = Field(default_factory=list)
    message: str = ""
