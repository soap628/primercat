import type { BlastResponse } from "./api";

export type PrimerBlastDirection = "forward" | "reverse";
export type PrimerBlastSpecies = "human" | "mouse";
export type BlastProgram = "blastn" | "blastp" | "blastx" | "tblastn";
export type BlastDatabase = "nt" | "nr" | "refseq_rna" | "refseq_protein" | "swissprot";
export type ShortQueryMode = "auto" | "on" | "off";

export interface BlastQueryDraft {
  sequence: string;
  program: BlastProgram;
  database: BlastDatabase;
  mode: ShortQueryMode;
  expectOverride: string | null;
  species: PrimerBlastSpecies | "";
}

export interface BlastQuerySnapshot {
  sequence: string;
  program: BlastProgram;
  database: BlastDatabase;
  expect: number;
  short_query: boolean;
  species?: PrimerBlastSpecies;
  hitlist_size: number;
}

export interface CompletedBlastSearch {
  query: BlastQuerySnapshot;
  result: BlastResponse;
  preferences?: { mode: ShortQueryMode; expectOverride: string | null };
}

/** Accept one plain sequence or one FASTA record; never concatenate separate queries. */
export function normalizeSingleBlastSequence(input: string): string | null {
  const lines = input.trim().split(/\r?\n/);
  if (lines[0]?.startsWith(">")) lines.shift();
  const sequence = lines.join("").replace(/\s/g, "").toUpperCase();
  return sequence.includes(">") ? null : sequence;
}

export function resolveBlastQuerySettings(draft: BlastQueryDraft) {
  const sequence = normalizeSingleBlastSequence(draft.sequence);
  const eligible = draft.program === "blastn" && sequence !== null && isShortPrimerQuery(sequence);
  const shortQuery = draft.program === "blastn" && (draft.mode === "on" || (draft.mode === "auto" && eligible));
  return { sequence, eligible, shortQuery, expect: draft.expectOverride ?? (shortQuery ? "1000" : "0.001") };
}

export function prepareBlastQuery(draft: BlastQueryDraft):
  | { ok: true; query: BlastQuerySnapshot }
  | { ok: false; reason: "multiple_sequences" | "empty_sequence" | "invalid_expect" | "invalid_short_query" } {
  const settings = resolveBlastQuerySettings(draft);
  if (settings.sequence === null) return { ok: false, reason: "multiple_sequences" };
  if (!settings.sequence) return { ok: false, reason: "empty_sequence" };
  const expect = Number(settings.expect);
  if (!Number.isFinite(expect) || expect <= 0) return { ok: false, reason: "invalid_expect" };
  if (settings.shortQuery && !settings.eligible) return { ok: false, reason: "invalid_short_query" };
  return {
    ok: true,
    query: {
      sequence: settings.sequence,
      program: draft.program,
      database: draft.database,
      expect,
      short_query: settings.shortQuery,
      hitlist_size: settings.shortQuery ? 50 : 10,
      ...(settings.shortQuery && draft.species ? { species: draft.species } : {}),
    },
  };
}

/** Bind a result to the submitted sequence and use the server's effective parameters. */
export function bindBlastResponse(query: BlastQuerySnapshot, result: BlastResponse): CompletedBlastSearch | null {
  const params = result.search_parameters;
  if (
    !["blastn", "blastp", "blastx", "tblastn"].includes(query.program) ||
    !["nt", "nr", "refseq_rna", "refseq_protein", "swissprot"].includes(query.database) ||
    !result.success || !Array.isArray(result.hits) ||
    result.query_sequence !== query.sequence || result.query_length !== query.sequence.length ||
    result.program !== query.program || result.database !== query.database ||
    !params || typeof params.short_query !== "boolean" ||
    !Number.isFinite(params.expect) || params.expect <= 0 ||
    !Number.isInteger(params.hitlist_size) || params.hitlist_size < 1 || params.hitlist_size > 50 ||
    (params.species != null && params.species !== "human" && params.species !== "mouse")
  ) return null;
  return {
    query: {
      ...query,
      short_query: params.short_query,
      expect: params.expect,
      hitlist_size: params.hitlist_size,
      species: params.species || undefined,
    },
    result,
  };
}

