import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function pageHarness(page, locale = "zh") {
  const source = readFileSync(new URL(`../src/app/[locale]/${page}/page.tsx`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const slots = [], messages = [], storage = new Map();
  let cursor = 0, effects = [], dirty = false, tree, focusedId;
  const sameDeps = (a, b) => a?.length === b?.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!slots[i]) slots[i] = { value: initial };
      return [slots[i].value, next => {
        const value = typeof next === "function" ? next(slots[i].value) : next;
        if (!Object.is(value, slots[i].value)) { slots[i].value = value; dirty = true; }
      }];
    },
    useRef(value) { const i = cursor++; return (slots[i] ??= { current: value }); },
    useMemo(factory, deps) {
      const i = cursor++;
      if (!slots[i] || !sameDeps(deps, slots[i].deps)) slots[i] = { value: factory(), deps };
      return slots[i].value;
    },
    useCallback(callback, deps) { return react.useMemo(() => callback, deps); },
    useEffect(effect, deps) {
      const i = cursor++;
      if (!slots[i] || !sameDeps(deps, slots[i].deps)) {
        const previous = slots[i];
        effects.push(() => { previous?.cleanup?.(); slots[i] = { deps, cleanup: effect() }; });
      }
    },
  };
  const showToast = (...args) => messages.push(args);
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports, URLSearchParams,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    window: { location: { search: "" } },
    require(name) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: "fragment" };
      if (name === "@/lib/useToast") return { useToast: () => ({ toast: showToast }) };
      throw new Error(`Unexpected import ${name}`);
    },
  });
  function nodes() {
    const found = [];
    function visit(node, ancestors = []) {
      if (!node || typeof node !== "object") return;
      found.push({ node, ancestors });
      [node.props?.children].flat(Infinity).forEach(child => visit(child, [...ancestors, node]));
    }
    visit(tree); return found;
  }
  const textOf = node => node == null || typeof node === "boolean" ? "" : typeof node !== "object" ? String(node) : [node.props?.children].flat(Infinity).map(textOf).join("");
  function render() {
    do {
      cursor = 0; effects = []; dirty = false;
      tree = module.exports.default({ params: { locale } });
      nodes().forEach(({ node }) => {
        if (node.props?.ref) node.props.ref.current = { focus() { focusedId = node.props.id; } };
      });
      effects.forEach(effect => effect());
    } while (dirty);
  }
  const find = predicate => nodes().find(({ node }) => predicate(node))?.node;
  function click(node) { assert.ok(node, "expected interactive control"); node.props.onClick(); render(); }
  render();
  return {
    nodes, textOf, find, messages,
    get focusedId() { return focusedId; },
    get status() { return textOf(find(node => node.props?.role === "status")); },
    field: id => find(node => node.props?.id === id),
    change(id, value) { find(node => node.props?.id === id).props.onChange({ target: { value } }); render(); },
    clickText: text => click(find(node => node.type === "button" && textOf(node) === text)),
    clickClass: className => click(find(node => node.props?.className === className)),
    assertNamedControls() {
      const all = nodes();
      for (const { node, ancestors } of all) {
        if (node.type === "button") assert.equal(node.props.type, "button");
        if (!["input", "select", "textarea"].includes(node.type)) continue;
        const props = node.props;
        const named = props["aria-label"] || props["aria-labelledby"] || ancestors.some(parent => parent.type === "label") || all.some(({ node: label }) => label.type === "label" && props.id && label.props.htmlFor === props.id);
        assert.ok(named, `unnamed ${node.type}: ${props.id ?? props.placeholder ?? "control"}`);
      }
    },
  };
}

test("all calculator modes have named fields, explicit button types and selected states", () => {
  const h = pageHarness("mw-calc");
  for (const mode of ["分子量", "溶液配制", "稀释计算"]) {
    h.clickText(mode);
    h.assertNamedControls();
    assert.equal(h.find(node => node.type === "button" && h.textOf(node) === mode).props["aria-pressed"], true);
  }
});

