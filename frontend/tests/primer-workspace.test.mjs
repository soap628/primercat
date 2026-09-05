import test from "node:test";
import assert from "node:assert/strict";
import { isPrimerWorkspace, samePrimerDraft } from "../src/lib/primer-workspace.ts";

const draft = { mode: "gene", geneName: "GAPDH", sequence: "", species: "human" };

function workspace() {
  return {
    draft: { ...draft }, result: null, resultQuery: null, pendingDesign: false,
    expandedRow: null, activeTab: "checklist", knownPrimerRecords: [],
    knownPrimerCatalog: null, knownPrimerChecks: {}, geneLiterature: null,
  };
}

function completed() {
  const blast = { specific: true, top_hit_identity: 100, off_target_count: 0, top_hits: [] };
  return {
    ...workspace(), resultQuery: { ...draft }, expandedRow: 1,
    result: {
      success: true, gene_name: "GAPDH", species: "human", transcript_id: "NM_002046.7",
      sequence_length: 100, cds_start: 0, cds_end: 100, message: "原始服务端摘要", exons: [],
      primer_pairs: [{
        rank: 1, left_primer: "ACGTACGTACGTACGTACGT", right_primer: "TGCATGCATGCATGCATGCA",
        left_tm: 60, right_tm: 61, left_gc: 50, right_gc: 50, product_size: 100, penalty: 1,
        blast_left: { ...blast }, blast_right: { ...blast }, is_specific: true,
        exon_span: { spans_junction: false, left_exon: 0, right_exon: 0, junction_count: 0 },
        score: { total: 90, tm_score: 20, gc_score: 20, specificity_score: 20, exon_score: 10, dimer_score: 20 },
        left_props: null, right_props: null, amplicon_sequence: "ACGT".repeat(25),
      }],
    },
  };
}

function withSources() {
  const state = completed();
  const record = {
    id: "source-1", gene_symbol: "GAPDH", species: "human", target_accession: "NM_002046.7",
    forward_primer: "ACGTACGTACGTACGTACGT", reverse_primer: "TGCATGCATGCATGCATGCA",
    source_name: "PrimerBank", source_record_id: "123", source_url: "https://example.org/source",
    evidence: "database_record", retrieved_on: "2026-09-05", transcript_match: "exact_accession",
  };
  state.knownPrimerRecords = [record];
  state.knownPrimerCatalog = {
    query: "GAPDH", species: "human", target_transcript: "NM_002046.7", resolved_gene_symbol: "GAPDH",
    gene_index_available: true, gene_index_match: true, computed_design_available: true,
    records: [structuredClone(record)], catalog_gene_count: 100, catalog_pair_count: 200,
    catalog_updated_at: "2026-09-05T12:00:00Z", snapshots: [], source_summaries: [],
  };
  state.knownPrimerChecks = {
    "source-1": { status: "partial", scope: "transcript", target_transcript: "NM_002046.7", message: "Original evidence message" },
  };
  state.geneLiterature = {
    query_gene: "GAPDH", species: "human", source_name: "NCBI PubMed",
    ranking: "Curated journal priority, then PubMed Best Match", search_query: "GAPDH qPCR",
    search_url: "https://pubmed.ncbi.nlm.nih.gov/?term=GAPDH", total_results: 1, available: true, message: "Original literature message",
    records: [{ pmid: "1", title: "Example research", journal: "Example journal", publication_date: "2026", authors: ["A Researcher"], publication_types: ["Journal Article"], pubmed_url: "https://pubmed.ncbi.nlm.nih.gov/1/" }],
  };
  return state;
}

test("drafts and interrupted pending work are valid without inventing a result", () => {
  const state = workspace();
  state.draft.geneName = "unfinished input !";
  assert.equal(isPrimerWorkspace(state), true);
  state.pendingDesign = true;
  assert.equal(isPrimerWorkspace(state), true);
  assert.equal(isPrimerWorkspace({ ...state, resultQuery: draft }), false);
});

test("the edited draft remains independent of the last result's submitted input", () => {
  const state = completed();
  state.draft = { ...draft, geneName: "Trp53", species: "mouse" };
  state.pendingDesign = true;
  const before = structuredClone(state);
  assert.equal(isPrimerWorkspace(state), true);
  assert.deepEqual(state, before);
  assert.equal(state.result.message, "原始服务端摘要");
  assert.equal(samePrimerDraft(state.draft, state.resultQuery), false);
});

test("result and submitted query must agree on the gene and species", () => {
  for (const query of [null, { ...draft, geneName: "TP53" }, { ...draft, species: "mouse" }]) {
    assert.equal(isPrimerWorkspace({ ...completed(), resultQuery: query }), false);
  }
  assert.equal(isPrimerWorkspace({ ...completed(), resultQuery: { ...draft, geneName: " gapdh " } }), true);
});

