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


class BlastTopHit(BaseModel):
    rank: int
    title: str           # 基因/登录号描述
    identity: float      # 相似度 %
    is_off_target: bool  # 是否为脱靶


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
