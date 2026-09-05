import test from "node:test";
import assert from "node:assert/strict";
import {
  bindBlastResponse, blastQueryCoverage, buildPrimerBlastHref, isShortPrimerQuery,
  parsePrimerBlastFragment, prepareBlastQuery, readCachedBlastSearch, resolveBlastQuerySettings, sameBlastQuery,
} from "../src/lib/blast-prefill.ts";

const origin = { sequence: "acgtacgt acgtacgtacgt", direction: "reverse", gene: "GAPDH", source: "PrimerBank", species: "human" };

test("imports a single reverse primer in its original 5′→3′ direction via the fragment", () => {
  const href = buildPrimerBlastHref("zh", origin);
  const url = new URL(href, "https://primercat.tech");
  assert.equal(url.pathname, "/zh/blast");
  assert.equal(url.search, "");
  assert.deepEqual(parsePrimerBlastFragment(url.hash), {
    state: "valid",
    value: { ...origin, sequence: "ACGTACGTACGTACGTACGT" },
  });
});

test("rejects merged FASTA, unsupported program/database/species and duplicate sequences", () => {
  assert.equal(buildPrimerBlastHref("en", { ...origin, sequence: ">F\nACGTACGTACGT\n>R\nACGTACGTACGT" }), null);
  const href = buildPrimerBlastHref("en", origin);
  const fragment = new URL(href, "https://primercat.tech").hash;
  for (const invalid of [
    fragment.replace("program=blastn", "program=blastp"),
    fragment.replace("database=refseq_rna", "database=nr"),
    fragment.replace("species=human", "species=unknown"),
    fragment.replace("direction=reverse", "direction=both"),
    fragment + "&sequence=GGGGGGGGGGGGGGGGGGGG",
  ]) assert.equal(parsePrimerBlastFragment(invalid).state, "invalid");
});

test("bounds short DNA sequences and leaves ordinary section anchors alone", () => {
  assert.equal(isShortPrimerQuery("A".repeat(9)), false);
  assert.equal(isShortPrimerQuery("A".repeat(10)), true);
  assert.equal(isShortPrimerQuery("N".repeat(50)), true);
  assert.equal(isShortPrimerQuery("A".repeat(51)), false);
  assert.equal(isShortPrimerQuery("ATGCEFILPQATG"), false);
  assert.equal(parsePrimerBlastFragment("#results").state, "none");
});

test("encodes metadata as text and limits fragment size", () => {
  const href = buildPrimerBlastHref("en", { ...origin, source: "Source & program=blastp\nlabel" });
  const parsed = parsePrimerBlastFragment(new URL(href, "https://primercat.tech").hash);
  assert.equal(parsed.state, "valid");
  assert.equal(parsed.value.source, "Source & program=blastp label");
  assert.equal(parsePrimerBlastFragment("#primer=1&source=" + "x".repeat(2048)).state, "invalid");
});

const draft = { sequence: "GATTTGGTCGTATTGGGCGC", program: "blastn", database: "refseq_rna", mode: "auto", expectOverride: null, species: "human" };

test("pasted short DNA automatically uses sensitive settings and keeps the chosen database", () => {
  const prepared = prepareBlastQuery({ ...draft, database: "nt" });
  assert.equal(prepared.ok, true);
  assert.equal(prepared.query.short_query, true);
  assert.equal(prepared.query.expect, 1000);
  assert.equal(prepared.query.hitlist_size, 50);
  assert.equal(prepared.query.database, "nt");
  assert.equal(prepared.query.species, "human");
});

test("single-record FASTA is detected without counting its header", () => {
  const settings = resolveBlastQuerySettings({ ...draft, sequence: "\n>GAPDH_reverse\r\ngatttggtcg\r\ntattgggcgc\n" });
  assert.equal(settings.sequence, draft.sequence);
  assert.equal(settings.shortQuery, true);
  assert.equal(settings.expect, "1000");
  assert.equal(prepareBlastQuery({ ...draft, sequence: ">F\nACGTACGTACGT\n>R\nACGTACGTACGT" }).reason, "multiple_sequences");
});

