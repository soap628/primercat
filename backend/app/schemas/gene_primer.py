from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class Species(str, Enum):
    human = "human"
    mouse = "mouse"


class PrimerMode(str, Enum):
    sequence = "sequence"
    gene = "gene"


class GenePrimerRequest(BaseModel):
    mode: PrimerMode = Field(..., description="设计模式")
    sequence: Optional[str] = Field(None, description="自定义DNA序列")
    gene_name: Optional[str] = Field(None, description="基因名称，如 TP53")
    species: Species = Field(Species.human, description="物种：human / mouse")
    num_return: int = Field(5, description="返回引物对数量", ge=1, le=10)


class KnownPrimerValidationRequest(BaseModel):
    forward_primer: str = Field(..., min_length=15, max_length=40, pattern=r"^[ACGTacgt]+$")
    reverse_primer: str = Field(..., min_length=15, max_length=40, pattern=r"^[ACGTacgt]+$")
    species: Species
    target_transcript: str = Field(
        ...,
        min_length=4,
        max_length=32,
        pattern=r"^(?:NM|NR|XM|XR)_\d+(?:\.\d+)?$",
    )


class BlastTopHit(BaseModel):
    rank: int
    title: str           # 基因/登录号描述
    identity: float      # 相似度 %
    is_off_target: bool  # 是否为脱靶
    is_target: bool = False
    is_same_gene: bool = False  # 是否为同一基因的其他转录本


class BlastValidationStatus(str, Enum):
    validated = "validated"
    no_hits = "no_hits"
    error = "error"


class BlastValidation(BaseModel):
    specific: bool
    top_hit_identity: float
    off_target_count: int
    top_hits: list[BlastTopHit] = Field(default_factory=list)  # top 3 命中
    status: BlastValidationStatus = BlastValidationStatus.validated
    message: str = ""
    target_accession: Optional[str] = None
    target_found: bool = False
    qualified_hit_count: int = 0
    hit_limit_reached: bool = False


class ExonSpan(BaseModel):
    spans_junction: bool
    left_exon: Optional[int]
    right_exon: Optional[int]
    junction_count: int


class PrimerScore(BaseModel):
    total: float
    tm_score: float
    gc_score: float
    specificity_score: float
    exon_score: float
    dimer_score: float


class PrimerProperties(BaseModel):
    self_any_th: float   # 自互补 Tm（any）°C，越低越好，< 45 合格
    self_end_th: float   # 3'端自互补 Tm °C，越低越好，< 35 合格
    hairpin_th: float    # 发卡结构 Tm °C，越低越好，< 24 合格
    gc_clamp: int        # 3'端 5 bp 中 G/C 数量，1-3 最佳
    pos: int             # 在模板中的位置（左引物：5' 起始；右引物：3' 末端，即 primer3 PRIMER_RIGHT_{i}[0]）
    length: int          # 引物长度


class PrimerDesignBasis(BaseModel):
    template_source: str
    design_region_start: int
    design_region_end: int
    cds_region_start: Optional[int] = None
    cds_region_end: Optional[int] = None
    exon_count: int
    exon_spanning_preferred: bool
    primer_size_min: int
    primer_size_opt: int
    primer_size_max: int
    tm_min: float
    tm_opt: float
    tm_max: float
    gc_min: float
    gc_max: float
    product_min: int
    product_max: int
    max_poly_x: int
    max_self_any_th: float
    max_self_end_th: float
    max_hairpin_th: float
    candidate_pairs_designed: int
    candidate_pairs_blasted: int
    returned_pairs: int
    blast_database: str
    specificity_scope: str
    genome_wide_specificity_checked: bool
    off_target_identity_threshold: float
    paired_amplicon_screen: bool = False
    reference_assembly: Optional[str] = None
    paired_transcriptome_screen: bool = False
    transcriptome_reference: Optional[str] = None


class GenomePairScreenStatus(str, Enum):
    validated = "validated"
    no_paired_amplicons = "no_paired_amplicons"
    target_not_anchored = "target_not_anchored"
    truncated = "truncated"
    error = "error"


