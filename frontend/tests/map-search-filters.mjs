import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
const require = createRequire(import.meta.url), ts = require("typescript"), React = require("react");
function find(node, predicate) {
  if (!node || typeof node !== "object") return;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props?.children)) {
    const match = find(child, predicate); if (match) return match;
  }
}
function harness() {
  let query = "mode=in-person&areaId=city&radius=25", current, cursor, effectCursor;
  const instances = new Map(), requests = [], pending = [];
  const area = { id: "city", name: "Test City" };
  const hooks = { ...React,
    useState(initial) {
      const instance = current, index = cursor++;
      if (!(index in instance.state)) instance.state[index] = initial;
      return [instance.state[index], value => { instance.state[index] = value; }];
    },
    useEffect(callback, deps) {
      const instance = current, index = effectCursor++, previous = instance.effects[index];
      if (!previous || deps.some((value, i) => value !== previous.deps[i])) {
        previous?.cleanup?.();
        const effect = { deps }; instance.effects[index] = effect;
        pending.push(() => { effect.cleanup = callback(); });
      }
    },
  };
  const Picker = () => null, MapView = () => null;
  const source = readFileSync(new URL("../app/tutors/(main page)/page.tsx", import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(js, { module: loaded, exports: loaded.exports, URLSearchParams, require(name) {
    if (name === "react") return hooks;
    if (name === "next/navigation") return { useSearchParams: () => new URLSearchParams(query), useRouter: () => ({ push(url) { query = url.split("?")[1]; } }) };
    if (name === "next/dynamic") return { default: () => MapView };
    if (name === "@/lib/api/api-helper") return { apiFetch: url => url.includes("/search?") ? new Promise(resolve => requests.push({ url, resolve })) : Promise.resolve({ data: area }) };
    if (name === "@/lib/api/actions/client-actions") return { getSubjects: async () => ({ data: [] }) };
    if (name === "@/components/ServiceAreaPicker") return { default: Picker };
    if (name.startsWith("@/")) return { default: () => null };
    return require(name);
  } });
  function call(key, component, props) {
    if (!instances.has(key)) instances.set(key, { state: [], effects: [] });
    current = instances.get(key); cursor = 0; effectCursor = 0;
    return component(props);
  }
  let previousKey;
  function render() {
    const child = call("parent", loaded.exports.default, {});
    if (previousKey && previousKey !== child.key) {
      instances.get(previousKey)?.effects.forEach(effect => effect.cleanup?.());
      instances.delete(previousKey);
    }
    previousKey = child.key;
    const tree = call(child.key, child.type, child.props);
    while (pending.length) pending.shift()();
    return tree;
  }
  return { render, requests, Picker, MapView, area };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
const response = { data: { items: [], total: 0, offset: 0, limit: 20 } };
test("map filters retain view and selected location through loading and refreshed results", async () => {
  const h = harness(); h.render(); await flush();
  h.requests[0].resolve(response); await flush();
  let tree = h.render();
  find(tree, node => node.type === "button" && node.props.children === "Map View").props.onClick();
  tree = h.render();
  for (const [inputType, value, parameter] of [["range", "50", "radius=50"], ["text", "Math", "subject=Math"], ["number", "10", "minPrice=10"]]) {
    find(tree, node => node.type === "input" && node.props.type === inputType).props.onChange({ target: { value } });
    tree = h.render();
    find(tree, node => node.type === "form").props.onSubmit({ preventDefault() {} });
    tree = h.render();
    assert.equal(find(tree, node => node.type === "button" && node.props.children === "Map View").props["aria-pressed"], true);
    assert.equal(find(tree, node => node.type === h.Picker).props.value.id, "city");
    assert.ok(find(tree, node => node.props?.role === "status" && node.props.className?.includes("h-[65dvh]")));
    assert.match(h.requests.at(-1).url, new RegExp(parameter));
    assert.match(h.requests.at(-1).url, /areaId=city/);
    h.requests.at(-1).resolve(response); await flush();
    tree = h.render(); assert.ok(find(tree, node => node.type === h.MapView));
  }
});
test("list filter submission keeps the existing list view", async () => {
  const h = harness(); h.render(); await flush(); h.requests[0].resolve(response); await flush();
  let tree = h.render();
  find(tree, node => node.type === "form").props.onSubmit({ preventDefault() {} });
  tree = h.render();
  assert.equal(find(tree, node => node.type === "button" && node.props.children === "List View").props["aria-pressed"], true);
  assert.equal(find(tree, node => node.props?.role === "status" && node.props.children === "Loading tutors...").props.children, "Loading tutors...");
});
