import re
from hashlib import sha1

from app.schemas.grna import (
    CasType,
    GrnaDesignRequest,
    GrnaDesignResponse,
    GrnaOffTargetHit,
    GrnaResult,
    GrnaRiskLevel,
    OffTargetStatus,
    TargetLocusAnchorStatus,
)
from app.services.grna_genome_offtarget import screen_grna_off_targets
from app.services.ncbi_client import cached_call, run_qblast

SPECIES_ENTREZ_FILTER = {
    "human": "txid9606[Organism]",
    "mouse": "txid10090[Organism]",
}

OFF_TARGET_DB = "nt"
OFF_TARGET_HITLIST_SIZE = 8
HIGH_CONFIDENCE_MISMATCHES = 3
HIGH_CONFIDENCE_ALIGNMENT_SLACK = 2


def reverse_complement(seq: str) -> str:
    comp = str.maketrans("ACGTNacgtn", "TGCANtgcan")
    return seq.translate(comp)[::-1]


def gc_content(seq: str) -> float:
    seq = seq.upper()
    gc = seq.count("G") + seq.count("C")
    return round(gc / len(seq) * 100, 1)


def score_grna(guide: str, cas_type: CasType) -> float:
    """
    Lightweight activity model.
    Cas9/Cas9-NG uses a Rule Set 2-inspired heuristic, while Cas12a uses a
    separate heuristic instead of reusing Cas9 weights verbatim.
    """
    score = 50.0
    gc = gc_content(guide)

    if cas_type in (CasType.cas9, CasType.cas9_ng):
        if 40 <= gc <= 70:
            score += 15
        elif gc < 30 or gc > 80:
            score -= 20

        if "TTTT" in guide.upper():
            score -= 25

        if guide[-1].upper() in ("G", "C"):
            score += 5
        if guide[-2].upper() in ("G", "C"):
            score += 3
    else:
        if 30 <= gc <= 65:
            score += 16
        elif gc < 25 or gc > 75:
            score -= 18

        if "TTTTT" in guide.upper():
            score -= 12

        if guide[0].upper() in ("T", "A"):
            score += 4
        if guide[-1].upper() in ("A", "G"):
            score += 4

    return max(0.0, min(100.0, round(score, 1)))


def heuristic_risk_level(score: float) -> GrnaRiskLevel:
    if score >= 70:
        return GrnaRiskLevel.low
    if score >= 45:
        return GrnaRiskLevel.medium
    return GrnaRiskLevel.high


def _guide_with_pam(guide: str, pam: str, cas_type: CasType) -> str:
    if cas_type == CasType.cas12a:
        return f"{pam}{guide}"
    return f"{guide}{pam}"


def _empty_off_target_payload(status: OffTargetStatus, message: str) -> dict:
    return {
        "off_target_risk": None,
        "off_target_status": status.value,
        "potential_off_target_hits": 0,
        "best_non_target_identity": 0.0,
        "top_off_target_hits": [],
        "off_target_message": message,
        "target_locus_status": TargetLocusAnchorStatus.not_provided.value,
        "target_locus_message": "",
    }


def _select_best_hsp(alignment: object, query_length: int) -> tuple[float, int, int] | None:
    best: tuple[float, int, int] | None = None

    for hsp in getattr(alignment, "hsps", []):
        if getattr(hsp, "gaps", 0):
            continue

        align_length = int(getattr(hsp, "align_length", 0) or 0)
        identities = int(getattr(hsp, "identities", 0) or 0)
        mismatches = max(query_length - identities, 0)

        if align_length < query_length - HIGH_CONFIDENCE_ALIGNMENT_SLACK:
            continue
        if mismatches > HIGH_CONFIDENCE_MISMATCHES:
            continue

        identity = round(identities / query_length * 100, 1)
        current = (identity, align_length, mismatches)
        if best is None or current[0] > best[0] or (current[0] == best[0] and current[2] < best[2]):
            best = current

    return best


def _risk_from_hits(candidate_hits: list[tuple[object, float, int, int]]) -> GrnaRiskLevel:
    potential_off_targets = max(0, len(candidate_hits) - 1)
    if potential_off_targets == 0:
        return GrnaRiskLevel.low

    best_non_target_identity = candidate_hits[1][1]
    has_extra_perfect_hit = any(identity >= 100.0 for _, identity, _, _ in candidate_hits[1:])

    if has_extra_perfect_hit or potential_off_targets >= 3 or best_non_target_identity >= 95.0:
        return GrnaRiskLevel.high
    return GrnaRiskLevel.medium


