from __future__ import annotations

import re
import shutil
import subprocess
import tempfile
import time
from dataclasses import dataclass
from hashlib import sha1
from pathlib import Path
from threading import Lock
from typing import Callable

from Bio import SeqIO

from app.core.config import settings
from app.schemas.grna import (
    CasType,
    GrnaOffTargetHit,
    GrnaOffTargetReadinessResponse,
    GrnaResult,
    GrnaRiskLevel,
    OffTargetReadinessStatus,
    OffTargetStatus,
    TargetLocus,
    TargetLocusAnchorStatus,
)
from app.services.grna_hit_annotation import annotate_genome_hit, get_grna_hit_annotation_meta
from app.services.ncbi_client import cached_call

PAM_PATTERNS = {
    CasType.cas9: re.compile(r"[ACGT]GG"),
    CasType.cas9_ng: re.compile(r"[ACGT]G"),
    CasType.cas12a: re.compile(r"TTT[ACG]"),
}


@dataclass
class OffTargetScreenResult:
    payloads: list[dict]
    off_target_model: str
    off_target_scope: str
    off_target_engine: str
    genome_wide_offtarget_checked: bool
    off_target_fallback_reason: str = ""
    target_locus_anchor_used: bool = False
    target_locus_anchor_status: str = TargetLocusAnchorStatus.not_provided.value
    target_locus_matched_guides: int = 0
    target_locus_unmatched_guides: int = 0
    target_locus_summary: str = ""
    hit_annotation_ready: bool = False
    hit_annotation_source: str = "none"
    hit_annotation_summary: str = ""


@dataclass
class Bowtie2BackendConfig:
    executable: str
    index_prefix: str
    fasta_path: str


def reverse_complement(seq: str) -> str:
    comp = str.maketrans("ACGTNacgtn", "TGCANtgcan")
    return seq.translate(comp)[::-1]


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


def _accession_tokens(accession: str) -> set[str]:
    token = accession.strip().lower()
    if not token:
        return set()

    tokens = {token}
    core = token.split(".", 1)[0]
    tokens.add(core)

    if token.startswith("chr"):
        tokens.add(token[3:])
    else:
        tokens.add(f"chr{token}")

    if core.startswith("chr"):
        tokens.add(core[3:])
    else:
        tokens.add(f"chr{core}")

    return {value for value in tokens if value}


def _accession_matches(hit_accession: str, locus_accession: str) -> bool:
    return bool(_accession_tokens(hit_accession) & _accession_tokens(locus_accession))


def _hit_matches_target_locus(hit: dict, guide_length: int, target_locus: TargetLocus) -> bool:
    if not _accession_matches(hit["accession"], target_locus.accession):
        return False
    if target_locus.strand and hit["strand"] != target_locus.strand:
        return False

    hit_start = int(hit["position"])
    hit_end = hit_start + guide_length - 1
    return not (hit_end < target_locus.start or hit_start > target_locus.end)


def _anchor_status_for_guides(payloads: list[dict], target_locus: TargetLocus | None) -> tuple[str, int, int, str]:
    if target_locus is None:
        return (
            TargetLocusAnchorStatus.not_provided.value,
            0,
            0,
            "No target locus was provided, so on-target identification falls back to the best-supported genomic hit.",
        )

    matched = sum(
        1 for payload in payloads if payload.get("target_locus_status") == TargetLocusAnchorStatus.matched.value
    )
    unmatched = len(payloads) - matched

    if matched == 0:
        return (
            TargetLocusAnchorStatus.no_match.value,
            matched,
            unmatched,
            "The provided target locus did not overlap any returned genome hit. Check the contig naming and coordinates.",
        )
    if unmatched == 0:
        return (
            TargetLocusAnchorStatus.matched.value,
            matched,
            unmatched,
            f"The provided target locus anchored on-target identification for all {matched} returned guide(s).",
        )
    return (
        TargetLocusAnchorStatus.partial.value,
        matched,
        unmatched,
        f"The provided target locus anchored {matched} guide(s), while {unmatched} guide(s) had no overlapping genome hit.",
    )


