from __future__ import annotations

from bisect import bisect_left
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
import sqlite3

from app.core.config import settings
from app.schemas.grna import (
    GrnaHitAnnotation,
    GrnaHitAnnotationStatus,
    GrnaHitRegion,
)

BIN_SIZE = 200_000


@dataclass(frozen=True)
class AnnotationBackendConfig:
    gtf_path: str = ""
    database_path: str = ""


@dataclass(frozen=True)
class FeatureRecord:
    accession: str
    start: int
    end: int
    strand: str
    gene_id: str = ""
    gene_name: str = ""
    transcript_id: str = ""
    gene_biotype: str = ""


@dataclass(frozen=True)
class GeneRecord:
    accession: str
    start: int
    end: int
    strand: str
    tss: int
    gene_id: str = ""
    gene_name: str = ""
    gene_biotype: str = ""


@dataclass
class AnnotationIndex:
    exon_bins: dict[str, dict[int, list[FeatureRecord]]] = field(default_factory=dict)
    cds_bins: dict[str, dict[int, list[FeatureRecord]]] = field(default_factory=dict)
    transcript_bins: dict[str, dict[int, list[FeatureRecord]]] = field(default_factory=dict)
    promoter_bins: dict[str, dict[int, list[GeneRecord]]] = field(default_factory=dict)
    genes_by_accession: dict[str, list[GeneRecord]] = field(default_factory=dict)
    gene_tss_by_accession: dict[str, list[int]] = field(default_factory=dict)


def _annotation_env_var_for_species(species: str) -> str:
    return {
        "human": "GRNA_ANNOTATION_GTF_HUMAN",
        "mouse": "GRNA_ANNOTATION_GTF_MOUSE",
    }.get(species, "GRNA_ANNOTATION_GTF_<SPECIES>")


def _annotation_db_env_var_for_species(species: str) -> str:
    return {
        "human": "GRNA_ANNOTATION_DB_HUMAN",
        "mouse": "GRNA_ANNOTATION_DB_MOUSE",
    }.get(species, "GRNA_ANNOTATION_DB_<SPECIES>")


def resolve_grna_hit_annotation_backend(species: str) -> tuple[AnnotationBackendConfig | None, str]:
    database_path = settings.grna_annotation_db_by_species.get(species, "").strip()
    if database_path:
        if Path(database_path).exists():
            return AnnotationBackendConfig(database_path=database_path), ""
        database_reason = f"Configured gRNA annotation database '{database_path}' was not found."
    else:
        database_reason = ""

    gtf_path = settings.grna_annotation_gtf_by_species.get(species, "").strip()
    if not gtf_path:
        return None, database_reason or f"No gene annotation database or GTF is configured for species '{species}'."
    if not Path(gtf_path).exists():
        return None, database_reason or f"Gene annotation GTF '{gtf_path}' was not found."
    return AnnotationBackendConfig(gtf_path=gtf_path), ""


def get_grna_hit_annotation_meta(species: str) -> tuple[bool, str, str]:
    backend, reason = resolve_grna_hit_annotation_backend(species)
    if backend is None:
        database_env_var = _annotation_db_env_var_for_species(species)
        gtf_env_var = _annotation_env_var_for_species(species)
        return (
            False,
            "none",
            "Top genome hits are not annotated yet. Configure "
            f"{database_env_var} (preferred) or {gtf_env_var} with a species-matched "
            "reference to enable gene-context labels.",
        )
    return (
        True,
        "sqlite_gene_model" if backend.database_path else "gtf_gene_model",
        f"Top genome hits are annotated against the configured {species} gene model.",
    )


def annotate_genome_hit(species: str, accession: str, start: int, end: int) -> GrnaHitAnnotation | None:
    backend, _ = resolve_grna_hit_annotation_backend(species)
    if backend is None:
        return None
    if backend.database_path:
        return _annotate_with_database(
            str(Path(backend.database_path).resolve()),
            accession,
            start,
            end,
            settings.GRNA_PROMOTER_WINDOW_BP,
        )
    index = _load_annotation_index(backend.gtf_path, settings.GRNA_PROMOTER_WINDOW_BP)
    return _annotate_with_index(index, accession, start, end)