def _summarize_off_target_record(record: object | None) -> dict:
    if record is None or not getattr(record, "alignments", None):
        return _empty_off_target_payload(
            OffTargetStatus.no_hits,
            "No species-filtered genomic BLAST hit was found for this guide.",
        )

    query_length = int(getattr(record, "query_letters", 0) or 0)
    if query_length == 0:
        query_text = str(getattr(record, "query", "") or "")
        query_length = len(query_text)

    if query_length == 0:
        return _empty_off_target_payload(
            OffTargetStatus.error,
            "BLAST returned an invalid off-target record.",
        )

    candidate_hits: list[tuple[object, float, int, int]] = []
    for alignment in record.alignments:
        best = _select_best_hsp(alignment, query_length)
        if best is None:
            continue
        identity, align_length, mismatches = best
        candidate_hits.append((alignment, identity, align_length, mismatches))

    if not candidate_hits:
        return _empty_off_target_payload(
            OffTargetStatus.no_hits,
            "No high-confidence species-filtered genomic hit was found for this guide.",
        )

    candidate_hits.sort(key=lambda item: (-item[1], item[3], -item[2]))
    off_target_risk = _risk_from_hits(candidate_hits)
    potential_off_targets = max(0, len(candidate_hits) - 1)
    best_non_target_identity = candidate_hits[1][1] if len(candidate_hits) > 1 else 0.0

    top_hits = []
    for rank, (alignment, identity, align_length, mismatches) in enumerate(candidate_hits[:3], start=1):
        title = str(getattr(alignment, "title", ""))
        if len(title) > 120:
            title = title[:117] + "..."
        top_hits.append(
            GrnaOffTargetHit(
                rank=rank,
                accession=str(getattr(alignment, "accession", "")),
                title=title,
                identity=identity,
                align_length=align_length,
                mismatches=mismatches,
            ).model_dump()
        )

    if potential_off_targets == 0:
        message = (
            "Only one high-confidence species-filtered genomic hit was detected; "
            "it is treated as the intended locus."
        )
    else:
        message = (
            f"{potential_off_targets} additional high-confidence genomic hit(s) were detected. "
            "The strongest genomic hit is treated as the intended locus."
        )

    return {
        "off_target_risk": off_target_risk.value,
        "off_target_status": OffTargetStatus.validated.value,
        "potential_off_target_hits": potential_off_targets,
        "best_non_target_identity": round(best_non_target_identity, 1),
        "top_off_target_hits": top_hits,
        "off_target_message": message,
    }


def _batch_screen_off_targets_blast(grna_list: list[GrnaResult], cas_type: CasType, species: str) -> list[dict]:
    if not grna_list:
        return []

    entrez_filter = SPECIES_ENTREZ_FILTER.get(species)
    if not entrez_filter:
        return [
            _empty_off_target_payload(
                OffTargetStatus.skipped,
                f"Species '{species}' is not supported for off-target screening yet.",
            )
            for _ in grna_list
        ]

    fasta = "\n".join(f">grna_{idx + 1}\n{guide.guide_with_pam}" for idx, guide in enumerate(grna_list))
    fasta_hash = sha1(f"{species}:{cas_type.value}:{fasta}".encode("utf-8")).hexdigest()

    def _load() -> list[dict]:
        try:
            records = run_qblast(
                program="blastn",
                database=OFF_TARGET_DB,
                sequence=fasta,
                entrez_query=entrez_filter,
                hitlist_size=OFF_TARGET_HITLIST_SIZE,
                expect=1000,
                word_size=7,
                short_query=True,
                format_type="XML",
            )
        except Exception:
            return [
                _empty_off_target_payload(
                    OffTargetStatus.error,
                    "Species-filtered genomic off-target screening is temporarily unavailable.",
                )
                for _ in grna_list
            ]

        payloads = []
        for idx in range(len(grna_list)):
            record = records[idx] if idx < len(records) else None
            payloads.append(_summarize_off_target_record(record))
        return payloads

    return cached_call(
        "grna_offtarget_batch",
        species,
        cas_type.value,
        fasta_hash,
        loader=_load,
        should_cache=lambda payloads: all(
            payload["off_target_status"] != OffTargetStatus.error.value for payload in payloads
        ),
    )


def _final_rank_key(grna: GrnaResult) -> tuple[int, float]:
    risk_order = {
        None: 3,
        GrnaRiskLevel.low: 0,
        GrnaRiskLevel.medium: 1,
        GrnaRiskLevel.high: 2,
    }
    return (risk_order.get(grna.off_target_risk, 3), -grna.on_target_score)


