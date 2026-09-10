import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const compile = (path) => ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const dataModule = { exports: {} };
vm.runInNewContext(compile("../src/lib/lab-reference-data.ts"), { module: dataModule, exports: dataModule.exports });
const reference = dataModule.exports;
const records = reference.CHEMICAL_SAFETY_RECORDS;
const compiledPage = compile("../src/app/[locale]/chemical-safety/page.tsx");
const textOf = (node) => node == null || typeof node === "boolean" ? "" : typeof node !== "object" ? String(node)
  : [node.props?.children].flat(Infinity).map(textOf).join("");

// Render the real catalog with a small hook harness; no browser, server or network required.
function harness({ locale = "zh", query } = {}) {
  const slots = [];
  let cursor = 0, tree, focusedId;
  const module = { exports: {} };
  const jsx = (type, props) => typeof type === "function" ? type(props) : { type, props };
  vm.runInNewContext(compiledPage, {
    module, exports: module.exports,
    require(name) {
      if (name === "react") return {
        useState(initial) {
          const index = cursor++;
          slots[index] ??= { value: initial };
          return [slots[index].value, (next) => { slots[index].value = typeof next === "function" ? next(slots[index].value) : next; }];
        },
        useRef(initial) { return slots[cursor++] ??= { current: initial }; },
        useMemo(factory) { return factory(); },
      };
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "@/lib/lab-reference-data") return reference;
      throw new Error(`Unexpected import ${name}`);
    },
  });
  function nodes(root = tree) {
    const found = [];
    function visit(node, ancestors = []) {
      if (!node || typeof node !== "object") return;
      found.push({ node, ancestors });
      [node.props?.children].flat(Infinity).forEach((child) => visit(child, [...ancestors, node]));
    }
    visit(root); return found;
  }
  function render() {
    cursor = 0;
    tree = module.exports.default({ params: { locale }, searchParams: query === undefined ? undefined : { q: query } });
    nodes().forEach(({ node }) => {
      if (node.props?.ref) node.props.ref.current = { focus() { focusedId = node.props.id; } };
    });
  }
  const find = (predicate) => nodes().find(({ node }) => predicate(node))?.node;
  const byClass = (name) => find((node) => node.props?.className === name);
  const byId = (id) => find((node) => node.props?.id === id);
  const click = (node) => { assert.ok(node, "Expected control"); node.props.onClick(); render(); };
  render();
  return {
    nodes, find, byClass, byId, click,
    get focusedId() { return focusedId; },
    get ids() { return nodes().filter(({ node }) => node.type === "details" && node.props.className === "chem-card").map(({ node }) => node.props.id); },
    get groups() { return nodes().filter(({ node }) => node.props?.role === "group").map(({ node }) => node); },
    get count() { return Number(textOf(byClass("chem-result-count")).match(/^\d+/)?.[0]); },
    change(value) { byId("chemical-search").props.onChange({ target: { value } }); render(); },
    filter(group, label) {
      const controls = nodes(this.groups[group]).map(({ node }) => node);
      click(controls.find((node) => node.type === "button" && textOf(node) === label));
    },
  };
}

test("URL query initializes the real catalog search, including CAS, aliases and subscript formulas", () => {
  for (const [query, id] of [["64-17-5", "ethanol"], [" eToH ", "ethanol"], ["OsO₄", "osmium-tetroxide"], ["oso4", "osmium-tetroxide"]]) {
    const h = harness({ query });
    assert.equal(h.byId("chemical-search").props.value, query);
    assert.deepEqual(h.ids, [id]);
    assert.equal(h.count, 1);
  }
});

