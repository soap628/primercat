import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/app/[locale]/page.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("home.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const graphic = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "ProductEvidenceGraphic");
assert.ok(graphic, "Test the actual homepage evidence component");
const imports = ast.statements.filter(node => ts.isImportDeclaration(node)
  && ["react", "@/components/PrimerCatMascot"].includes(node.moduleSpecifier.text));
const testSource = `${imports.map(node => node.getText(ast)).join("\n")}\n${graphic.getText(ast)}\nexport { ProductEvidenceGraphic };`;
const compiled = ts.transpileModule(testSource, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;

// Isolate this real function from unrelated home-page data and effects. Native
// browser layout, keyboard/focus behavior and audible playback need browser QA.
function mountGraphic(locale, noteIndex = 0) {
  const slots = [];
  let cursor = 0, tree;
  const audio = {
    currentTime: 0, plays: 0, pauses: 0,
    play() { this.plays += 1; return Promise.resolve(); },
    pause() { this.pauses += 1; },
  };
  const react = {
    useState(initial) {
      const index = cursor++;
      // The first state slot selects the decorative, rotating note. Effects are
      // not run, so tests can inspect every existing note without real timers.
      slots[index] ??= { value: index === 0 ? noteIndex : initial };
      return [slots[index].value, next => {
        slots[index].value = typeof next === "function" ? next(slots[index].value) : next;
      }];
    },
    useRef(initial) { return slots[cursor++] ??= { current: initial }; },
    useCallback: callback => callback,
    useEffect: () => {},
  };
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports,
    require(name) {
      if (name === "react") return react;
      if (name === "@/components/PrimerCatMascot") return { default: "PrimerCatMascot" };
      if (name === "react/jsx-runtime") return {
        jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: "fragment",
      };
      throw new Error(`Unexpected evidence dependency: ${name}`);
    },
  });
  function nodes(root = tree) {
    const result = [];
    function visit(node, ancestors = []) {
      if (!node || typeof node !== "object") return;
      result.push({ node, ancestors });
      [node.props?.children].flat(Infinity).forEach(child => visit(child, [...ancestors, node]));
    }
    visit(root); return result;
  }
  function render() {
    cursor = 0;
    tree = module.exports.ProductEvidenceGraphic({ locale });
    for (const { node } of nodes()) {
      if (node.type === "audio" && node.props.ref) node.props.ref.current = audio;
    }
  }
  render();
  const find = predicate => nodes().find(({ node }) => predicate(node))?.node;
  return { nodes, find, render, audio, byClass: className => find(node => (node.props?.className ?? "").split(/\s+/).includes(className)) };
}

function textOf(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node !== "object") return String(node);
  return [node.props?.children].flat(Infinity).map(textOf).join("");
}

function assertExposed(h, node) {
  assert.ok(node, "Expected content to remain rendered");
  const entry = h.nodes().find(entry => entry.node === node);
  assert.ok(entry);
  // Semantic exposure only, not a computed-CSS visibility assertion.
  for (const current of [...entry.ancestors, node]) {
    assert.ok(!current.props.hidden);
    assert.ok(![true, "true"].includes(current.props["aria-hidden"]));
    assert.doesNotMatch(current.props.className ?? "", /\b(?:sr-only|home-mascot-note)\b/);
    assert.notEqual(current.props.style?.display, "none");
    assert.notEqual(current.props.style?.visibility, "hidden");
  }
}

test("compact evidence retains three complete, labelled dt/dd parameters in Chinese and English", () => {
  assert.equal(ast.parseDiagnostics.length, 0);
  for (const locale of ["zh", "en"]) {
    const h = mountGraphic(locale);
    const metrics = h.byClass("home-evidence-metrics");
    assert.equal(metrics.type, "dl");
    assert.equal(metrics.props["aria-label"], locale === "zh" ? "示意参数" : "Illustrative parameters");
    assertExposed(h, metrics);
    const pairs = [metrics.props.children].flat().map(group => {
      const terms = h.nodes(group).map(({ node }) => node).filter(node => ["dt", "dd"].includes(node.type));
      assert.deepEqual(terms.map(node => node.type), ["dt", "dd"]);
      terms.forEach(node => assertExposed(h, node));
      return terms.map(textOf);
    });
    assert.deepEqual(pairs, [["ΔTm", "0.3 °C"], ["GC", "55%"], [locale === "zh" ? "扩增子" : "Amplicon", "152 bp"]]);
  }
});

