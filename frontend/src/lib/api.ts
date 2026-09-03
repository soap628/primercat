const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json" };
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 180_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, credentials: "include", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function apiErrorMessage(res: Response): Promise<string> {
  const raw = (await res.text()).trim();
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json") || raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string") return parsed;
      if (typeof parsed?.detail === "string") return parsed.detail;
      if (Array.isArray(parsed?.detail) && typeof parsed.detail[0]?.msg === "string") {
        return parsed.detail[0].msg;
      }
    } catch {}
  }

  if (contentType.includes("text/html") || /^<!doctype html|^<html/i.test(raw)) {
    return `Upstream service timeout (HTTP ${res.status})`;
  }
  return raw || `Request failed (HTTP ${res.status})`;
}

export async function designPrimers(payload: PrimerRequest): Promise<PrimerResponse> {
  const res = await fetchWithTimeout(`${BASE_URL}/primer/design`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json();
}

export async function designPcr(payload: PCRDesignRequest): Promise<PCRDesignResponse> {
  const res = await fetchWithTimeout(`${BASE_URL}/pcr/design`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json();
}

export async function screenPcrSpecificity(
  payload: PCRPairSpecificityRequest,
): Promise<PCRPairSpecificityResponse> {
  const res = await fetchWithTimeout(`${BASE_URL}/pcr/specificity`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  }, 240_000);
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json();
}

export async function designGrna(payload: GrnaRequest): Promise<GrnaResponse> {
  const res = await fetchWithTimeout(`${BASE_URL}/grna/design`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json();
}

export async function getGrnaOfftargetReadiness(species: "human" | "mouse"): Promise<GrnaOfftargetReadiness> {
  const res = await fetchWithTimeout(`${BASE_URL}/grna/offtarget-readiness?species=${species}`, {}, 10_000);
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json();
}

export async function blastSearch(payload: BlastRequest): Promise<BlastResponse> {
  const res = await fetchWithTimeout(`${BASE_URL}/blast/search`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  }, 300_000); // BLAST 最多等 5 分钟
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json();
}

// ── Auth API ────────────────────────────────────────────────────────────────

export async function register(email: string, password: string, displayName?: string): Promise<AuthToken> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    credentials: "include",
    body: JSON.stringify({ email, password, display_name: displayName || "" }),
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json();
}

export async function login(email: string, password: string): Promise<AuthToken> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json();
}