def _parse_attributes(raw: str) -> dict[str, str]:
    attrs: dict[str, str] = {}
    for item in raw.strip().strip(";").split(";"):
        chunk = item.strip()
        if not chunk:
            continue
        if "=" in chunk and ('"' not in chunk or chunk.index("=") < chunk.index('"')):
            key, value = chunk.split("=", 1)
            attrs[key.strip()] = value.strip().strip('"')
            continue
        parts = chunk.split(" ", 1)
        if len(parts) != 2:
            continue
        key, value = parts
        attrs[key.strip()] = value.strip().strip('"')
    return attrs


def _pick_first(attrs: dict[str, str], *keys: str) -> str:
    for key in keys:
        value = attrs.get(key, "").strip()
        if value:
            return value
    return ""


def _normalise_gene_name(gene_name: str, gene_id: str, transcript_id: str) -> str:
    return gene_name or gene_id or transcript_id or ""


def _accession_candidates(accession: str) -> list[str]:
    values: list[str] = []

    def _push(value: str):
        if value and value not in values:
            values.append(value)

    token = accession.strip()
    core = token.split(".", 1)[0]
    _push(token)
    _push(core)

    if token.startswith("chr"):
        _push(token[3:])
    else:
        _push(f"chr{token}")

    if core.startswith("chr"):
        _push(core[3:])
    else:
        _push(f"chr{core}")

    return values


def _merge_interval(store: dict[tuple[str, str], dict[str, str | int]], key: tuple[str, str], **values: str | int):
    current = store.get(key)
    if current is None:
        store[key] = values
        return

    current["start"] = min(int(current["start"]), int(values["start"]))
    current["end"] = max(int(current["end"]), int(values["end"]))
    if not current.get("strand") and values.get("strand"):
        current["strand"] = values["strand"]
    if not current.get("gene_id") and values.get("gene_id"):
        current["gene_id"] = values["gene_id"]
    if not current.get("gene_name") and values.get("gene_name"):
        current["gene_name"] = values["gene_name"]
    if not current.get("gene_biotype") and values.get("gene_biotype"):
        current["gene_biotype"] = values["gene_biotype"]
    if not current.get("transcript_id") and values.get("transcript_id"):
        current["transcript_id"] = values["transcript_id"]


def _add_to_bins(bins: dict[str, dict[int, list[FeatureRecord | GeneRecord]]], record: FeatureRecord | GeneRecord):
    accession_bins = bins.setdefault(record.accession, {})
    start_bin = (record.start - 1) // BIN_SIZE
    end_bin = (record.end - 1) // BIN_SIZE
    for bin_id in range(start_bin, end_bin + 1):
        accession_bins.setdefault(bin_id, []).append(record)


def _promoter_interval(gene: GeneRecord, promoter_window_bp: int) -> tuple[int, int]:
    if gene.strand == "-":
        return gene.tss, gene.tss + promoter_window_bp
    return max(1, gene.tss - promoter_window_bp), gene.tss


