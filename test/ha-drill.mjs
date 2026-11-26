// Two independent HTTP workers share atomic per-object files to model Blob.
// Only generated data inside a private temporary directory is used by this drill.
import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { cp, link, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { startPreview } from "./preview.mjs";

const hash = data => createHash("sha256").update(data).digest("hex");
class SharedStore {
  constructor(dir) { this.dir = dir; }
  file(key) { return join(this.dir, hash(key) + ".json"); }
  async get(key) {
    try { return JSON.parse(await readFile(this.file(key), "utf8")).value; }
    catch (err) { if (err.code === "ENOENT") return null; throw err; }
  }
  async setJSON(key, value, options = {}) {
    const file = this.file(key), tmp = join(this.dir, randomUUID() + ".tmp");
    await writeFile(tmp, JSON.stringify({key,value}), {mode:0o600});
    try {
      if (options.onlyIfNew) await link(tmp, file);
      else await rename(tmp, file);
    } catch (err) {
      if (err.code === "EEXIST") throw Object.assign(Error("occupied"), {code:"PRECONDITION_FAILED"});
      throw err;
    } finally { await rm(tmp,{force:true}); }
  }
  async delete(key) { await rm(this.file(key),{force:true}); }
  async list({prefix="",cursor="",limit=Infinity}={}) {
    const names = (await readdir(this.dir)).filter(name=>name.endsWith(".json"));
    const keys = [];
    for (const name of names) {
      try { const {key}=JSON.parse(await readFile(join(this.dir,name),"utf8")); if(key.startsWith(prefix)&&key>cursor) keys.push(key); }
      catch(err){if(err.code!=="ENOENT") throw err;}
    }
    keys.sort(); const part=keys.slice(0,limit);
    return {blobs:part.map(key=>({key})),cursor:keys.length>part.length?part.at(-1):undefined};
  }
}

async function manifest(dir) {
  const names=(await readdir(dir)).filter(name=>name.endsWith(".json")).sort();
  return Promise.all(names.map(async name=>[name,hash(await readFile(join(dir,name)))]));
}

async function drill() {
  const root=await mkdtemp(join(tmpdir(),"edgeshort-ha-"));
  const live=join(root,"live"), backup=join(root,"snapshot"), recovered=join(root,"restored");
  await mkdir(live,{mode:0o700});
  const children=new Set();
  async function start(dir) {
    const child=fork(fileURLToPath(import.meta.url),["worker",dir],{silent:true});
    children.add(child);
    const [origin]=await Promise.race([once(child,"message"),once(child,"exit").then(()=>{throw Error("worker did not start");})]);
    return {origin,child};
  }
  async function stop(worker, signal="SIGTERM") {
    const exited=once(worker.child,"exit");
    worker.child.kill(signal); await exited; children.delete(worker.child);
  }
  let cookie;
  const pw=randomBytes(16).toString("hex");
  async function api(worker,path,method="GET",body,expected=200,credential=cookie) {
    const r=await fetch(worker.origin+"/api/"+path,{method,headers:{"Content-Type":"application/json",...(credential&&{Cookie:credential})},
      body: body===undefined?undefined:JSON.stringify(body)});
    assert.equal(r.status,expected,method+" "+path);
    return r;
  }
  function visit(worker,path,host) {
    return new Promise((resolve,reject)=>{http.get(worker.origin+path,{headers:host?{Host:host}:{}},r=>{
      r.resume();resolve({status:r.statusCode, url:r.headers.location, visit:r.headers["x-edgeshort-visit"]});
    }).on("error",reject);});
  }
  const target="https://example.org/product";
  const expectedVisit={status:302,url:target,visit:"stored"};
  const count=async(w,path)=>(await(await api(w,"links/"+path)).json()).link.visits;
  try {
    let a=await start(live);
    assert.equal((await(await api(a,"auth/session")).json()).needsSetup,true);
    const [proof]=(await new SharedStore(live).list({prefix:"setup/"})).blobs;
    await api(a,"auth/setup","POST",{username:"owner",password:pw,setupCode:proof.key.slice(6,-5)},201);
    const login=async w=>(await api(w,"auth/login","POST",{username:"owner",password:pw})).headers.get("set-cookie").split(";")[0];
    cookie=await login(a);
    await api(a,"links","POST",{code:"gpt",url:target},201);
    await api(a,"groups","POST",{name:"gome"},201);
    await api(a,"groups/gome/domain","POST",{action:"configure",hostname:"brand.example.test"});
    await api(a,"links","POST",{group:"gome",code:"sale",url:target},201);
    await api(a,"groups/gome","PATCH",{defaultCode:"sale"});
    await api(a,"users","POST",{username:"editor",password:pw,groups:["gome"]},201);
    const {key}=await(await api(a,"api-keys","POST",{name:"drill"} ,201)).json();
    for(const url of [a.origin+"/gome/sale","https://vyu.cc/gome/sale","https://brand.example.test/sale","https://brand.example.test/"])
      await api(a,"links/gome/sale","PATCH",{url},422);
    for(let i=0;i<10;i++)assert.deepEqual(await visit(a,"/gpt"),expectedVisit);
    await stop(a,"SIGKILL");
    a=await start(live);
    assert.equal(await count(a,"gpt"),10);
    console.log("10 sequential GETs, immediate process kill, new PID: /gpt = 10");
    const b=await start(live);
    const results=await Promise.all(Array.from({length:20},(_,i)=>i%2?visit(a,"/gome/sale"):visit(b,"/sale","brand.example.test")));
    results.forEach(result=>assert.deepEqual(result,expectedVisit));
    assert.equal(await count(b,"gome/sale"),20);
    await stop(a,"SIGKILL");
    assert.deepEqual(await visit(b,"/","brand.example.test"),expectedVisit);
    assert.equal(await count(b,"gome/sale"),21);
    console.log("two PIDs, 20 concurrent platform/brand GETs: 20; surviving worker served group default: 21");
    await stop(b);
    await cp(live,backup,{recursive:true,errorOnExist:true,force:false});
    const expected=await manifest(live); assert.deepEqual(await manifest(backup),expected);
    await cp(backup,recovered,{recursive:true,errorOnExist:true,force:false});
    assert.deepEqual(await manifest(recovered),expected);
    const restored=await start(recovered);
    assert.equal((await(await api(restored,"auth/session")).json()).user.username,"owner");
    cookie=await login(restored);
    assert.equal(await count(restored,"gpt"),10);assert.equal(await count(restored,"gome/sale"),21);
    assert.equal((await(await api(restored,"users")).json()).users[0].groups[0],"gome");
    const r=await fetch(restored.origin+"/api/v1/groups/gome",{headers:{Authorization:"Bearer "+key.value}});
    assert.equal(r.status,200);const {group}=await r.json();assert.equal(group.brandUrl,"https://brand.example.test/");
    assert.equal(group.defaultCode,"sale");
    assert.deepEqual(await visit(restored,"/gpt"),expectedVisit);assert.deepEqual(await visit(restored,"/sale","brand.example.test"),expectedVisit);
    console.log("restored "+expected.length+" SHA-256-verified objects into empty storage; password, old session, API key, grants, group, domain and both destinations passed");
  } finally {
    for(const child of children) if(child.exitCode===null&&child.signalCode===null) await stop({child},"SIGKILL");
    await rm(root,{recursive:true,force:true});
  }
}

if (process.argv[2]==="worker") {
  const app=await startPreview(0,{store:new SharedStore(process.argv[3]),fresh:true});
  process.send(app.origin);
  process.on("disconnect",()=>process.exit(0));
} else await drill();
