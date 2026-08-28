import re

import primer3

from app.schemas.pcr import PCRDesignRequest, PCRDesignResponse, PCRPrimerPair


_VALID_NT = re.compile(r"^[ACGTN]+$")


def _response_error(req: PCRDesignRequest, message: str, sequence_length: int = 0) -> PCRDesignResponse:
    return PCRDesignResponse(
        success=False,
        label=req.label,
        preset=req.preset,
        sequence_length=sequence_length,
        product_size_min=req.product_size_min,
        product_size_max=req.product_size_max,
        target_start=req.target_start,
        target_end=req.target_end,
        primer_pairs=[],
        specificity_checked=False,
        message=message,
    )


def normalize_dna_sequence(raw: str) -> tuple[str, str | None]:
    """Return a single uppercase DNA record and a machine-readable error code."""
    lines = raw.strip().splitlines()
    fasta_headers = [line for line in lines if line.lstrip().startswith(">")]
    if len(fasta_headers) > 1:
        return "", "multiple_fasta_records"

    sequence_lines = [line for line in lines if not line.lstrip().startswith(">")]
    sequence = re.sub(r"\s+", "", "".join(sequence_lines)).upper()
    if not sequence:
        return "", "empty_sequence"
    if not _VALID_NT.fullmatch(sequence):
        return sequence, "invalid_characters"
    return sequence, None


def _metric(result: dict, key: str) -> float:
    value = result.get(key, 0.0)
    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return 0.0


def _gc_clamp(primer_sequence: str) -> int:
    return sum(1 for base in primer_sequence[-5:] if base in "GC")


