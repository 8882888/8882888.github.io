'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.join(__dirname,'..');
const benchmark=require('../data/manus-service-url-benchmark-20261116.json');
const origin='http://127.0.0.1:39843';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
test('48 supplied URLs map to existing source-backed Smart24 services without blanket priority indexing',async()=>{
 const entries=benchmark.entries;
 assert.equal(entries.length,48);
 assert.equal(new Set(entries.map(e=>e.referencePath)).size,48);
 assert(new Set(entries.map(e=>e.targetPath)).size>=30,'distinct canonical targets should remain useful');
 assert(entries.every(e=>e.targetPath.startsWith('/')&&e.targetPath.endsWith('/')));
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
 assert(server.includes('serviceTopicDiscoveryLinks()'));
 const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'39843',PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ready=false;
  for(let n=0;n<70;n++){
   if(child.exitCode!==null)throw Error('server exited before test');
   try{if((await fetch(origin+'/health',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break}}catch{}
   await sleep(250);
  }
  assert(ready,'local server should start');
  const get=async p=>{
   const res=await fetch(origin+p,{signal:AbortSignal.timeout(18000)});
   assert.equal(res.status,200,p+' must respond with HTTP 200');
   return res.text();
  };
  const [homepage,coverage,xml]=await Promise.all([get('/'),get('/coverage/'),get('/sitemap-priority.xml')]);
  for(const page of [homepage,coverage])assert(page.includes('id="service-topic-discovery-20261116"'),'discovery section must be server-rendered');
  assert(coverage.includes('id="service-topic-deep-links"'),'long-tail links must appear on coverage rather than flooding homepage');
  for(const entry of entries){
   if(entry.featured!==false)assert(homepage.includes('href="'+entry.targetPath+'"'),entry.topic+' headline link missing');
   assert(coverage.includes('href="'+entry.targetPath+'"'),entry.topic+' must link from coverage');
   if(entry.featured!==false)assert(xml.includes('<loc>https://jeongukdaeri.kr'+entry.targetPath+'</loc>'),entry.topic+' missing priority sitemap');
  }
  // Verify every distinct target returns canonical HTML, without 48 redundant fetches.
  for(const target of new Set(entries.map(e=>e.targetPath))){
   const html=await get(target);
   assert(html.includes('href="https://jeongukdaeri.kr'+target+'"'),target+' must self-canonicalize');
   if(entries.some(e=>e.targetPath===target&&e.featured!==false))assert(!/<meta\\s+name="robots"\\s+content="[^"]*noindex/i.test(html),target+' key hub must be indexable');
  }
  assert(server.includes("...serviceTopicBenchmark.entries.filter(x=>x.featured!==false).map(x=>x.targetPath)"),'new reference links must not be blanket-added to priority sitemap');
  console.log('PASS 48 supplied reference paths, deduplicated real canonical targets, full coverage navigation and curated priority sitemap');
 }finally{child.kill()}
});