def _risk_from_identity_hits(candidate_hits: list[tuple[dict, float, int, int]]) -> GrnaRiskLevel:
    potential_off_targets = max(0, len(candidate_hits) - 1)
    if potential_off_targets == 0:
        return GrnaRiskLevel.low

    best_non_target_identity = candidate_hits[1][1]
    has_extra_perfect_hit = any(identity >= 100.0 for _, identity, _, _ in candidate_hits[1:])
    if has_extra_perfect_hit or potential_off_targets >= 3 or best_non_target_identity >= 95.0:
        return GrnaRiskLevel.high
    return GrnaRiskLevel.medium


def _bowtie_index_exists(index_prefix: str) -> bool:
    suffixes = (
        ".1.bt2",
        ".2.bt2",
        ".3.bt2",
        ".4.bt2",
        ".1.bt2l",
        ".2.bt2l",
        ".3.bt2l",
        ".4.bt2l",
    )
    return any(Path(f"{index_prefix}{suffix}").exists() for suffix in suffixes)


def _resolve_bowtie2_backend(species: str) -> tuple[Bowtie2BackendConfig | None, str]:
    backend = settings.GRNA_OFFTARGET_BACKEND.strip().lower()
    if backend == "nt_blast":
        return None, "Genome-level off-target screening is disabled by configuration."
    if backend not in {"auto", "bowtie2"}:
        return None, f"Unsupported CRISPR off-target backend '{settings.GRNA_OFFTARGET_BACKEND}'."

    index_prefix = settings.grna_bowtie2_index_by_species.get(species, "").strip()
    fasta_path = settings.grna_genome_fasta_by_species.get(species, "").strip()
    if not index_prefix or not fasta_path:
        return None, f"No local genome index and FASTA are configured for species '{species}'."

    executable = settings.GRNA_BOWTIE2_PATH.strip() or "bowtie2"
    resolved_executable = shutil.which(executable) or (executable if Path(executable).exists() else "")
    if not resolved_executable:
        return None, f"Bowtie2 executable '{executable}' was not found."
    if not _bowtie_index_exists(index_prefix):
        return None, f"Bowtie2 index '{index_prefix}' was not found."
    if not Path(fasta_path).exists():
        return None, f"Genome FASTA '{fasta_path}' was not found."

    return Bowtie2BackendConfig(
        executable=resolved_executable,
        index_prefix=index_prefix,
        fasta_path=fasta_path,
    ), ""


def _index_env_var_for_species(species: str) -> str:
    return {
        "human": "GRNA_BOWTIE2_INDEX_HUMAN",
        "mouse": "GRNA_BOWTIE2_INDEX_MOUSE",
    }.get(species, "GRNA_BOWTIE2_INDEX_<SPECIES>")


def _fasta_env_var_for_species(species: str) -> str:
    return {
        "human": "GRNA_GENOME_FASTA_HUMAN",
        "mouse": "GRNA_GENOME_FASTA_MOUSE",
    }.get(species, "GRNA_GENOME_FASTA_<SPECIES>")


