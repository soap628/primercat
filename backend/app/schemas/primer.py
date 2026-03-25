from pydantic import BaseModel, Field
from typing import Optional


class PrimerDesignRequest(BaseModel):
    sequence: str = Field(..., description="输入DNA序列（5'→3'）", min_length=50)
    product_size_min: int = Field(80, description="扩增子最小长度 (bp)")
    product_size_max: int = Field(250, description="扩增子最大长度 (bp)")
    primer_tm_min: float = Field(58.0, description="引物最低Tm (°C)")
    primer_tm_max: float = Field(62.0, description="引物最高Tm (°C)")
    primer_tm_opt: float = Field(60.0, description="引物最适Tm (°C)")
    primer_gc_min: float = Field(40.0, description="引物最低GC% ")
    primer_gc_max: float = Field(60.0, description="引物最高GC% ")
    num_return: int = Field(5, description="返回引物对数量", ge=1, le=20)
    gene_name: Optional[str] = Field(None, description="基因名称（可选）")


class PrimerPair(BaseModel):
    pair_index: int
    left_primer: str
    right_primer: str
    left_tm: float
    right_tm: float
    left_gc: float
    right_gc: float
    product_size: int
    penalty: float


class PrimerDesignResponse(BaseModel):
    success: bool
    gene_name: Optional[str]
    sequence_length: int
    primer_pairs: list[PrimerPair]
    message: str = ""
