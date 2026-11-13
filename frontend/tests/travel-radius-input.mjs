import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
const require = createRequire(import.meta.url),
  ts = require("typescript"),
  React = require("react");
function harness() {
  let cursor = 0;
  const states = [],
    requests = [];
  const source = readFileSync(
    new URL("../components/TutorLocationSettings.tsx", import.meta.url),
    "utf8",
  );
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  const mocks = {
    react: {
      useState(initial) {
        const i = cursor++;
        if (!(i in states)) states[i] = initial;
        return [
          states[i],
          (value) => {
            states[i] = value;
          },
        ];
      },
    },
    "./ServiceAreaPicker": { default: () => null },
    "./SubjectsYouTeach": { default: () => null },
    "@/lib/api/authorized": {
      authorized: async (...args) => {
        requests.push(args);
        return { data: {} };
      },
    },
  };
  vm.runInNewContext(js, {
    module: loaded,
    exports: loaded.exports,
    require: (name) => mocks[name] || require(name),
  });
  const tutor = {
    userId: 1,
    onlineEnabled: true,
    inPersonEnabled: true,
    serviceArea: { id: "synthetic" },
    travelRadiusMiles: 25,
  };
  const render = () => {
    cursor = 0;
    return loaded.exports.default({ tutor, onSaved() {} });
  };
  const find = (type) => {
    const found = [];
    function walk(node) {
      if (!node || typeof node !== "object") return;
      if (node.type === type) found.push(node);
      React.Children.forEach(node.props?.children, walk);
    }
    walk(render());
    return found;
  };
  const change = (value) =>
    find("input")
      .find((node) => node.props.type === "number")
      .props.onChange({ target: { value } });
  const submit = () => find("form")[0].props.onSubmit({ preventDefault() {} });
  find("input")
    .at(-1)
    .props.onChange({ target: { checked: true } });
  return { find, change, submit, requests };
}
test("travel radius can be cleared and retyped without rendering NaN; save sends a number", async () => {
  const h = harness();
  h.change("");
  assert.equal(h.find("input").find((node) => node.props.type === "number").props.value, "");
  await h.submit();
  assert.equal(h.requests.length, 0);
  h.change("40");
  await h.submit();
  assert.equal(h.requests[0][2].travelRadiusMiles, 40);
});
test("empty/nonfinite/out-of-range values never reach the API; zero is valid", async () => {
  const h = harness();
  for (const value of ["", "-1", "101", "Infinity", "not-a-number"]) {
    h.change(value);
    await h.submit();
  }
  assert.equal(h.requests.length, 0);
  h.change("0");
  await h.submit();
  assert.equal(h.requests[0][2].travelRadiusMiles, 0);
});
test("switching to online-only after clearing the field retains the saved radius", async () => {
  const h = harness();
  h.change("");
  h.find("input")[1].props.onChange({ target: { checked: false } });
  await h.submit();
  assert.equal(h.requests[0][2].travelRadiusMiles, 25);
});
