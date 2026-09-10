import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const compilerOptions = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX };
const source = readFileSync(new URL("../src/app/[locale]/solutions/page.tsx", import.meta.url), "utf8");
const syntax = ts.createSourceFile("solutions.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const dataSource = readFileSync(new URL("../src/lib/lab-reference-data.ts", import.meta.url), "utf8");
const dataModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(dataSource, { compilerOptions }).outputText, { module: dataModule, exports: dataModule.exports });
const data = dataModule.exports;
const originalRecipes = JSON.stringify(data.SOLUTION_RECIPES);

function createPage() {
  let active;
  const react = {
    useState(initial) {
      const instance = active, index = instance.cursor++;
      if (!(index in instance.slots)) instance.slots[index] = typeof initial === "function" ? initial() : initial;
      return [instance.slots[index], next => {
        instance.slots[index] = typeof next === "function" ? next(instance.slots[index]) : next;
      }];
    },
    useRef(initial) {
      const index = active.cursor++;
      return active.slots[index] ??= { current: initial };
    },
    useMemo: factory => factory(),
  };
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions }).outputText + "\nmodule.exports.testHelpers = { NumericField, RecipeCard, recipeMatchesQuery };", {
    module, exports: module.exports,
    require(name) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: "fragment" };
      if (name === "@/navigation") return { Link: "a" };
      if (name === "@/lib/lab-reference-data") return data;
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  const helpers = module.exports.testHelpers;
  function mount(Component, props) {
    const instance = { slots: [], cursor: 0, tree: null, focusedId: null };
    function nodes(root = instance.tree) {
      const result = [];
      function visit(node) {
        if (!node || typeof node !== "object") return;
        result.push(node);
        [node.props?.children].flat(Infinity).forEach(visit);
      }
      visit(root); return result;
    }
    const textOf = node => node == null || typeof node === "boolean" ? "" : typeof node !== "object" ? String(node) : [node.props?.children].flat(Infinity).map(textOf).join("");
    function render() {
      active = instance; instance.cursor = 0;
      instance.tree = Component(props);
      nodes().forEach(node => {
        if (node.props?.ref) node.props.ref.current = { focus() { instance.focusedId = node.props.id; } };
      });
    }
    const find = predicate => nodes().find(predicate);
    const byId = id => find(node => node.props?.id === id);
    const click = node => { assert.ok(node); node.props.onClick(); render(); };
    render();
    return {
      nodes, textOf, find, byId, render,
      get focusedId() { return instance.focusedId; },
      clickText: text => click(find(node => node.type === "button" && textOf(node) === text)),
      clickClass: name => click(find(node => node.props?.className === name)),
      change(id, value) { const node = byId(id); assert.ok(node, id); (node.props.setValue ?? (value => node.props.onChange({ target: { value } })))(value); render(); },
      recipes: () => nodes().filter(node => node.type === helpers.RecipeCard).map(node => node.props.recipe),
      result: () => textOf(find(node => node.props?.className === "lab-result-card")),
    };
  }
  return { mount: (locale = "zh") => mount(module.exports.default, { params: { locale } }), mountComponent: mount, ...helpers };
}

test("calculator choices are native pressed buttons, not incomplete ARIA tabs", () => {
  assert.equal(syntax.parseDiagnostics.length, 0);
  const page = createPage(), h = page.mount();
  const group = h.find(node => node.props?.className === "lab-tabs lab-calculator-mode");
  assert.equal(group.props.role, "group");
  assert.ok(group.props["aria-label"]);
  assert.equal(h.nodes().some(node => ["tab", "tablist"].includes(node.props?.role)), false);
  for (const label of ["摩尔溶液", "储备液稀释", "百分浓度"]) {
    h.clickText(label);
    assert.equal(h.find(node => node.type === "button" && h.textOf(node) === label).props["aria-pressed"], true);
    for (const field of h.nodes().filter(node => node.type === page.NumericField)) {
      const rendered = page.mountComponent(page.NumericField, field.props);
      assert.ok(rendered.find(node => node.type === "label" && node.props.htmlFor === field.props.id));
      assert.equal(rendered.byId(field.props.id).type, "input");
      const select = rendered.find(node => node.type === "select");
      if (select) assert.match(select.props["aria-label"], /单位$/);
    }
  }
});

