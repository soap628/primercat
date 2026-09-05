import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Exercise the page's private restore validator without importing a Next.js client route.
const source = readFileSync(new URL("../src/app/[locale]/pcr/page.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("pcr-page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = ast.statements.filter((statement) =>
  (ts.isVariableStatement(statement) && statement.declarationList.declarations.some((declaration) =>
    ts.isIdentifier(declaration.name) && ["PRESETS", "EMPTY_WORKSPACE"].includes(declaration.name.text))) ||
  (ts.isFunctionDeclaration(statement) && statement.name?.text === "isPCRWorkspace"),
);
const compiled = ts.transpileModule(declarations.map((statement) => statement.getText(ast)).join("\n") + "\nmodule.exports = { isPCRWorkspace, EMPTY_WORKSPACE };", {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const context = { module: { exports: {} } };
vm.runInNewContext(compiled, context);
const { isPCRWorkspace, EMPTY_WORKSPACE } = context.module.exports;

function completedWorkspace() {
  const saved = JSON.parse(JSON.stringify(EMPTY_WORKSPACE));
  saved.draft.sequence = "ACGT".repeat(100);
  saved.resultQuery = { sequence: saved.draft.sequence, preset: "standard", product_size_min: 150, product_size_max: 800 };
  saved.result = {
    success: true, preset: "standard", sequence_length: 400, product_size_min: 150, product_size_max: 800,
    primer_pairs: [{
      pair_index: 1, left_primer: "ACGTACGTACGTACGTACGT", right_primer: "TGCATGCATGCATGCATGCA",
      left_tm: 60, right_tm: 60, left_gc: 50, right_gc: 50, tm_difference: 0,
      product_size: 180, penalty: 0.8, left_start: 1, left_end: 20, right_start: 161, right_end: 180,
      amplicon_start: 1, amplicon_end: 180, amplicon_sequence: "ACGT".repeat(45),
      left_self_any_th: 0, left_self_end_th: 0, left_hairpin_th: 0,
      right_self_any_th: 0, right_self_end_th: 0, right_hairpin_th: 0,
      pair_compl_any_th: 0, pair_compl_end_th: 0, left_gc_clamp: 2, right_gc_clamp: 2,
      annealing_temp_estimate: 57, annealing_gradient_low: 55, annealing_gradient_high: 60,
      target_included: false,
    }],
    specificity_checked: false, primer3_pair_explain: "", message: "ok",
  };
  saved.expandedPairs = { 1: true };
  saved.specificityResults = { 1: {
    success: true, species: "human", pair_index: 1, verdict: "one_paired_record",
    status: "completed", specificity_checked: true, paired_records: [{ accession: "TEST", title: "Fixture", start: 1, end: 180, product_size: 180, left_identity: 100, right_identity: 100 }],
  } };
  return saved;
}

test("restores an unfinished draft and a completed design with expanded pair screening", () => {
  assert.equal(isPCRWorkspace(EMPTY_WORKSPACE), true);
  const saved = completedWorkspace();
  assert.equal(isPCRWorkspace(saved), true);
  // Editing the draft must not discard the separately bound, last completed result.
  saved.draft.sequence = "TGCA".repeat(100);
  assert.equal(isPCRWorkspace(saved), true);
  assert.notEqual(saved.draft.sequence, saved.resultQuery.sequence);
});

test("rejects screens belonging to another species or missing primer pair", () => {
  const wrongSpecies = completedWorkspace();
  wrongSpecies.specificitySpecies = "mouse";
  assert.equal(isPCRWorkspace(wrongSpecies), false);
  const wrongPair = completedWorkspace();
  wrongPair.specificityResults = { 2: { ...wrongPair.specificityResults[1], pair_index: 2 } };
  assert.equal(isPCRWorkspace(wrongPair), false);
});

test("rejects malformed persisted values that would break numeric result rendering", () => {
  const missingTm = completedWorkspace();
  missingTm.result.primer_pairs[0].left_tm = null;
  assert.equal(isPCRWorkspace(missingTm), false);
  const malformedScreen = completedWorkspace();
  malformedScreen.specificityResults[1].paired_records[0].left_identity = "100";
  assert.equal(isPCRWorkspace(malformedScreen), false);
  const malformedDraft = completedWorkspace();
  malformedDraft.draft.sequence = {};
  assert.equal(isPCRWorkspace(malformedDraft), false);
});

test("a restored result requires its original submitted query", () => {
  const saved = completedWorkspace();
  saved.resultQuery = null;
  assert.equal(isPCRWorkspace(saved), false);
  const orphanedScreen = completedWorkspace();
  orphanedScreen.result = null;
  orphanedScreen.resultQuery = null;
  assert.equal(isPCRWorkspace(orphanedScreen), false);
});
