import { test } from "node:test";
import assert from "node:assert/strict";
import { createAuthAttempt } from "../lib/auth/form-attempt.ts";

test("returned duplicate permits a corrected signup on the same runner", async () => {
  const attempt=createAuthAttempt();let calls=0;
  const first=await attempt(async()=>{calls++;return {error:{status:409,code:"ACCOUNT_ALREADY_EXISTS"}};},"signup");
  assert.equal(first.kind,"error");assert.match(first.message,/already exists/);
  const next=await attempt(async()=>{calls++;return {data:{user:{email:"different@example.test"}}};},"signup");
  assert.equal(next.kind,"success");assert.equal(next.data.user.email,"different@example.test");assert.equal(calls,2);
});
test("thrown duplicate does not permanently lock the signup runner", async () => {
  const attempt=createAuthAttempt();
  const result=await attempt(async()=>{throw {status:409,body:{code:"ACCOUNT_ALREADY_EXISTS"}};},"signup");
  assert.equal(result.kind,"error");assert.match(result.message,/Please sign in/);
  assert.equal((await attempt(async()=>({data:{user:{id:"synthetic"}}}),"signup")).kind,"success");
});
test("validation, throttling and unavailable service errors all allow retry", async () => {
  for(const error of [{status:400,message:"Password is too short"},{status:422,message:"Invalid email"},{status:429,message:"Please try later"},{status:503,message:"private server diagnostic"},new TypeError("private network diagnostic")]) {
    const attempt=createAuthAttempt();
    const result=await attempt(async()=>{throw error;},"signup");assert.equal(result.kind,"error");assert.ok(!result.message.includes("private"));
    assert.equal((await attempt(async()=>({data:{user:{id:"synthetic"}}}),"signup")).kind,"success");
  }
});
test("wrong-password errors recover on the next login attempt", async () => {
  const attempt=createAuthAttempt();
  const failed=await attempt(async()=>({error:{status:401,code:"INVALID_EMAIL_OR_PASSWORD"}}),"login");
  assert.equal(failed.kind,"error");assert.match(failed.message,/email or password is incorrect/);
  assert.equal((await attempt(async()=>({data:{session:{id:"synthetic"}}}),"login")).kind,"success");
});
test("verification-required login stays actionable and retryable", async () => {
  const attempt=createAuthAttempt();
  const failed=await attempt(async()=>{throw {body:{code:"EMAIL_NOT_VERIFIED"},status:403};},"login");
  assert.match(failed.message,/verify your email/);
  assert.equal((await attempt(async()=>({data:{session:{id:"synthetic"}}}),"login")).kind,"success");
});
test("rapid submits invoke the provider only once and release after success", async () => {
  const attempt=createAuthAttempt();let release;let calls=0;
  const first=attempt(()=>{calls++;return new Promise(resolve=>{release=resolve;});},"signup");
  assert.equal((await attempt(async()=>{calls++;return {data:{}};},"signup")).kind,"busy");
  assert.equal(calls,1);release({data:{user:{id:"synthetic"}}});assert.equal((await first).kind,"success");
  assert.equal((await attempt(async()=>({data:{}}),"signup")).kind,"success");
});
test("missing response data is an error that does not retain the lock", async () => {
  const attempt=createAuthAttempt();assert.equal((await attempt(async()=>({data:null}),"login")).kind,"error");
  assert.equal((await attempt(async()=>({data:{session:{id:"synthetic"}}}),"login")).kind,"success");
});
