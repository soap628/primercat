from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class BlastProgram(str, Enum):
    blastn = "blastn"       # 核酸 vs 核酸库
    blastp = "blastp"       # 蛋白 vs 蛋白库
    blastx = "blastx"       # 核酸翻译 vs 蛋白库
    tblastn = "tblastn"     # 蛋白 vs 核酸库翻译


class BlastDatabase(str, Enum):
    nt = "nt"                           # 核酸数据库
    nr = "nr"                           # 非冗余蛋白库
    refseq_rna = "refseq_rna"           # RefSeq RNA
    refseq_protein = "refseq_protein"   # RefSeq 蛋白
    swissprot = "swissprot"             # Swiss-Prot


class BlastRequest(BaseModel):
    sequence: str = Field(..., description="查询序列（核酸或蛋白）", min_length=10)
    program: BlastProgram = Field(BlastProgram.blastn, description="BLAST 程序")
    database: BlastDatabase = Field(BlastDatabase.nt, description="目标数据库")
    hitlist_size: int = Field(10, description="返回 hits 数量", ge=1, le=50)
    expect: float = Field(0.001, description="E-value 阈值")


class BlastHsp(BaseModel):
    score: float
    bits: float
    expect: float
    identity_pct: float
    gaps_pct: float
    align_length: int
    query_start: int
    query_end: int
    subject_start: int
    subject_end: int
    query_seq: str
    subject_seq: str
    midline: str


class BlastHit(BaseModel):
    rank: int
    accession: str
    title: str
    length: int
    best_hsp: BlastHsp


class BlastResponse(BaseModel):
    success: bool
    program: str
    database: str
    query_length: int
    hits: list[BlastHit]
    message: str = ""
