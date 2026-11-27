'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const net=require('node:net');

const root=path.resolve(__dirname,'..');
const owners=JSON.parse(fs.readFileSync(path.join(root,'data/sitemap-url-owners.json'),'utf8'));
const {loadPublishedCases}=require('../lib/published-case-feed');
const ns='http://www.sitemaps.org/schemas/sitemap/0.9';

async function unusedPort(){
 const server=net.createServer();
 await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 await new Promise(resolve=>server.close(resolve));
 return port;
}
async function get(url){
 const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
 assert.equal(response.status,200,'Expected HTTP 200 for '+url);
 return response.text();
}
function locs(xml,tag){
 return [...xml.matchAll(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<loc>([^<]+)<\\/loc>[\\s\\S]*?<\\/${tag}>`,'g'))].map(x=>x[1]);
}

test('live sitemap output preserves all registered canonical URLs exactly once under one owner',async t=>{
 const port=await unusedPort();
 const child=spawn(process.execPath,['server.js'],{
  cwd:root,
  env:{...process.env,PORT:String(port),PUBLIC_HOST:'example.com'},
  stdio:'ignore'
 });
 t.after(()=>{if(!child.killed)child.kill('SIGTERM')});
 const base='http://127.0.0.1:'+port;
 let ready=false,lastError;
 for(let i=0;i<100;i++){
  if(child.exitCode!==null)throw new Error('server exited before readiness: '+child.exitCode);
  try{await get(base+'/health');ready=true;break}catch(error){lastError=error;await new Promise(resolve=>setTimeout(resolve,250))}
 }
 assert.ok(ready,'server did not become ready: '+lastError);
 async function verifyRevalidation(feedPath){
  const url=base+feedPath;
  const headers={'X-Smart24-Monitor':'github-health-probe','User-Agent':'Smart24-Sitemap-Regression/1.0'};
  const initial=await fetch(url,{headers,signal:AbortSignal.timeout(15000)});
  assert.equal(initial.status,200,feedPath);
  const tag=initial.headers.get('etag');
  assert.match(tag||'',/^W\/"[a-f0-9]{64}"$/,feedPath+' final XML ETag');
  const xml=await initial.text();
  assert(xml.length>0);
  const again=await fetch(url,{headers:{...headers,'If-None-Match':tag},signal:AbortSignal.timeout(15000)});
  assert.equal(again.status,304,feedPath+' unchanged feed');
  assert.equal(again.headers.get('etag'),tag);
  assert.equal(await again.text(),'');
  if(feedPath==='/sitemap-all.xml'){
   const changed=await fetch(url,{headers:{...headers,'If-None-Match':'"different"'},signal:AbortSignal.timeout(15000)});
   assert.equal(changed.status,200);
   assert.equal(await changed.text(),xml);
  }
  return xml;
 }
 const index=await verifyRevalidation('/sitemap-all.xml');
 const feedPaths=locs(index,'sitemap').map(value=>new URL(value).pathname);
 assert.equal(feedPaths.length,21,'integrated index lists only URL-set feeds with owned URLs');
 const emitted=[];
 for(const feedPath of feedPaths){
  const xml=await verifyRevalidation(feedPath);
  assert.match(xml,/<urlset\b/,'expected a URL-set at '+feedPath);
  for(const value of locs(xml,'url')){
   const route=decodeURIComponent(new URL(value).pathname);
   assert.equal(owners[route],feedPath,'wrong or missing owner for '+route);
   emitted.push(route);
  }
 }
 assert.equal(emitted.length,Object.keys(owners).length,'all registered URLs must remain in feeds');
 assert.equal(new Set(emitted).size,emitted.length,'a URL must be listed in only one feed');
 assert.deepEqual(new Set(emitted),new Set(Object.keys(owners)),'the unique URL set must be unchanged');
 assert.ok(Object.keys(owners).length>=4308,'preserve the 4,303 baseline URLs and five restored cases');
 for(const ride of loadPublishedCases(root))assert.equal(owners[ride.path],'/sitemap-published.xml','published case must have dedicated owner: '+ride.path);
 assert.equal(ns,'http://www.sitemaps.org/schemas/sitemap/0.9');
});
