import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
const require = createRequire(import.meta.url), ts = require("typescript"), React = require("react");

function emptyList(user, compact) {
  let index = 0;
  const source = readFileSync(new URL("../components/BookingList.tsx", import.meta.url), "utf8");
  const js = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const loaded = {exports:{}};
  const mocks = {
    react: {useEffect(){},useState(initial){ const value = index++ === 2 ? false : initial; return [value,()=>{}]; }},
    "next/link": {default: function SyntheticLink(){return null;}},
    "@/lib/context/UserContext": {useCurrentUser:()=>({user})},
    "@/lib/api/authorized": {authorized:async()=>({data:[]})},
    "@/lib/booking-status": {bookingDisplayStatus:()=>"pending"},
    "./BookingDetails": {default:()=>null},
    "./BookingNotice": {default:()=>null},
  };
  vm.runInNewContext(js,{module:loaded,exports:loaded.exports,require:name=>mocks[name]||require(name)});
  const tree=loaded.exports.default({compact});
  const discovery=[];
  function walk(node){if(!node||typeof node!=="object")return;if(node.props?.href==="/tutors")discovery.push(node);React.Children.forEach(node.props?.children,walk);}
  walk(tree);return discovery;
}
test("tutor dashboards and session lists do not offer tutor discovery",()=>{
  for(const compact of [true,false])assert.equal(emptyList({role:"tutor"},compact).length,0);
});
test("adult student and parent accounts retain tutor discovery",()=>{
  for(const compact of [true,false])for(const accountPurpose of ["self","guardian"])
    assert.equal(emptyList({role:"student",accountPurpose},compact).length,1);
});
test("unresolved accounts do not briefly display the student-only action",()=>{
  assert.equal(emptyList(null,true).length,0);
});