test("search matches both languages, purposes and normalized ingredient formulas", () => {
  const { recipeMatchesQuery } = createPage();
  const pbs = data.SOLUTION_RECIPES.find(recipe => recipe.id === "pbs-1x");
  for (const query of ["", "  ", "ＰＢＳ", "Phosphate-buffered", "无钙", "Na2HPO4", "PBS sodium"]) assert.equal(recipeMatchesQuery(pbs, query), true, query);
  assert.equal(recipeMatchesQuery(pbs, "PBS nonexistent-ingredient"), false);
  assert.equal(JSON.stringify(data.SOLUTION_RECIPES), originalRecipes);
});

test("search combines with category filters, reports counts and clears back to the current category", () => {
  const page = createPage(), h = page.mount();
  h.change("solution-recipe-search", "PBS");
  assert.ok(h.recipes().length > 0);
  assert.ok(h.recipes().every(recipe => page.recipeMatchesQuery(recipe, "PBS")));
  h.clickText("缓冲液");
  assert.ok(h.recipes().every(recipe => recipe.category === "buffer"));
  assert.equal(h.byId("solution-recipe-count").props.role, "status");
  h.change("solution-recipe-search", "no-such-recipe-xyz");
  assert.equal(h.recipes().length, 0);
  assert.ok(h.find(node => node.props?.className === "solution-library-empty"));
  h.clickClass("solution-search-clear");
  assert.equal(h.focusedId, "solution-recipe-search");
  assert.equal(h.recipes().length, data.SOLUTION_RECIPES.filter(recipe => recipe.category === "buffer").length);
});

test("molarity, dilution, percentage results and validation boundaries remain unchanged", () => {
  const h = createPage().mount();
  assert.match(h.result(), /58\.44 g/);
  h.change("solution-molar-concentration", "2");
  assert.match(h.result(), /116\.88 g/);
  h.clickText("储备液稀释");
  assert.match(h.result(), /0\.1 L/);
  h.change("solution-target-concentration", "20");
  assert.match(h.result(), /储备液浓度必须高于或等于目标浓度/);
  h.clickText("百分浓度");
  assert.match(h.result(), /10 g/);
  const selector = h.find(node => node.props?.className === "lab-wide-select");
  selector.props.onChange({ target: { value: "vv" } }); h.render();
  assert.match(h.result(), /10 mL/);
  h.change("solution-percent-value", "101");
  assert.match(h.result(), /不能大于 100%/);
});

test("recipe expansion has a stable labelled target; volume changes preserve ingredient scaling", () => {
  const page = createPage();
  const recipe = data.SOLUTION_RECIPES.find(item => item.id === "pbs-1x");
  const closed = page.mountComponent(page.RecipeCard, { recipe, zh: true, expanded: false, onToggle() {} });
  const toggle = closed.find(node => node.props?.className === "lab-recipe-summary");
  assert.equal(toggle.props.type, "button");
  assert.equal(toggle.props["aria-expanded"], false);
  assert.equal(closed.byId(toggle.props["aria-controls"]).props.hidden, true);
  assert.ok(closed.byId(closed.byId(toggle.props["aria-controls"]).props["aria-labelledby"]));
  const open = page.mountComponent(page.RecipeCard, { recipe, zh: true, expanded: true, onToggle() {} });
  open.change("pbs-1x-volume", "500");
  const amounts = open.nodes().filter(node => node.type === "strong" && node.props?.role === "cell").map(open.textOf);
  assert.deepEqual(amounts, ["4 g", "0.1 g", "0.72 g", "0.12 g"]);
  open.change("pbs-1x-volume", "0");
  assert.equal(open.byId("pbs-1x-volume").props["aria-invalid"], true);
  assert.equal(open.byId("pbs-1x-volume-error").props.role, "alert");
  assert.equal(JSON.stringify(data.SOLUTION_RECIPES), originalRecipes);
});

test("English fields, units and recipe table names remain localized", () => {
  const page = createPage(), h = page.mount("en");
  const field = h.byId("solution-molar-concentration");
  const numeric = page.mountComponent(page.NumericField, field.props);
  assert.equal(numeric.find(node => node.type === "select").props["aria-label"], "Target concentration unit");
  const recipe = data.SOLUTION_RECIPES[0];
  const card = page.mountComponent(page.RecipeCard, { recipe, zh: false, expanded: true, onToggle() {} });
  assert.equal(card.find(node => node.props?.role === "table").props["aria-label"], `${recipe.title.en} — Ingredient`);
});