test("search, filter groups, result count and hero anchor retain explicit accessible names", () => {
  for (const locale of ["zh", "en"]) {
    const h = harness({ locale });
    assert.equal(h.count, records.length);
    assert.ok(h.find((node) => node.type === "label" && node.props.htmlFor === "chemical-search" && textOf(node)));
    assert.equal(h.byId("chemical-search").props.type, "search");
    assert.equal(h.byClass("chem-result-count").props.role, "status");
    assert.equal(h.byClass("chem-result-count").props["aria-atomic"], "true");
    const link = h.byClass("chem-browse-link");
    assert.equal(link.type, "a");
    assert.equal(link.props.href, "#chemical-library");
    assert.ok(textOf(link));
    assert.ok(h.byId(h.byId("chemical-library").props["aria-labelledby"]));
    assert.equal(h.groups.length, 2);
    for (const group of h.groups) {
      assert.ok(group.props["aria-label"]);
      const buttons = h.nodes(group).filter(({ node }) => node.type === "button").map(({ node }) => node);
      assert.equal(buttons.filter((node) => node.props["aria-pressed"] === true).length, 1);
      buttons.forEach((button) => { assert.equal(button.props.type, "button"); assert.ok(textOf(button)); });
    }
  }
});

test("use, hazard and query are intersected; clearing search preserves filters and returns focus", () => {
  const h = harness();
  h.filter(0, "清洁消毒"); h.filter(1, "易燃");
  const expected = Array.from(records.filter((record) => (record.uses ?? ["general"]).includes("cleaning") && record.categories.includes("flammable")), (record) => record.id);
  assert.ok(expected.includes("ethanol"));
  assert.ok(expected.length < records.length);
  assert.deepEqual(h.ids, expected);
  h.change("EtOH");
  assert.deepEqual(h.ids, ["ethanol"]);
  const clear = h.byClass("chem-search-clear");
  assert.equal(clear.props.type, "button");
  assert.ok(clear.props["aria-label"]);
  h.click(clear);
  assert.equal(h.focusedId, "chemical-search");
  assert.deepEqual(h.ids, expected);
  assert.equal(h.count, expected.length);
  for (const [index, label] of [[0, "清洁消毒"], [1, "易燃"]]) {
    assert.equal(h.nodes(h.groups[index]).find(({ node }) => node.type === "button" && textOf(node) === label).node.props["aria-pressed"], true);
  }
});

test("empty-state reset clears query and both filters, then returns focus to search", () => {
  const h = harness({ query: "EtOH" });
  h.filter(0, "清洁消毒"); h.filter(1, "腐蚀");
  assert.deepEqual(h.ids, []);
  assert.equal(h.count, 0);
  h.click(h.byClass("chem-filter-reset"));
  assert.equal(h.byId("chemical-search").props.value, "");
  assert.equal(h.focusedId, "chemical-search");
  assert.equal(h.count, records.length);
  assert.equal(h.byClass("chem-no-results"), undefined);
  h.groups.forEach((group) => assert.equal(h.nodes(group).find(({ node }) => node.type === "button").node.props["aria-pressed"], true));
});

test("native safety cards preserve every catalog source, warning and reference link in both languages", () => {
  for (const locale of ["zh", "en"]) {
    const h = harness({ locale });
    for (const record of records) {
      const card = h.byId(record.id);
      assert.equal(card.type, "details");
      const summary = h.nodes(card).find(({ node }) => node.type === "summary").node;
      assert.ok(textOf(summary).includes(record.name[locale]));
      assert.ok(textOf(card).includes(record.special[locale]));
      const source = h.nodes(card).find(({ node }) => node.props?.className === "chem-source-link").node;
      assert.equal(source.props.href, record.sourceUrl ?? `https://pubchem.ncbi.nlm.nih.gov/compound/${record.cid}`);
      assert.equal(source.props.target, "_blank");
      assert.match(source.props.rel, /noreferrer/);
      if (record.sourceLabel) assert.ok(textOf(source).includes(record.sourceLabel[locale]));
    }
    const hrefs = new Set(h.nodes().filter(({ node }) => node.type === "a").map(({ node }) => node.props.href));
    for (const url of [reference.PUBCHEM_GHS_URL, reference.OSHA_SDS_URL, ...reference.CHEMICAL_INTERACTION_ALERTS.map((alert) => alert.sourceUrl)]) {
      assert.ok(hrefs.has(url), `Missing original reference ${url}`);
    }
  }
});