class GenomeAmpliconHit(BaseModel):
    accession: str
    start: int
    end: int
    product_size: int
    orientation: str
    left_mismatches: int
    right_mismatches: int
    is_target: bool = False


class GenomePairValidation(BaseModel):
    checked: bool
    specific: bool
    status: GenomePairScreenStatus
    engine: str = "bowtie2_paired_amplicon"
    reference_assembly: Optional[str] = None
    target_transcript: Optional[str] = None
    target_locus_accession: Optional[str] = None
    target_locus_start: Optional[int] = None
    target_locus_end: Optional[int] = None
    target_locus_strand: Optional[str] = None
    left_hit_count: int = 0
    right_hit_count: int = 0
    paired_amplicon_count: int = 0
    target_amplicon_count: int = 0
    off_target_amplicon_count: int = 0
    unclassified_amplicon_count: int = 0
    hit_limit_reached: bool = False
    min_amplicon_size: int = 50
    max_amplicon_size: int = 5000
    top_amplicons: list[GenomeAmpliconHit] = Field(default_factory=list)
    message: str = ""


class TranscriptomePairScreenStatus(str, Enum):
    validated = "validated"
    no_paired_amplicons = "no_paired_amplicons"
    target_not_found = "target_not_found"
    ambiguous_target = "ambiguous_target"
    truncated = "truncated"
    error = "error"


class TranscriptAmpliconClass(str, Enum):
    target_transcript = "target_transcript"
    same_gene_isoform = "same_gene_isoform"
    other_gene = "other_gene"
    unclassified = "unclassified"


class TranscriptAmpliconHit(BaseModel):
    transcript_accession: str
    start: int
    end: int
    product_size: int
    orientation: str
    left_mismatches: int
    right_mismatches: int
    classification: TranscriptAmpliconClass
    gene_id: Optional[str] = None
    gene_name: Optional[str] = None


class TranscriptomePairValidation(BaseModel):
    checked: bool
    gene_specific: bool
    isoform_specific: bool
    status: TranscriptomePairScreenStatus
    engine: str = "bowtie2_paired_transcriptome"
    reference_assembly: Optional[str] = None
    target_transcript: Optional[str] = None
    target_gene_id: Optional[str] = None
    target_gene_name: Optional[str] = None
    left_hit_count: int = 0
    right_hit_count: int = 0
    paired_amplicon_count: int = 0
    target_transcript_amplicon_count: int = 0
    same_gene_isoform_amplicon_count: int = 0
    other_gene_amplicon_count: int = 0
    unclassified_amplicon_count: int = 0
    hit_limit_reached: bool = False
    min_amplicon_size: int = 50
    max_amplicon_size: int = 5000
    top_amplicons: list[TranscriptAmpliconHit] = Field(default_factory=list)
    message: str = ""


class KnownPrimerCheckStatus(str, Enum):
    passed = "passed"
    review = "review"
    partial = "partial"
    unavailable = "unavailable"


class KnownPrimerEvidence(str, Enum):
    vendor_tested = "vendor_tested"
    experimental_record = "experimental_record"
    published_record = "published_record"
    database_record = "database_record"
    computed_database = "computed_database"


class KnownPrimerTranscriptMatch(str, Enum):
    exact_accession = "exact_accession"
    accession_root = "accession_root"
    different_transcript = "different_transcript"
    not_assessed = "not_assessed"


class KnownPrimerRecord(BaseModel):
    id: str
    gene_symbol: str
    species: Species
    target_accession: str
    forward_primer: str
    reverse_primer: str
    source_name: str
    source_record_id: str
    source_url: str
    evidence: KnownPrimerEvidence
    evidence_url: Optional[str] = None
    source_amplicon_size_bp: Optional[int] = None
    source_forward_tm_c: Optional[float] = None
    source_reverse_tm_c: Optional[float] = None
    retrieved_on: str
    source_reference: Optional[str] = None
    evidence_code: str = ""
    transcript_match: KnownPrimerTranscriptMatch = KnownPrimerTranscriptMatch.not_assessed


class PrimerCatalogSnapshot(BaseModel):
    source_name: str
    release: str
    imported_at: str
    source_url: Optional[str] = None
    citation_url: Optional[str] = None
    retrieved_on: Optional[str] = None
    record_count: Optional[int] = None
    data_sha256: Optional[str] = None