test("reference identity, 5′→3′ direction and illustrative disclaimer remain outside decorative content", () => {
  for (const locale of ["zh", "en"]) {
    const h = mountGraphic(locale);
    const top = h.byClass("home-evidence-topline");
    const expectedPreview = locale === "zh" ? "示意预览" : "Illustrative preview";
    const label = h.find(node => node.type === "span" && textOf(node) === expectedPreview);
    const reference = h.find(node => node.type === "strong" && textOf(node) === "TP53 · NM_000546");
    const direction = h.byClass("home-evidence-status");
    const disclaimer = h.byClass("home-evidence-disclaimer");
    [top, label, reference, direction, disclaimer].forEach(node => assertExposed(h, node));
    assert.equal(textOf(direction).replace(/\s/g, ""), "5′→3′");
    assert.equal(textOf(disclaimer), locale === "zh" ? "示意数据，非实验结果" : "Illustrative data, not experimental results");
    assert.equal(disclaimer.type, "p");
  }
});

test("all three method names remain in the exposed footer, not just in the cat bubble", () => {
  for (const locale of ["zh", "en"]) {
    const h = mountGraphic(locale);
    const methods = h.byClass("home-evidence-methodline");
    assertExposed(h, methods);
    assert.equal(textOf(methods), "NCBI RefSeq · Primer3 · RNA BLAST");
    const entry = h.nodes().find(entry => entry.node === methods);
    assert.ok(entry.ancestors.includes(h.byClass("home-evidence-footer")));
    assert.equal(h.byClass("home-mascot-note").props["aria-hidden"], "true");
  }
});

test("mascot activation still opens the original audio easter egg and closing resets it", () => {
  for (const locale of ["zh", "en"]) {
    const h = mountGraphic(locale);
    let mascot = h.find(node => node.type === "PrimerCatMascot");
    assert.equal(mascot.props.locale, locale);
    assert.equal(mascot.props.expanded, false);
    assert.equal(h.audio.plays, 0);
    assert.equal(h.find(node => node.props?.role === "dialog"), undefined);
    assert.equal(h.find(node => node.type === "audio").props.src, "/audio/primer-cat-easter-egg.mp3");

    h.audio.currentTime = 7;
    mascot.props.onActivate();
    assert.equal(h.audio.plays, 1, "Audio remains in the synchronous user-activation callback");
    assert.equal(h.audio.currentTime, 0);
    h.render();
    mascot = h.find(node => node.type === "PrimerCatMascot");
    assert.equal(mascot.props.expanded, true);
    const dialog = h.find(node => node.props?.role === "dialog");
    assert.equal(dialog.props["aria-modal"], "true");
    assert.equal(h.byClass("home-easter-action").props.href, "https://soap628.com");
    assert.equal(h.byClass("home-easter-action").props.target, "_blank");
    assert.match(h.byClass("home-easter-action").props.rel, /noopener/);
    h.audio.currentTime = 3;
    h.byClass("home-easter-close").props.onClick();
    h.render();
    assert.equal(h.audio.pauses, 1);
    assert.equal(h.audio.currentTime, 0);
    assert.equal(h.find(node => node.type === "PrimerCatMascot").props.expanded, false);
    assert.equal(h.find(node => node.props?.role === "dialog"), undefined);
  }
});

test("every rotating note is short and avoids invented scores or completed-screening claims", () => {
  let notes;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "mascotNotes") notes = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(graphic);
  assert.ok(notes && ts.isConditionalExpression(notes));
  for (const [locale, list] of [["zh", notes.whenTrue], ["en", notes.whenFalse]]) {
    assert.ok(ts.isArrayLiteralExpression(list));
    assert.ok(list.elements.length > 0);
    list.elements.forEach((note, index) => {
      assert.ok(ts.isStringLiteral(note));
      const h = mountGraphic(locale, index);
      const rendered = textOf(h.byClass("home-mascot-note-copy"));
      assert.equal(rendered, note.text, "Inspect the actual note selected by the component");
      assert.ok([...rendered].length <= (locale === "zh" ? 20 : 42), `Keep the bubble short: ${rendered}`);
      assert.doesNotMatch(rendered, /\bscore\b|94|\d+\s*分|(?:初筛|筛查|验证).*(?:已完成|完成|已通过)|已完成.*(?:筛查|初筛|验证)|screen(?:ing)?\s+(?:is\s+)?complete|specificity confirmed|experimentally validated/i);
      assertExposed(h, h.byClass("home-evidence-disclaimer"));
    });
  }
});
