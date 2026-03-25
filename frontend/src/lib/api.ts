const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function authHeaders(): HeadersInit {
  if (typeof window === "undefined") return { "Content-Type": "application/json" };
  const token = localStorage.getItem("primercat_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function designPrimers(payload: PrimerRequest): Promise<PrimerResponse> {
  const res = await fetch(`${BASE_URL}/primer/design`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function designGrna(payload: GrnaRequest): Promise<GrnaResponse> {
  const res = await fetch(`${BASE_URL}/grna/design`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getGrnaOfftargetReadiness(species: "human" | "mouse"): Promise<GrnaOfftargetReadiness> {
  const res = await fetch(`${BASE_URL}/grna/offtarget-readiness?species=${species}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function blastSearch(payload: BlastRequest): Promise<BlastResponse> {
  const res = await fetch(`${BASE_URL}/blast/search`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Auth API ────────────────────────────────────────────────────────────────

export async function register(email: string, password: string, displayName?: string): Promise<AuthToken> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, display_name: displayName || "" }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function login(email: string, password: string): Promise<AuthToken> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getMe(): Promise<AuthUser> {
  const res = await fetch(`${BASE_URL}/auth/me`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
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
  const res = await fetch(`${BASE_URL}/jobs/primer${jobsQuery(params)}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getGrnaJobs(params: JobsParams = {}): Promise<JobRecord[]> {
  const res = await fetch(`${BASE_URL}/jobs/grna${jobsQuery(params)}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getBlastJobs(params: JobsParams = {}): Promise<JobRecord[]> {
  const res = await fetch(`${BASE_URL}/jobs/blast${jobsQuery(params)}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteJob(type: "primer" | "grna" | "blast", id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/jobs/${type}/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
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

export interface GrnaRequest {
  sequence: string;
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