test("auto mode follows sequence length and program, but preserves a manually selected threshold", () => {
  for (const overrides of [{ sequence: "A".repeat(51) }, { program: "blastp", database: "nr" }, { program: "blastx", database: "nr" }]) {
    const prepared = prepareBlastQuery({ ...draft, ...overrides });
    assert.equal(prepared.query.short_query, false);
    assert.equal(prepared.query.expect, 0.001);
    assert.equal(prepared.query.species, undefined);
  }
  const custom = prepareBlastQuery({ ...draft, expectOverride: "0.01" });
  assert.equal(custom.query.short_query, true);
  assert.equal(custom.query.expect, 0.01);
  assert.equal(prepareBlastQuery({ ...draft, mode: "off" }).query.short_query, false);
  assert.equal(prepareBlastQuery({ ...draft, mode: "on", sequence: "A".repeat(51) }).reason, "invalid_short_query");
});

test("invalid E-values do not become a search with no hits", () => {
  for (const expectOverride of ["", "-1", "NaN", "Infinity", "garbage"]) {
    assert.deepEqual(prepareBlastQuery({ ...draft, expectOverride }), { ok: false, reason: "invalid_expect" });
  }
});

function matchingResponse(query) {
  return {
    success: true, program: query.program, database: query.database,
    query_sequence: query.sequence, query_length: query.sequence.length, hits: [], message: "No alignments",
    search_parameters: { short_query: query.short_query, expect: query.expect, hitlist_size: query.hitlist_size, word_size: 7, species: query.species || null },
  };
}

test("a genuine zero-hit result is bound to its query and actual server parameters", () => {
  const query = prepareBlastQuery(draft).query;
  const response = matchingResponse(query);
  response.search_parameters.expect = 500;
  const completed = bindBlastResponse(query, response);
  assert.equal(completed.result.hits.length, 0);
  assert.equal(completed.query.expect, 500);
  assert.equal(completed.query.sequence, draft.sequence);
  assert.equal(sameBlastQuery(completed.query, query), false);
});

test("errors and responses for another query cannot be presented as zero-hit results", () => {
  const query = prepareBlastQuery(draft).query;
  const response = matchingResponse(query);
  for (const overrides of [
    { success: false, error_code: "timeout" }, { query_sequence: "ACGT" },
    { query_length: 21 }, { database: "nt" }, { program: "blastp" },
    { search_parameters: null },
  ]) assert.equal(bindBlastResponse(query, { ...response, ...overrides }), null);
});

test("only a versioned cache with matching request and actual parameters can be restored", () => {
  const query = prepareBlastQuery(draft).query;
  const result = matchingResponse(query);
  const restored = readCachedBlastSearch(JSON.stringify({ version: 2, query, result }));
  assert.equal(restored.query.sequence, draft.sequence);
  assert.equal(readCachedBlastSearch(JSON.stringify(result)), null);
  assert.equal(readCachedBlastSearch(JSON.stringify({ version: 2, query: { ...query, sequence: "OTHER" }, result })), null);
  assert.equal(readCachedBlastSearch("{malformed"), null);
  const auto = readCachedBlastSearch(JSON.stringify({ version: 2, query, result, preferences: { mode: "auto", expectOverride: null } }));
  assert.deepEqual(auto.preferences, { mode: "auto", expectOverride: null });
  // A restored automatic search must still adapt when the next input is longer.
  assert.equal(resolveBlastQuerySettings({ ...draft, sequence: "A".repeat(80), ...auto.preferences }).shortQuery, false);
});

test("query coverage uses query-coordinate span, not gap-inflated alignment length", () => {
  // A 6-column local alignment with two query gaps covers 4 of the query's 10 bases.
  assert.equal(blastQueryCoverage(2, 5, 10), 40);
  assert.equal(blastQueryCoverage(5, 2, 10), 40);
  assert.equal(blastQueryCoverage(1, 20, 20), 100);
  assert.equal(blastQueryCoverage(1, 21, 20), null);
  assert.equal(blastQueryCoverage(0, 20, 20), null);
});