def get_grna_offtarget_readiness(species: str) -> GrnaOffTargetReadinessResponse:
    backend_mode = settings.GRNA_OFFTARGET_BACKEND.strip().lower() or "auto"
    fallback_enabled = settings.GRNA_ENABLE_NT_BLAST_FALLBACK
    executable = settings.GRNA_BOWTIE2_PATH.strip() or "bowtie2"
    resolved_executable = shutil.which(executable) or (executable if Path(executable).exists() else "")
    index_prefix = settings.grna_bowtie2_index_by_species.get(species, "").strip()
    fasta_path = settings.grna_genome_fasta_by_species.get(species, "").strip()
    index_env_var = _index_env_var_for_species(species)
    fasta_env_var = _fasta_env_var_for_species(species)

    missing_requirements: list[str] = []
    missing_env_vars: list[str] = []

    if backend_mode == "nt_blast":
        return GrnaOffTargetReadinessResponse(
            species=species,
            backend_mode=backend_mode,
            readiness_status=OffTargetReadinessStatus.disabled,
            genome_backend_ready=False,
            target_locus_anchor_ready=False,
            fallback_enabled=fallback_enabled,
            active_engine="ncbi_nt_blast" if fallback_enabled else "none",
            summary=(
                "Genome-level off-target screening is disabled by configuration. "
                "Requests will use nt BLAST only, so target-locus anchoring will stay unavailable."
            ),
        )

    if backend_mode not in {"auto", "bowtie2"}:
        return GrnaOffTargetReadinessResponse(
            species=species,
            backend_mode=backend_mode,
            readiness_status=OffTargetReadinessStatus.unavailable,
            genome_backend_ready=False,
            target_locus_anchor_ready=False,
            fallback_enabled=fallback_enabled,
            active_engine="ncbi_nt_blast" if fallback_enabled else "none",
            summary=f"Unsupported GRNA_OFFTARGET_BACKEND value '{settings.GRNA_OFFTARGET_BACKEND}'.",
            missing_requirements=["Set GRNA_OFFTARGET_BACKEND to 'auto', 'bowtie2', or 'nt_blast'."],
        )

    if not resolved_executable:
        missing_requirements.append(f"Install bowtie2 or set GRNA_BOWTIE2_PATH to a valid executable. Current value: {executable}.")

    if not index_prefix:
        missing_env_vars.append(index_env_var)
        missing_requirements.append(f"Set {index_env_var} to your Bowtie2 index prefix for {species}.")
    elif not _bowtie_index_exists(index_prefix):
        missing_requirements.append(f"{index_env_var} is set, but the Bowtie2 index files were not found at that prefix.")

    if not fasta_path:
        missing_env_vars.append(fasta_env_var)
        missing_requirements.append(f"Set {fasta_env_var} to the reference FASTA path for {species}.")
    elif not Path(fasta_path).exists():
        missing_requirements.append(f"{fasta_env_var} is set, but the reference FASTA file does not exist at that path.")

    genome_backend_ready = not missing_requirements

    if genome_backend_ready:
        status = OffTargetReadinessStatus.ready
        active_engine = "bowtie2_local_index"
        summary = (
            f"Genome-level Bowtie2 screening is ready for {species}. "
            "Target-locus anchoring will use the configured reference genome."
        )
    elif fallback_enabled:
        status = OffTargetReadinessStatus.fallback
        active_engine = "ncbi_nt_blast"
        summary = (
            f"Genome-level screening is not ready for {species}, so requests will fall back to nt BLAST. "
            "Target-locus anchoring will not be applied until the local genome backend is configured."
        )
    else:
        status = OffTargetReadinessStatus.unavailable
        active_engine = "none"
        summary = (
            f"Genome-level screening is not ready for {species}, and nt BLAST fallback is disabled. "
            "CRISPR off-target screening will remain unavailable until the local backend is configured."
        )

    return GrnaOffTargetReadinessResponse(
        species=species,
        backend_mode=backend_mode,
        readiness_status=status,
        genome_backend_ready=genome_backend_ready,
        target_locus_anchor_ready=genome_backend_ready,
        fallback_enabled=fallback_enabled,
        active_engine=active_engine,
        summary=summary,
        missing_requirements=missing_requirements,
        missing_env_vars=missing_env_vars,
    )


_GENOME_INDEX_TTL = 24 * 3600  # seconds
_genome_cache: dict[str, tuple[float, object]] = {}
_genome_cache_lock = Lock()


def _load_genome_index(fasta_path: str):
    now = time.time()
    with _genome_cache_lock:
        entry = _genome_cache.get(fasta_path)
        if entry is not None:
            loaded_at, index = entry
            if now - loaded_at < _GENOME_INDEX_TTL:
                return index
        # Use a persistent SQLite-backed index so repeated server restarts
        # skip the expensive full-FASTA scan (first build ~2 min, then <1s).
        db_path = fasta_path + ".idx.db"
        try:
            index = SeqIO.index_db(db_path, fasta_path, "fasta")
        except Exception:
            index = SeqIO.index(fasta_path, "fasta")
        _genome_cache[fasta_path] = (now, index)
        return index