test("molecular-weight results are announced; history uses a keyboard-native button", () => {
  const h = pageHarness("mw-calc");
  h.change("mw-formula", "H2O");
  h.clickClass("mw-calculate-button");
  assert.equal(h.textOf(h.find(node => node.props?.className === "mw-result-value")), "18.015");
  assert.equal(h.status, "H2O: 18.015 g/mol");
  assert.equal(h.find(node => node.props?.className === "mw-history-button").type, "button");
  h.clickClass("mw-history-button");
  assert.equal(h.field("mw-formula").props.value, "H2O");
  h.clickClass("mw-result-action");
  assert.equal(h.field("mw-solution-mw").props.value, "18.015");
  assert.equal(h.focusedId, "mw-solution-mw");
});

test("formula errors are associated with the field and announced as alerts", () => {
  const h = pageHarness("mw-calc");
  h.change("mw-formula", "Xx");
  h.clickClass("mw-calculate-button");
  assert.equal(h.field("mw-formula").props["aria-invalid"], true);
  assert.match(h.field("mw-formula").props["aria-describedby"], /mw-formula-error/);
  assert.equal(h.field("mw-formula-error").props.role, "alert");
});

test("all solution solving modes preserve numeric outputs and announce result units", () => {
  const h = pageHarness("mw-calc");
  h.clickText("溶液配制");
  h.change("mw-solution-mw", "58.44");
  h.change("mw-solution-mass", "58.44");
  h.change("mw-solution-volume", "10");
  h.clickClass("mw-calculate-button");
  assert.equal(h.field("mw-solution-concentration").props.value, "100");
  assert.equal(h.status, "浓度: 100 mM");
  h.clickText("质量"); h.clickClass("mw-calculate-button");
  assert.equal(h.field("mw-solution-mass").props.value, "58.44");
  assert.equal(h.status, "质量: 58.44 mg");
  h.clickText("体积"); h.clickClass("mw-calculate-button");
  assert.equal(h.field("mw-solution-volume").props.value, "10");
  assert.equal(h.status, "体积: 10 mL");
});

test("all dilution solving modes preserve numeric outputs and announce result units", () => {
  const h = pageHarness("mw-calc");
  h.clickText("稀释计算");
  h.change("mw-dilution-c1", "100"); h.change("mw-dilution-v1", "1"); h.change("mw-dilution-c2", "10");
  for (const [mode, id, expected, unit] of [["V₂", "v2", "10", "mL"], ["V₁", "v1", "1", "mL"], ["C₂", "c2", "10", "mM"], ["C₁", "c1", "100", "mM"]]) {
    h.clickText(mode); h.clickClass("mw-calculate-button");
    assert.equal(h.field(`mw-dilution-${id}`).props.value, expected);
    assert.equal(h.field(`mw-dilution-${id}`).props.readOnly, true);
    assert.equal(h.status, `${mode}: ${expected} ${unit}`);
  }
});

test("budget sliders announce both shares and amounts; saved actions have contextual names", () => {
  const h = pageHarness("fund-calc");
  h.assertNamedControls();
  for (const { node } of h.nodes().filter(({ node }) => node.props?.type === "range")) {
    assert.match(node.props["aria-valuetext"], /%, [\d.]+ 万元$/);
  }
  h.clickText("保存草案");
  assert.equal(h.status, "预算草案已保存在当前浏览器");
  const load = h.find(node => node.type === "button" && h.textOf(node) === "载入");
  const remove = h.find(node => node.type === "button" && h.textOf(node) === "删除");
  assert.match(load.props["aria-label"], /国家自然科学基金/);
  assert.match(remove.props["aria-label"], /国家自然科学基金/);
  h.clickText("删除");
  assert.equal(h.status, "预算草案已删除");
});

test("English utility controls and feedback retain their locale", () => {
  const h = pageHarness("mw-calc", "en");
  h.clickText("Solution Prep"); h.assertNamedControls();
  assert.ok(h.find(node => node.type === "select" && node.props["aria-label"] === "Mass unit"));
  const budget = pageHarness("fund-calc", "en");
  budget.clickText("Reset shares");
  assert.equal(budget.status, "Reference shares restored");
});
