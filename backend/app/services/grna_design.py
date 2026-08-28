import logging
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
from app.services.ncbi_fetch import fetch_gene_info, fetch_transcript

logger = logging.getLogger("primercat")

SPECIES_ENTREZ_FILTER = {
    "human": "txid9606[Organism]",
    "mouse": "txid10090[Organism]",
}

OFF_TARGET_DB = "nt"
OFF_TARGET_HITLIST_SIZE = 15
HIGH_CONFIDENCE_MISMATCHES = 3
HIGH_CONFIDENCE_ALIGNMENT_SLACK = 2

# Minimum identity to count a BLAST hit as a real off-target candidate.
# Hits below this threshold are sequencing noise / distant homologs, not
# functional off-target sites for a 20-nt guide.
OFF_TARGET_MIN_IDENTITY = 80.0

# Mismatches at or above this count are too divergent to cause off-target cutting.
OFF_TARGET_MAX_MISMATCHES = 4


def reverse_complement(seq: str) -> str:
    comp = str.maketrans("ACGTNacgtn", "TGCANtgcan")
    return seq.translate(comp)[::-1]


def gc_content(seq: str) -> float:
    seq = seq.upper()
    gc = seq.count("G") + seq.count("C")
    return round(gc / len(seq) * 100, 1)


def score_grna(guide: str, cas_type: CasType) -> float:
    """
    Position-weighted activity model.

    SpCas9 / SpCas9-NG
    ──────────────────
    Based on the Doench 2016 Rule Set 2 position-nucleotide weights, simplified
    to a discrete lookup table derived from the published coefficients.
    Positions are 1-based from the 5' end of the 20-nt protospacer.

    Scoring components (each additive, final score clamped 0–100):
      1. Intercept baseline: 50 points
      2. Per-position nucleotide weights (top 10 most discriminating positions
         from Rule Set 2; adjusted to a ±5 pt scale)
      3. GC content: 40–70% optimal (+12), 30–39% or 71–80% marginal (+4),
         <30% or >80% penalised (−18)
      4. Seed-region quality (PAM-proximal positions 13–20):
           - GGGG in seed: G-quadruplex risk (−15)
           - any run of ≥4 identical bases in seed (−8)
      5. poly-T (TTTT): U6 Pol-III terminator signal (−20)
      6. GC clamp: G or C at position 20 (+3); G or C at position 19 (+2)
      7. 5' G at position 1: improves U6-driven transcription (+3)
      8. Seed GC window (positions 13–20): ≥75% GC penalises secondary
         structure in the seed (−6); ≤25% seed GC also penalised (−4)

    Cas12a (AsCas12a / LbCas12a)
    ─────────────────────────────
      1. Intercept baseline: 50 points
      2. GC content: 30–65% optimal (+14), 25–29% or 66–75% marginal (+4),
         <25% or >75% penalised (−16)
      3. poly-T (TTTTT): Pol-III termination (−12)
      4. poly-G (GGGG): G-quadruplex risk (−12)
      5. 5' T at position 1 preferred (+4); 5' A neutral (+2)
      6. 3' A or G preferred (+4)
      7. Seed GC window (positions 13–20): same clamp as Cas9 (−5 / −3)
    """
    g = guide.upper()
    n = len(g)
    if n == 0:
        return 0.0

    gc = gc_content(guide)

    if cas_type in (CasType.cas9, CasType.cas9_ng):
        score = 50.0

        # ── 1. Position-nucleotide weights (Rule Set 2, simplified) ─────────
        # Weights derived from Doench et al. 2016 Nat Biotechnol Table S3,
        # rescaled so the full table contributes ±15 pts to the final score.
        # Only positions with |weight| > 0.15 in the original are included.
        # Format: { position (1-based): { nucleotide: delta } }
        POS_WEIGHTS: dict[int, dict[str, float]] = {
            1:  {"G": 2.0, "A": -1.0},
            2:  {"C": 1.5, "T": -1.0},
            3:  {"A": 1.0, "T": -1.5},
            4:  {"G": 1.5, "C": -1.0},
            6:  {"G": 1.5, "A": -1.0},
            10: {"A": 2.0, "C": -1.5, "T": -1.0},
            12: {"A": 1.5, "G": -2.0},
            15: {"T": -2.0, "G": 1.5},
            17: {"G": 2.0, "A": -1.5},
            18: {"G": 2.0, "T": -1.5},
            19: {"G": 1.5, "T": -2.0},
            20: {"G": 2.0, "C": 1.5, "A": -1.0, "T": -1.5},
        }
        for pos, weights in POS_WEIGHTS.items():
            if pos <= n:
                nuc = g[pos - 1]
                score += weights.get(nuc, 0.0)

        # ── 2. GC content ────────────────────────────────────────────────────
        if 40 <= gc <= 70:
            score += 12
        elif 30 <= gc < 40 or 70 < gc <= 80:
            score += 4
        else:
            score -= 18

        # ── 3. poly-T: U6 termination signal ────────────────────────────────
        if "TTTT" in g:
            score -= 20

        # ── 4. Seed region quality (PAM-proximal 8 nt = positions 13–20) ────
        seed = g[12:20]
        if "GGGG" in seed:
            score -= 15
        if re.search(r"(.)\1{3}", seed):
            score -= 8

        # ── 5. Seed GC window ────────────────────────────────────────────────
        seed_gc = gc_content(seed) if seed else 50.0
        if seed_gc >= 75:
            score -= 6
        elif seed_gc <= 25:
            score -= 4

        # ── 6. GC clamp (3' end) ─────────────────────────────────────────────
        if n >= 1 and g[-1] in ("G", "C"):
            score += 3
        if n >= 2 and g[-2] in ("G", "C"):
            score += 2

        # ── 7. 5' G: U6 transcription bonus ─────────────────────────────────
        if g[0] == "G":
            score += 3

    else:  # Cas12a
        score = 50.0

        # ── 1. GC content ────────────────────────────────────────────────────
        if 30 <= gc <= 65:
            score += 14
        elif 25 <= gc < 30 or 65 < gc <= 75:
            score += 4
        else:
            score -= 16

        # ── 2. poly-T: Pol-III termination ───────────────────────────────────
        if "TTTTT" in g:
            score -= 12

        # ── 3. poly-G: G-quadruplex risk ─────────────────────────────────────
        if "GGGG" in g:
            score -= 12

        # ── 4. 5' nucleotide preference ──────────────────────────────────────
        if g[0] == "T":
            score += 4
        elif g[0] == "A":
            score += 2

        # ── 5. 3' nucleotide preference ──────────────────────────────────────
        if g[-1] in ("A", "G"):
            score += 4

        # ── 6. Seed GC window (positions 13–20) ──────────────────────────────
        seed = g[12:20] if n >= 20 else g[max(0, n - 8):]
        seed_gc = gc_content(seed) if seed else 50.0
        if seed_gc >= 75:
            score -= 5
        elif seed_gc <= 25:
            score -= 3

        # ── 7. Position-nucleotide weights (Cas12a, simplified Kim 2018) ─────
        CAS12A_WEIGHTS: dict[int, dict[str, float]] = {
            1:  {"T": 2.0, "A": 1.0, "G": -1.5},
            4:  {"A": 2.0, "T": 1.0, "G": -1.5},
            8:  {"T": 1.5, "A": 1.0, "C": -1.0},
            12: {"A": 2.0, "G": -2.0},
            16: {"T": 1.5, "C": -1.5},
            20: {"A": 2.0, "T": 1.5, "G": -2.0},
        }
        for pos, weights in CAS12A_WEIGHTS.items():
            if pos <= n:
                nuc = g[pos - 1]
                score += weights.get(nuc, 0.0)

    return max(0.0, min(100.0, round(score, 1)))


