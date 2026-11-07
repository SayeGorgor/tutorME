/** Isolated rendered-component viewport audit using installed Chrome, no new dependencies.
 * Run from frontend after a build: node scripts/responsive-audit.mjs
 * --before reads HEAD source and requires CSS built from that same baseline.
 * --quick diagnoses a subset; the full run supplies the final report.
 * All hooks/API/Auth are synthetic. No provider requests, accounts or DB writes.
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import vm from "node:vm";
import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript"), React = require("react"), { renderToStaticMarkup } = require("react-dom/server");
const root = process.cwd(), before = process.argv.includes("--before");
const output = path.resolve(root, "../docs/responsive-artifacts");
fs.mkdirSync(output, { recursive: true });
const read = file => before ? execFileSync("git", ["show", `HEAD:frontend/${path.relative(root,file).replaceAll("\\","/")}`], {cwd:root,encoding:"utf8"}) : fs.readFileSync(file,"utf8");
const long = "Alexandria".repeat(8);
const subjects = Array.from({length:12}, (_,i)=>({id:i+1,name:i ? `Advanced subject ${i}` : "Interdisciplinary".repeat(7),category:"Math"}));
const tutor = {id:1,userId:1,price:25.1,intro:long,bio:long.repeat(3),subjects,availability:[],onlineEnabled:true,inPersonEnabled:true,travelRadiusMiles:25,meetingPreferences:"Public libraries",serviceArea:{id:"synthetic",displayLabel:long+", NY",name:long,region:"NY",country:"US"},user:{id:1,firstName:long,lastName:"Example",role:"tutor",timezone:"America/New_York"}};
const booking = {id:"synthetic",studentName:long,tutorName:long,studentId:2,tutorId:1,status:"pending",mode:"online",startsAt:"2030-01-01T12:00:00Z",endsAt:"2030-01-01T13:00:00Z",subjectId:1,subjectNameSnapshot:subjects[0].name,hourlyRateSnapshot:"25.10",sessionAmountSnapshot:"25.10",currencySnapshot:"USD",durationMinutesSnapshot:60};
let route="", editing=false, cache=new Map(), ids=0;
function fixtureState(name, initial) {
  const overrides={plan:{firstName:long,lastName:"Example",acceptanceCurrent:false},tutorProfile:tutor,isLoading:false,loading:false,busy:false,checkingRequirements:false,policies:{ready:true,termsVersion:"synthetic",bookingsEnabled:true,contactEmail:"privacy@example.test"},subjects,subjectCategories:[{name:"Math",subjects}],result:{items:[{...tutor,distanceMiles:2}],total:1,offset:0,limit:20},records:[booking,{...booking,id:"legacy",status:"cancelled",subjectNameSnapshot:null,hourlyRateSnapshot:null,sessionAmountSnapshot:null,durationMinutesSnapshot:null}],day:"2030-01-01",selected:"2030-01-01T12:00:00Z",subject:"1",slots:["2030-01-01T12:00:00Z"],isEditingIntro:editing,isEditingAbout:editing,account:route==="complete"?{name:long,email:long+"@example.test"}:{subject:"synthetic",role:"student"},loaded:true};
  return [name in overrides ? overrides[name] : typeof initial==="function" ? initial() : initial,()=>{}];
}
const hookReact={...React,useState:initial=>[typeof initial==="function"?initial():initial,()=>{}],useEffect:()=>{},useRef:value=>({current:value}),useId:()=>`synthetic-${++ids}`,useSyncExternalStore:(_subscribe,_snapshot,server)=>server()};
const user={...tutor.user,role:route.startsWith("tutor")?"tutor":"student",email:long+"@example.test"};
const mockActions={getSubjects:async()=>({data:subjects}),getTutorByUserId:async()=>({data:tutor}),getCurrentUser:async()=>({data:user}),getAvailabilityWeekDates:()=>Array.from({length:7},(_,i)=>new Date(2030,0,i+1)),formatToDateString:date=>date.toISOString().slice(0,10),getAvailabilityCalendarCellSize:active=>active?"bg-blue-700":"bg-blue-100",updateTutorProfile:async()=>({data:tutor}),updateTutorAvailability:async()=>({data:[]})};
function load(file) {
  let full=file;
  if (!path.extname(full)) full=[".tsx",".ts"].map(ext=>file+ext).find(name=>fs.existsSync(name));
  if (!full) throw Error(`Fixture import absent: ${file}`);
  if (cache.has(full)) return cache.get(full).exports;
  if (full.endsWith(".css")) return {page:"page"};
  // Preserve original setter names; components use them in callbacks even though SSR never calls them.
  const original=read(full);
  const transformed=original.replace(/(const \[(\w+),[^\]\n]+\]\s*=\s*)useState(?:<[^\n]*?>)?\(/g,(_all,prefix,name)=>`${prefix}fixtureState("${name}",`);
  const js=ts.transpileModule(transformed,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const loaded={exports:{}};cache.set(full,loaded);
  function localRequire(name) {
    if(name==="react")return hookReact;
    if(name==="next/image")return function SyntheticImage({alt,src,width,height,...props}) {return React.createElement("img",{...props,alt,src,width,height});};
    if(name==="next/link")return function SyntheticLink({children,...props}) {return React.createElement("a",props,children);};
    if(name==="next/navigation")return {useRouter:()=>({push(){},back(){},replace(){}}),usePathname:()=>"/tutors",useSearchParams:()=>new URLSearchParams("subject=Math")};
    if(name==="next/dynamic")return ()=>function SyntheticMap() {return React.createElement("p",null,"Synthetic map placeholder; Google not loaded.");};
    if(name.includes("context/UserContext"))return {useCurrentUser:()=>({user:{...user,role:route.startsWith("tutor")?"tutor":"student"},loading:false})};
    if(name.endsWith("auth/client"))return {authClient:{useSession:()=>({data:{user:{id:"synthetic"}},isPending:false})}};
    if(name.endsWith("api/actions/client-actions"))return mockActions;
    if(name.endsWith("api/api-helper"))return {apiFetch:async()=>({data:{}})};
    if(name.endsWith("api/authorized"))return {authorized:async()=>({data:[]})};
    if(name === "@/lib/policies")return {loadPolicyInfo:async()=>({ready:true,operatorName:"Synthetic operator",contactEmail:"privacy@example.test",effectiveDate:"2030-01-01",termsVersion:"synthetic"})};
    if(name.endsWith("api/registration"))return {getRegistrationStatus:async()=>({data:{}}),finishRegistration:async()=>({data:{}})};
    if(name.endsWith(".svg"))return function SyntheticIcon(props) {return React.createElement("svg",{...props,"aria-hidden":true});};
    if(name.startsWith("@/"))return load(path.join(root,name.slice(2)));
    if(name.startsWith("."))return load(path.resolve(path.dirname(full),name));
    return require(name);
  }
  vm.runInNewContext(js,{module:loaded,exports:loaded.exports,require:localRequire,fixtureState,Intl,Date,URLSearchParams,crypto:globalThis.crypto,process:{env:{NEXT_PUBLIC_API_URL:"https://synthetic.invalid"}},console},{filename:full});
  return loaded.exports;
}
const e=React.createElement;
async function markup(name) {
 route=name;editing=name==="tutor-editor";cache=new Map();ids=0;
 const component=file=>load(path.join(root,file)).default;
 const Footer=component("components/SiteFooter.tsx");
 let content;
 const routes={home:"app/(landing)/page.tsx",discovery:"app/tutors/(main page)/page.tsx",publicProfile:"app/tutors/[id]/page.tsx","tutor-editor":"app/(protected)/tutor/profile/page.tsx",studentDashboard:"app/(protected)/student/dashboard/page.tsx",tutorDashboard:"app/(protected)/tutor/dashboard/page.tsx",account:"components/AccountSettings.tsx",signup:"components/SignupForm.tsx",signupTutor:"components/SignupForm.tsx",complete:"components/CompleteRegistration.tsx",tutorStudents:"app/(protected)/tutor/students/page.tsx",tutorPayments:"app/(protected)/tutor/payments/page.tsx",verify:"components/VerifyEmail.tsx",login:"app/(landing)/login/page.tsx"};
 if(name==="sessions"||name==="tutorSessions")content=e(component("components/BookingList.tsx"));
 else if(name==="booking")content=e(component("components/BookingRequest.tsx"),{tutor});
 else if(name==="legal"||name==="terms")content=await component("components/LegalDocument.tsx")({kind:name==="terms"?"terms":"privacy"});
 else content=e(component(routes[name]),(name==="signup"||name==="signupTutor")?{role:name==="signupTutor"?"tutor":"student"}:name==="publicProfile"?{params:Promise.resolve({id:1})}:{});
 if(name.startsWith("tutor"))content=e(component("app/(protected)/tutor/layout.tsx"),null,content);
 else if(name==="studentDashboard" || name==="sessions")content=e(component("app/(protected)/student/layout.tsx"),null,content);
 else content=e(React.Fragment,null,e(component("components/LandingNav.tsx")),content);
 return renderToStaticMarkup(e(React.Fragment,null,content,e(Footer)));
}
const cssFiles=fs.readdirSync(path.join(root,".next/static/chunks")).filter(name=>name.endsWith(".css"));
let css=cssFiles.map(name=>fs.readFileSync(path.join(root,".next/static/chunks",name),"utf8")).join("\n");
css+="\n"+read(path.join(root,"app/(landing)/landing.module.css")).replace(/:global\(([^)]+)\)/g,"$1");
const cases=process.argv.includes("--quick")?["home","tutor-editor"]:before?["tutor-editor"]:["home","discovery","publicProfile","tutor-editor","studentDashboard","tutorDashboard","account","signup","verify","login","sessions","tutorSessions","booking","legal","terms","signupTutor","complete","tutorStudents","tutorPayments"];
const pages=new Map(await Promise.all(cases.map(async name=>[name,`<!doctype html><html lang="en" style="--font-inter:Arial"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body class="min-h-screen flex flex-col">${await markup(name)}</body></html>`])));
const server=http.createServer((req,res)=>{
 const name=req.url.slice(1).split("?")[0];
 if(pages.has(name)){res.setHeader("Content-Type","text/html");res.end(pages.get(name));return;}
 const file=path.resolve(root,"public",name);
 if(file.startsWith(path.join(root,"public")+path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()){res.setHeader("Content-Type",name.endsWith(".svg")?"image/svg+xml":"application/octet-stream");fs.createReadStream(file).pipe(res);return;}
 res.statusCode=404;res.end();
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const profile=path.join(root,".next",`responsive-browser-${Date.now()}`);
const chrome=spawn("C:/Program Files/Google/Chrome/Application/chrome.exe",["--headless=new","--disable-gpu","--disable-background-networking","--disable-extensions","--no-first-run","--no-default-browser-check","--remote-debugging-port=0",`--user-data-dir=${profile}`,"about:blank"],{windowsHide:true,stdio:"ignore"});
let ws;
try {
 let port;
 for(let i=0;i<100;i++){try{port=fs.readFileSync(path.join(profile,"DevToolsActivePort"),"utf8").split("\n")[0];break;}catch{await new Promise(resolve=>setTimeout(resolve,100));}}
 if(!port)throw Error("Chrome did not start");
 const version=await(await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(5000)})).json();
 ws=new WebSocket(version.webSocketDebuggerUrl);await Promise.race([new Promise(resolve=>ws.addEventListener("open",resolve,{once:true})),new Promise((_,reject)=>setTimeout(()=>reject(Error("Browser socket timeout")),5000))]);
 let serial=0;const pending=new Map(),events=new Map();
 ws.addEventListener("message",event=>{const message=JSON.parse(event.data);if(message.id){const waiter=pending.get(message.id);pending.delete(message.id);if(message.error)waiter.reject(Error(message.error.message));else waiter.resolve(message.result);}else{const key=`${message.sessionId}:${message.method}`;events.get(key)?.();events.delete(key);}});
 const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++serial;const timer=setTimeout(()=>reject(Error(`Browser command timeout: ${method}`)),10000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});ws.send(JSON.stringify({id,method,params,sessionId}));});
 const target=await call("Target.createTarget",{url:"about:blank"});const {sessionId}=await call("Target.attachToTarget",{targetId:target.targetId,flatten:true});
 await call("Page.enable",{},sessionId);await call("Page.bringToFront",{},sessionId);await call("Network.enable",{},sessionId);
 await call("Network.setBlockedURLs",{urls:["*googleapis.com*","*neon.tech*","*neonauth*","*synthetic.invalid*"]},sessionId);
 const widths=before||process.argv.includes("--quick")?[390]:[320,360,390,430,600,768,900,1024,1100,1280,1440,1920];const results=[];
 for(const theme of before?["light"]:["light","dark"]){
  await call("Emulation.setEmulatedMedia",{features:[{name:"prefers-color-scheme",value:theme}]},sessionId);
  const scenarios=widths.map(width=>({width,height:900,textScale:1,label:"normal"}));
  if(!before)scenarios.push({width:844,height:390,textScale:1,label:"landscape"},{width:320,height:900,textScale:2,label:"text200"});
  for(const {width,height,textScale,label} of scenarios){
   await call("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:false},sessionId);
   for(const name of cases){
    const loaded=Promise.race([new Promise(resolve=>events.set(`${sessionId}:Page.loadEventFired`,resolve)),new Promise((_,reject)=>setTimeout(()=>reject(Error("Fixture load timeout")),10000))]);
    await call("Page.navigate",{url:`http://127.0.0.1:${server.address().port}/${name}`},sessionId);await loaded;
    const response=await call("Runtime.evaluate",{expression:`document.documentElement.style.fontSize="${textScale*100}%";new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,calendarDesktopOverflow:${width>=1536&&textScale===1}? [...document.querySelectorAll('.calendar-scroll')].some(el=>el.scrollWidth>el.clientWidth+1):false,navigationOverlap:(()=>{const a=document.querySelector('nav #logo, nav a[aria-label="tutorME dashboard"],nav a[aria-label="tutorME home"]')?.getBoundingClientRect(), b=document.querySelector('nav summary')?.getBoundingClientRect();return !!(a&&b&&a.width&&b.width&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top);})(),overflow:[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0 && (r.right>document.documentElement.clientWidth+1 || r.left< -1) && !el.closest('.calendar-scroll,[aria-label="Tutor availability calendar"]') && getComputedStyle(el).visibility!=='hidden' && !el.closest('.overflow-hidden');}).slice(0,8).map(el=>({tag:el.tagName,id:el.id,rect:{left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width},class:el.className?.baseVal??el.className}))}))))`,awaitPromise:true,returnByValue:true},sessionId);
    const result=response.result.value;
    if(!before && width===390 && label==="normal" && ["home","tutor-editor"].includes(name)){
     await call("Runtime.evaluate",{expression:'document.querySelector("nav summary").focus()'},sessionId);
     await call("Input.dispatchKeyEvent",{type:"keyDown",key:"Enter",code:"Enter",windowsVirtualKeyCode:13,text:"\r",unmodifiedText:"\r"},sessionId);
     await call("Input.dispatchKeyEvent",{type:"keyUp",key:"Enter",code:"Enter",windowsVirtualKeyCode:13,text:"\r",unmodifiedText:"\r"},sessionId);
     const menu=await call("Runtime.evaluate",{expression:'({open:document.querySelector("nav details").open,overflow:document.documentElement.scrollWidth>innerWidth+1})',returnByValue:true},sessionId);
     result.nativeMenuOpen=menu.result.value.open;result.nativeMenuOverflow=menu.result.value.overflow;result.nativeMenuKeyboard=menu.result.value.open && !menu.result.value.overflow;
     await call("Input.dispatchKeyEvent",{type:"keyDown",key:"Enter",code:"Enter",windowsVirtualKeyCode:13,text:"\r",unmodifiedText:"\r"},sessionId);
     await call("Input.dispatchKeyEvent",{type:"keyUp",key:"Enter",code:"Enter",windowsVirtualKeyCode:13,text:"\r",unmodifiedText:"\r"},sessionId);
    }
    results.push({name,theme,width,height,label,textScale,...result});
    if(width===390 && label==="normal" && ["tutor-editor","booking","discovery"].includes(name)){
     if(name==="tutor-editor")await call("Runtime.evaluate",{expression:'document.getElementById("tutor-profile-card").scrollIntoView({block:"start"})'},sessionId);
     const shot=await call("Page.captureScreenshot",{format:"png",captureBeyondViewport:false},sessionId);
     fs.writeFileSync(path.join(output,`${before?"before":"after"}-${name}-${theme}-390.png`),Buffer.from(shot.data,"base64"));
     if(!before && name==="tutor-editor"){
      await call("Runtime.evaluate",{expression:'document.querySelector(".calendar-scroll").scrollIntoView({block:"start"})'},sessionId);
      const calendar=await call("Page.captureScreenshot",{format:"png",captureBeyondViewport:false},sessionId);
      fs.writeFileSync(path.join(output,`after-calendar-${theme}-390.png`),Buffer.from(calendar.data,"base64"));
     }
    }
   }
  }
  console.log(`Viewport fixture audit ${before?"before":"after"}: ${theme} complete`);
 }
 fs.writeFileSync(path.join(output,`${before?"before":"after"}-results.json`),JSON.stringify(results,null,2));
 fs.writeFileSync(path.join(output,`${before?"before":"after"}-environment.json`),JSON.stringify({browser:version.Browser,node:process.version,routes:cases,baseline:execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim(),source:before?"HEAD with baseline build":"working tree with current build",google:"mocked; not loaded",providers:"not contacted"},null,2));
 const failures=results.filter(item=>item.scrollWidth>item.clientWidth+1 || item.navigationOverlap || item.nativeMenuKeyboard===false || item.calendarDesktopOverflow);console.log(JSON.stringify({checks:results.length,pageOverflow:failures.map(({name,theme,width,label,scrollWidth,navigationOverlap,nativeMenuOpen,nativeMenuOverflow})=>({name,theme,width,label,scrollWidth,navigationOverlap,nativeMenuOpen,nativeMenuOverflow}))},null,2));
 if(!before && failures.length)process.exitCode=1;
} finally {ws?.close();chrome.kill();server.close();}