def _pam_length(cas_type: CasType) -> int:
    return 4 if cas_type == CasType.cas12a else (2 if cas_type == CasType.cas9_ng else 3)


def _pam_matches(pam: str, cas_type: CasType) -> bool:
    pattern = PAM_PATTERNS.get(cas_type)
    return bool(pattern and pattern.fullmatch(pam.upper()))


def _extract_nm(optional_fields: list[str]) -> int | None:
    for field in optional_fields:
        if field.startswith("NM:i:"):
            try:
                return int(field.split(":")[-1])
            except ValueError:
                return None
    return None


def _pam_for_alignment(
    fasta_index,
    accession: str,
    start_1based: int,
    query_length: int,
    strand: str,
    cas_type: CasType,
) -> str | None:
    try:
        record = fasta_index[accession]
    except KeyError:
        return None

    seq = str(record.seq).upper()
    start0 = start_1based - 1
    end0 = start0 + query_length
    pam_len = _pam_length(cas_type)

    if cas_type == CasType.cas12a:
        pam_start0, pam_end0 = (start0 - pam_len, start0) if strand == "+" else (end0, end0 + pam_len)
    else:
        pam_start0, pam_end0 = (end0, end0 + pam_len) if strand == "+" else (start0 - pam_len, start0)

    if pam_start0 < 0 or pam_end0 > len(seq):
        return None

    pam_seq = seq[pam_start0:pam_end0]
    if strand == "-":
        pam_seq = reverse_complement(pam_seq)
    return pam_seq


