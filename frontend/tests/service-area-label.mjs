import { test } from "node:test";
import assert from "node:assert/strict";
import { areaLabel } from "../lib/service-area-label.ts";
const area = {
  id: "census-2025-place-1304000",
  name: "Atlanta city",
  region: "GA",
  country: "US",
  postalCode: null,
};
test("all area surfaces use the API label while preserving raw data", () => {
  const input = { ...area, displayName: "Atlanta", displayLabel: "Atlanta, GA" };
  assert.equal(areaLabel(input), "Atlanta, GA");
  assert.equal(input.name, "Atlanta city");
});
test("ZIP fallback includes known region or country without invented state", () => {
  assert.equal(
    areaLabel({ ...area, name: "ZIP area 00123", postalCode: "00123", region: "" }),
    "00123, US",
  );
  assert.equal(areaLabel({ ...area, postalCode: "00123", region: "PR" }), "00123, PR");
});
test("legacy payload fallback does not guess Census normalization", () => {
  assert.equal(areaLabel(area), "Atlanta city, GA");
});