export async function logoutApi(): Promise<void> {
  await fetch(`${BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function getMe(): Promise<AuthUser> {
  const res = await fetch(`${BASE_URL}/auth/me`, { credentials: "include" });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json();
}

// ── Jobs API ────────────────────────────────────────────────────────────────

export interface JobsParams { skip?: number; limit?: number; q?: string; }

function jobsQuery(params: JobsParams = {}) {
  const p = new URLSearchParams();
  if (params.skip) p.set("skip", String(params.skip));
  if (params.limit) p.set("limit", String(params.limit));
  if (params.q) p.set("q", params.q);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export async function getPrimerJobs(params: JobsParams = {}): Promise<JobRecord[]> {
  const res = await fetch(`${BASE_URL}/jobs/primer${jobsQuery(params)}`, { credentials: "include" });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json();
}

export async function getGrnaJobs(params: JobsParams = {}): Promise<JobRecord[]> {
  const res = await fetch(`${BASE_URL}/jobs/grna${jobsQuery(params)}`, { credentials: "include" });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json();
}

export async function getBlastJobs(params: JobsParams = {}): Promise<JobRecord[]> {
  const res = await fetch(`${BASE_URL}/jobs/blast${jobsQuery(params)}`, { credentials: "include" });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json();
}

export async function deleteJob(type: "primer" | "grna" | "blast", id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/jobs/${type}/${id}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
}

// ── Auth Types ───────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface JobRecord {
  id: string;
  user_id: string;
  gene_name?: string;
  sequence_snippet: string;
  mode?: string;
  cas_type?: string;
  species?: string;
  program?: string;
  database?: string;
  result_json: Record<string, unknown>;
  created_at: string;
}



export interface PrimerRequest {
  sequence: string;
  gene_name?: string;
  product_size_min?: number;
  product_size_max?: number;
  primer_tm_min?: number;
  primer_tm_max?: number;
  primer_tm_opt?: number;
  num_return?: number;
}

export interface PrimerPair {
  pair_index: number;
  left_primer: string;
  right_primer: string;
  left_tm: number;
  right_tm: number;
  left_gc: number;
  right_gc: number;
  product_size: number;
  penalty: number;
}

export interface PrimerResponse {
  success: boolean;
  gene_name?: string;
  sequence_length: number;
  primer_pairs: PrimerPair[];
  message: string;
}

export type PCRPreset = "standard" | "colony" | "high_fidelity";

export interface PCRDesignRequest {
  sequence: string;
  label?: string;
  preset?: PCRPreset;
  product_size_min?: number;
  product_size_max?: number;
  primer_tm_min?: number;
  primer_tm_opt?: number;
  primer_tm_max?: number;
  primer_gc_min?: number;
  primer_gc_max?: number;
  num_return?: number;
  target_start?: number;
  target_end?: number;
}

export interface PCRPrimerPair {
  pair_index: number;
  left_primer: string;
  right_primer: string;
  left_tm: number;
  right_tm: number;
  left_gc: number;
  right_gc: number;
  tm_difference: number;
  product_size: number;
  penalty: number;
  left_start: number;
  left_end: number;
  right_start: number;
  right_end: number;
  amplicon_start: number;
  amplicon_end: number;
  amplicon_sequence: string;
  left_self_any_th: number;
  left_self_end_th: number;
  left_hairpin_th: number;
  right_self_any_th: number;
  right_self_end_th: number;
  right_hairpin_th: number;
  pair_compl_any_th: number;
  pair_compl_end_th: number;
  left_gc_clamp: number;
  right_gc_clamp: number;
  annealing_temp_estimate: number;
  annealing_gradient_low: number;
  annealing_gradient_high: number;
  target_included: boolean;
}

export interface PCRDesignResponse {
  success: boolean;
  label?: string;
  preset: PCRPreset;
  sequence_length: number;
  product_size_min: number;
  product_size_max: number;
  target_start?: number;
  target_end?: number;
  primer_pairs: PCRPrimerPair[];
  specificity_checked: boolean;
  primer3_pair_explain: string;
  message: string;
}

export type PCRSpecificitySpecies = "human" | "mouse";
export type PCRSpecificityVerdict =
  | "one_paired_record"
  | "multiple_paired_records"
  | "no_paired_records"
  | "not_checked";

export interface PCRPairSpecificityRequest {
  pair_index: number;
  left_primer: string;
  right_primer: string;
  species: PCRSpecificitySpecies;
  min_amplicon_size?: number;
  max_amplicon_size?: number;
  expected_product_size?: number;
}

export interface PCRPairedRecord {
  accession: string;
  title: string;
  start: number;
  end: number;
  product_size: number;
  orientation: "left_plus_right_minus" | "right_plus_left_minus" | string;
  left_identity: number;
  right_identity: number;
  left_mismatches: number;
  right_mismatches: number;
  matches_expected_size: boolean;
}

export interface PCRPairSpecificityResponse {
  success: boolean;
  specificity_checked: boolean;
  status: "completed" | "no_paired_records" | "error";
  verdict: PCRSpecificityVerdict;
  pair_index: number;
  species: PCRSpecificitySpecies;
  engine: "ncbi_blast_refseq_genomic_pair_screen" | string;
  database: string;
  specificity_scope: string;
  genome_wide_specificity_checked: boolean;
  left_hit_count: number;
  right_hit_count: number;
  paired_record_count: number;
  returned_record_count: number;
  search_hit_limit: number;
  results_may_be_truncated: boolean;
  paired_records: PCRPairedRecord[];
  message: string;
}

export interface GrnaRequest {
  sequence?: string;
  gene_name?: string;
  cas_type?: "SpCas9" | "Cas12a" | "SpCas9-NG";
  species?: "human" | "mouse";
  num_return?: number;
  target_locus?: TargetLocusInput;
}

export interface TargetLocusInput {
  accession: string;
  start: number;
  end: number;
  strand?: "+" | "-";
}

export interface GrnaHitAnnotation {
  status: "annotated" | "unavailable";
  region: "cds" | "exon" | "intron" | "promoter" | "intergenic" | null;
  gene_symbol?: string | null;
  gene_id?: string | null;
  transcript_id?: string | null;
  gene_biotype?: string | null;
  distance_to_tss?: number | null;
}

export interface GrnaOffTargetHit {
  rank: number;
  accession: string;
  title: string;
  identity: number;
  align_length: number;
  mismatches: number;
  position: number;
  strand: string;
  pam: string;
  is_target_locus: boolean;
  annotation?: GrnaHitAnnotation | null;
}

export interface GrnaResult {
  rank: number;
  grna_sequence: string;
  pam: string;
  position: number;
  strand: string;
  gc_content: number;
  on_target_score: number;
  heuristic_risk: "Low" | "Medium" | "High";
  off_target_risk: "Low" | "Medium" | "High" | null;
  off_target_status: "validated" | "no_hits" | "anchor_missing" | "error" | "skipped";
  potential_off_target_hits: number;
  best_non_target_identity: number;
  guide_with_pam: string;
  top_off_target_hits: GrnaOffTargetHit[];
  off_target_message: string;
  target_locus_status: "not_provided" | "matched" | "partial" | "no_match" | "unavailable";
  target_locus_message: string;
}

export interface GrnaResponse {
  success: boolean;
  gene_name?: string;
  cas_type: string;
  species: "human" | "mouse" | string;
  sequence_length: number;
  grna_list: GrnaResult[];
  risk_model: string;
  off_target_model: string;
  off_target_scope: string;
  off_target_engine: string;
  genome_wide_offtarget_checked: boolean;
  off_target_fallback_reason: string;
  target_locus?: TargetLocusInput;
  target_locus_anchor_used: boolean;
  target_locus_anchor_status: "not_provided" | "matched" | "partial" | "no_match" | "unavailable";
  target_locus_matched_guides: number;
  target_locus_unmatched_guides: number;
  target_locus_summary: string;
  hit_annotation_ready: boolean;
  hit_annotation_source: string;
  hit_annotation_summary: string;
  fetched_transcript_id?: string | null;
  fetched_transcript_desc?: string | null;
  gene_full_name?: string | null;
  gene_summary?: string | null;
  gene_chromosome?: string | null;
  gene_aliases?: string | null;
  message: string;
}

export interface GrnaOfftargetReadiness {
  species: "human" | "mouse" | string;
  backend_mode: string;
  readiness_status: "ready" | "fallback" | "unavailable" | "disabled";
  genome_backend_ready: boolean;
  target_locus_anchor_ready: boolean;
  fallback_enabled: boolean;
  active_engine: string;
  summary: string;
  missing_requirements: string[];
  missing_env_vars: string[];
}

export interface BlastRequest {
  sequence: string;
  program?: "blastn" | "blastp" | "blastx" | "tblastn";
  database?: "nt" | "nr" | "refseq_rna" | "refseq_protein" | "swissprot";
  hitlist_size?: number;
  expect?: number;
}

export interface BlastHsp {
  score: number;
  bits: number;
  expect: number;
  identity_pct: number;
  gaps_pct: number;
  align_length: number;
  query_start: number;
  query_end: number;
  subject_start: number;
  subject_end: number;
  query_seq: string;
  subject_seq: string;
  midline: string;
}

export interface BlastHit {
  rank: number;
  accession: string;
  title: string;
  length: number;
  best_hsp: BlastHsp;
}

export interface BlastResponse {
  success: boolean;
  program: string;
  database: string;
  query_length: number;
  hits: BlastHit[];
  message: string;
}

// ── Gene Primer Types ────────────────────────────────────────────────────────

export interface BlastTopHit { rank: number; title: string; identity: number; is_off_target: boolean; is_target?: boolean; }
export interface BlastValidation {
  specific: boolean;
  top_hit_identity: number;
  off_target_count: number;
  top_hits: BlastTopHit[];
  status?: "validated" | "no_hits" | "error";
  message?: string;
  target_accession?: string | null;
  target_found?: boolean;
  qualified_hit_count?: number;
  hit_limit_reached?: boolean;
}
export interface GenomeAmpliconHit {
  accession: string;
  start: number;
  end: number;
  product_size: number;
  orientation: string;
  left_mismatches: number;
  right_mismatches: number;
  is_target: boolean;
}
export interface GenomePairValidation {
  checked: boolean;
  specific: boolean;
  status: "validated" | "no_paired_amplicons" | "target_not_anchored" | "truncated" | "error";
  engine: string;
  reference_assembly?: string | null;
  target_transcript?: string | null;
  target_locus_accession?: string | null;
  target_locus_start?: number | null;
  target_locus_end?: number | null;
  target_locus_strand?: string | null;
  left_hit_count: number;
  right_hit_count: number;
  paired_amplicon_count: number;
  target_amplicon_count: number;
  off_target_amplicon_count: number;
  unclassified_amplicon_count: number;
  hit_limit_reached: boolean;
  min_amplicon_size: number;
  max_amplicon_size: number;
  top_amplicons: GenomeAmpliconHit[];
  message: string;
}
export type TranscriptAmpliconClass = "target_transcript" | "same_gene_isoform" | "other_gene" | "unclassified";
export interface TranscriptAmpliconHit {
  transcript_accession: string;
  start: number;
  end: number;
  product_size: number;
  orientation: string;
  left_mismatches: number;
  right_mismatches: number;
  classification: TranscriptAmpliconClass;
  gene_id?: string | null;
  gene_name?: string | null;
}
export interface TranscriptomePairValidation {
  checked: boolean;
  gene_specific: boolean;
  isoform_specific: boolean;
  status: "validated" | "no_paired_amplicons" | "target_not_found" | "ambiguous_target" | "truncated" | "error";
  engine: string;
  reference_assembly?: string | null;
  target_transcript?: string | null;
  target_gene_id?: string | null;
  target_gene_name?: string | null;
  left_hit_count: number;
  right_hit_count: number;
  paired_amplicon_count: number;
  target_transcript_amplicon_count: number;
  same_gene_isoform_amplicon_count: number;
  other_gene_amplicon_count: number;
  unclassified_amplicon_count: number;
  hit_limit_reached: boolean;
  min_amplicon_size: number;
  max_amplicon_size: number;
  top_amplicons: TranscriptAmpliconHit[];
  message: string;
}
export interface ExonSpan { spans_junction: boolean; left_exon: number | null; right_exon: number | null; junction_count: number; }
export interface PrimerScore { total: number; tm_score: number; gc_score: number; specificity_score: number; exon_score: number; dimer_score: number; }
export interface PrimerProperties { self_any_th: number; self_end_th: number; hairpin_th: number; gc_clamp: number; pos: number; length: number; }
export interface PrimerDesignBasis {
  template_source: string;
  design_region_start: number;
  design_region_end: number;
  cds_region_start?: number | null;
  cds_region_end?: number | null;
  exon_count: number;
  exon_spanning_preferred: boolean;
  primer_size_min: number;
  primer_size_opt: number;
  primer_size_max: number;
  tm_min: number;
  tm_opt: number;
  tm_max: number;
  gc_min: number;
  gc_max: number;
  product_min: number;
  product_max: number;
  max_poly_x: number;
  max_self_any_th: number;
  max_self_end_th: number;
  max_hairpin_th: number;
  candidate_pairs_designed: number;
  candidate_pairs_blasted: number;
  returned_pairs: number;
  blast_database: string;
  specificity_scope: string;
  genome_wide_specificity_checked: boolean;
  off_target_identity_threshold: number;
  paired_amplicon_screen?: boolean;
  reference_assembly?: string | null;
  paired_transcriptome_screen?: boolean;
  transcriptome_reference?: string | null;
}
export interface GeneInfo {
  gene_symbol: string; full_name: string; summary: string;
  chromosome: string; map_location: string; aliases: string; organism: string;
  transcript_id: string; transcript_description: string;
  total_nm_found: number; selection_reason: string;
  cds_length: number; protein_length: number; exon_count: number;
}
export interface ValidatedPrimerPair {
  rank: number; left_primer: string; right_primer: string;
  left_tm: number; right_tm: number; left_gc: number; right_gc: number;
  product_size: number; penalty: number;
  blast_left: BlastValidation; blast_right: BlastValidation;
  is_specific: boolean; exon_span: ExonSpan; score: PrimerScore;
  left_props: PrimerProperties | null; right_props: PrimerProperties | null;
  amplicon_sequence: string;
  genome_pair_validation?: GenomePairValidation | null;
  transcriptome_pair_validation?: TranscriptomePairValidation | null;
}
export type KnownPrimerCheckStatus = "passed" | "review" | "partial" | "unavailable";
export type KnownPrimerEvidence =
  | "vendor_tested"
  | "experimental_record"
  | "published_record"
  | "database_record"
  | "computed_database";
export type KnownPrimerTranscriptMatch =
  | "exact_accession"
  | "accession_root"
  | "different_transcript"
  | "not_assessed";
export interface KnownQpcrPrimerRecord {
  id: string;
  gene_symbol: string;
  species: "human" | "mouse";
  target_accession: string;
  forward_primer: string;
  reverse_primer: string;
  source_name: string;
  source_record_id: string;
  source_url: string;
  evidence: KnownPrimerEvidence;
  evidence_url?: string | null;
  source_amplicon_size_bp?: number | null;
  source_forward_tm_c?: number | null;
  source_reverse_tm_c?: number | null;
  retrieved_on: string;
  source_reference?: string | null;
  evidence_code?: string;
  transcript_match?: KnownPrimerTranscriptMatch;
}
export interface KnownPrimerCatalogResponse {
  query: string;
  species: "human" | "mouse";
  target_transcript?: string | null;
  resolved_gene_symbol?: string | null;
  ncbi_gene_id?: string | null;
  gene_index_available: boolean;
  gene_index_match: boolean;
  computed_design_available: boolean;
  records: KnownQpcrPrimerRecord[];
  catalog_gene_count: number;
  catalog_pair_count: number;
  catalog_updated_at?: string | null;
  snapshots: {
    source_name: string;
    release: string;
    imported_at: string;
    source_url?: string | null;
    citation_url?: string | null;
    retrieved_on?: string | null;
    record_count?: number | null;
    data_sha256?: string | null;
  }[];
  source_summaries?: {
    source_name: string;
    record_count: number;
    evidence_counts: Record<string, number>;
  }[];
}
export interface KnownPrimerValidationResponse {
  status: KnownPrimerCheckStatus;
  scope: string;
  reference_assembly?: string | null;
  target_transcript: string;
  observed_product_size?: number | null;
  genome_pair_validation?: GenomePairValidation | null;
  transcriptome_pair_validation?: TranscriptomePairValidation | null;
  message: string;
}
export interface ExonViz { index: number; start: number; end: number; }
export interface GenePrimerResult {
  success: boolean; gene_name?: string; species: string; transcript_id?: string;
  sequence_length: number; cds_start: number; cds_end: number;
  exons: ExonViz[]; primer_pairs: ValidatedPrimerPair[];
  design_basis?: PrimerDesignBasis;
  gene_info?: GeneInfo;
  message: string;
}
