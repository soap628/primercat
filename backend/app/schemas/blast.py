from pydantic import BaseModel, Field, model_validator
from typing import Literal
from enum import Enum
import re


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
    expect: float = Field(0.001, description="E-value 阈值", gt=0, allow_inf_nan=False)
    short_query: bool | None = Field(None, description="短核酸模式；省略时自动识别 10–50 nt 单条 DNA")
    species: Literal["human", "mouse"] | None = Field(None, description="短引物检索的物种范围")

    @model_validator(mode="after")
    def validate_short_query(self):
        lines = self.sequence.strip().splitlines()
        if lines and lines[0].startswith(">"):
            lines = lines[1:]
        if any(">" in line for line in lines):
            raise ValueError("Submit one sequence at a time, not multiple FASTA records")
        sequence = "".join("".join(lines).split()).upper()
        if len(sequence) < 10:
            raise ValueError("Query sequence must contain at least 10 residues")
        self.sequence = sequence
        is_short_dna = bool(re.fullmatch(r"[ACGTRYSWKMBDHVN]{10,50}", sequence))
        if self.short_query is None:
            self.short_query = self.program == BlastProgram.blastn and is_short_dna
        if self.short_query:
            if "expect" not in self.model_fields_set:
                self.expect = 1000
            if "hitlist_size" not in self.model_fields_set:
                self.hitlist_size = 50
        if not self.short_query:
            if self.species is not None:
                raise ValueError("Species restriction requires short-query mode")
            return self
        if self.program != BlastProgram.blastn or self.database not in (BlastDatabase.nt, BlastDatabase.refseq_rna):
            raise ValueError("Short-query mode requires blastn and a nucleotide database")
        if not is_short_dna:
            raise ValueError("Short-query mode requires one DNA sequence of 10–50 nt")
        self.sequence = sequence
        return self


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
    error_code: Literal["timeout", "unavailable", "invalid_response", "busy"] | None = None
    query_sequence: str = ""
    search_parameters: "BlastSearchParameters | None" = None


class BlastSearchParameters(BaseModel):
    short_query: bool
    expect: float
    word_size: int | None = None
    species: Literal["human", "mouse"] | None = None
    hitlist_size: int
