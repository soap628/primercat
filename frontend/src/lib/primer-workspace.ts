import type {
  GenePrimerResult, GeneLiteratureResponse, KnownPrimerCatalogResponse,
  KnownQpcrPrimerRecord, KnownPrimerValidationResponse,
} from "./api";

export interface PrimerDraft {
  mode: "gene" | "sequence";
  geneName: string;
  sequence: string;
  species: "human" | "mouse";
}

export interface PrimerWorkspace {
  draft: PrimerDraft;
  result: GenePrimerResult | null;
  resultQuery: PrimerDraft | null;
  pendingDesign: boolean;
  expandedRow: number | null;
  activeTab: "checklist" | "blast" | "props" | "amplicon";
  knownPrimerRecords: KnownQpcrPrimerRecord[];
  knownPrimerCatalog: KnownPrimerCatalogResponse | null;
  knownPrimerChecks: Record<string, KnownPrimerValidationResponse>;
  geneLiterature: GeneLiteratureResponse | null;
}

type ObjectValue = Record<string, unknown>;
const object = (v: unknown): v is ObjectValue => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string";
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const integer = (v: unknown): v is number => finite(v) && Number.isInteger(v) && v >= 0;
const species = (v: unknown) => v === "human" || v === "mouse";
const strings = (v: ObjectValue, keys: string[]) => keys.every((key) => text(v[key]));
const numbers = (v: ObjectValue, keys: string[]) => keys.every((key) => finite(v[key]));
const booleans = (v: ObjectValue, keys: string[]) => keys.every((key) => typeof v[key] === "boolean");
const nullableText = (v: unknown) => v == null || text(v);
const nullableNumber = (v: unknown) => v == null || finite(v);
const list = (v: unknown, check: (item: unknown) => boolean): v is unknown[] => Array.isArray(v) && v.every(check);

function isDraft(v: unknown): v is PrimerDraft {
  return object(v) && (v.mode === "gene" || v.mode === "sequence") &&
    strings(v, ["geneName", "sequence"]) && species(v.species);
}

function geneKey(value: string): string {
  const trimmed = value.trim();
  // Fold only the ASCII symbols accepted by gene input. Unicode case folding
  // could incorrectly identify unrelated strings (for example ß and SS).
  return /^[\w.-]+$/.test(trimmed) ? trimmed.toUpperCase() : trimmed;
}

function sequenceKey(value: string): string {
  const compact = value.replace(/\s/g, "");
  return /^[ATGCNatgcn]*$/.test(compact) ? compact.toUpperCase() : value;
}

/** Compare submitted meaning, ignoring the inactive field's retained draft. */
export function samePrimerDraft(a: PrimerDraft, b: PrimerDraft): boolean {
  return a.mode === b.mode && a.species === b.species && (a.mode === "gene"
    ? geneKey(a.geneName) === geneKey(b.geneName)
    : sequenceKey(a.sequence) === sequenceKey(b.sequence));
}

function isBlastValidation(v: unknown): boolean {
  return object(v) && typeof v.specific === "boolean" && numbers(v, ["top_hit_identity", "off_target_count"]) &&
    (v.status === undefined || ["validated", "no_hits", "error"].includes(v.status as string)) &&
    list(v.top_hits, (hit) => object(hit) && strings(hit, ["title"]) && numbers(hit, ["rank", "identity"]) && typeof hit.is_off_target === "boolean");
}

function isPairScreen(v: unknown, transcript: boolean): boolean {
  if (v == null) return true;
  if (!object(v) || !strings(v, ["engine", "message", "status"]) ||
      !booleans(v, ["checked", "hit_limit_reached", ...(transcript ? ["gene_specific", "isoform_specific"] : ["specific"])]) ||
      !numbers(v, ["left_hit_count", "right_hit_count", "paired_amplicon_count", "min_amplicon_size", "max_amplicon_size",
        ...(transcript ? ["target_transcript_amplicon_count", "same_gene_isoform_amplicon_count", "other_gene_amplicon_count"] : ["target_amplicon_count", "off_target_amplicon_count"]),
        "unclassified_amplicon_count"])) return false;
  const states = transcript ? ["validated", "no_paired_amplicons", "target_not_found", "ambiguous_target", "truncated", "error"]
    : ["validated", "no_paired_amplicons", "target_not_anchored", "truncated", "error"];
  return states.includes(v.status as string) && list(v.top_amplicons, (hit) => object(hit) &&
    strings(hit, [transcript ? "transcript_accession" : "accession", "orientation"]) &&
    numbers(hit, ["start", "end", "product_size", "left_mismatches", "right_mismatches"]) &&
    (transcript ? ["target_transcript", "same_gene_isoform", "other_gene", "unclassified"].includes(hit.classification as string) : typeof hit.is_target === "boolean"));
}

