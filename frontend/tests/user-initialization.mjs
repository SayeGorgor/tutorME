import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { initialAccountState, loadAccount } from "../lib/context/account-state.ts";

const require = createRequire(import.meta.url), ts = require("typescript"), React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const fixture = (role = "student", id = 1) => ({ id, firstName: id === 1 ? "Alex" : "Jordan", lastName: "Example", role, email: "synthetic@example.test", timezone: "UTC" });
const flush = () => new Promise(resolve => setImmediate(resolve));
function load(path, mocks) {
  const source = readFileSync(new URL("../" + path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(js, {module: loaded, exports: loaded.exports, require: name => mocks[name] ?? require(name)});
  return loaded.exports;
}
function providerHarness() {
  let pathname = "/student/dashboard", session = {data:{user:{id:"subject-a"}},isPending:false}, refs = [], cursor = 0, effectCursor = 0, effects = [], key, component;
  let latest, writes = 0, refetches = 0;
  const requests = [];
  const hooks = {
    createContext: () => ({Provider: Symbol("Provider")}),
    useContext: () => latest,
    useState(initial) {
      const index = cursor++, slots = refs;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], value => { writes++; slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in refs)) refs[index] = {current:initial};
      return refs[index];
    },
    useEffect(setup, deps) {
      const index = effectCursor++, previous = effects[index];
      if (!previous || deps.some((dep,i) => !Object.is(dep,previous.deps[i]))) {
        previous?.cleanup?.();
        effects[index] = {setup,deps,cleanup:setup()};
      }
    }
  };
  const exports = load("lib/context/UserContext.tsx", {
    react:hooks,
    "next/navigation":{usePathname:()=>pathname},
    "@/lib/auth/client":{authClient:{useSession:()=>({...session,refetch:async()=>{refetches++;}})}},
    "@/lib/api/actions/client-actions":{getCurrentUser:()=>new Promise((resolve,reject)=>requests.push({resolve,reject}))},
    "./account-state":{initialAccountState,loadAccount}
  });
  function dispose(){effects.forEach(effect=>effect.cleanup?.());effects=[];}
  return {
    requests,
    render(){
      const outer=exports.UserProvider({children:"protected content"});
      if(typeof outer.type === "function"){
        if(key!==outer.key || component!==outer.type){dispose();refs=[];key=outer.key;component=outer.type;}
        cursor=effectCursor=0;
        latest=outer.type(outer.props).props.value;
      } else {dispose();key=component=undefined;refs=[];latest=outer.props.value;}
      return latest;
    },
    replay(){effects.forEach(effect=>{effect.cleanup?.();effect.cleanup=effect.setup();});},
    path(value){pathname=value;},
    session(value){session=value;},
    dispose,
    get writes(){return writes;},
    get refetches(){return refetches;}
  };
}
test("student and tutor initialization stays loading until valid account data arrives", async()=>{
  for(const role of ["student","tutor"]){
    const h=providerHarness();assert.equal(h.render().status,"loading");assert.equal(h.render().user,null);
    assert.equal(h.requests.length,1);
    h.requests[0].resolve({data:fixture(role)});await flush();
    const account=h.render();assert.equal(account.status,"ready");assert.equal(account.user.firstName,"Alex");assert.equal(account.user.role,role);assert.equal(account.loading,false);h.dispose();
  }
});
test("null and malformed responses, including missing essential fields, never become ready",async()=>{
  const valid=fixture();
  for(const data of [null,undefined,{},[],{...valid,firstName:""},{...valid,firstName:"  "},{...valid,lastName:null},{...valid,id:0},{...valid,id:"1"},{...valid,role:"unknown"},{...valid,firstName:undefined}]){
    const result=await loadAccount(async()=>({data}));assert.equal(result.status,"error");assert.equal(result.user,null);
  }
});
test("transient errors are distinct from rejected credentials and incomplete registration",async()=>{
  for(const error of [{status:500},{status:503},{status:401,code:"AUTH_TOKEN_UNAVAILABLE"},{status:403}]){
    assert.equal((await loadAccount(async()=>({error}))).status,"error");
  }
  assert.equal((await loadAccount(async()=>({error:{status:401}}))).status,"unauthenticated");
  assert.equal((await loadAccount(async()=>({error:{status:404,code:"REGISTRATION_INCOMPLETE"}}))).status,"registration-incomplete");
  const thrown=await loadAccount(async()=>{throw Error("private provider diagnostic");});
  assert.equal(thrown.status,"error");assert.ok(!thrown.message.includes("private"));
});
test("Retry recovers from HTTP 500 and thrown network errors without parallel requests",async()=>{
  for(const reject of [false,true]){
    const h=providerHarness();h.render();
    if(reject) h.requests[0].reject(Error("private"));else h.requests[0].resolve({error:{status:500}});
    await flush();let state=h.render();assert.equal(state.status,"error");
    state.retry();state.retry();assert.equal(h.render().status,"loading");assert.equal(h.requests.length,2);
    h.render().retry();h.render();assert.equal(h.requests.length,2);
    h.requests[1].resolve({data:fixture()});await flush();assert.equal(h.render().status,"ready");h.dispose();
  }
});
test("Strict Mode effect replay shares one pending request and discards inactive subscriptions",async()=>{
  const h=providerHarness();h.render();h.replay();assert.equal(h.requests.length,1);
  h.requests[0].resolve({data:fixture()});await flush();
  assert.equal(h.writes,1);assert.equal(h.render().status,"ready");h.dispose();
});
test("rapid protected navigation preserves pending and ready identity data without refetching",async()=>{
  const h=providerHarness();h.render();
  for(const path of ["/student/sessions","/account/settings","/student/dashboard"]){h.path(path);assert.equal(h.render().status,"loading");}
  assert.equal(h.requests.length,1);h.requests[0].resolve({data:fixture()});await flush();
  for(const path of ["/account/settings","/student/sessions","/student/dashboard"]){h.path(path);assert.equal(h.render().status,"ready");}
  assert.equal(h.requests.length,1);h.dispose();
});
test("logout and identity changes immediately remove old users and discard stale responses",async()=>{
  const h=providerHarness();h.render();
  h.session({data:{user:{id:"subject-b"}},isPending:false});assert.equal(h.render().user,null);
  h.requests[1].resolve({data:fixture("tutor",2)});await flush();assert.equal(h.render().user.firstName,"Jordan");
  h.requests[0].resolve({data:fixture()});await flush();assert.equal(h.render().user.firstName,"Jordan");
  h.session({data:null,isPending:false});assert.equal(h.render().status,"unauthenticated");assert.equal(h.render().user,null);
  h.session({data:{user:{id:"subject-a"}},isPending:false});assert.equal(h.render().status,"loading");assert.equal(h.requests.length,3);
  h.dispose();const before=h.writes;h.requests[2].resolve({data:fixture()});await flush();assert.equal(h.writes,before);
});
test("session pending and failures do not request account data or reveal a prior account",async()=>{
  const h=providerHarness();h.session({data:null,isPending:true});assert.equal(h.render().status,"loading");assert.equal(h.requests.length,0);
  h.session({data:null,error:{status:503},isPending:false});const state=h.render();assert.equal(state.status,"error");await state.retry();assert.equal(h.refetches,1);
  h.session({data:null,error:{status:401},isPending:false});assert.equal(h.render().status,"unauthenticated");h.dispose();
});
test("completion route bypasses user fetch and leaving it initializes a fresh account",async()=>{
  const h=providerHarness();h.path("/complete-registration");h.render();assert.equal(h.requests.length,0);
  h.path("/student/dashboard");assert.equal(h.render().status,"loading");h.requests[0].resolve({data:fixture()});await flush();assert.equal(h.render().status,"ready");
  h.path("/complete-registration");assert.equal(h.render().user,null);assert.equal(h.requests.length,1);h.dispose();
});
test("authenticated refresh starts a new provider with loading instead of cached account data",()=>{
  const first=providerHarness();first.render();first.dispose();
  const refreshed=providerHarness();assert.equal(refreshed.render().status,"loading");assert.equal(refreshed.render().user,null);assert.equal(refreshed.requests.length,1);refreshed.dispose();
});
function find(tree, type) {
  const nodes=[];function walk(node){if(!node || typeof node!=="object")return;if(node.type===type)nodes.push(node);React.Children.forEach(node.props?.children,walk);}walk(tree);return nodes;
}
test("shared boundary gates all essential content, exposes retry, and redirects only incomplete accounts",()=>{
  let account={status:"loading",user:null}, retries=0;const routes=[];
  const Loading=()=>null, router={replace:path=>routes.push(path)};
  const Boundary=load("components/AccountBoundary.tsx",{
    react:{useEffect:fn=>fn()},"next/navigation":{useRouter:()=>router},"next/link":{default:()=>null},
    "@/lib/context/UserContext":{useCurrentUser:()=>account},"./AccountLoading":{default:Loading}
  }).default;
  const child=React.createElement("h1",null,"Welcome, Alex");
  assert.equal(Boundary({children:child}).type,Loading);
  account={status:"error",message:"Please retry.",retry:()=>retries++};const error=Boundary({children:child});
  assert.equal(find(error,"h1").length,0);find(error,"button")[0].props.onClick();assert.equal(retries,1);assert.equal(routes.length,0);
  account={status:"unauthenticated",message:"Sign in again."};assert.equal(find(Boundary({children:child}),"button").length,0);assert.equal(routes.length,0);
  account={status:"registration-incomplete"};assert.equal(Boundary({children:child}).type,Loading);assert.deepEqual(routes,["/complete-registration"]);
  account={status:"ready",user:fixture()};assert.equal(Boundary({children:child}),child);
});
test("loading uses the existing animation with one accessible status and reduced-motion support",()=>{
  const Loading=load("components/AccountLoading.tsx",{"next/image":{default:props=>React.createElement("img",props)}}).default;
  const tree=Loading({}), image=find(tree,"div")[1].props.children;
  assert.equal(tree.props.role,"status");assert.equal(image.props.src,"/icons/loading_animation_icon.svg");assert.equal(image.props.alt,"");assert.match(image.props.className,/motion-reduce:hidden/);
  assert.match(renderToStaticMarkup(tree),/Loading your dashboard/);
});
test("both dashboard headings render only with an initialized user",()=>{
  for(const role of ["student","tutor"]){
    let user=null;
    const Dashboard=load("app/(protected)/"+role+"/dashboard/page.tsx",{
      "@/lib/context/UserContext":{useCurrentUser:()=>({user})},"@/components/BookingList":{default:()=>null},"next/link":{default:()=>null}
    }).default;
    assert.equal(Dashboard(),null);user=fixture(role);assert.equal(find(Dashboard(),"h1")[0].props.children.join(""),"Welcome, Alex");
  }
});
test("all protected content boundaries are installed while completion remains outside them",()=>{
  for(const path of ["student/layout.tsx","tutor/layout.tsx","account/settings/page.tsx"]){
    assert.match(readFileSync(new URL("../app/(protected)/"+path,import.meta.url),"utf8"),/<AccountBoundary>/);
  }
  assert.doesNotMatch(readFileSync(new URL("../app/(protected)/complete-registration/page.tsx",import.meta.url),"utf8"),/AccountBoundary/);
});

