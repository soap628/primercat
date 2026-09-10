import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Exercise the actual component's handlers without a browser or extra dependencies.
const source = readFileSync(new URL("../src/app/NavLinks.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function harness(initialMobile = true) {
  const hooks = [];
  let cursor = 0, pending = [], dirty = false, tree;
  const listeners = new Map();
  const queryListeners = new Set();
  const focusCalls = [];
  class TestNode {
    contains(node) { return node === this || this.children?.includes(node); }
    focus(options) { focusCalls.push({ node: this, options }); }
  }
  const wrapper = new TestNode(), toggle = new TestNode(), link = new TestNode(), outside = new TestNode();
  wrapper.children = [toggle, link];
  const viewport = {
    matches: initialMobile,
    addEventListener: (_name, handler) => queryListeners.add(handler),
    removeEventListener: (_name, handler) => queryListeners.delete(handler),
  };
  // Any attempt to restore the old body-scroll lock fails the test immediately.
  const bodyStyle = Object.freeze({ overflow: "auto" });
  const document = {
    body: { style: bodyStyle },
    documentElement: { setAttribute() {} },
    addEventListener(name, handler) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(handler);
    },
    removeEventListener: (name, handler) => listeners.get(name)?.delete(handler),
  };
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!hooks[index]) hooks[index] = { value: initial };
      return [hooks[index].value, next => {
        const value = typeof next === "function" ? next(hooks[index].value) : next;
        if (!Object.is(value, hooks[index].value)) { hooks[index].value = value; dirty = true; }
      }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!hooks[index]) hooks[index] = { ref: { current: initial } };
      return hooks[index].ref;
    },
    useEffect(effect, deps) {
      const index = cursor++;
      const previous = hooks[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        pending.push(() => { previous?.cleanup?.(); hooks[index] = { deps, cleanup: effect() }; });
      }
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports, document, Node: TestNode,
    localStorage: { getItem: () => "light", setItem() {} },
    window: { matchMedia: query => query === "(max-width: 1100px)" ? viewport : { matches: false } },
    require(name) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: "fragment" };
      if (name === "next/link") return { default: "link" };
      if (name === "@/navigation") return { usePathname: () => "/primer", useRouter: () => ({ push() {} }) };
      if (name === "@/lib/useAuth") return { useAuth: () => ({ user: null, loading: false, logout() {} }) };
      throw new Error(`Unexpected module: ${name}`);
    },
  });
  function find(className, node = tree) {
    if (!node || typeof node !== "object") return undefined;
    if (node.props?.className === className) return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      if (child == null) continue;
      const match = find(className, child);
      if (match) return match;
    }
  }
  function render() {
    do {
      dirty = false; cursor = 0; pending = [];
      tree = module.exports.default({ locale: "zh" });
      find("nav-mobile").props.ref.current = wrapper;
      find("nav-menu-button").props.ref.current = toggle;
      pending.forEach(effect => effect());
    } while (dirty);
  }
  render();
  return {
    wrapper, toggle, link, outside, focusCalls, bodyStyle,
    get open() { return find("nav-menu-button").props["aria-expanded"]; },
    clickToggle() { find("nav-menu-button").props.onClick(); render(); },
    blurTo(relatedTarget) { find("nav-mobile").props.onBlur({ currentTarget: wrapper, relatedTarget }); render(); },
    key(key) {
      let prevented = false;
      for (const handler of [...(listeners.get("keydown") ?? [])]) handler({ key, preventDefault() { prevented = true; } });
      render(); return prevented;
    },
    resize(mobile) { viewport.matches = mobile; [...queryListeners].forEach(handler => handler()); render(); },
    unmount() { hooks.forEach(hook => hook?.cleanup?.()); },
    listenerCount() { return [...listeners.values()].reduce((count, handlers) => count + handlers.size, 0) + queryListeners.size; },
  };
}

test("mobile disclosure leaves page scrolling alone; Escape closes and returns focus", () => {
  const h = harness();
  h.clickToggle();
  assert.equal(h.open, true);
  assert.equal(h.bodyStyle.overflow, "auto");
  assert.equal(h.key("Escape"), true);
  assert.equal(h.open, false);
  assert.equal(h.focusCalls.length, 1);
  assert.equal(h.focusCalls[0].node, h.toggle);
  assert.equal(h.focusCalls[0].options.preventScroll, true);
});

test("Escape does not steal focus when the mobile disclosure is already closed", () => {
  const h = harness();
  assert.equal(h.key("Escape"), false);
  assert.equal(h.focusCalls.length, 0);
});

test("Tab within disclosure stays open; leaving to another control closes without moving focus", () => {
  const h = harness();
  h.clickToggle();
  assert.equal(h.key("Tab"), false);
  h.blurTo(h.link);
  assert.equal(h.open, true);
  h.blurTo(h.toggle);
  assert.equal(h.open, true);
  h.blurTo(h.outside);
  assert.equal(h.open, false);
  assert.equal(h.focusCalls.length, 0);
});

test("losing focus outside the document also closes the disclosure", () => {
  const h = harness();
  h.clickToggle();
  h.blurTo(null);
  assert.equal(h.open, false);
});

test("crossing the 1100px media breakpoint closes and does not reopen on return", () => {
  const h = harness();
  h.clickToggle();
  h.resize(true);
  assert.equal(h.open, true);
  h.resize(false);
  assert.equal(h.open, false);
  h.resize(true);
  assert.equal(h.open, false);
  assert.equal(h.focusCalls.length, 0);
});

test("unmount cleans keyboard, outside-click and media-query listeners", () => {
  const h = harness();
  h.clickToggle();
  h.clickToggle();
  assert.equal(h.listenerCount(), 3);
  h.unmount();
  assert.equal(h.listenerCount(), 0);
});
