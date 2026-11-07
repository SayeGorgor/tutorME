import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { canRequestSubject, profileQuote, moneyLabel, bookingDetails } from "../lib/booking-details.ts";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

// Execute the actual TSX with controlled hooks/network, without browser/provider calls.
function loadComponent(file, mocks = {}) {
  const source = readFileSync(new URL(`../components/${file}.tsx`, import.meta.url), "utf8");
  const js = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const loaded = {exports:{}};
  const localRequire = name => name in mocks ? (typeof mocks[name] === "function" ? {default:mocks[name]} : mocks[name]) : require(name);
  vm.runInNewContext(js, {module:loaded,exports:loaded.exports,require:localRequire,Intl,Date,URLSearchParams,crypto:globalThis.crypto});
  return loaded.exports.default;
}
const detailsModule = {canRequestSubject,profileQuote,moneyLabel,bookingDetails};
const Details = loadComponent("BookingDetails", {"@/lib/booking-details":detailsModule});
test("exact decimal formatting and unsupported/missing data", () => {
  assert.equal(moneyLabel("25.10","USD"),"$25.10 USD");
  assert.equal(moneyLabel("0.10","USD"),"$0.10 USD");
  assert.equal(moneyLabel("10000.00","USD"),"$10,000.00 USD");
  for (const value of [null,undefined,"NaN","1.111","-1"]) assert.equal(moneyLabel(value,"USD"),"Not recorded");
  assert.equal(moneyLabel("25","EUR"),"Not recorded");
  assert.equal(profileQuote(25.105),null);
  assert.equal(profileQuote(25.1),"25.1");
});
test("stored snapshots render consistently across statuses and never read current tutor rate", () => {
  const booking={subjectNameSnapshot:"SAT Math",hourlyRateSnapshot:"25.10",sessionAmountSnapshot:"25.10",currencySnapshot:"USD",durationMinutesSnapshot:60,price:35};
  for (const status of ["pending","confirmed","declined","cancelled","completed","expired"]) {
    const markup=renderToStaticMarkup(React.createElement(Details,{booking:{...booking,status}}));
    assert.match(markup,/SAT Math/);assert.match(markup,/60 minutes/);assert.match(markup,/25.10 USD/);assert.doesNotMatch(markup,/35/);
    assert.match(markup,status==="confirmed"||status==="completed"?/Accepted rate/:/Quoted rate/);
  }
});
test("legacy render explicitly identifies missing subject duration and prices", () => {
  const markup=renderToStaticMarkup(React.createElement(Details,{booking:{status:"confirmed"}}));
  assert.equal((markup.match(/Not recorded/g)||[]).length,4);
});
function harness(subjects = [{id:7,name:"Math"},{id:8,name:"English"}]) {
  const states=[], refs=[];let cursor=0, refCursor=0;
  const hookReact={...React,useEffect:()=>{},useRef:value=>{const i=refCursor++;return refs[i] ||= {current:value};},useState:initial=>{
    const i=cursor++;if(!(i in states))states[i]=typeof initial==="function"?initial():initial;
    // The policies state is the fifth hook: keep all other real initial values.
    if(states[i]===null && i===4)states[i]={bookingsEnabled:true};
    return [states[i],value=>{states[i]=typeof value==="function"?value(states[i]):value;}];
  }};
  const requests=[];let response={data:{id:"one",status:"pending"}};
  const Component=loadComponent("BookingRequest", {react:hookReact,"next/link":({children})=>children,"@/lib/booking-details":detailsModule,"./BookingDetails":Details,"./BookingNotice":()=>null,"@/lib/api/api-helper":{apiFetch:async()=>({data:{slots:["2030-01-01T12:00:00Z"]}})},"@/lib/api/authorized":{authorized:async(...args)=>{requests.push(args);return response;}}});
  const tutor={id:1,userId:1,price:25.1,subjects,onlineEnabled:true,inPersonEnabled:true,user:{firstName:"Test",lastName:"Tutor"}};
  const render=()=>{cursor=0;refCursor=0;return Component({tutor});};
  function nodes(tree, type) {const result=[];function walk(node){if(!node||typeof node!=="object")return;if(node.type===type)result.push(node);React.Children.forEach(node.props?.children,walk);}walk(tree);return result;}
  return {render,nodes,requests,setResponse:value=>response=value};
}
test("actual booking form requires tutor subject, retains it across date/format/time changes, submits compare-only rate",async()=>{
  const h=harness();let tree=h.render();
  const selects=h.nodes(tree,"select");assert.equal(selects[0].props.required,true);
  assert.deepEqual(h.nodes(selects[0],"option").map(node=>String(node.props.value)),["","7","8"]);
  let submit=()=>h.nodes(h.render(),"button").find(node=>node.props.children==="Submit booking request");
  assert.equal(submit().props.disabled,true);
  const markup=renderToStaticMarkup(tree);
  assert.match(markup,/What subject do you need help with/);assert.match(markup,/Review your session/);
  assert.match(markup,/60 minutes/);assert.match(markup,/25.10 USD/);assert.match(markup,/sm:grid-cols-2/);
  selects[0].props.onChange({target:{value:"7"}});
  h.nodes(h.render(),"input")[0].props.onChange({target:{value:"2030-01-01"}});
  h.nodes(h.render(),"select")[1].props.onChange({target:{value:"in-person"}});
  assert.equal(h.nodes(h.render(),"select")[0].props.value,"7");
  await h.nodes(h.render(),"button").find(node=>node.props.children==="Check times").props.onClick();
  h.nodes(h.render(),"select")[2].props.onChange({target:{value:"2030-01-01T12:00:00Z"}});
  assert.equal(submit().props.disabled,false);
  await submit().props.onClick();
  const body=h.requests[0][2];assert.equal(body.subjectId,7);assert.equal(body.expectedHourlyRate,"25.1");assert.equal(body.mode,"in-person");assert.equal("sessionAmountSnapshot" in body,false);
  assert.equal(h.nodes(h.render(),"select")[0].props.value,"7");
});
test("empty subjects disable booking and stale quote blocks submission until refresh",async()=>{
  const empty=harness([]);assert.equal(empty.nodes(empty.render(),"select")[0].props.disabled,true);
  assert.equal(canRequestSubject([],"7"),false);assert.equal(canRequestSubject([{id:7}],"8"),false);
  const h=harness();h.nodes(h.render(),"select")[0].props.onChange({target:{value:"7"}});
  h.nodes(h.render(),"input")[0].props.onChange({target:{value:"2030-01-01"}});
  await h.nodes(h.render(),"button").find(node=>node.props.children==="Check times").props.onClick();
  h.nodes(h.render(),"select")[2].props.onChange({target:{value:"2030-01-01T12:00:00Z"}});
  h.setResponse({error:{code:"QUOTE_CHANGED",message:"Refresh quote"}});
  await h.nodes(h.render(),"button").find(node=>node.props.children==="Submit booking request").props.onClick();
  assert.equal(h.nodes(h.render(),"button").find(node=>node.props.children==="Submit booking request").props.disabled,true);
});

test("actual form disables inputs during a request and restores them after a general error",async()=>{
  const h=harness();h.nodes(h.render(),"select")[0].props.onChange({target:{value:"7"}});
  h.nodes(h.render(),"input")[0].props.onChange({target:{value:"2030-01-01"}});
  await h.nodes(h.render(),"button").find(node=>node.props.children==="Check times").props.onClick();
  h.nodes(h.render(),"select")[2].props.onChange({target:{value:"2030-01-01T12:00:00Z"}});
  let finish;h.setResponse(new Promise(resolve=>{finish=resolve;}));
  const request=h.nodes(h.render(),"button").find(node=>node.props.children==="Submit booking request").props.onClick();
  assert.equal(h.nodes(h.render(),"select").every(node=>node.props.disabled),true);
  assert.equal(h.nodes(h.render(),"button").find(node=>node.props.children==="Please wait...").props.disabled,true);
  finish({error:{message:"Please retry"}});await request;
  assert.equal(h.nodes(h.render(),"button").find(node=>node.props.children==="Submit booking request").props.disabled,false);
});
