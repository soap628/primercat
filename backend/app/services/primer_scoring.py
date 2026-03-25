from typing import Optional
from app.schemas.gene_primer import PrimerScore, ExonSpan, BlastValidation, BlastValidationStatus
from app.services.ncbi_fetch import ExonInfo


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
    if both_validated and blast_left.specific and blast_right.specific:
        specificity_score = 30.0
    elif both_validated and (blast_left.specific or blast_right.specific):
        specificity_score = 15.0
    elif either_error:
        # BLAST 服务暂时不可用，给基础分，不应与真实脱靶一视同仁
        specificity_score = 10.0
    else:
        specificity_score = 0.0
    if both_validated:
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
    left: str,
    right: str,
    sequence: str,
    exons: list[ExonInfo],
) -> ExonSpan:
    """检测引物对是否跨外显子边界。"""
    if len(exons) <= 1:
        return ExonSpan(spans_junction=False, left_exon=0, right_exon=0, junction_count=0)

    seq = sequence.upper()
    left_pos = seq.find(left.upper())
    # 反向引物需要找反向互补
    comp = str.maketrans("ACGT", "TGCA")
    right_rc = right.upper().translate(comp)[::-1]
    right_pos = seq.find(right_rc)

    if left_pos == -1 or right_pos == -1:
        return ExonSpan(spans_junction=False, left_exon=None, right_exon=None, junction_count=0)

    def find_exon(pos: int) -> Optional[int]:
        for e in exons:
            if e.start <= pos < e.end:
                return e.index
        return None

    left_exon = find_exon(left_pos)
    right_exon = find_exon(right_pos + len(right_rc) - 1)  # 引物末尾碱基所在外显子

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
