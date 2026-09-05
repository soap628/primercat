import test from "node:test";
import assert from "node:assert/strict";
import { readSessionWorkspace, writeSessionWorkspace, clearSessionWorkspace } from "../src/lib/session-workspace.ts";

function storage(initial = {}) {
  const entries = new Map(Object.entries(initial));
  return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
}
const valid = value => value !== null && typeof value === "object" && typeof value.gene === "string";

test("restores completed results, input drafts and view options together", () => {
  const store = storage();
  const saved = { gene: "TP53", resultGene: "GAPDH", result: { pairs: [1, 2] }, expanded: 2, tab: "blast" };
  assert.equal(writeSessionWorkspace("test:restore", saved, store), true);
  assert.deepEqual(readSessionWorkspace("test:restore", valid, store), saved);
  assert.equal(readSessionWorkspace("test:other-tool", valid, store), null);
});

test("a fresh page can read persisted session data without running a design", () => {
  const store = storage({ "test:fresh": JSON.stringify({ version: 1, value: { gene: "GAPDH" } }) });
  assert.deepEqual(readSessionWorkspace("test:fresh", valid, store), { gene: "GAPDH" });
});

test("invalid JSON, old schemas and incompatible payloads are discarded safely", () => {
  for (const [index, serialized] of ["{broken", JSON.stringify({ version: 0, value: { gene: "GAPDH" } }), JSON.stringify({ version: 1, value: null })].entries()) {
    const key = `test:invalid:${index}`;
    const store = storage({ [key]: serialized });
    assert.equal(readSessionWorkspace(key, valid, store), null);
    assert.equal(store.getItem(key), null);
  }
});

test("blocked or full storage falls back to memory for navigation", () => {
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("quota"); }, removeItem() { throw new Error("blocked"); } };
  assert.equal(writeSessionWorkspace("test:blocked", { gene: "GAPDH" }, blocked), false);
  assert.deepEqual(readSessionWorkspace("test:blocked", valid, blocked), { gene: "GAPDH" });
  clearSessionWorkspace("test:blocked", blocked);
  assert.equal(readSessionWorkspace("test:blocked", valid, blocked), null);
});

test("clear removes only the requested workspace", () => {
  const store = storage();
  writeSessionWorkspace("test:clear", { gene: "GAPDH" }, store);
  writeSessionWorkspace("test:keep", { gene: "ACTB" }, store);
  clearSessionWorkspace("test:clear", store);
  assert.equal(readSessionWorkspace("test:clear", valid, store), null);
  assert.deepEqual(readSessionWorkspace("test:keep", valid, store), { gene: "ACTB" });
});

test("restored objects do not mutate stored data", () => {
  const store = storage();
  writeSessionWorkspace("test:immutable", { gene: "GAPDH" }, store);
  readSessionWorkspace("test:immutable", valid, store).gene = "TP53";
  assert.equal(readSessionWorkspace("test:immutable", valid, store).gene, "GAPDH");
});