@lru_cache(maxsize=4)
def _load_annotation_index(gtf_path: str, promoter_window_bp: int) -> AnnotationIndex:
    genes: dict[tuple[str, str], dict[str, str | int]] = {}
    transcripts: dict[tuple[str, str], dict[str, str | int]] = {}
    exon_bins: dict[str, dict[int, list[FeatureRecord]]] = {}
    cds_bins: dict[str, dict[int, list[FeatureRecord]]] = {}

    with Path(gtf_path).open("r", encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue

            fields = line.split("\t")
            if len(fields) < 9:
                continue

            accession, _, feature_type, start_raw, end_raw, _, strand, _, attrs_raw = fields[:9]
            try:
                start = int(start_raw)
                end = int(end_raw)
            except ValueError:
                continue
            if end < start:
                continue

            attrs = _parse_attributes(attrs_raw)
            gene_id = _pick_first(attrs, "gene_id", "gene", "ID", "Parent")
            transcript_id = _pick_first(attrs, "transcript_id", "transcript", "Parent")
            gene_name = _normalise_gene_name(
                _pick_first(attrs, "gene_name", "gene", "Name", "gene_symbol"),
                gene_id,
                transcript_id,
            )
            gene_biotype = _pick_first(attrs, "gene_biotype", "gene_type", "gene_biotype", "biotype")

            gene_key = (accession, gene_id or gene_name or transcript_id or f"gene:{start}:{end}:{strand}")
            _merge_interval(
                genes,
                gene_key,
                accession=accession,
                start=start,
                end=end,
                strand=strand,
                gene_id=gene_id,
                gene_name=gene_name,
                gene_biotype=gene_biotype,
                transcript_id="",
            )

            if transcript_id:
                transcript_key = (accession, transcript_id)
                _merge_interval(
                    transcripts,
                    transcript_key,
                    accession=accession,
                    start=start,
                    end=end,
                    strand=strand,
                    gene_id=gene_id,
                    gene_name=gene_name,
                    gene_biotype=gene_biotype,
                    transcript_id=transcript_id,
                )

            feature = FeatureRecord(
                accession=accession,
                start=start,
                end=end,
                strand=strand,
                gene_id=gene_id,
                gene_name=gene_name,
                transcript_id=transcript_id,
                gene_biotype=gene_biotype,
            )
            feature_key = feature_type.lower()
            if feature_key == "exon":
                _add_to_bins(exon_bins, feature)
            elif feature_key == "cds":
                _add_to_bins(cds_bins, feature)

    transcript_bins: dict[str, dict[int, list[FeatureRecord]]] = {}
    for values in transcripts.values():
        record = FeatureRecord(
            accession=str(values["accession"]),
            start=int(values["start"]),
            end=int(values["end"]),
            strand=str(values["strand"]),
            gene_id=str(values.get("gene_id", "")),
            gene_name=str(values.get("gene_name", "")),
            transcript_id=str(values.get("transcript_id", "")),
            gene_biotype=str(values.get("gene_biotype", "")),
        )
        _add_to_bins(transcript_bins, record)

    promoter_bins: dict[str, dict[int, list[GeneRecord]]] = {}
    genes_by_accession: dict[str, list[GeneRecord]] = {}
    gene_tss_by_accession: dict[str, list[int]] = {}
    for values in genes.values():
        gene = GeneRecord(
            accession=str(values["accession"]),
            start=int(values["start"]),
            end=int(values["end"]),
            strand=str(values["strand"]),
            tss=int(values["end"]) if str(values["strand"]) == "-" else int(values["start"]),
            gene_id=str(values.get("gene_id", "")),
            gene_name=str(values.get("gene_name", "")),
            gene_biotype=str(values.get("gene_biotype", "")),
        )
        genes_by_accession.setdefault(gene.accession, []).append(gene)
        promoter_start, promoter_end = _promoter_interval(gene, promoter_window_bp)
        _add_to_bins(
            promoter_bins,
            GeneRecord(
                accession=gene.accession,
                start=promoter_start,
                end=promoter_end,
                strand=gene.strand,
                tss=gene.tss,
                gene_id=gene.gene_id,
                gene_name=gene.gene_name,
                gene_biotype=gene.gene_biotype,
            ),
        )

    for accession, genes_for_accession in genes_by_accession.items():
        genes_for_accession.sort(key=lambda gene: gene.tss)
        gene_tss_by_accession[accession] = [gene.tss for gene in genes_for_accession]

    return AnnotationIndex(
        exon_bins=exon_bins,
        cds_bins=cds_bins,
        transcript_bins=transcript_bins,
        promoter_bins=promoter_bins,
        genes_by_accession=genes_by_accession,
        gene_tss_by_accession=gene_tss_by_accession,
    )


def _collect_overlaps(
    bins: dict[str, dict[int, list[FeatureRecord | GeneRecord]]],
    accession: str,
    start: int,
    end: int,
) -> list[FeatureRecord | GeneRecord]:
    for candidate_accession in _accession_candidates(accession):
        accession_bins = bins.get(candidate_accession)
        if not accession_bins:
            continue

        matches: list[FeatureRecord | GeneRecord] = []
        seen: set[tuple[str, int, int, str, str]] = set()
        start_bin = (start - 1) // BIN_SIZE
        end_bin = (end - 1) // BIN_SIZE
        for bin_id in range(start_bin, end_bin + 1):
            for record in accession_bins.get(bin_id, []):
                key = (
                    record.gene_id,
                    record.start,
                    record.end,
                    record.strand,
                    getattr(record, "transcript_id", ""),
                )
                if key in seen:
                    continue
                if record.end < start or record.start > end:
                    continue
                seen.add(key)
                matches.append(record)
        return matches
    return []


def _overlap_length(start: int, end: int, record: FeatureRecord | GeneRecord) -> int:
    return max(0, min(end, record.end) - max(start, record.start) + 1)


def _pick_best_feature(features: list[FeatureRecord], start: int, end: int) -> FeatureRecord:
    return max(
        features,
        key=lambda record: (
            _overlap_length(start, end, record),
            1 if record.transcript_id else 0,
            -(record.end - record.start),
        ),
    )


def _pick_best_gene(features: list[GeneRecord], start: int, end: int) -> GeneRecord:
    return max(
        features,
        key=lambda record: (
            _overlap_length(start, end, record),
            -_distance_to_tss(start, end, record.tss),
            -(record.end - record.start),
        ),
    )


def _distance_to_tss(start: int, end: int, tss: int) -> int:
    if end < tss:
        return tss - end
    if start > tss:
        return start - tss
    return 0


def _nearest_gene(index: AnnotationIndex, accession: str, start: int, end: int) -> GeneRecord | None:
    for candidate_accession in _accession_candidates(accession):
        genes = index.genes_by_accession.get(candidate_accession)
        tss_values = index.gene_tss_by_accession.get(candidate_accession)
        if not genes or not tss_values:
            continue

        midpoint = (start + end) // 2
        idx = bisect_left(tss_values, midpoint)
        candidates: list[GeneRecord] = []
        if idx < len(genes):
            candidates.append(genes[idx])
        if idx > 0:
            candidates.append(genes[idx - 1])
        if not candidates:
            return None
        return min(candidates, key=lambda gene: _distance_to_tss(start, end, gene.tss))
    return None


def _annotation_from_feature(region: GrnaHitRegion, record: FeatureRecord, start: int, end: int) -> GrnaHitAnnotation:
    return GrnaHitAnnotation(
        status=GrnaHitAnnotationStatus.annotated,
        region=region,
        gene_symbol=record.gene_name or None,
        gene_id=record.gene_id or None,
        transcript_id=record.transcript_id or None,
        gene_biotype=record.gene_biotype or None,
        distance_to_tss=None,
    )


def _annotation_from_gene(region: GrnaHitRegion, record: GeneRecord, start: int, end: int) -> GrnaHitAnnotation:
    return GrnaHitAnnotation(
        status=GrnaHitAnnotationStatus.annotated,
        region=region,
        gene_symbol=record.gene_name or None,
        gene_id=record.gene_id or None,
        gene_biotype=record.gene_biotype or None,
        distance_to_tss=_distance_to_tss(start, end, record.tss),
    )


def _database_feature_overlaps(
    connection: sqlite3.Connection,
    accession: str,
    feature_type: str,
    start: int,
    end: int,
) -> list[FeatureRecord]:
    start_bin = (start - 1) // BIN_SIZE
    end_bin = (end - 1) // BIN_SIZE
    for candidate_accession in _accession_candidates(accession):
        rows = connection.execute(
            """
            SELECT DISTINCT accession, start, end, strand, gene_id, gene_name,
                   transcript_id, gene_biotype
            FROM grna_features
            WHERE accession = ? AND feature_type = ? AND bin BETWEEN ? AND ?
              AND start <= ? AND end >= ?
            """,
            (candidate_accession, feature_type, start_bin, end_bin, end, start),
        ).fetchall()
        if rows:
            return [FeatureRecord(*row) for row in rows]
    return []


def _database_promoter_overlaps(
    connection: sqlite3.Connection,
    accession: str,
    start: int,
    end: int,
    promoter_window_bp: int,
) -> list[GeneRecord]:
    for candidate_accession in _accession_candidates(accession):
        rows = connection.execute(
            """
            SELECT accession, start, end, strand, tss, gene_id, gene_name, gene_biotype
            FROM grna_features
            WHERE accession = ? AND feature_type = 'gene' AND tss BETWEEN ? AND ?
            """,
            (candidate_accession, max(1, start - promoter_window_bp), end + promoter_window_bp),
        ).fetchall()
        if not rows:
            continue
        overlaps: list[GeneRecord] = []
        for row in rows:
            gene = GeneRecord(*row)
            promoter_start, promoter_end = _promoter_interval(gene, promoter_window_bp)
            if promoter_end < start or promoter_start > end:
                continue
            overlaps.append(GeneRecord(
                accession=gene.accession,
                start=promoter_start,
                end=promoter_end,
                strand=gene.strand,
                tss=gene.tss,
                gene_id=gene.gene_id,
                gene_name=gene.gene_name,
                gene_biotype=gene.gene_biotype,
            ))
        if overlaps:
            return overlaps
    return []


def _database_nearest_gene(
    connection: sqlite3.Connection,
    accession: str,
    start: int,
    end: int,
) -> GeneRecord | None:
    midpoint = (start + end) // 2
    for candidate_accession in _accession_candidates(accession):
        row = connection.execute(
            """
            SELECT accession, start, end, strand, tss, gene_id, gene_name, gene_biotype
            FROM grna_features
            WHERE accession = ? AND feature_type = 'gene'
            ORDER BY ABS(tss - ?) ASC
            LIMIT 1
            """,
            (candidate_accession, midpoint),
        ).fetchone()
        if row:
            return GeneRecord(*row)
    return None


@lru_cache(maxsize=8192)
def _annotate_with_database(
    database_path: str,
    accession: str,
    start: int,
    end: int,
    promoter_window_bp: int,
) -> GrnaHitAnnotation:
    with sqlite3.connect(f"file:{database_path}?mode=ro", uri=True) as connection:
        cds_hits = _database_feature_overlaps(connection, accession, "cds", start, end)
        if cds_hits:
            return _annotation_from_feature(
                GrnaHitRegion.cds,
                _pick_best_feature(cds_hits, start, end),
                start,
                end,
            )

        exon_hits = _database_feature_overlaps(connection, accession, "exon", start, end)
        if exon_hits:
            return _annotation_from_feature(
                GrnaHitRegion.exon,
                _pick_best_feature(exon_hits, start, end),
                start,
                end,
            )

        transcript_hits = _database_feature_overlaps(
            connection,
            accession,
            "transcript",
            start,
            end,
        )
        if transcript_hits:
            return _annotation_from_feature(
                GrnaHitRegion.intron,
                _pick_best_feature(transcript_hits, start, end),
                start,
                end,
            )

        promoter_hits = _database_promoter_overlaps(
            connection,
            accession,
            start,
            end,
            promoter_window_bp,
        )
        if promoter_hits:
            return _annotation_from_gene(
                GrnaHitRegion.promoter,
                _pick_best_gene(promoter_hits, start, end),
                start,
                end,
            )

        nearest_gene = _database_nearest_gene(connection, accession, start, end)
        if nearest_gene is not None:
            return _annotation_from_gene(
                GrnaHitRegion.intergenic,
                nearest_gene,
                start,
                end,
            )

    return GrnaHitAnnotation(
        status=GrnaHitAnnotationStatus.annotated,
        region=GrnaHitRegion.intergenic,
    )


def _annotate_with_index(index: AnnotationIndex, accession: str, start: int, end: int) -> GrnaHitAnnotation:
    cds_hits = _collect_overlaps(index.cds_bins, accession, start, end)
    if cds_hits:
        return _annotation_from_feature(GrnaHitRegion.cds, _pick_best_feature(cds_hits, start, end), start, end)

    exon_hits = _collect_overlaps(index.exon_bins, accession, start, end)
    if exon_hits:
        return _annotation_from_feature(GrnaHitRegion.exon, _pick_best_feature(exon_hits, start, end), start, end)

    transcript_hits = _collect_overlaps(index.transcript_bins, accession, start, end)
    if transcript_hits:
        return _annotation_from_feature(
            GrnaHitRegion.intron,
            _pick_best_feature(transcript_hits, start, end),
            start,
            end,
        )

    promoter_hits = _collect_overlaps(index.promoter_bins, accession, start, end)
    if promoter_hits:
        return _annotation_from_gene(GrnaHitRegion.promoter, _pick_best_gene(promoter_hits, start, end), start, end)

    nearest_gene = _nearest_gene(index, accession, start, end)
    if nearest_gene is not None:
        return _annotation_from_gene(GrnaHitRegion.intergenic, nearest_gene, start, end)

    return GrnaHitAnnotation(
        status=GrnaHitAnnotationStatus.annotated,
        region=GrnaHitRegion.intergenic,
    )
