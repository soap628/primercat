import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const localized = (value) => ({ zh: value, en: value });
const protocols = ["nucleic-acid", "protein"].map((category, index) => ({
  id: `test-${index}`, category, title: localized(`Test ${index}`), summary: localized("Test summary"),
  duration: localized("Test duration"), difficulty: "routine", applicability: localized("Test scope"),
  parameters: [{ label: localized("Parameter"), value: localized("Value"), note: localized("Note") }],
  controls: [], materials: [], acceptance: [], records: [], critical: localized("Boundary"), safety: localized("Safety"),
  sourceLabel: "Test source", sourceUrl: "https://example.org/",
  steps: [0, 1].map((step) => ({ title: localized(`Step ${step}`), body: localized(`Body ${step}`) })),
}));
const compiled = ts.transpileModule(readFileSync(new URL("../src/app/[locale]/protocols/page.tsx", import.meta.url), "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function harness({ locale = "zh", mobile = false, reducedMotion = false } = {}) {
  const slots = [], frames = new Map(), scrolls = [];
  let cursor = 0, tree, focused, cleanup, frameId = 0;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports,
    window: {
      matchMedia: (query) => ({ matches: query.includes("prefers-reduced-motion") ? reducedMotion : mobile }),
      requestAnimationFrame: (callback) => { frames.set(++frameId, callback); return frameId; },
      cancelAnimationFrame: (id) => frames.delete(id),
    },
    require(name) {
      if (name === "react") return {
        useState(initial) {
          const index = cursor++;
          slots[index] ??= { value: initial };
          return [slots[index].value, (next) => { slots[index].value = typeof next === "function" ? next(slots[index].value) : next; }];
        },
        useRef(initial) { return slots[cursor++] ??= { current: initial }; },
        useMemo(factory) { return factory(); },
        useEffect(effect) { cleanup ??= effect(); },
      };
      if (name === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name === "@/navigation") return { Link: "a" };
      if (name === "@/lib/protocol-data") return { PROTOCOLS: protocols };
      throw new Error(`Unexpected import ${name}`);
    },
  });
  function nodes() {
    const found = [];
    function visit(node, ancestors = []) {
      if (!node || typeof node !== "object") return;
      found.push({ node, ancestors });
      [node.props?.children].flat(Infinity).forEach((child) => visit(child, [...ancestors, node]));
    }
    visit(tree); return found;
  }
  function render() {
    cursor = 0; tree = module.exports.default({ params: { locale } });
    nodes().forEach(({ node }) => {
      if (node.props?.ref) node.props.ref.current = {
        focus() { focused = node.props; }, scrollIntoView(options) { scrolls.push(options); },
      };
    });
  }
  const find = (predicate) => nodes().find(({ node }) => predicate(node))?.node;
  const byClass = (name) => find((node) => node.props?.className === name);
  const byId = (id) => find((node) => node.props?.id === id);
  const click = (node) => { assert.ok(node, "Expected control"); node.props.onClick(); render(); };
  render();
  return {
    nodes, find, byClass, byId, click, scrolls,
    get focused() { return focused; }, get pendingFrames() { return frames.size; },
    change(value) { byId("protocol-search").props.onChange({ target: { value } }); render(); },
    choose(index) { click(nodes().filter(({ node }) => node.props?.className === "protocol-list-item")[index]?.node); },
    flushFrames() { const pending = [...frames.values()]; frames.clear(); pending.forEach((callback) => callback()); },
    dispose() { cleanup?.(); },
    get progress() { return find((node) => node.props?.role === "progressbar").props; },
  };
}

test("search has an explicit label and clearing restores its focus and results", () => {
  const h = harness();
  assert.ok(h.find((node) => node.type === "label" && node.props.htmlFor === "protocol-search"));
  assert.equal(h.byId("protocol-search").props.type, "search");
  h.change("no-matching-result");
  assert.equal(h.byClass("protocol-result-count").props.children[0], 0);
  assert.equal(h.byClass("protocol-result-count").props.role, "status");
  h.click(h.byClass("protocol-search-clear"));
  assert.equal(h.focused.id, "protocol-search");
  assert.equal(h.byId("protocol-search").props.value, "");
  assert.equal(h.byClass("protocol-result-count").props.children[0], 2);
  for (const { node, ancestors } of h.nodes().filter(({ node }) => node.type === "button")) {
    assert.equal(node.props.type, "button");
    assert.ok(!ancestors.some((parent) => parent.type === "label" || parent.type === "button"));
  }
});

test("category and list selection expose pressed state and progress descriptions", () => {
  const h = harness();
  const group = h.byClass("protocol-filter-row");
  assert.equal(group.props.role, "group");
  assert.ok(group.props["aria-label"]);
  const buttons = group.props.children;
  assert.equal(buttons[0].props["aria-pressed"], true);
  h.click(buttons.at(-1));
  assert.equal(h.byClass("protocol-filter-row").props.children.at(-1).props["aria-pressed"], true);
  const selected = h.byClass("protocol-list-item");
  assert.equal(selected.props["aria-pressed"], true);
  assert.equal(selected.props["aria-controls"], "protocol-detail");
  assert.ok(h.byId(selected.props["aria-describedby"]));
});

test("completed steps have named progress; reset affects only this document and restores focus", () => {
  const h = harness();
  assert.ok(h.progress["aria-label"]);
  assert.equal(h.progress["aria-valuenow"], 0);
  h.click(h.byClass("protocol-step-check"));
  assert.equal(h.progress["aria-valuenow"], 50);
  assert.equal(h.progress["aria-valuetext"], "已完成 1 / 2 个步骤");
  assert.ok(h.byId(h.byClass("protocol-step-check").props["aria-describedby"]));
  h.choose(1); h.click(h.byClass("protocol-step-check")); h.choose(0);
  h.click(h.byClass("protocol-progress-reset"));
  assert.equal(h.focused.className, "protocol-step-check");
  assert.equal(h.progress["aria-valuenow"], 0);
  assert.equal(h.byClass("protocol-step-check").props["aria-pressed"], false);
  h.choose(1);
  assert.equal(h.progress["aria-valuenow"], 50);
  const en = harness({ locale: "en" });
  assert.equal(en.progress["aria-label"], "Session progress");
  assert.equal(en.progress["aria-valuetext"], "0 of 2 steps completed");
});

test("mobile selection focuses the document, respects reduced motion and cancels stale scrolling", () => {
  const h = harness({ mobile: true, reducedMotion: true });
  h.choose(1); h.choose(0);
  assert.equal(h.pendingFrames, 1);
  h.flushFrames();
  assert.equal(h.focused.id, "protocol-detail-title");
  assert.equal(h.scrolls[0].behavior, "auto");
  h.choose(1); h.dispose();
  assert.equal(h.pendingFrames, 0);
});

test("parameter tables have scoped headers and a named keyboard-scrollable region", () => {
  const h = harness();
  const region = h.byClass("protocol-parameter-table-wrap");
  assert.equal(region.props.role, "region");
  assert.equal(region.props.tabIndex, 0);
  assert.ok(h.byId(region.props["aria-labelledby"]));
  assert.deepEqual(h.nodes().filter(({ node }) => node.type === "th").map(({ node }) => node.props.scope), ["col", "col", "col", "row"]);
});