def _summarize_genome_hits(
    hits: list[dict],
    guide_length: int,
    species: str,
    target_locus: TargetLocus | None = None,
) -> dict:
    if not hits:
        payload = _empty_off_target_payload(
            OffTargetStatus.no_hits,
            "No canonical-PAM genome-level hit was detected for this guide.",
        )
        if target_locus is not None:
            payload["target_locus_status"] = TargetLocusAnchorStatus.no_match.value
            payload["target_locus_message"] = (
                "No genome-level hit overlapped the provided target locus for this guide."
            )
        return payload

    candidate_hits: list[tuple[dict, float, int, int]] = []
    for hit in hits:
        identity = round((guide_length - hit["mismatches"]) / guide_length * 100, 1)
        candidate_hits.append((hit, identity, guide_length, hit["mismatches"]))

    candidate_hits.sort(key=lambda item: (item[3], -item[1], item[0]["accession"], item[0]["position"]))
    intended_idx = 0
    target_locus_status = TargetLocusAnchorStatus.not_provided.value
    target_locus_message = ""

    if target_locus is not None:
        intended_idx = -1
        for idx, (hit, _, _, _) in enumerate(candidate_hits):
            if _hit_matches_target_locus(hit, guide_length, target_locus):
                intended_idx = idx
                break

        if intended_idx >= 0:
            target_locus_status = TargetLocusAnchorStatus.matched.value
            target_locus_message = "A genome hit overlapping the provided target locus was used as the intended on-target site."
        else:
            target_locus_status = TargetLocusAnchorStatus.no_match.value
            target_locus_message = (
                "No genome hit overlapped the provided target locus. All detected hits are treated as non-target evidence."
            )

    top_hits = []

    if intended_idx >= 0:
        intended_hit = candidate_hits[intended_idx]
        non_target_hits = [item for idx, item in enumerate(candidate_hits) if idx != intended_idx]
        ordered_hits = [intended_hit, *non_target_hits]
        off_target_risk = _risk_from_identity_hits(ordered_hits)
        potential_off_targets = len(non_target_hits)
        best_non_target_identity = non_target_hits[0][1] if non_target_hits else 0.0
        target_key = (
            intended_hit[0]["accession"],
            intended_hit[0]["position"],
            intended_hit[0]["strand"],
            intended_hit[0]["pam"],
        )

        for rank, (hit, identity, align_length, mismatches) in enumerate(ordered_hits[:3], start=1):
            hit_key = (hit["accession"], hit["position"], hit["strand"], hit["pam"])
            annotation = annotate_genome_hit(
                species=species,
                accession=hit["accession"],
                start=hit["position"],
                end=hit["position"] + guide_length - 1,
            )
            top_hits.append(
                GrnaOffTargetHit(
                    rank=rank,
                    accession=hit["accession"],
                    title=hit["title"],
                    identity=identity,
                    align_length=align_length,
                    mismatches=mismatches,
                    position=hit["position"],
                    strand=hit["strand"],
                    pam=hit["pam"],
                    is_target_locus=hit_key == target_key,
                    annotation=annotation,
                ).model_dump()
            )

        if target_locus is None:
            if potential_off_targets == 0:
                message = (
                    "Only one canonical-PAM genome hit passed the mismatch filter; "
                    "it is treated as the intended locus by the best-match heuristic."
                )
            else:
                message = (
                    f"{potential_off_targets} additional canonical-PAM genome hit(s) passed the mismatch filter. "
                    "The strongest hit is treated as the intended locus because no target locus was provided."
                )
        elif potential_off_targets == 0:
            message = (
                "A genome hit overlapping the provided target locus was found, and no additional genome hit passed the mismatch filter."
            )
        else:
            message = (
                f"{potential_off_targets} additional canonical-PAM genome hit(s) passed the mismatch filter. "
                "A hit overlapping the provided target locus was treated as the intended locus."
            )
    else:
        off_target_risk = GrnaRiskLevel.high
        potential_off_targets = len(candidate_hits)
        best_non_target_identity = candidate_hits[0][1]

        for rank, (hit, identity, align_length, mismatches) in enumerate(candidate_hits[:3], start=1):
            annotation = annotate_genome_hit(
                species=species,
                accession=hit["accession"],
                start=hit["position"],
                end=hit["position"] + guide_length - 1,
            )
            top_hits.append(
                GrnaOffTargetHit(
                    rank=rank,
                    accession=hit["accession"],
                    title=hit["title"],
                    identity=identity,
                    align_length=align_length,
                    mismatches=mismatches,
                    position=hit["position"],
                    strand=hit["strand"],
                    pam=hit["pam"],
                    is_target_locus=False,
                    annotation=annotation,
                ).model_dump()
            )

        message = (
            "No genome hit overlapped the provided target locus. Confirm the locus coordinates and reference naming before using this guide."
        )

    return {
        "off_target_risk": off_target_risk.value,
        "off_target_status": (
            OffTargetStatus.validated.value
            if intended_idx >= 0
            else OffTargetStatus.anchor_missing.value
        ),
        "potential_off_target_hits": potential_off_targets,
        "best_non_target_identity": round(best_non_target_identity, 1),
        "top_off_target_hits": top_hits,
        "off_target_message": message,
        "target_locus_status": target_locus_status,
        "target_locus_message": target_locus_message,
    }


def _parse_bowtie2_hits(
    stdout: str,
    guides: list[GrnaResult],
    cas_type: CasType,
    species: str,
    fasta_path: str,
    target_locus: TargetLocus | None = None,
) -> list[dict]:
    fasta_index = _load_genome_index(fasta_path)
    guide_map = {f"grna_{idx + 1}": guide for idx, guide in enumerate(guides)}
    collected_hits: dict[str, list[dict]] = {name: [] for name in guide_map}
    seen_hits: dict[str, set[tuple[str, int, str, str]]] = {name: set() for name in guide_map}

    for raw_line in stdout.splitlines():
        if not raw_line or raw_line.startswith("@"):
            continue

        fields = raw_line.split("\t")
        if len(fields) < 11:
            continue

        query_name = fields[0]
        guide = guide_map.get(query_name)
        if guide is None:
            continue

        flag = int(fields[1])
        if flag & 4:
            continue

        cigar = fields[5]
        if cigar != f"{len(guide.grna_sequence)}M":
            continue

        mismatches = _extract_nm(fields[11:])
        if mismatches is None or mismatches > settings.GRNA_MAX_OFFTARGET_MISMATCHES:
            continue

        accession = fields[2]
        position = int(fields[3])
        strand = "-" if (flag & 16) else "+"
        pam = _pam_for_alignment(
            fasta_index=fasta_index,
            accession=accession,
            start_1based=position,
            query_length=len(guide.grna_sequence),
            strand=strand,
            cas_type=cas_type,
        )
        if not pam or not _pam_matches(pam, cas_type):
            continue

        dedupe_key = (accession, position, strand, pam)
        if dedupe_key in seen_hits[query_name]:
            continue
        seen_hits[query_name].add(dedupe_key)

        collected_hits[query_name].append(
            {
                "accession": accession,
                "position": position,
                "strand": strand,
                "pam": pam,
                "mismatches": mismatches,
                "title": f"{accession}:{position} ({strand}) PAM={pam}",
            }
        )

    payloads = []
    for idx, guide in enumerate(guides):
        query_name = f"grna_{idx + 1}"
        payloads.append(
            _summarize_genome_hits(
                collected_hits[query_name],
                len(guide.grna_sequence),
                species,
                target_locus=target_locus,
            )
        )
    return payloads