def find_grnas(seq: str, cas_type: CasType, num_return: int) -> list[GrnaResult]:
    seq = seq.upper()
    rev_seq = reverse_complement(seq)
    results: list[GrnaResult] = []

    for strand, search_seq in [("+", seq), ("-", rev_seq)]:
        if cas_type in (CasType.cas9, CasType.cas9_ng):
            pam_len = 3 if cas_type == CasType.cas9 else 2
            for i in range(len(search_seq) - 20 - pam_len + 1):
                guide = search_seq[i : i + 20]
                pam = search_seq[i + 20 : i + 20 + pam_len]

                if cas_type == CasType.cas9 and not re.fullmatch(r"[ACGT]GG", pam):
                    continue
                if cas_type == CasType.cas9_ng and not re.fullmatch(r"[ACGT]G", pam):
                    continue

                score = score_grna(guide, cas_type)
                pos = i if strand == "+" else len(seq) - i - 20 - pam_len
                results.append(
                    GrnaResult(
                        rank=0,
                        grna_sequence=guide,
                        pam=pam,
                        position=pos,
                        strand=strand,
                        gc_content=gc_content(guide),
                        on_target_score=score,
                        heuristic_risk=heuristic_risk_level(score),
                        guide_with_pam=_guide_with_pam(guide, pam, cas_type),
                    )
                )

        elif cas_type == CasType.cas12a:
            for i in range(len(search_seq) - 24 + 1):
                pam = search_seq[i : i + 4]
                if not re.fullmatch(r"TTT[ACG]", pam):
                    continue
                guide = search_seq[i + 4 : i + 24]
                score = score_grna(guide, cas_type)
                pos = i if strand == "+" else len(seq) - i - 24
                results.append(
                    GrnaResult(
                        rank=0,
                        grna_sequence=guide,
                        pam=pam,
                        position=pos,
                        strand=strand,
                        gc_content=gc_content(guide),
                        on_target_score=score,
                        heuristic_risk=heuristic_risk_level(score),
                        guide_with_pam=_guide_with_pam(guide, pam, cas_type),
                    )
                )

    results.sort(key=lambda guide: guide.on_target_score, reverse=True)
    return results[:num_return]


def design_grna(req: GrnaDesignRequest) -> GrnaDesignResponse:
    seq = req.sequence.upper().strip()
    target_locus = req.target_locus

    if target_locus is not None and target_locus.end < target_locus.start:
        return GrnaDesignResponse(
            success=False,
            gene_name=req.gene_name,
            cas_type=req.cas_type.value,
            species=req.species.value,
            sequence_length=len(seq),
            grna_list=[],
            target_locus=target_locus,
            message="Target locus end must be greater than or equal to start.",
        )

    if len(seq) < 23:
        return GrnaDesignResponse(
            success=False,
            gene_name=req.gene_name,
            cas_type=req.cas_type.value,
            species=req.species.value,
            sequence_length=len(seq),
            grna_list=[],
            target_locus=target_locus,
            message="Target sequence is too short. At least 23 bp is required.",
        )

    grna_list = find_grnas(seq, req.cas_type, req.num_return)
    screening = screen_grna_off_targets(
        grna_list,
        req.cas_type,
        req.species.value,
        target_locus=target_locus,
        fallback_loader=lambda: _batch_screen_off_targets_blast(grna_list, req.cas_type, req.species.value),
    )

    for guide, payload in zip(grna_list, screening.payloads):
        guide.off_target_risk = (
            GrnaRiskLevel(payload["off_target_risk"]) if payload["off_target_risk"] is not None else None
        )
        guide.off_target_status = OffTargetStatus(payload["off_target_status"])
        guide.potential_off_target_hits = payload["potential_off_target_hits"]
        guide.best_non_target_identity = payload["best_non_target_identity"]
        guide.top_off_target_hits = [GrnaOffTargetHit(**hit) for hit in payload["top_off_target_hits"]]
        guide.off_target_message = payload["off_target_message"]
        guide.target_locus_status = TargetLocusAnchorStatus(
            payload.get("target_locus_status", TargetLocusAnchorStatus.not_provided.value)
        )
        guide.target_locus_message = payload.get("target_locus_message", "")

    grna_list.sort(key=_final_rank_key)
    for idx, guide in enumerate(grna_list, start=1):
        guide.rank = idx

    target_locus_message = ""
    if target_locus is not None:
        if screening.target_locus_anchor_used:
            target_locus_message = (
                f" The provided target locus anchored on-target identification for "
                f"{screening.target_locus_matched_guides}/{len(grna_list)} returned guide(s)."
            )
        else:
            target_locus_message = " The provided target locus could not be applied to this run."

    return GrnaDesignResponse(
        success=True,
        gene_name=req.gene_name,
        cas_type=req.cas_type.value,
        species=req.species.value,
        sequence_length=len(seq),
        grna_list=grna_list,
        risk_model="heuristic_sequence_features",
        off_target_model=screening.off_target_model,
        off_target_scope=screening.off_target_scope,
        off_target_engine=screening.off_target_engine,
        genome_wide_offtarget_checked=screening.genome_wide_offtarget_checked,
        off_target_fallback_reason=screening.off_target_fallback_reason,
        target_locus=target_locus,
        target_locus_anchor_used=screening.target_locus_anchor_used,
        target_locus_anchor_status=TargetLocusAnchorStatus(screening.target_locus_anchor_status),
        target_locus_matched_guides=screening.target_locus_matched_guides,
        target_locus_unmatched_guides=screening.target_locus_unmatched_guides,
        target_locus_summary=screening.target_locus_summary,
        hit_annotation_ready=screening.hit_annotation_ready,
        hit_annotation_source=screening.hit_annotation_source,
        hit_annotation_summary=screening.hit_annotation_summary,
        message=(
            f"Found {len(grna_list)} candidate gRNAs. Activity scores come from a sequence-feature heuristic, "
            + (
                "while off-target labels come from local genome-level screening."
                if screening.genome_wide_offtarget_checked
                else "while off-target labels come from species-filtered nt short-query BLAST screening."
            )
            + target_locus_message
        ),
    )