/** Query coordinates exclude inserted gap characters from the covered nucleotide count. */
export function blastQueryCoverage(queryStart: number, queryEnd: number, queryLength: number): number | null {
  if (![queryStart, queryEnd, queryLength].every(Number.isInteger) || queryLength < 1 ||
    queryStart < 1 || queryEnd < 1 || queryStart > queryLength || queryEnd > queryLength) return null;
  return Math.round((Math.abs(queryEnd - queryStart) + 1) / queryLength * 1000) / 10;
}

export function sameBlastQuery(first: BlastQuerySnapshot, second: BlastQuerySnapshot): boolean {
  return first.sequence === second.sequence && first.program === second.program && first.database === second.database &&
    first.expect === second.expect && first.short_query === second.short_query && first.species === second.species &&
    first.hitlist_size === second.hitlist_size;
}

export function readCachedBlastSearch(serialized: string): CompletedBlastSearch | null {
  try {
    const cached = JSON.parse(serialized);
    if (cached.version !== 2 || !cached.query || !cached.result || typeof cached.query.sequence !== "string") return null;
    const bound = bindBlastResponse(cached.query, cached.result);
    if (!bound) return null;
    const preferences = cached.preferences;
    if (preferences && ["auto", "on", "off"].includes(preferences.mode) &&
      (preferences.expectOverride === null || typeof preferences.expectOverride === "string")) {
      return { ...bound, preferences };
    }
    return bound;
  } catch {
    return null;
  }
}

export interface PrimerBlastPrefill {
  sequence: string;
  direction: PrimerBlastDirection;
  gene: string;
  source: string;
  species?: PrimerBlastSpecies;
}

export type PrimerBlastFragment =
  | { state: "none" }
  | { state: "invalid" }
  | { state: "valid"; value: PrimerBlastPrefill };

export function normalizePrimerQuery(sequence: string): string {
  return sequence.replace(/\s/g, "").toUpperCase();
}

export function isShortPrimerQuery(sequence: string): boolean {
  return /^[ACGTRYSWKMBDHVN]{10,50}$/.test(normalizePrimerQuery(sequence));
}

function cleanLabel(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}

/** The fragment stays in the browser; importing never submits a sequence to NCBI. */
export function buildPrimerBlastHref(locale: string, input: PrimerBlastPrefill): string | null {
  if (!isShortPrimerQuery(input.sequence)) return null;
  if (input.direction !== "forward" && input.direction !== "reverse") return null;
  const params = new URLSearchParams({
    primer: "1",
    sequence: normalizePrimerQuery(input.sequence),
    direction: input.direction,
    gene: cleanLabel(input.gene),
    source: cleanLabel(input.source),
    program: "blastn",
    database: "refseq_rna",
  });
  if (input.species === "human" || input.species === "mouse") params.set("species", input.species);
  return `/${locale === "zh" ? "zh" : "en"}/blast#${params.toString()}`;
}

export function parsePrimerBlastFragment(fragment: string): PrimerBlastFragment {
  const params = new URLSearchParams(fragment.replace(/^#/, ""));
  if (!params.has("primer")) return { state: "none" };
  if (fragment.length > 2048) return { state: "invalid" };
  // Reject ambiguous duplicated values rather than silently choosing a sequence.
  for (const key of ["primer", "sequence", "direction", "gene", "source", "program", "database", "species"]) {
    if (params.getAll(key).length > 1) return { state: "invalid" };
  }
  const sequence = params.get("sequence") || "";
  const direction = params.get("direction");
  const species = params.get("species");
  if (
    params.get("primer") !== "1" ||
    params.get("program") !== "blastn" ||
    params.get("database") !== "refseq_rna" ||
    !isShortPrimerQuery(sequence) ||
    (direction !== "forward" && direction !== "reverse") ||
    (species !== null && species !== "human" && species !== "mouse")
  ) return { state: "invalid" };
  return {
    state: "valid",
    value: {
      sequence: normalizePrimerQuery(sequence),
      direction,
      gene: cleanLabel(params.get("gene") || ""),
      source: cleanLabel(params.get("source") || ""),
      ...(species ? { species } : {}),
    },
  };
}