function isPrimerPair(v: unknown): boolean {
  if (!object(v) || !integer(v.rank) || v.rank < 1 || !strings(v, ["left_primer", "right_primer", "amplicon_sequence"]) ||
      !numbers(v, ["left_tm", "right_tm", "left_gc", "right_gc", "product_size", "penalty"]) || typeof v.is_specific !== "boolean" ||
      !object(v.score) || !numbers(v.score, ["total", "tm_score", "gc_score", "specificity_score", "exon_score", "dimer_score"]) ||
      !object(v.exon_span) || typeof v.exon_span.spans_junction !== "boolean" || !integer(v.exon_span.junction_count) ||
      !nullableNumber(v.exon_span.left_exon) || !nullableNumber(v.exon_span.right_exon)) return false;
  return [v.left_primer, v.right_primer].every((s) => /^[ACGTN]+$/i.test(s as string)) &&
    [v.left_props, v.right_props].every((p) => p === null || (object(p) && numbers(p, ["self_any_th", "self_end_th", "hairpin_th", "gc_clamp", "pos", "length"]))) &&
    isBlastValidation(v.blast_left) && isBlastValidation(v.blast_right) &&
    isPairScreen(v.genome_pair_validation, false) && isPairScreen(v.transcriptome_pair_validation, true);
}

function isResult(v: unknown): v is GenePrimerResult {
  if (!object(v) || typeof v.success !== "boolean" || !species(v.species) || !text(v.message) ||
      !integer(v.sequence_length) || v.sequence_length < 1 || !numbers(v, ["cds_start", "cds_end"]) ||
      !nullableText(v.gene_name) || !nullableText(v.transcript_id) ||
      !list(v.exons, (e) => object(e) && numbers(e, ["index", "start", "end"])) ||
      !list(v.primer_pairs, isPrimerPair)) return false;
  if (v.gene_info != null && (!object(v.gene_info) ||
      !strings(v.gene_info, ["gene_symbol", "full_name", "summary", "chromosome", "map_location", "aliases", "organism", "transcript_id", "transcript_description", "selection_reason"]) ||
      !numbers(v.gene_info, ["total_nm_found", "cds_length", "protein_length", "exon_count"]))) return false;
  if (v.design_basis != null && (!object(v.design_basis) ||
      !strings(v.design_basis, ["template_source", "blast_database", "specificity_scope"]) ||
      !booleans(v.design_basis, ["exon_spanning_preferred", "genome_wide_specificity_checked"]) ||
      !numbers(v.design_basis, ["design_region_start", "design_region_end", "exon_count", "primer_size_min", "primer_size_opt", "primer_size_max", "tm_min", "tm_opt", "tm_max", "gc_min", "gc_max", "product_min", "product_max", "max_poly_x", "max_self_any_th", "max_self_end_th", "max_hairpin_th", "candidate_pairs_designed", "candidate_pairs_blasted", "returned_pairs", "off_target_identity_threshold"]))) return false;
  const ranks = v.primer_pairs.map((pair) => (pair as ObjectValue).rank);
  return new Set(ranks).size === ranks.length;
}

function isKnownRecord(v: unknown): boolean {
  return object(v) && species(v.species) && strings(v, ["id", "gene_symbol", "target_accession", "forward_primer", "reverse_primer", "source_name", "source_record_id", "source_url", "retrieved_on"]) &&
    ["vendor_tested", "experimental_record", "published_record", "database_record", "computed_database"].includes(v.evidence as string) &&
    (v.transcript_match == null || ["exact_accession", "accession_root", "different_transcript", "not_assessed"].includes(v.transcript_match as string));
}