test("sequence mode checks active sequence length and does not use the hidden gene draft", () => {
  const state = completed();
  state.result.gene_name = null;
  state.result.transcript_id = null;
  state.resultQuery = { ...draft, mode: "sequence", geneName: "GAPDH", sequence: "acgt\n".repeat(25) };
  assert.equal(isPrimerWorkspace(state), true);
  state.resultQuery.sequence += "A";
  assert.equal(isPrimerWorkspace(state), false);
  state.resultQuery.sequence = ">FASTA\n" + "ACGT".repeat(25);
  assert.equal(isPrimerWorkspace(state), false);
});

test("malformed nested results are rejected before rendering numeric or array operations", () => {
  const changes = [
    (s) => { s.result.primer_pairs[0].score.tm_score = "20"; },
    (s) => { s.result.primer_pairs[0].score.total = NaN; },
    (s) => { s.result.primer_pairs[0].blast_left.top_hits = null; },
    (s) => { s.result.primer_pairs[0].exon_span = {}; },
    (s) => { s.result.primer_pairs[0].transcriptome_pair_validation = { checked: true }; },
    (s) => { s.result.gene_info = { summary: null }; },
    (s) => { s.result.exons = "exons"; },
    (s) => { s.result.primer_pairs.push(structuredClone(s.result.primer_pairs[0])); },
  ];
  for (const change of changes) {
    const state = completed(); change(state);
    assert.equal(isPrimerWorkspace(state), false);
  }
});

test("expanded state must refer to an existing pair and supported detail tab", () => {
  assert.equal(isPrimerWorkspace({ ...completed(), expandedRow: null }), true);
  assert.equal(isPrimerWorkspace({ ...completed(), expandedRow: 1, activeTab: "amplicon" }), true);
  assert.equal(isPrimerWorkspace({ ...completed(), expandedRow: 2 }), false);
  assert.equal(isPrimerWorkspace({ ...completed(), activeTab: "unknown" }), false);
});

test("source records, catalog, check results and literature form a coherent snapshot", () => {
  const state = withSources();
  const serialized = JSON.stringify(state);
  assert.equal(isPrimerWorkspace(JSON.parse(serialized)), true);
  assert.equal(JSON.stringify(state), serialized);
  for (const change of [
    (s) => { s.knownPrimerChecks["source-1"].target_transcript = "NM_002046.6"; },
    (s) => { s.knownPrimerChecks.orphan = s.knownPrimerChecks["source-1"]; },
    (s) => { s.knownPrimerCatalog.target_transcript = "NM_000546.6"; },
    (s) => { s.knownPrimerCatalog.query = "TP53"; },
    (s) => { s.knownPrimerCatalog.catalog_updated_at = "not a date"; },
    (s) => { s.knownPrimerCatalog.catalog_gene_count = null; },
    (s) => { s.knownPrimerRecords[0].forward_primer = "TTTTTTTTTTTTTTTTTTTT"; },
    (s) => { s.geneLiterature.species = "mouse"; },
    (s) => { s.geneLiterature.query_gene = "TP53"; },
    (s) => { s.geneLiterature.records[0].authors = null; },
  ]) {
    const invalid = structuredClone(state); change(invalid);
    assert.equal(isPrimerWorkspace(invalid), false);
  }
});

test("source evidence cannot be restored without its owning design result", () => {
  const state = withSources();
  state.result = null;
  state.resultQuery = null;
  state.expandedRow = null;
  assert.equal(isPrimerWorkspace(state), false);
});

test("complete empty results can be represented without a fake selected row", () => {
  const state = completed();
  state.result.success = false;
  state.result.primer_pairs = [];
  state.expandedRow = null;
  assert.equal(isPrimerWorkspace(state), true);
});

test("semantic draft comparison ignores inactive fields without merging unrelated gene symbols", () => {
  assert.equal(samePrimerDraft(draft, { ...draft, geneName: " gapdh ", sequence: "old hidden sequence" }), true);
  assert.equal(samePrimerDraft({ ...draft, geneName: "TP-53" }, { ...draft, geneName: "TP53" }), false);
  assert.equal(samePrimerDraft({ ...draft, geneName: "ß" }, { ...draft, geneName: "SS" }), false);
  assert.equal(samePrimerDraft({ ...draft, geneName: "基因甲" }, { ...draft, geneName: "基因乙" }), false);
  assert.equal(samePrimerDraft(draft, { ...draft, species: "mouse" }), false);
  assert.equal(samePrimerDraft(draft, { ...draft, mode: "sequence" }), false);
  const sequence = { ...draft, mode: "sequence", sequence: "acgt\nacgt" };
  assert.equal(samePrimerDraft(sequence, { ...sequence, geneName: "inactive", sequence: "ACGTACGT" }), true);
});

test("invalid outer structures fail closed", () => {
  for (const value of [null, [], {}, "cached", { ...workspace(), knownPrimerRecords: {} }, { ...workspace(), knownPrimerChecks: [] }]) {
    assert.equal(isPrimerWorkspace(value), false);
  }
});
