from typing import Optional
from app.schemas.gene_primer import (
    BlastValidation,
    BlastValidationStatus,
    ExonSpan,
    GenomePairValidation,
    PrimerScore,
    TranscriptomePairValidation,
)
from app.services.ncbi_fetch import ExonInfo
from app.services.primer_transcriptome import combined_computational_specificity_pass


def score_primer_pair(
    left: str,
    right: str,
    left_tm: float,
    right_tm: float,
    left_gc: float,
    right_gc: float,
    product_size: int,
    blast_left: BlastValidation,
    blast_right: BlastValidation,
    exon_span: ExonSpan,
    genome_pair_validation: GenomePairValidation | None = None,
    transcriptome_pair_validation: TranscriptomePairValidation | None = None,
) -> PrimerScore:
    # ── Tm 评分（最优 59-61°C，差值 < 1°C）────────────────────────
    tm_avg = (left_tm + right_tm) / 2
    tm_diff = abs(left_tm - right_tm)
    if 59 <= tm_avg <= 61:
        tm_score = 25.0
    elif 58 <= tm_avg <= 62:
        tm_score = 20.0
    elif 57 <= tm_avg <= 63:
        tm_score = 12.0
    else:
        tm_score = 5.0
    if tm_diff < 1:
        tm_score += 5
    elif tm_diff > 3:
        tm_score -= 8

    # ── GC% 评分（最优 45-55%）────────────────────────────────────
    gc_avg = (left_gc + right_gc) / 2
    if 45 <= gc_avg <= 55:
        gc_score = 20.0
    elif 40 <= gc_avg <= 60:
        gc_score = 15.0
    elif 35 <= gc_avg <= 65:
        gc_score = 8.0
    else:
        gc_score = 2.0

    # ── 特异性评分 ────────────────────────────────────────────────
    both_validated = (
        blast_left.status == BlastValidationStatus.validated
        and blast_right.status == BlastValidationStatus.validated
    )
    either_error = (
        blast_left.status == BlastValidationStatus.error
        or blast_right.status == BlastValidationStatus.error
    )
    if genome_pair_validation and transcriptome_pair_validation:
        specificity_score = 30.0 if combined_computational_specificity_pass(
            genome_pair_validation,
            transcriptome_pair_validation,
        ) else 0.0
        specificity_score = max(
            0.0,
            specificity_score
            - genome_pair_validation.off_target_amplicon_count * 2
            - transcriptome_pair_validation.other_gene_amplicon_count * 2
            - transcriptome_pair_validation.unclassified_amplicon_count * 2,
        )
    elif genome_pair_validation and genome_pair_validation.checked:
        specificity_score = 30.0 if genome_pair_validation.specific else 0.0
        specificity_score = max(
            0.0,
            specificity_score - genome_pair_validation.off_target_amplicon_count * 2,
        )
    elif transcriptome_pair_validation and transcriptome_pair_validation.checked:
        # A complete transcript-pair screen is useful evidence, but without a
        # genome-wide screen it must not receive the same weight as the joint
        # fixed-reference decision above.
        specificity_score = 20.0 if transcriptome_pair_validation.gene_specific else 0.0
        specificity_score = max(
            0.0,
            specificity_score
            - transcriptome_pair_validation.other_gene_amplicon_count * 2
            - transcriptome_pair_validation.unclassified_amplicon_count * 2,
        )
    elif both_validated and blast_left.specific and blast_right.specific:
        specificity_score = 30.0
    elif both_validated and (blast_left.specific or blast_right.specific):
        specificity_score = 15.0
    elif either_error:
        # 未完成验证时不能奖励特异性分，避免把“未知”误当成“通过”。
        specificity_score = 0.0
    else:
        specificity_score = 0.0
    if both_validated and not genome_pair_validation and not transcriptome_pair_validation:
        # 脱靶惩罚
        off = blast_left.off_target_count + blast_right.off_target_count
        specificity_score = max(0.0, specificity_score - off * 2)

    # ── 跨外显子评分 ──────────────────────────────────────────────
    if exon_span.spans_junction:
        exon_score = 15.0 + min(exon_span.junction_count - 1, 2) * 2
    else:
        exon_score = 0.0

    # ── 二聚体风险评分（简化：检查 3' 端互补）────────────────────
    dimer_score = 10.0
    left_3 = left[-5:].upper()
    right_3 = right[-5:].upper()
    comp = str.maketrans("ACGT", "TGCA")
    left_rc = left_3.translate(comp)[::-1]
    right_rc = right_3.translate(comp)[::-1]
    if left_3 in right or right_3 in left:
        dimer_score -= 6
    if left_rc in right or right_rc in left:
        dimer_score -= 4
    dimer_score = max(0.0, dimer_score)

    total = tm_score + gc_score + specificity_score + exon_score + dimer_score
    total = round(min(100.0, max(0.0, total)), 1)

    return PrimerScore(
        total=total,
        tm_score=round(tm_score, 1),
        gc_score=round(gc_score, 1),
        specificity_score=round(specificity_score, 1),
        exon_score=round(exon_score, 1),
        dimer_score=round(dimer_score, 1),
    )


def detect_exon_span(
    left_start: int,
    left_len: int,
    right_end: int,
    right_len: int,
    exons: list[ExonInfo],
) -> ExonSpan:
    """检测引物对是否跨外显子边界。

    使用 primer3 返回的坐标而非序列搜索，避免重复元件（Alu、LINE 等）导致的
    str.find() 错误定位。

    Parameters
    ----------
    left_start : int
        左引物 5' 端在模板上的 0-based 起始位置（primer3 PRIMER_LEFT_{i}[0]）。
    left_len : int
        左引物长度（primer3 PRIMER_LEFT_{i}[1]）。
    right_end : int
        右引物 3' 端在模板上的 0-based 位置（primer3 PRIMER_RIGHT_{i}[0]），
        即扩增子最末一个碱基的位置。
    right_len : int
        右引物长度（primer3 PRIMER_RIGHT_{i}[1]）。
    exons : list[ExonInfo]
        外显子信息列表，每个元素含 index/start/end。
    """
    if len(exons) <= 1:
        return ExonSpan(spans_junction=False, left_exon=0, right_exon=0, junction_count=0)

    def find_exon(pos: int) -> Optional[int]:
        for e in exons:
            if e.start <= pos < e.end:
                return e.index
        return None

    left_exon = find_exon(left_start)
    right_exon = find_exon(right_end)

    if left_exon is None or right_exon is None:
        return ExonSpan(spans_junction=False, left_exon=left_exon, right_exon=right_exon, junction_count=0)

    junction_count = right_exon - left_exon
    spans = junction_count > 0

    return ExonSpan(
        spans_junction=spans,
        left_exon=left_exon,
        right_exon=right_exon,
        junction_count=junction_count,
    )
