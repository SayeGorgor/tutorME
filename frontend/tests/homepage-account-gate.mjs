import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
const require = createRequire(import.meta.url), ts = require("typescript"), React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
function load(path, mocks) {
  const source = readFileSync(new URL("../" + path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(js, { module: loaded, exports: loaded.exports, URLSearchParams, setTimeout, clearTimeout, require: name => mocks[name] ?? require(name) });
  return loaded.exports.default;
}
const Link = ({href, children, ...props}) => React.createElement("a", {href, ...props}, children);
test("homepage navbar renders public desktop/mobile links without reading session; other routes retain session loading", () => {
  let pathname = "/", sessions = 0;
  const Nav = load("components/LandingNav.tsx", {
    "next/link": { default: Link },
    "next/navigation": { usePathname: () => pathname, useRouter: () => ({}) },
    "@/lib/auth/client": { authClient: { useSession: () => { sessions++; return {isPending:true}; } } },
    "@/lib/api/actions/client-actions": { getCurrentUser: () => { throw Error("unexpected lookup"); } },
    "./MobileMenu": { default: ({children}) => React.createElement("details", null, children) },
    "./TutorMELogo": { default: () => "TutorME" }
  });
  const html = renderToStaticMarkup(React.createElement(Nav));
  for (const text of ["How it works", "Become a tutor", "Log in", "Get started"]) assert.ok(html.includes(text));
  assert.ok(html.includes("<details")); assert.ok(!html.includes("Loading account")); assert.equal(sessions, 0);
  for (pathname of ["/tutors", "/tutors/1", "/login", "/signup"]) {
    assert.match(renderToStaticMarkup(React.createElement(Nav)), /Loading account/);
  }
  assert.equal(sessions, 4);
});
test("server gate handles signed-out, valid, expired and failed sessions without exposing session data", async () => {
  let result, thrown = false;
  const Content = () => null, Gate = () => null;
  const Page = load("app/(landing)/page.tsx", {
    "@/lib/auth/server": {auth:{getSession:async()=>{if(thrown) throw Error("private"); return result;}}},
    "./LandingContent": {default:Content},
    "@/components/HomepageAccountGate": {default:Gate}
  });
  for (result of [{data:null}, {data:{session:null,user:null}}]) assert.equal((await Page()).type, Content);
  result={data:{session:{id:"secret"},user:{id:"secret"}}};
  assert.equal((await Page()).type, Gate); assert.deepEqual(Object.keys((await Page()).props), []);
  result={error:{message:"private"}}; assert.equal((await Page()).props.sessionError,true);
  thrown=true; assert.equal((await Page()).props.sessionError,true);
});
async function runGate(response, {reject=false, cancel=false}={}) {
  let effect, cleanup, pending, resolve, state="", redirects=[];
  const router={replace:path=>redirects.push(path)};
  const Gate=load("components/HomepageAccountGate.tsx", {
    react:{useState:initial=>[initial,value=>{state=value;}],useEffect:fn=>{effect=fn;}},
    "next/link":{default:Link}, "next/navigation":{useRouter:()=>router},
    "@/lib/api/registration":{getRegistrationStatus:()=>pending=new Promise(done=>{resolve=done;})}
  });
  Gate({}); cleanup=effect();
  if(cancel) cleanup();
  if(reject) resolve(Promise.reject(Error("network"))); else resolve(response);
  await pending.catch(()=>{}); await new Promise(done=>setImmediate(done)); cleanup();
  return {state,redirects};
}
test("authoritative registration statuses use replace with safe destinations",async()=>{
  for(const [data,path] of [
    [{status:"complete",role:"student"},"/student/dashboard"],
    [{status:"complete",role:"tutor"},"/tutor/dashboard"],
    [{status:"complete",role:"admin"},"/account/settings"],
    [{status:"needs_completion"},"/complete-registration"],
    [{status:"EMAIL_VERIFICATION_REQUIRED"},"/verify-email"],
    [{status:"PROVIDER_NAME_UNAVAILABLE"},"/complete-registration"],
    [{status:"PROVIDER_EMAIL_UNAVAILABLE"},"/complete-registration"]
  ]) assert.deepEqual((await runGate({data})).redirects,[path]);
});
test("failed, expired and unknown accounts remain retryable without dashboard fallback",async()=>{
  for(const response of [{error:{status:500}},{error:{status:401}},{data:{status:"complete",role:"unknown"}},{data:{status:"complete"}},{}]) {
    const result=await runGate(response);assert.deepEqual(result.redirects,[]);assert.match(result.state,/retry/i);
  }
  assert.match((await runGate({}, {reject:true})).state,/retry/i);
});
test("unmounted and Strict Mode discarded requests cannot navigate",async()=>{
  assert.deepEqual((await runGate({data:{status:"complete",role:"tutor"}},{cancel:true})).redirects,[]);
  assert.deepEqual((await runGate({data:{status:"complete",role:"student"}})).redirects,["/student/dashboard"]);
});
test("interactive landing content retains search dependencies",()=>{
  const source=readFileSync(new URL("../app/(landing)/LandingContent.tsx",import.meta.url),"utf8");
  assert.match(source,/router.push/); assert.match(source,/ServiceAreaPicker/);assert.match(source,/getSubjects/);
});

function find(tree, predicate) {
  const found=[];
  function walk(node) { if(!node || typeof node!=="object") return; if(predicate(node)) found.push(node); React.Children.forEach(node.props?.children, walk); }
  walk(tree); return found;
}
test("landing search submits subject/mode/location and validates in-person area",()=>{
  const values=["Algebra",[],null,"in-person",false,null], pushed=[];
  let index=0, error;
  const Content=load("app/(landing)/LandingContent.tsx",{
    react:{useState:()=>{const current=index++;return [values[current],value=>{if(current===5)error=value;}];},useRef:()=>({current:null}),useEffect:()=>{},useLayoutEffect:()=>{}},
    "next/navigation":{useRouter:()=>({push:path=>pushed.push(path)})},
    "next/link":{default:Link},"./landing.module.css":{default:{}},
    "@/lib/api/actions/client-actions":{getSubjects:async()=>({data:[]})},
    "@/components/ServiceAreaPicker":{default:()=>null}
  });
  function submit(){index=0;const tree=Content();find(tree,node=>node.type==="form")[0].props.onSubmit({preventDefault(){}});}
  submit();assert.equal(pushed.length,0);assert.match(error,/Choose a city/);
  values[2]={id:"area-1"};submit();assert.equal(pushed[0],"/tutors?mode=in-person&subject=Algebra&areaId=area-1");
  values[3]="online";submit();assert.equal(pushed[1],"/tutors?mode=online&subject=Algebra");
});
test("successful logout replaces homepage and refreshes server session; failed logout stays put",async()=>{
  for(const failed of [false,true]){
    let effect;const navigations=[],router={replace:path=>navigations.push(path),refresh:()=>navigations.push("refresh")};
    const Nav=load("components/LandingNav.tsx",{
      react:{useState:initial=>[initial,()=>{}],useEffect:fn=>{effect=fn;}},
      "next/navigation":{usePathname:()=>"/tutors",useRouter:()=>router},
      "next/link":{default:Link},"./MobileMenu":{default:()=>null},"./TutorMELogo":{default:()=>null},
      "@/lib/auth/client":{authClient:{useSession:()=>({data:{user:{id:"synthetic"}}}),signOut:async()=>failed?{error:true}:{}}},
      "@/lib/api/actions/client-actions":{getCurrentUser:async()=>({data:{role:"student"}})}
    });
    const tree=Nav().type();assert.equal(typeof effect,"function");
    await find(tree,node=>node.type==="button" && node.props.children==="Log out")[0].props.onClick();
    assert.deepEqual(navigations,failed?[]:["/","refresh"]);
  }
});