def _run_bowtie2_screen(
    grna_list: list[GrnaResult],
    cas_type: CasType,
    species: str,
    config: Bowtie2BackendConfig,
    target_locus: TargetLocus | None = None,
) -> OffTargetScreenResult:
    hit_annotation_ready, hit_annotation_source, hit_annotation_summary = get_grna_hit_annotation_meta(species)
    fasta_payload = "\n".join(
        f">grna_{idx + 1}\n{guide.grna_sequence}"
        for idx, guide in enumerate(grna_list)
    )
    locus_key = ""
    if target_locus is not None:
        locus_key = f":{target_locus.accession}:{target_locus.start}:{target_locus.end}:{target_locus.strand or '.'}"
    payload_hash = sha1(
        f"{species}:{cas_type.value}:{config.index_prefix}:{config.fasta_path}:{fasta_payload}{locus_key}".encode("utf-8")
    ).hexdigest()

    def _load() -> OffTargetScreenResult:
        with tempfile.NamedTemporaryFile("w", suffix=".fa", delete=False, encoding="utf-8") as handle:
            handle.write(fasta_payload)
            fasta_path = handle.name

        try:
            command = [
                config.executable,
                "-x",
                config.index_prefix,
                "-f",
                "-U",
                fasta_path,
                "--end-to-end",
                "--very-sensitive",
                "--no-unal",
                "--quiet",
                "--no-hd",
                "--no-sq",
                "-L",
                "8",
                "-N",
                "1",
                "-k",
                str(settings.GRNA_BOWTIE2_MAX_ALIGNMENTS),
            ]
            completed = subprocess.run(
                command,
                capture_output=True,
                check=True,
                text=True,
                timeout=90,
            )
            payloads = _parse_bowtie2_hits(
                completed.stdout,
                grna_list,
                cas_type,
                species,
                config.fasta_path,
                target_locus=target_locus,
            )
        finally:
            Path(fasta_path).unlink(missing_ok=True)

        anchor_status, matched_guides, unmatched_guides, anchor_summary = _anchor_status_for_guides(
            payloads,
            target_locus,
        )

        return OffTargetScreenResult(
            payloads=payloads,
            off_target_model="bowtie2_reference_genome_shortread",
            off_target_scope="species_reference_genome",
            off_target_engine="bowtie2_local_index",
            genome_wide_offtarget_checked=True,
            target_locus_anchor_used=target_locus is not None,
            target_locus_anchor_status=anchor_status,
            target_locus_matched_guides=matched_guides,
            target_locus_unmatched_guides=unmatched_guides,
            target_locus_summary=anchor_summary,
            hit_annotation_ready=hit_annotation_ready,
            hit_annotation_source=hit_annotation_source,
            hit_annotation_summary=hit_annotation_summary,
        )

    return cached_call(
        "grna_genome_offtarget_batch",
        species,
        cas_type.value,
        payload_hash,
        loader=_load,
        should_cache=lambda result: all(
            payload["off_target_status"] != OffTargetStatus.error.value for payload in result.payloads
        ),
    )


