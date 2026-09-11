import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

const source = readFileSync(new URL("../src/components/PrimerCatMascot.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/components/PrimerCatMascot.module.css", import.meta.url), "utf8");
const ast = ts.createSourceFile("PrimerCatMascot.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const compiled = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;

// Use real React SSR for useId allocation; stub only CSS-module names.
// A separate useId stub permits direct inspection/invocation of event props.
function loadComponent(react = React) {
  const styles = new Proxy({}, { get: (_target, key) => `mascot_${String(key)}` });
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports,
    require(name) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return jsxRuntime;
      if (name === "./PrimerCatMascot.module.css") return { default: styles };
      throw new Error(`Unexpected mascot dependency: ${name}`);
    },
  });
  return module.exports.default;
}

function elements(tree) {
  const found = [];
  function visit(node) {
    if (!React.isValidElement(node)) return;
    found.push(node);
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree);
  return found;
}

const renderElement = (props) => loadComponent({ useId: () => ":test:" })(props);
const noop = () => {};

test("mascot preserves a named native dialog button in both languages and expanded states", () => {
  assert.equal(ast.parseDiagnostics.length, 0);
  for (const [locale, name] of [["zh", "点击 PrimerCat 猫咪"], ["en", "Click the PrimerCat mascot"]]) {
    for (const expanded of [false, true]) {
      const tree = renderElement({ locale, expanded, onActivate: noop });
      assert.equal(tree.type, "button");
      assert.equal(tree.props.type, "button");
      assert.equal(tree.props["aria-label"], name);
      assert.equal(tree.props["aria-haspopup"], "dialog");
      assert.equal(tree.props["aria-expanded"], expanded);
      assert.match(tree.props.className, /\bhome-mascot-trigger\b/);
      assert.notEqual(tree.props.tabIndex, -1);
      assert.ok(!tree.props.disabled);
      assert.equal(elements(tree).filter(node => node.type === "button").length, 1);
      assert.equal(elements(tree).filter(node => ["a", "input", "select", "textarea"].includes(node.type)).length, 0);
    }
  }
});

test("activation remains the caller's synchronous callback without rendering side effects", () => {
  let activations = 0;
  const onActivate = () => { activations += 1; };
  const tree = renderElement({ locale: "zh", expanded: false, onActivate });
  assert.equal(activations, 0, "Rendering must not open the easter egg or play its audio");
  assert.equal(tree.props.onClick, onActivate, "Keep the user activation callback direct");
  tree.props.onClick();
  assert.equal(activations, 1);
  tree.props.onClick();
  assert.equal(activations, 2);
  assert.equal(tree.props.onKeyDown, undefined, "Native Enter/Space must not gain a second activation handler");
});

test("decorative SVG has no separate accessibility or keyboard target", () => {
  const tree = renderElement({ locale: "en", expanded: false, onActivate: noop });
  const artwork = elements(tree).filter(node => node.type === "svg");
  assert.equal(artwork.length, 1);
  const svg = artwork[0];
  assert.equal(svg.props["aria-hidden"], "true");
  assert.equal(svg.props.focusable, "false");
  assert.ok(svg.props.tabIndex == null || svg.props.tabIndex === -1);
  assert.match(svg.props.viewBox, /^0 0 \d+ \d+$/);
  for (const node of elements(svg)) {
    assert.ok(node.props.tabIndex == null || node.props.tabIndex === -1);
    assert.notEqual(node.props.role, "button");
    assert.equal(node.props.onClick, undefined);
    assert.equal(node.props.href, undefined);
    assert.equal(node.props.xlinkHref, undefined);
  }
});

test("real React SSR gives multiple mascot instances unique paint IDs and local references", () => {
  const Mascot = loadComponent();
  const markup = renderToStaticMarkup(React.createElement(React.Fragment, null,
    React.createElement(Mascot, { locale: "zh", expanded: false, onActivate: noop }),
    React.createElement(Mascot, { locale: "en", expanded: true, onActivate: noop }),
    React.createElement(Mascot, { locale: "zh", expanded: false, onActivate: noop }),
  ));
  const svgs = [...markup.matchAll(/<svg\b[^>]*>([\s\S]*?)<\/svg>/g)].map(match => match[1]);
  assert.equal(svgs.length, 3);
  const allIds = [];
  for (const svg of svgs) {
    const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    const refs = [...svg.matchAll(/url\(#([^)]+)\)/g)].map(match => match[1]);
    assert.ok(ids.length > 0, "The figurine needs its local paint definitions");
    assert.ok(refs.length > 0, "Definitions must be used by the artwork");
    assert.equal(new Set(ids).size, ids.length, "IDs must be unique within one SVG");
    for (const ref of refs) assert.ok(ids.includes(ref), `${ref} must resolve inside its own SVG`);
    for (const id of ids) assert.ok(refs.includes(id), `${id} should be referenced by the artwork`);
    allIds.push(...ids);
  }
  assert.equal(new Set(allIds).size, allIds.length, "Sibling mascots must not share paint IDs");
});

function cssBlock(text, pattern) {
  const match = pattern.exec(text);
  assert.ok(match, `Missing CSS source contract: ${pattern}`);
  const start = text.indexOf("{", match.index);
  let depth = 1;
  for (let i = start + 1; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    if (text[i] === "}" && --depth === 0) return text.slice(start + 1, i);
  }
  assert.fail("Unclosed CSS contract block");
}

test("source guard: reduced motion disables artwork animation while keeping the cat visible", () => {
  // This checks authored declarations, not the browser cascade, SVG geometry,
  // contrast, focus-ring visibility or the actual computed reduced-motion state.
  const base = cssBlock(css, /^\.art\s*\{/m);
  assert.match(base, /\bopacity:\s*1\s*;/);
  assert.doesNotMatch(base, /(?:display:\s*none|visibility:\s*hidden)/);
  const reduced = cssBlock(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/);
  const allArtwork = cssBlock(reduced, /\.trigger\s+\.art\s*,\s*\.trigger\s+\.art\s+\*\s*\{/);
  for (const property of ["animation", "transition", "transform"]) {
    assert.match(allArtwork, new RegExp(`\\b${property}:\\s*none\\s*!important\\s*;`));
  }
  assert.match(cssBlock(reduced, /\.trigger\s+\.art\s*\{/), /\bopacity:\s*1\s*;/);
});

test("source guard: the mascot adds no network, audio or JavaScript animation runtime", () => {
  // The page owns audio and the easter-egg dialog. This artwork component only
  // allocates SVG IDs and forwards user activation; this is not an E2E audio test.
  const imports = ast.statements.filter(ts.isImportDeclaration);
  assert.deepEqual(imports.map(node => node.moduleSpecifier.text).sort(), ["./PrimerCatMascot.module.css", "react"]);
  const reactImport = imports.find(node => node.moduleSpecifier.text === "react");
  const reactBindings = reactImport.importClause?.namedBindings;
  assert.ok(reactBindings && ts.isNamedImports(reactBindings));
  assert.deepEqual(reactBindings.elements.map(node => (node.propertyName ?? node.name).text), ["useId"]);
  const forbidden = new Set(["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "Audio", "setTimeout", "setInterval", "requestAnimationFrame", "window", "document", "navigator"]);
  function visit(node) {
    if (ts.isIdentifier(node)) assert.ok(!forbidden.has(node.text), `Unexpected mascot runtime: ${node.text}`);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.doesNotMatch(css, /@import\b|url\(\s*["']?(?:https?:|\/\/|data:)/i);
});