test("single-name accounts remain compatible with registration completion",async()=>{
  const result=await loadAccount(async()=>({data:{...fixture(),lastName:""}}));assert.equal(result.status,"ready");
});
test("student and tutor login wait for sign-in and registration before navigation, without duplicate sign-in",async()=>{
  for(const role of ["student","tutor"]){
    const states=[], refs=[], routes=[];let cursor=0,refCursor=0,signins=0,resolveSignIn,resolveRegistration;
    const router={replace:path=>routes.push(path)};
    const Login=load("app/(landing)/login/page.tsx",{
      react:{
        useState(initial){const index=cursor++;if(!(index in states))states[index]=typeof initial==="function"?initial():initial;return [states[index],value=>{states[index]=typeof value==="function"?value(states[index]):value;}];},
        useRef(initial){const index=refCursor++;return refs[index]??=( {current:initial} );}
      },
      "@/components/auth-layout":{authPageClass:"",authFormClass:""},
      "@/lib/auth/form-attempt":{createAuthAttempt:()=>async action=>({kind:"success",data:await action()})},
      "@/lib/auth/client":{authClient:{signIn:{email:()=>{signins++;return new Promise(resolve=>{resolveSignIn=resolve;});}}}},
      "@/lib/api/registration":{getRegistrationStatus:()=>new Promise(resolve=>{resolveRegistration=resolve;})},
      "next/navigation":{useRouter:()=>router},"next/image":{default:()=>null},"next/link":{default:()=>null}
    }).default;
    function render(){cursor=refCursor=0;return Login();}
    const submit=()=>find(render(),"form")[0].props.onSubmit({preventDefault(){}});
    const first=submit();await submit();assert.equal(signins,1);assert.equal(routes.length,0);
    resolveSignIn({user:{id:"synthetic"}});await flush();assert.equal(routes.length,0);
    resolveRegistration({data:{status:"complete",role}});await first;
    assert.deepEqual(routes,["/"+role+"/dashboard"]);assert.equal(signins,1);
  }
});
