import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStore } from "./memory-store.js";
import { createGroup } from "../edge-functions/_groups.js";
import { changeDomain } from "../edge-functions/_domains.js";
import { createLink, updateLink, deleteLink, getLink } from "../edge-functions/_links.js";
import { recordVisit } from "../edge-functions/_visit-shards.js";
import { onRequestGet as redirect } from "../edge-functions/[code].js";
import { setStoreFactory } from "../edge-functions/_storage.js";

test("both aliases, brand member and default are blocked on writes and pending activation", async () => {
  const s = new MemoryStore(), origin = "https://vyu.cc", ctx = {origin,host:"vyu.cc"}, admin = {role:"admin", username:"owner"};
  await createGroup(s,{name:"gome"},origin);
  await changeDomain(s,"gome",{action:"configure",hostname:"go.example.test"},admin,origin);
  const { link } = await createLink(s,{group:"gome",code:"sale",url:"https://example.org/product"},ctx);
  for(const url of [link.platformUrl,link.brandUrl,"https://667989.xyz/gome/sale?x=1","https://go.example.test/","https://vyu.cc/gome","https://go.example.test/%73ale/"]) {
    await assert.rejects(updateLink(s,"gome/sale",{url},ctx),{status:422});
    await assert.rejects(createLink(s,{group:"gome",code:"copy",url},ctx),{status:422});
  }
  await createGroup(s,{name:"events"},origin);
  await createLink(s,{group:"events",code:"sale",url:"https://new.example.test/sale"},ctx);
  await assert.rejects(changeDomain(s,"events",{action:"configure",hostname:"new.example.test"},admin,origin),{status:422});
  assert.equal((await getLink(s,"gome/sale")).link.url,"https://example.org/product");
});

test("counter retries use the same cumulative value; rename and code reuse keep separate identities",async()=>{
  const s=new MemoryStore(); setStoreFactory(()=>s);
  await createLink(s,{code:"deal",url:"https://example.org"});
  const old=await s.get("links/deal.json");
  const put=s.setJSON.bind(s); let failed=false;
  s.setJSON=async(k,v,o)=>{await put(k,v,o); if(k.startsWith("visit-shards/")&&!failed){failed=true;throw Error("lost ack");}};
  await recordVisit(s,old);
  await updateLink(s,"deal",{code:"next"});
  await recordVisit(s,old); // a still-warm mapping belongs to the same record.
  assert.equal((await getLink(s,"next")).link.visits,2);
  await deleteLink(s,"next"); await createLink(s,{code:"next",url:"https://example.org/new"});
  await recordVisit(s,old);
  assert.equal((await getLink(s,"next")).link.visits,0);
  s.setJSON=async(k,v,o)=>{if(k.startsWith("visit-shards/"))throw Error("telemetry unavailable");return put(k,v,o);};
  const result=await redirect({params:{code:"next"},request:new Request("https://vyu.cc/next")});
  assert.equal(result.status,302); assert.equal(result.headers.get("X-EdgeShort-Visit"),"degraded");
});
