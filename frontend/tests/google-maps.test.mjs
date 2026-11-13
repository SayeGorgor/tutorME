import { test } from "node:test";
import assert from "node:assert/strict";
let sequence = 0;
async function loader() {
  return import(`../lib/google-maps.ts?test=${++sequence}`);
}
function browser() {
  const scripts = [];
  globalThis.window = { setTimeout, dispatchEvent() {} };
  globalThis.document = {
    createElement: () => ({}),
    head: { appendChild: (script) => scripts.push(script) },
  };
  return scripts;
}
test("missing key rejects without inserting Google script", async () => {
  const scripts = browser();
  delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const maps = await loader();
  await assert.rejects(maps.loadGoogleMaps(), /not configured/);
  assert.equal(scripts.length, 0);
});
test("imports only requested libraries and shares bootstrap across concurrent consumers", async () => {
  const scripts = browser();
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "synthetic-test-key";
  const maps = await loader();
  const requested = [];
  const places = maps.googleLibrary("places");
  const second = maps.loadGoogleMaps();
  assert.equal(scripts.length, 1);
  assert.ok(!scripts[0].src.includes("libraries=maps"));
  window.google = {
    maps: {
      importLibrary: async (name) => {
        requested.push(name);
        return { name };
      },
    },
  };
  window.tutorMEMapsReady();
  assert.deepEqual(await places, { name: "places" });
  await second;
  assert.deepEqual(requested, ["places"]);
  await maps.googleLibrary("marker");
  assert.deepEqual(requested, ["places", "marker"]);
  assert.equal(scripts.length, 1);
});
test("script network errors reject gracefully", async () => {
  const scripts = browser();
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "synthetic-test-key";
  const maps = await loader();
  const promise = maps.loadGoogleMaps();
  scripts[0].onerror();
  await assert.rejects(promise, /could not load/);
});
test("authentication errors reject and preserve previous authentication handler", async () => {
  browser();
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "synthetic-invalid-key";
  let called = false;
  window.gm_authFailure = () => {
    called = true;
  };
  const maps = await loader();
  const promise = maps.loadGoogleMaps();
  window.gm_authFailure();
  await assert.rejects(promise, /could not load/);
  assert.equal(called, true);
});