class PrimerCatalogSourceSummary(BaseModel):
    source_name: str
    record_count: int
    evidence_counts: dict[str, int] = Field(default_factory=dict)


class KnownPrimerCatalogResponse(BaseModel):
    query: str
    species: Species
    target_transcript: Optional[str] = None
    resolved_gene_symbol: Optional[str] = None
    ncbi_gene_id: Optional[str] = None
    gene_index_available: bool = False
    gene_index_match: bool = False
    computed_design_available: bool = True
    records: list[KnownPrimerRecord] = Field(default_factory=list)
    catalog_gene_count: int = 0
    catalog_pair_count: int = 0
    catalog_updated_at: Optional[str] = None
    snapshots: list[PrimerCatalogSnapshot] = Field(default_factory=list)
    source_summaries: list[PrimerCatalogSourceSummary] = Field(default_factory=list)


class GeneLiteratureRecord(BaseModel):
    pmid: str
    title: str
    journal: str = ""
    publication_date: str = ""
    year: Optional[int] = None
    authors: list[str] = Field(default_factory=list)
    publication_types: list[str] = Field(default_factory=list)
    doi: Optional[str] = None
    pmc_id: Optional[str] = None
    pubmed_url: str
    doi_url: Optional[str] = None
    pmc_url: Optional[str] = None
    journal_tier: str = "other"


class GeneLiteratureResponse(BaseModel):
    query_gene: str
    species: Species
    source_name: str = "NCBI PubMed"
    ranking: str = "Curated journal priority, then PubMed Best Match"
    search_query: str
    search_url: str
    total_results: int = 0
    total_results_exact: bool = True
    partial: bool = False
    available: bool = True
    records: list[GeneLiteratureRecord] = Field(default_factory=list)
    message: str = ""


class KnownPrimerValidationResponse(BaseModel):
    status: KnownPrimerCheckStatus
    scope: str
    reference_assembly: Optional[str] = None
    target_transcript: str
    observed_product_size: Optional[int] = None
    genome_pair_validation: Optional[GenomePairValidation] = None
    transcriptome_pair_validation: Optional[TranscriptomePairValidation] = None
    message: str = ""


class ValidatedPrimerPair(BaseModel):
    rank: int
    left_primer: str
    right_primer: str
    left_tm: float
    right_tm: float
    left_gc: float
    right_gc: float
    product_size: int
    penalty: float
    blast_left: BlastValidation
    blast_right: BlastValidation
    is_specific: bool
    exon_span: ExonSpan
    score: PrimerScore
    left_props: Optional[PrimerProperties] = None
    right_props: Optional[PrimerProperties] = None
    amplicon_sequence: str = ""
    genome_pair_validation: Optional[GenomePairValidation] = None
    transcriptome_pair_validation: Optional[TranscriptomePairValidation] = None


class ExonViz(BaseModel):
    index: int
    start: int
    end: int


class GeneInfo(BaseModel):
    gene_symbol: str
    full_name: str               # 官方全名，来自 NCBI Gene Description
    summary: str                 # 基因功能摘要，来自 NCBI Gene Summary
    chromosome: str              # 染色体
    map_location: str            # 细胞遗传学位置，如 17p13.1
    aliases: str                 # 基因别名
    organism: str                # 物种全名
    # 转录本信息
    transcript_id: str
    transcript_description: str  # GenBank 记录标题
    total_nm_found: int          # 搜索到的 NM_ 转录本总数
    selection_reason: str        # 为何选此转录本
    cds_length: int              # CDS 长度（bp）
    protein_length: int          # 蛋白质长度（aa）
    exon_count: int              # 外显子数量


class GenePrimerResponse(BaseModel):
    success: bool
    gene_name: Optional[str]
    species: str
    transcript_id: Optional[str]
    sequence_length: int
    cds_start: int
    cds_end: int
    exons: list[ExonViz]
    design_basis: PrimerDesignBasis
    primer_pairs: list[ValidatedPrimerPair]
    gene_info: Optional[GeneInfo] = None
    message: str = ""
