import re
import primer3
from app.schemas.primer import PrimerDesignRequest, PrimerDesignResponse, PrimerPair

_VALID_NT = re.compile(r'^[ACGTN]+$')


def design_qpcr_primers(req: PrimerDesignRequest) -> PrimerDesignResponse:
    seq = req.sequence.upper().strip()

    if not _VALID_NT.match(seq):
        return PrimerDesignResponse(
            success=False,
            gene_name=req.gene_name,
            sequence_length=len(seq),
            primer_pairs=[],
            message="序列包含非法字符，只允许 A/C/G/T/N",
        )

    n_count = seq.count('N')
    if n_count / len(seq) > 0.1:
        return PrimerDesignResponse(
            success=False,
            gene_name=req.gene_name,
            sequence_length=len(seq),
            primer_pairs=[],
            message=f"序列中 N 碱基比例过高（{n_count}/{len(seq)}），无法设计引物",
        )

    primer3_input = {
        "SEQUENCE_ID": req.gene_name or "target",
        "SEQUENCE_TEMPLATE": seq,
    }

    primer3_params = {
        "PRIMER_TASK": "generic",
        "PRIMER_PICK_LEFT_PRIMER": 1,
        "PRIMER_PICK_RIGHT_PRIMER": 1,
        "PRIMER_PICK_INTERNAL_OLIGO": 0,
        "PRIMER_MIN_SIZE": 18,
        "PRIMER_OPT_SIZE": 20,
        "PRIMER_MAX_SIZE": 25,
        "PRIMER_MIN_TM": req.primer_tm_min,
        "PRIMER_OPT_TM": req.primer_tm_opt,
        "PRIMER_MAX_TM": req.primer_tm_max,
        "PRIMER_MIN_GC": req.primer_gc_min,
        "PRIMER_MAX_GC": req.primer_gc_max,
        "PRIMER_PRODUCT_SIZE_RANGE": [[req.product_size_min, req.product_size_max]],
        "PRIMER_NUM_RETURN": req.num_return,
        "PRIMER_MAX_POLY_X": 4,
        "PRIMER_MAX_SELF_ANY_TH": 45.0,
        "PRIMER_MAX_SELF_END_TH": 35.0,
        "PRIMER_MAX_HAIRPIN_TH": 24.0,
        "PRIMER_EXPLAIN_FLAG": 1,
    }

    try:
        result = primer3.design_primers(primer3_input, primer3_params)
    except Exception as e:
        return PrimerDesignResponse(
            success=False,
            gene_name=req.gene_name,
            sequence_length=len(seq),
            primer_pairs=[],
            message=f"Primer3 错误: {str(e)}",
        )

    pairs = []
    num_pairs = result.get("PRIMER_PAIR_NUM_RETURNED", 0)

    for i in range(num_pairs):
        pair = PrimerPair(
            pair_index=i + 1,
            left_primer=result[f"PRIMER_LEFT_{i}_SEQUENCE"],
            right_primer=result[f"PRIMER_RIGHT_{i}_SEQUENCE"],
            left_tm=round(result[f"PRIMER_LEFT_{i}_TM"], 2),
            right_tm=round(result[f"PRIMER_RIGHT_{i}_TM"], 2),
            left_gc=round(result[f"PRIMER_LEFT_{i}_GC_PERCENT"], 2),
            right_gc=round(result[f"PRIMER_RIGHT_{i}_GC_PERCENT"], 2),
            product_size=result[f"PRIMER_PAIR_{i}_PRODUCT_SIZE"],
            penalty=round(result[f"PRIMER_PAIR_{i}_PENALTY"], 4),
        )
        pairs.append(pair)

    return PrimerDesignResponse(
        success=True,
        gene_name=req.gene_name,
        sequence_length=len(seq),
        primer_pairs=pairs,
        message=f"成功设计 {len(pairs)} 对引物",
    )