def screen_grna_off_targets(
    grna_list: list[GrnaResult],
    cas_type: CasType,
    species: str,
    target_locus: TargetLocus | None = None,
    fallback_loader: Callable[[], list[dict]] | None = None,
) -> OffTargetScreenResult:
    if not grna_list:
        hit_annotation_ready, hit_annotation_source, hit_annotation_summary = get_grna_hit_annotation_meta(species)
        return OffTargetScreenResult(
            payloads=[],
            off_target_model="species_filtered_nt_blast_short",
            off_target_scope="species_filtered_nt",
            off_target_engine="ncbi_nt_blast",
            genome_wide_offtarget_checked=False,
            target_locus_anchor_status=(
                TargetLocusAnchorStatus.not_provided.value
                if target_locus is None
                else TargetLocusAnchorStatus.unavailable.value
            ),
            target_locus_summary=(
                "No target locus was provided."
                if target_locus is None
                else "A target locus was provided, but no guide was returned."
            ),
            hit_annotation_ready=hit_annotation_ready,
            hit_annotation_source=hit_annotation_source,
            hit_annotation_summary=hit_annotation_summary,
        )

    config, unavailable_reason = _resolve_bowtie2_backend(species)
    if config is not None:
        try:
            return _run_bowtie2_screen(grna_list, cas_type, species, config, target_locus=target_locus)
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, OSError, KeyError, ValueError) as exc:
            unavailable_reason = f"Genome-level Bowtie2 screening failed and the service fell back to nt BLAST: {exc}"

    if fallback_loader is not None and settings.GRNA_ENABLE_NT_BLAST_FALLBACK:
        payloads = fallback_loader()
        if target_locus is not None:
            payloads = [
                {
                    **payload,
                    "target_locus_status": TargetLocusAnchorStatus.unavailable.value,
                    "target_locus_message": "The provided target locus could not be applied because genome-level screening was unavailable.",
                }
                for payload in payloads
            ]
        return OffTargetScreenResult(
            payloads=payloads,
            off_target_model="species_filtered_nt_blast_short",
            off_target_scope="species_filtered_nt",
            off_target_engine="ncbi_nt_blast",
            genome_wide_offtarget_checked=False,
            off_target_fallback_reason=unavailable_reason,
            target_locus_anchor_status=(
                TargetLocusAnchorStatus.not_provided.value
                if target_locus is None
                else TargetLocusAnchorStatus.unavailable.value
            ),
            target_locus_summary=(
                "No target locus was provided, so the fallback screen uses the strongest hit heuristic."
                if target_locus is None
                else "A target locus was provided, but it could not be applied because genome-level screening was unavailable."
            ),
            hit_annotation_ready=False,
            hit_annotation_source="none",
            hit_annotation_summary=(
                "Top-hit gene annotations require genome-level coordinate hits. This run fell back to nt BLAST, so contextual labels were not attached."
            ),
        )

    payloads = [
        _empty_off_target_payload(
            OffTargetStatus.error,
            unavailable_reason or "Genome-level off-target screening is unavailable.",
        )
        for _ in grna_list
    ]
    if target_locus is not None:
        payloads = [
            {
                **payload,
                "target_locus_status": TargetLocusAnchorStatus.unavailable.value,
                "target_locus_message": "The provided target locus could not be applied because genome-level screening was unavailable.",
            }
            for payload in payloads
        ]
    return OffTargetScreenResult(
        payloads=payloads,
        off_target_model="unavailable",
        off_target_scope="unavailable",
        off_target_engine="none",
        genome_wide_offtarget_checked=False,
        off_target_fallback_reason=unavailable_reason,
        target_locus_anchor_status=(
            TargetLocusAnchorStatus.not_provided.value
            if target_locus is None
            else TargetLocusAnchorStatus.unavailable.value
        ),
        target_locus_summary=(
            "No target locus was provided."
            if target_locus is None
            else "A target locus was provided, but genome-level screening was unavailable."
        ),
        hit_annotation_ready=False,
        hit_annotation_source="none",
        hit_annotation_summary="Top-hit gene annotations require genome-level coordinate hits, but no genome-level screen was available for this run.",
    )
