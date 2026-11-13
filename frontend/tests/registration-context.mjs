import { test } from "node:test";
import assert from "node:assert/strict";
import {
  signupDraft,
  sealDraft,
  openDraft,
  draftForIdentity,
  retainSignupDraft,
  DRAFT_COOKIE,
} from "../lib/auth/registration-draft.ts";
import { completionPlan } from "../lib/auth/completion-plan.ts";
import { createSignupHandler } from "../lib/auth/signup-handler.ts";

const secret = "synthetic-test-cookie-secret-never-used-outside-tests";
const now = 1800000000000;
const body = {
  email: "synthetic@example.test",
  firstName: "Mary Ann",
  lastName: "O'Neill",
  name: "Mary Ann O'Neill",
  accountType: "tutor",
  accountPurpose: "tutor",
  timezone: "UTC",
  adultConfirmed: true,
  termsAccepted: true,
  termsVersion: "current",
  password: "never-retain-this",
};
const user = { id: "synthetic-subject", email: body.email, name: body.name };
const request = () =>
  new Request("https://example.test/api/auth/sign-up/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

test("encrypted draft retains original split name, role and acknowledgments without credentials", () => {
  const draft = signupDraft(body, user, now);
  assert.ok(draft);
  const encrypted = sealDraft(draft, secret);
  assert.ok(!encrypted.includes(body.email));
  const restored = openDraft(encrypted, secret, now + 1000);
  assert.deepEqual(restored, draft);
  assert.equal(restored.password, undefined);
  assert.equal(restored.token, undefined);
  const plan = completionPlan(user.name, restored, "current");
  assert.equal(plan.firstName, "Mary Ann");
  assert.equal(plan.lastName, "O'Neill");
  assert.equal(plan.role, "tutor");
  assert.equal(plan.acceptanceCurrent, true);
});
test("student and guardian account choices survive signup and verification", () => {
  for (const accountPurpose of ["self", "guardian"]) {
    const draft = signupDraft({ ...body, accountType: "student", accountPurpose }, user, now);
    const plan = completionPlan(
      user.name,
      openDraft(sealDraft(draft, secret), secret, now),
      "current",
    );
    assert.equal(plan.role, "student");
    assert.equal(plan.accountPurpose, accountPurpose);
  }
});
test("draft cannot be used by another subject, email or registered name", () => {
  const draft = signupDraft(body, user, now);
  assert.deepEqual(draftForIdentity(draft, user), draft);
  for (const changed of [
    { id: "another-subject" },
    { email: "another@example.test" },
    { name: "Changed Name" },
  ])
    assert.equal(draftForIdentity(draft, { ...user, ...changed }), null);
});
test("tampering, secret rotation, expired and future receipts fail closed", () => {
  const draft = signupDraft(body, user, now);
  const sealed = sealDraft(draft, secret);
  const bytes = Buffer.from(sealed, "base64url");
  bytes[30] ^= 1;
  assert.equal(openDraft(bytes.toString("base64url"), secret, now), null);
  assert.equal(openDraft(sealed, "other-synthetic-secret-with-more-than-32-chars", now), null);
  assert.equal(openDraft(sealed, secret, now + 7 * 86400 * 1000 + 1), null);
  assert.equal(openDraft(sealed, secret, now - 1), null);
});
test("invalid roles, mismatched names and missing acknowledgment cannot create receipts", () => {
  for (const changed of [
    { accountType: "admin" },
    { accountType: "student" },
    { adultConfirmed: false },
    { termsAccepted: false },
    { timezone: "bad-zone" },
    { firstName: "Changed" },
  ])
    assert.equal(signupDraft({ ...body, ...changed }, user, now), null);
});
test("new Terms only requests new acceptance while keeping names and account type", () => {
  const plan = completionPlan(user.name, signupDraft(body, user, now), "updated");
  assert.equal(plan.acceptanceCurrent, false);
  assert.equal(plan.role, "tutor");
  assert.equal(plan.firstName, "Mary Ann");
});
test("missing receipt keeps the verified name and asks only for missing choices", () => {
  const plan = completionPlan("Registered Person", null, "current");
  assert.equal(plan.firstName, "Registered");
  assert.equal(plan.lastName, "Person");
  assert.equal(plan.role, null);
  assert.equal(plan.acceptanceCurrent, false);
  assert.equal(completionPlan("SingleName", null, "current").lastName, "");
});
test("foreign-name receipts never override the verified name or account type", () => {
  const plan = completionPlan("Different Person", signupDraft(body, user, now), "current");
  assert.equal(plan.firstName, "Different");
  assert.equal(plan.role, null);
  assert.equal(plan.acceptanceCurrent, false);
});
test("successful provider response retains HttpOnly receipt and original session cookies", async () => {
  const original = new Response(JSON.stringify({ user }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "provider-session=synthetic; HttpOnly",
    },
  });
  const response = await retainSignupDraft(body, original, secret, true);
  const cookies = response.headers.getSetCookie();
  assert.equal(cookies.length, 2);
  assert.ok(cookies.some((value) => value.startsWith("provider-session=")));
  const cookie = cookies.find((value) => value.startsWith(DRAFT_COOKIE + "="));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.deepEqual(await response.json(), { user });
});
test("rejected signup never saves a receipt; successful signup saves one", async () => {
  let retained = 0;
  for (const status of [409, 201]) {
    const post = createSignupHandler(
      async () => new Response(JSON.stringify({ user }), { status }),
      async () => new Response(),
      async (b, response) => {
        retained++;
        return retainSignupDraft(b, response, secret, true);
      },
    );
    const response = await post(request());
    assert.equal(response.status, status);
    assert.equal(response.headers.has("Set-Cookie"), status === 201);
  }
  assert.equal(retained, 1);
});
test("receipt failures preserve successful signup for minimal verified-name recovery", async () => {
  const response = await retainSignupDraft(
    body,
    new Response(JSON.stringify({ user })),
    "too-short",
    true,
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.has("Set-Cookie"), false);
});
