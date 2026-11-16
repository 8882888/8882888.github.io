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
test('Manus URL examples map to 15 distinct, useful existing Smart24 canonical topics',async()=>{
 const entries=benchmark.entries;
 assert.equal(entries.length,15);
 assert.equal(new Set(entries.map(e=>e.referencePath)).size,15);
 assert.equal(new Set(entries.map(e=>e.targetPath)).size,15);
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
  for(const entry of entries){
   assert(homepage.includes('href="'+entry.targetPath+'"'),entry.topic+' not linked from homepage');
   assert(coverage.includes('href="'+entry.targetPath+'"'),entry.topic+' not linked from coverage');
   assert(xml.includes('<loc>https://jeongukdaeri.kr'+entry.targetPath+'</loc>'),entry.topic+' missing from dynamic priority sitemap');
   const html=await get(entry.targetPath);
   assert(html.includes('href="https://jeongukdaeri.kr'+entry.targetPath+'"'),entry.topic+' must self-canonicalize');
   assert(!/<meta\\s+name="robots"\\s+content="[^"]*noindex/i.test(html),entry.topic+' must not be noindex');
  }
  console.log('PASS 15 service-topic canonical routes, homepage and coverage links, and priority sitemap');
 }finally{child.kill()}
});
