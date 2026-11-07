import { test } from "node:test";
import assert from "node:assert/strict";
import { createAuthenticatedRequest } from "../lib/api/authenticated-request.ts";
const jwt="syntheticHeader.syntheticPayload.syntheticSignature";
test("missing and opaque tokens never produce a backend Authorization header",async()=>{
 for(const token of [undefined,null,"","undefined","null","opaque-session-token",{},"a.b","a..c"]){
  let requests=0;const calls=[];
  const api=createAuthenticatedRequest(async fresh=>{calls.push(fresh);return {data:{token}};},async()=>{requests++;return {data:{}};});
  const result=await api("/api/users/me");assert.equal(result.error.status,401);assert.equal(requests,0);assert.deepEqual(calls,[false,true]);
 }
});
test("fresh token retrieval recovers initial SDK/session timing failures",async()=>{
 const calls=[];const api=createAuthenticatedRequest(async fresh=>{calls.push(fresh);return fresh?{data:{token:jwt}}:{data:null};},async(path,options)=>{
  assert.equal(path,"/api/users/me");assert.equal(options.headers.Authorization,`Bearer ${jwt}`);return {data:{role:"student"}};
 });
 assert.equal((await api("/api/users/me")).data.role,"student");assert.deepEqual(calls,[false,true]);
});
test("valid token preserves request method/body without retries or mutation replay",async()=>{
 let tokenCalls=0;let requests=0;
 const api=createAuthenticatedRequest(async()=>{tokenCalls++;return {data:{token:jwt}};},async(path,options)=>{requests++;assert.equal(options.method,"PATCH");assert.deepEqual(options.body,{price:20});return {error:{status:409,message:"conflict"}};});
 assert.equal((await api("/profile","PATCH",{price:20})).error.status,409);assert.equal(tokenCalls,1);assert.equal(requests,1);
});
test("concurrent user/profile lookups share pending token retrieval",async()=>{
 let release;let tokenCalls=0;let requests=0;
 const api=createAuthenticatedRequest(()=>{tokenCalls++;return new Promise(resolve=>{release=resolve;});},async()=>{requests++;return {data:{}};});
 const one=api("/one");const two=api("/two");release({data:{token:jwt}});await Promise.all([one,two]);assert.equal(tokenCalls,1);assert.equal(requests,2);
});
test("thrown provider errors allow recovery and never print or forward raw errors",async()=>{
 const api=createAuthenticatedRequest(async()=>{throw new Error("synthetic-private-error");},async()=>assert.fail("No JWT, no backend request"));
 const result=await api("/api/users/me");assert.equal(result.error.code,"AUTH_TOKEN_UNAVAILABLE");assert.ok(!JSON.stringify(result).includes("synthetic-private-error"));
});
