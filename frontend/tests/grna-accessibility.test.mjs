import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Source-level contracts only; run with: node --test tests/grna-accessibility.test.mjs
const source = readFileSync(new URL("../src/app/[locale]/grna/page.tsx", import.meta.url), "utf8");
const parse = (text) => ts.createSourceFile("grna.tsx", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const page = parse(source);
const isElement = (node) => ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node);
const opening = (node) => ts.isJsxElement(node) ? node.openingElement : node;
const tag = (node) => opening(node).tagName.getText();
const attr = (node, name) => opening(node).attributes.properties.find(
  (property) => ts.isJsxAttribute(property) && property.name.getText() === name,
);
const expr = (node, name) => {
  const value = attr(node, name)?.initializer;
  return value && ts.isJsxExpression(value) ? value.expression : value;
};
const literal = (node, name) => {
  const value = expr(node, name);
  return value && ts.isStringLiteral(value) ? value.text : undefined;
};
const text = (node, name) => expr(node, name)?.getText() ?? "";
const hasClass = (node, name) => (literal(node, "className") ?? "").split(/\s+/).includes(name);
function elements(root) {
  const found = [];
  function visit(node) { if (isElement(node)) found.push(node); ts.forEachChild(node, visit); }
  visit(root);
  return found;
}
function within(node, parent) {
  for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) if (ancestor === parent) return true;
  return false;
}
const all = elements(page);
function one(predicate, description) {
  const found = all.filter(predicate);
  assert.equal(found.length, 1, `Expected one ${description}, found ${found.length}`);
  return found[0];
}
const byId = (id) => one((node) => literal(node, "id") === id, `#${id}`);
function nestedButtons(root) {
  const buttons = elements(root).filter((node) => tag(node) === "button");
  return buttons.filter((node) => buttons.some((parent) => within(node, parent)));
}

test("gRNA JSX parses and copy/expand remain independent native buttons", () => {
  assert.equal(page.parseDiagnostics.length, 0);
  assert.equal(nestedButtons(page).length, 0, "A button must not contain another button");
  const summary = one((node) => hasClass(node, "grna-guide-summary"), "guide summary");
  assert.equal(tag(summary), "div");
  assert.equal(attr(summary, "role"), undefined, "The summary must not become a second button");
  for (const name of ["grna-guide-copy", "grna-guide-toggle"]) {
    const button = one((node) => hasClass(node, name), name);
    assert.equal(tag(button), "button");
    assert.equal(literal(button, "type"), "button");
    assert.ok(within(button, summary));
    assert.ok(attr(button, "aria-label"), `${name} needs its own accessible name`);
  }
  const toggle = one((node) => hasClass(node, "grna-guide-toggle"), "expand button");
  assert.equal(text(toggle, "aria-expanded"), "expanded");
  assert.match(text(toggle, "aria-controls"), /grna-guide-details-/);
  assert.ok(all.some((node) => text(node, "id").includes("grna-guide-details-")));
});

test("nested-button detector catches both regular and self-closing descendants", () => {
  assert.equal(nestedButtons(parse("<button><span><button>Copy</button></span><button /></button>")).length, 2);
  assert.equal(nestedButtons(parse("<div><button>Copy</button><button>Expand</button></div>")).length, 0);
});

test("gene, locus and sequence fields have explicit label associations", () => {
  for (const [id, expectedTag] of [["grna-gene", "input"], ["grna-locus", "input"], ["grna-sequence", "textarea"]]) {
    assert.equal(tag(byId(id)), expectedTag);
    one((node) => tag(node) === "label" && literal(node, "htmlFor") === id, `label for ${id}`);
  }
  assert.equal(literal(byId("grna-sequence"), "aria-describedby"), "grna-sequence-help");
  byId("grna-sequence-help");
});

test("invalid loci expose both their help and validation error", () => {
  const locus = byId("grna-locus");
  assert.match(text(locus, "aria-invalid"), /Boolean\(targetLocusText\.trim\(\)\s*&&\s*!parsedTargetLocus\)/);
  const description = expr(locus, "aria-describedby");
  assert.ok(description && ts.isConditionalExpression(description));
  assert.equal(description.condition.getText(), "targetLocusText.trim() && !parsedTargetLocus");
  assert.equal(description.whenTrue.text, "grna-locus-help grna-locus-error");
  assert.equal(description.whenFalse.text, "grna-locus-help");
  byId("grna-locus-help");
  byId("grna-locus-error");
});

test("species stays a labelled, keyboard-focusable native radio group", () => {
  const group = one((node) => hasClass(node, "grna-species-options"), "species group");
  assert.equal(literal(group, "role"), "radiogroup");
  byId(literal(group, "aria-labelledby"));
  const radio = one((node) => tag(node) === "input" && literal(node, "name") === "grna-species", "species radio template");
  assert.equal(literal(radio, "type"), "radio");
  assert.ok(within(radio, group));
  assert.ok(hasClass(radio, "sr-only"), "Hide visually without display:none");
  assert.equal(attr(radio, "hidden"), undefined);
  assert.equal(attr(radio, "disabled"), undefined);
  assert.notEqual(text(radio, "tabIndex"), "-1");
  assert.doesNotMatch(text(radio, "style"), /(?:display\s*:\s*["']none|visibility\s*:\s*["']hidden)/);
  assert.equal(text(radio, "checked"), "species === value");
  assert.match(text(radio, "onChange"), /setSpecies\(value\)/);
  assert.ok(all.some((node) => tag(node) === "label" && hasClass(node, "grna-species-option") && within(radio, node)));
});

test("Cas choices expose their selected state within a labelled group", () => {
  const group = one((node) => hasClass(node, "grna-cas-options"), "Cas group");
  assert.equal(literal(group, "role"), "group");
  byId(literal(group, "aria-labelledby"));
  const button = one((node) => tag(node) === "button" && within(node, group), "Cas button template");
  assert.equal(literal(button, "type"), "button");
  assert.equal(text(button, "aria-pressed"), "casType === option.value");
  assert.match(text(button, "onClick"), /setCasType\(option\.value\)/);
});
