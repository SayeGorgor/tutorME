import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { getInitialWeeklyTimePage } from "../lib/initial-weekly-time-page.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript"),
  React = require("react");
const weekly = (startTime, dayOfTheWeek = 0) => ({ type: "weekly", startTime, dayOfTheWeek });

test("maps start times and exact three-hour boundaries to pages", () => {
  for (const [time, page] of [
    [0, 0],
    [360, 2],
    [540, 3],
    [810, 4],
    [900, 5],
    [1260, 7],
    [1439, 7],
  ]) {
    assert.equal(getInitialWeeklyTimePage([weekly(time)], 8), page);
  }
  for (let page = 0; page < 8; page++) {
    assert.equal(getInitialWeeklyTimePage([weekly(page * 180)], 8), page);
    if (page > 0) assert.equal(getInitialWeeklyTimePage([weekly(page * 180 - 1)], 8), page - 1);
  }
  assert.equal(getInitialWeeklyTimePage([weekly(1260)], 3), 2);
});

test("considers every weekday, ignores custom records, and leaves records unchanged", () => {
  for (let day = 0; day < 7; day++) {
    const records = Array.from({ length: 7 }, (_, index) =>
      weekly(index === day ? 360 : 900, index),
    );
    records.push({ type: "custom", startTime: 0 });
    const before = structuredClone(records);
    assert.equal(getInitialWeeklyTimePage(records, 8), 2);
    assert.deepEqual(records, before);
  }
});

test("defaults to zero without valid weekly starts", () => {
  for (const records of [
    [],
    [{ type: "custom", startTime: 360 }],
    [
      null,
      ...[undefined, null, "360", NaN, Infinity, -1, 1440, 360.5].map((value) => weekly(value)),
    ],
  ]) {
    assert.equal(getInitialWeeklyTimePage(records, 8), 0);
    assert.equal(getInitialWeeklyTimePage([...records, weekly(810)], 8), 4);
  }
});

// Execute the actual page with controlled hooks/services, matching the existing
// component tests. This exercises handlers and effect cleanup without a browser.
function harness() {
  const states = [],
    effects = [],
    requests = [];
  let cursor = 0,
    effectCursor = 0;
  const hooks = {
    ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [
        states[index],
        (value) => {
          states[index] = typeof value === "function" ? value(states[index]) : value;
        },
      ];
    },
    useEffect(callback, deps) {
      const index = effectCursor++,
        previous = effects[index];
      if (!previous || deps.some((dep, i) => dep !== previous.deps[i])) {
        previous?.cleanup?.();
        effects[index] = { deps, cleanup: callback() };
      }
    },
  };
  const source = readFileSync(new URL("../app/tutors/[id]/page.tsx", import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  const controls = () => null;
  vm.runInNewContext(js, {
    module: loaded,
    exports: loaded.exports,
    require(name) {
      if (name === "react") return hooks;
      if (name === "next/navigation") return { useRouter: () => ({ back() {} }) };
      if (name === "@/constants/constants")
        return { AVAILABILITY_TIMES: Array.from({ length: 48 }, (_, i) => String(i)), DAYS: [] };
      if (name === "@/lib/initial-weekly-time-page") return { getInitialWeeklyTimePage };
      if (name === "@/lib/subject-summary") return { subjectSummary: () => "" };
      if (name === "@/lib/api/actions/client-actions")
        return {
          getAvailabilityWeekDates: () => [],
          getTutorByUserId: (id) => new Promise((resolve) => requests.push({ id, resolve })),
        };
      if (name === "@/components/AvailabilityControls") return { default: controls };
      if (name.startsWith("@/") || name === "next/image") return { default: () => null };
      return require(name);
    },
  });
  function render(params) {
    cursor = 0;
    effectCursor = 0;
    return loaded.exports.default({ params });
  }
  return { render, requests, controls };
}
function find(tree, predicate) {
  if (!tree || typeof tree !== "object") return undefined;
  if (predicate(tree)) return tree;
  for (const child of React.Children.toArray(tree.props?.children)) {
    const found = find(child, predicate);
    if (found) return found;
  }
}
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
const profile = (startTime) => ({
  availability: [weekly(startTime)],
  user: { firstName: "Test", lastName: "Tutor" },
  subjects: [],
});
const pageOf = (tree) => find(tree, (node) => node.props?.style?.transform)?.props.style.transform;

test("manual arrows and schedule changes persist; a new tutor initializes again", async () => {
  const h = harness(),
    first = Promise.resolve({ id: 1 });
  h.render(first);
  await flush();
  h.requests[0].resolve({ data: profile(810) });
  await flush();
  let tree = h.render(first);
  assert.equal(pageOf(tree), "translateX(-400%)");
  find(tree, (node) => node.props?.["aria-label"] === "Next availability times").props.onClick();
  tree = h.render(first);
  assert.equal(pageOf(tree), "translateX(-500%)");
  find(tree, (node) => node.type === h.controls).props.onTypeChange("custom");
  assert.equal(pageOf(h.render(first)), "translateX(-500%)");
  find(h.render(first), (node) => node.type === h.controls).props.onTypeChange("weekly");
  assert.equal(pageOf(h.render(first)), "translateX(-500%)");
  find(
    h.render(first),
    (node) => node.props?.["aria-label"] === "Previous availability times",
  ).props.onClick();
  assert.equal(pageOf(h.render(first)), "translateX(-400%)");
  const second = Promise.resolve({ id: 2 });
  h.render(second);
  await flush();
  h.requests[1].resolve({ data: profile(360) });
  await flush();
  assert.equal(pageOf(h.render(second)), "translateX(-200%)");
});

test("stale tutor responses cannot override the newer tutor", async () => {
  const h = harness(),
    first = Promise.resolve({ id: 1 }),
    second = Promise.resolve({ id: 2 });
  h.render(first);
  await flush();
  h.render(second);
  await flush();
  h.requests[1].resolve({ data: profile(1260) });
  await flush();
  assert.equal(pageOf(h.render(second)), "translateX(-700%)");
  h.requests[0].resolve({ data: profile(0) });
  await flush();
  assert.equal(pageOf(h.render(second)), "translateX(-700%)");
});