def heuristic_risk_level(score: float) -> GrnaRiskLevel:
    """Map activity score to heuristic risk label (sequence features only)."""
    if score >= 65:
        return GrnaRiskLevel.low
    if score >= 40:
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
        # Allow up to OFF_TARGET_MAX_MISMATCHES for off-target candidates;
        # hits with more mismatches are too divergent to cause functional cutting.
        if mismatches > OFF_TARGET_MAX_MISMATCHES:
            continue

        identity = round(identities / query_length * 100, 1)

        # Filter out distant homologs that are unlikely to be cut.
        if identity < OFF_TARGET_MIN_IDENTITY:
            continue

        current = (identity, align_length, mismatches)
        if best is None or current[0] > best[0] or (current[0] == best[0] and current[2] < best[2]):
            best = current

    return best


def _risk_from_hits(candidate_hits: list[tuple[object, float, int, int]]) -> GrnaRiskLevel:
    """
    Classify off-target risk from a filtered list of BLAST hits.

    The first hit is treated as the intended on-target locus.
    Remaining hits are genuine off-target candidates (already filtered to
    ≥80% identity, ≤4 mismatches by _select_best_hsp).

    Risk thresholds (conservative but realistic for BLAST-based screening):
      High   — any extra perfect hit (100% identity) OR
               best non-target identity ≥ 95% OR
               ≥ 3 hits with identity ≥ 90%
      Medium — best non-target identity ≥ 85% OR ≥ 2 hits with identity ≥ 85%
      Low    — no qualifying off-target hits remain
    """
    # Hits already filtered; only those ≥ OFF_TARGET_MIN_IDENTITY survive.
    off_target_hits = candidate_hits[1:]  # exclude best (on-target) hit

    if not off_target_hits:
        return GrnaRiskLevel.low

    best_nt_identity = off_target_hits[0][1]
    has_perfect = any(identity >= 100.0 for _, identity, _, _ in off_target_hits)
    hits_ge90 = sum(1 for _, identity, _, _ in off_target_hits if identity >= 90.0)
    hits_ge85 = sum(1 for _, identity, _, _ in off_target_hits if identity >= 85.0)

    if has_perfect or best_nt_identity >= 95.0 or hits_ge90 >= 3:
        return GrnaRiskLevel.high
    if best_nt_identity >= 85.0 or hits_ge85 >= 2:
        return GrnaRiskLevel.medium
    return GrnaRiskLevel.low


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
        except Exception as exc:
            logger.warning("gRNA off-target BLAST failed (all retries exhausted): %s", exc)
            # Return skipped (not error) so the response model validates cleanly
            # and the frontend can render results without a 500.
            return [
                _empty_off_target_payload(
                    OffTargetStatus.skipped,
                    "Off-target screening temporarily unavailable — NCBI BLAST did not respond. "
                    "Please retry; results are otherwise complete.",
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
            payload["off_target_status"] not in (
                OffTargetStatus.error.value, OffTargetStatus.skipped.value
            ) for payload in payloads
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
                # pos: 0-based start of the guide on the original (+) strand.
                # For '-' strand hits, mirror back: i is the position on rev_seq,
                # so the original-strand start = len(seq) - i - 20 - pam_len.
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
                # pos: 0-based start of the PAM+guide unit on the original (+) strand.
                # For '-' strand hits: i is the position on rev_seq (PAM starts at i),
                # so the original-strand start = len(seq) - i - 24 (4 PAM + 20 guide).
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


def design_grna(req: GrnaDesignRequest, allow_remote_fallback: bool = True) -> GrnaDesignResponse:
    target_locus = req.target_locus
    fetched_transcript_id: str | None = None
    fetched_transcript_desc: str | None = None
    gene_full_name: str | None = None
    gene_summary: str | None = None
    gene_chromosome: str | None = None
    gene_aliases: str | None = None

    # ── Resolve sequence ──────────────────────────────────────────────────────
    raw_seq = req.sequence or ""
    if not raw_seq.strip() and req.gene_name:
        try:
            transcript = fetch_transcript(req.gene_name.strip(), req.species.value)
            raw_seq = transcript.sequence
            fetched_transcript_id = transcript.transcript_id
            fetched_transcript_desc = transcript.transcript_description
        except Exception as exc:
            return GrnaDesignResponse(
                success=False,
                gene_name=req.gene_name,
                cas_type=req.cas_type.value,
                species=req.species.value,
                sequence_length=0,
                grna_list=[],
                message=f"Could not fetch sequence for gene '{req.gene_name}': {exc}",
            )

    # ── Fetch gene info (non-fatal, after transcript so NCBI throttle is shared) ──
    if req.gene_name:
        try:
            gene_info = fetch_gene_info(req.gene_name.strip(), req.species.value)
            gene_full_name = gene_info.full_name or None
            gene_summary = gene_info.summary or None
            gene_chromosome = gene_info.chromosome or None
            gene_aliases = gene_info.aliases or None
        except Exception as exc:
            logger.debug("fetch_gene_info skipped for '%s': %s", req.gene_name, exc)

    seq = raw_seq.upper().strip()

    if not seq:
        return GrnaDesignResponse(
            success=False,
            gene_name=req.gene_name,
            cas_type=req.cas_type.value,
            species=req.species.value,
            sequence_length=0,
            grna_list=[],
            message="Please provide a DNA sequence or a valid gene name.",
        )

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
        fallback_loader=(
            (lambda: _batch_screen_off_targets_blast(grna_list, req.cas_type, req.species.value))
            if allow_remote_fallback
            else None
        ),
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
        fetched_transcript_id=fetched_transcript_id,
        fetched_transcript_desc=fetched_transcript_desc,
        gene_full_name=gene_full_name,
        gene_summary=gene_summary,
        gene_chromosome=gene_chromosome,
        gene_aliases=gene_aliases,
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