function isCatalog(v: unknown): v is KnownPrimerCatalogResponse {
  return object(v) && text(v.query) && species(v.species) && nullableText(v.resolved_gene_symbol) && nullableText(v.target_transcript) &&
    booleans(v, ["gene_index_available", "gene_index_match", "computed_design_available"]) &&
    numbers(v, ["catalog_gene_count", "catalog_pair_count"]) &&
    (v.catalog_updated_at == null || v.catalog_updated_at === "" || (text(v.catalog_updated_at) && Number.isFinite(Date.parse(v.catalog_updated_at)))) &&
    list(v.records, isKnownRecord) && list(v.snapshots, (s) => object(s) && strings(s, ["source_name", "release", "imported_at"])) &&
    (v.source_summaries == null || list(v.source_summaries, (s) => object(s) && text(s.source_name) && finite(s.record_count) && object(s.evidence_counts) && Object.values(s.evidence_counts).every(integer)));
}

function isLiterature(v: unknown): v is GeneLiteratureResponse {
  return object(v) && strings(v, ["query_gene", "source_name", "ranking", "search_query", "search_url", "message"]) &&
    species(v.species) && integer(v.total_results) && typeof v.available === "boolean" &&
    list(v.records, (r) => object(r) && strings(r, ["pmid", "title", "journal", "publication_date", "pubmed_url"]) &&
      list(r.authors, text) && list(r.publication_types, text) && nullableNumber(r.year) &&
      [r.doi, r.pmc_id, r.doi_url, r.pmc_url].every(nullableText));
}

/** Accept only a coherent, renderable snapshot; never infer a result from a draft. */
export function isPrimerWorkspace(value: unknown): value is PrimerWorkspace {
  if (!object(value) || !isDraft(value.draft) || typeof value.pendingDesign !== "boolean" ||
      !["checklist", "blast", "props", "amplicon"].includes(value.activeTab as string) ||
      !(value.expandedRow === null || integer(value.expandedRow)) ||
      !list(value.knownPrimerRecords, isKnownRecord) || !object(value.knownPrimerChecks) ||
      !(value.knownPrimerCatalog === null || isCatalog(value.knownPrimerCatalog)) ||
      !(value.geneLiterature === null || isLiterature(value.geneLiterature))) return false;
  if (value.result === null) {
    return value.resultQuery === null && value.expandedRow === null && value.knownPrimerRecords.length === 0 &&
      value.knownPrimerCatalog === null && Object.keys(value.knownPrimerChecks).length === 0 && value.geneLiterature === null;
  }
  if (!isResult(value.result) || !isDraft(value.resultQuery)) return false;
  const result = value.result;
  const query = value.resultQuery;
  if (result.species !== query.species) return false;
  if (query.mode === "gene") {
    if (!/^[\w.-]+$/.test(query.geneName.trim()) || !result.gene_name || geneKey(result.gene_name) !== geneKey(query.geneName)) return false;
  } else {
    const sequence = sequenceKey(query.sequence);
    if (!/^[ACGTN]{100,}$/.test(sequence) || result.sequence_length !== sequence.length || result.gene_name) return false;
  }
  if (value.expandedRow !== null && !result.primer_pairs.some((pair) => pair.rank === value.expandedRow)) return false;
  const records = value.knownPrimerRecords as KnownQpcrPrimerRecord[];
  if (new Set(records.map((r) => r.id)).size !== records.length || records.some((r) => r.species !== result.species)) return false;
  const catalog = value.knownPrimerCatalog as KnownPrimerCatalogResponse | null;
  if (catalog !== null && (catalog.species !== result.species || !result.gene_name ||
      geneKey(catalog.query) !== geneKey(result.gene_name) || catalog.target_transcript !== result.transcript_id)) return false;
  if (records.length > 0 && (catalog === null || !records.every((record) => catalog.records.some((r) =>
      r.id === record.id && r.forward_primer === record.forward_primer && r.reverse_primer === record.reverse_primer && r.species === record.species)))) return false;
  for (const [id, check] of Object.entries(value.knownPrimerChecks)) {
    if (!records.some((r) => r.id === id) || !object(check) || !strings(check, ["scope", "target_transcript", "message"]) ||
        !["passed", "review", "partial", "unavailable"].includes(check.status as string) ||
        check.target_transcript !== result.transcript_id || !isPairScreen(check.genome_pair_validation, false) ||
        !isPairScreen(check.transcriptome_pair_validation, true)) return false;
  }
  const literature = value.geneLiterature as GeneLiteratureResponse | null;
  return literature === null || (literature.species === result.species && !!result.gene_name && geneKey(literature.query_gene) === geneKey(result.gene_name));
}
