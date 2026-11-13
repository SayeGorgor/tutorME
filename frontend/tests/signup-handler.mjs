import { test } from "node:test";
import assert from "node:assert/strict";
import { createSignupHandler } from "../lib/auth/signup-handler.ts";
const request = (path = "sign-up/email") =>
  new Request(`https://example.test/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "synthetic@example.test", adultConfirmed: true }),
  });
test("duplicate rejection never invokes provider/mail path", async () => {
  let providerCalls = 0;
  const post = createSignupHandler(
    async () => {
      providerCalls++;
      return new Response();
    },
    async () => new Response(null, { status: 409 }),
  );
  const result = await post(request());
  assert.equal(result.status, 409);
  assert.equal(providerCalls, 0);
  assert.equal((await result.json()).code, "ACCOUNT_ALREADY_EXISTS");
});
test("backend failure and timeout fail closed", async () => {
  for (const check of [
    async () => new Response(null, { status: 503 }),
    async () => {
      throw new Error("private");
    },
  ]) {
    const post = createSignupHandler(async () => {
      assert.fail("Provider must not receive signup");
    }, check);
    const result = await post(request());
    assert.equal(result.status, 503);
    assert.ok(!(await result.text()).includes("private"));
  }
});
test("new signup forwards original request and body exactly once", async () => {
  const input = request();
  let calls = 0;
  const post = createSignupHandler(
    async (incoming) => {
      calls++;
      assert.equal(incoming, input);
      assert.equal((await incoming.json()).email, "synthetic@example.test");
      return new Response(null, { status: 201 });
    },
    async (body) => {
      assert.equal(body.email, "synthetic@example.test");
      return new Response();
    },
  );
  assert.equal((await post(input)).status, 201);
  assert.equal(calls, 1);
});
test("explicit verification and sign-in bypass signup check", async () => {
  for (const path of ["email-otp/send-verification-otp", "sign-in/email"]) {
    let calls = 0;
    const post = createSignupHandler(
      async () => {
        calls++;
        return new Response();
      },
      async () => {
        assert.fail("Not signup");
      },
    );
    assert.equal((await post(request(path))).status, 200);
    assert.equal(calls, 1);
  }
});