def design_pcr_primers(req: PCRDesignRequest) -> PCRDesignResponse:
    sequence, sequence_error = normalize_dna_sequence(req.sequence)
    if sequence_error:
        return _response_error(req, sequence_error, len(sequence))

    if len(sequence) < 50:
        return _response_error(req, "sequence_too_short", len(sequence))
    if sequence.count("N") / len(sequence) > 0.1:
        return _response_error(req, "too_many_ambiguous_bases", len(sequence))
    if req.product_size_min >= req.product_size_max:
        return _response_error(req, "invalid_product_range", len(sequence))
    if not (req.primer_tm_min <= req.primer_tm_opt <= req.primer_tm_max):
        return _response_error(req, "invalid_tm_range", len(sequence))
    if req.primer_gc_min >= req.primer_gc_max:
        return _response_error(req, "invalid_gc_range", len(sequence))
    if (req.target_start is None) != (req.target_end is None):
        return _response_error(req, "incomplete_target_range", len(sequence))
    if req.target_start is not None and req.target_end is not None:
        if req.target_start > req.target_end or req.target_end > len(sequence):
            return _response_error(req, "invalid_target_range", len(sequence))

    effective_product_max = min(req.product_size_max, len(sequence))
    if req.product_size_min > effective_product_max:
        return _response_error(req, "template_shorter_than_product_range", len(sequence))

    primer3_input: dict[str, object] = {
        "SEQUENCE_ID": req.label or "pcr_target",
        "SEQUENCE_TEMPLATE": sequence,
    }
    if req.target_start is not None and req.target_end is not None:
        primer3_input["SEQUENCE_TARGET"] = [
            req.target_start - 1,
            req.target_end - req.target_start + 1,
        ]

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
        "PRIMER_PRODUCT_SIZE_RANGE": [[req.product_size_min, effective_product_max]],
        "PRIMER_NUM_RETURN": req.num_return,
        "PRIMER_MAX_NS_ACCEPTED": 0,
        "PRIMER_MAX_POLY_X": 4,
        "PRIMER_MAX_SELF_ANY_TH": 45.0,
        "PRIMER_MAX_SELF_END_TH": 35.0,
        "PRIMER_MAX_HAIRPIN_TH": 24.0,
        "PRIMER_PAIR_MAX_COMPL_ANY_TH": 45.0,
        "PRIMER_PAIR_MAX_COMPL_END_TH": 35.0,
        "PRIMER_THERMODYNAMIC_OLIGO_ALIGNMENT": 1,
        "PRIMER_EXPLAIN_FLAG": 1,
    }

    try:
        result = primer3.design_primers(primer3_input, primer3_params)
    except Exception:
        return _response_error(req, "primer3_error", len(sequence))

    primer_pairs: list[PCRPrimerPair] = []
    for index in range(int(result.get("PRIMER_PAIR_NUM_RETURNED", 0))):
        left_sequence = result[f"PRIMER_LEFT_{index}_SEQUENCE"]
        right_sequence = result[f"PRIMER_RIGHT_{index}_SEQUENCE"]
        left_position, left_length = result[f"PRIMER_LEFT_{index}"]
        right_position, right_length = result[f"PRIMER_RIGHT_{index}"]

        left_start_zero = int(left_position)
        right_end_zero = int(right_position)
        right_start_zero = right_end_zero - int(right_length) + 1
        amplicon = sequence[left_start_zero : right_end_zero + 1]

        left_tm = round(float(result[f"PRIMER_LEFT_{index}_TM"]), 2)
        right_tm = round(float(result[f"PRIMER_RIGHT_{index}_TM"]), 2)
        lower_tm = min(left_tm, right_tm)

        target_included = True
        if req.target_start is not None and req.target_end is not None:
            target_included = (
                left_start_zero + 1 <= req.target_start
                and right_end_zero + 1 >= req.target_end
            )

        primer_pairs.append(
            PCRPrimerPair(
                pair_index=index + 1,
                left_primer=left_sequence,
                right_primer=right_sequence,
                left_tm=left_tm,
                right_tm=right_tm,
                left_gc=round(float(result[f"PRIMER_LEFT_{index}_GC_PERCENT"]), 2),
                right_gc=round(float(result[f"PRIMER_RIGHT_{index}_GC_PERCENT"]), 2),
                tm_difference=round(abs(left_tm - right_tm), 2),
                product_size=int(result[f"PRIMER_PAIR_{index}_PRODUCT_SIZE"]),
                penalty=round(float(result[f"PRIMER_PAIR_{index}_PENALTY"]), 4),
                left_start=left_start_zero + 1,
                left_end=left_start_zero + int(left_length),
                right_start=right_start_zero + 1,
                right_end=right_end_zero + 1,
                amplicon_start=left_start_zero + 1,
                amplicon_end=right_end_zero + 1,
                amplicon_sequence=amplicon,
                left_self_any_th=_metric(result, f"PRIMER_LEFT_{index}_SELF_ANY_TH"),
                left_self_end_th=_metric(result, f"PRIMER_LEFT_{index}_SELF_END_TH"),
                left_hairpin_th=_metric(result, f"PRIMER_LEFT_{index}_HAIRPIN_TH"),
                right_self_any_th=_metric(result, f"PRIMER_RIGHT_{index}_SELF_ANY_TH"),
                right_self_end_th=_metric(result, f"PRIMER_RIGHT_{index}_SELF_END_TH"),
                right_hairpin_th=_metric(result, f"PRIMER_RIGHT_{index}_HAIRPIN_TH"),
                pair_compl_any_th=_metric(result, f"PRIMER_PAIR_{index}_COMPL_ANY_TH"),
                pair_compl_end_th=_metric(result, f"PRIMER_PAIR_{index}_COMPL_END_TH"),
                left_gc_clamp=_gc_clamp(left_sequence),
                right_gc_clamp=_gc_clamp(right_sequence),
                annealing_temp_estimate=round(lower_tm - 3.0, 1),
                annealing_gradient_low=round(max(40.0, lower_tm - 5.0), 1),
                annealing_gradient_high=round(lower_tm - 1.0, 1),
                target_included=target_included,
            )
        )

    if not primer_pairs:
        return PCRDesignResponse(
            success=False,
            label=req.label,
            preset=req.preset,
            sequence_length=len(sequence),
            product_size_min=req.product_size_min,
            product_size_max=effective_product_max,
            target_start=req.target_start,
            target_end=req.target_end,
            primer_pairs=[],
            specificity_checked=False,
            primer3_pair_explain=str(result.get("PRIMER_PAIR_EXPLAIN", "")),
            message="no_primers_found",
        )

    return PCRDesignResponse(
        success=True,
        label=req.label,
        preset=req.preset,
        sequence_length=len(sequence),
        product_size_min=req.product_size_min,
        product_size_max=effective_product_max,
        target_start=req.target_start,
        target_end=req.target_end,
        primer_pairs=primer_pairs,
        specificity_checked=False,
        primer3_pair_explain=str(result.get("PRIMER_PAIR_EXPLAIN", "")),
        message="design_complete",
    )
