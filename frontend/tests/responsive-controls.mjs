import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
const require = createRequire(import.meta.url),
  ts = require("typescript"),
  React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
function load(name, react = React) {
  const source = readFileSync(new URL(`../components/${name}.tsx`, import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(js, {
    module: loaded,
    exports: loaded.exports,
    require: (name) => (name === "react" ? react : require(name)),
  });
  return loaded.exports.default;
}
function find(tree, type) {
  const nodes = [];
  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === type) nodes.push(node);
    React.Children.forEach(node.props?.children, walk);
  }
  walk(tree);
  return nodes;
}
test("schedule controls preserve native date/type bindings and do not submit an empty date", () => {
  const Controls = load("AvailabilityControls");
  const changes = [];
  const tree = Controls({
    type: "custom",
    selectedDate: "2030-01-02T12:00:00Z",
    onTypeChange: (type) => changes.push(type),
    onDateChange: (date) => changes.push(date),
    timezone: "America/New_York",
  });
  const select = find(tree, "select")[0],
    input = find(tree, "input")[0];
  assert.equal(input.props.type, "date");
  assert.equal(input.props.value, "2030-01-02");
  input.props.onChange({ target: { value: "" } });
  assert.deepEqual(changes, []);
  input.props.onChange({ target: { value: "2030-02-03" } });
  select.props.onChange({ target: { value: "weekly" } });
  assert.deepEqual(changes, ["2030-02-03", "weekly"]);
  const markup = renderToStaticMarkup(tree);
  assert.match(markup, /Schedule type/);
  assert.match(markup, /Week containing/);
  assert.match(markup, /America\/New_York/);
  assert.match(markup, /grid-cols-1/);
  assert.equal(
    find(
      Controls({
        type: "weekly",
        selectedDate: "2030-01-01",
        onTypeChange() {},
        onDateChange() {},
      }),
      "input",
    ).length,
    0,
  );
});
test("mobile disclosure Escape closes and returns focus to its summary", () => {
  let focused = false;
  const details = {
    open: true,
    querySelector: () => ({
      focus: () => {
        focused = true;
      },
    }),
  };
  const Menu = load("MobileMenu", { useRef: () => ({ current: details }) });
  const tree = Menu({
    children: React.createElement("a", { href: "/student/dashboard" }, "Dashboard"),
  });
  tree.props.onKeyDown({ key: "Escape" });
  assert.equal(details.open, false);
  assert.equal(focused, true);
  details.open = true;
  find(tree, "div")[0].props.onClick({ target: { closest: () => true } });
  assert.equal(details.open, false);
});
test("mobile filters expand in place with stable accessibility relationships", () => {
  let expanded = false;
  const Panel = load("ResponsivePanel", {
    useId: () => "filter-panel",
    useState: () => [
      expanded,
      (value) => {
        expanded = value;
      },
    ],
  });
  const render = () => Panel({ title: "Refine your search", children: "Filters" });
  let tree = render();
  const button = find(tree, "button")[0];
  assert.equal(button.props["aria-controls"], "filter-panel");
  assert.equal(button.props["aria-expanded"], false);
  button.props.onClick();
  tree = render();
  assert.equal(find(tree, "button")[0].props["aria-expanded"], true);
  assert.equal(find(tree, "div")[0].props.id, "filter-panel");
  assert.match(find(tree, "div")[0].props.className, /^block/);
});
