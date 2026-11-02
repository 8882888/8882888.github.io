'use strict';
// Start the REAL Node server before deploying. Syntax-only checks missed a hardcoded
// 27-vs-34 priority-region startup crash. This test exercises production routes.
const http=require('node:http');
const net=require('node:net');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const assert=require('node:assert/strict');

function freePort(){
 return new Promise((resolve,reject)=>{
  const s=net.createServer();
  s.once('error',reject);
  s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port))});
 });
}
function request(port,pathname){
 return new Promise((resolve,reject)=>{
  const req=http.get({host:'127.0.0.1',port,path:pathname,timeout:15000},res=>{
   const parts=[];
   res.on('data',chunk=>parts.push(chunk));
   res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(parts).toString('utf8')}));
  });
  req.on('timeout',()=>req.destroy(new Error('HTTP timeout: '+pathname)));
  req.on('error',reject);
 });
}
async function main(){
 const port=await freePort();
 const srv=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:['ignore','pipe','pipe']});
 let logs='';
 srv.stdout.on('data',x=>{logs+=(String(x)).slice(0,2500)});
 srv.stderr.on('data',x=>{logs+=(String(x)).slice(0,3500)});
 let exited=false;srv.on('exit',()=>{exited=true});
 try{
  const stop=Date.now()+40000;
  let healthy=false;
  while(Date.now()<stop&&!exited){
   try{const res=await request(port,'/health');if(res.status===200){const data=JSON.parse(res.body);if(data.ok&&data.regions>=20000){healthy=true;break}}}catch(_){}
   await new Promise(resolve=>setTimeout(resolve,350));
  }
  assert(healthy,'Node server failed to start with nationwide region data; output: '+logs.slice(-5000));
  const expected=JSON.parse(fs.readFileSync('data/priority-regions.json','utf8')).pages;
  assert(expected.length>=34,'Priority regions unexpectedly reduced');
  const json=await request(port,'/health/seo.json');assert.equal(json.status,200,'Deployment JSON');
  const diagnostic=JSON.parse(json.body);
  assert.equal(diagnostic.priority_region_count,expected.length,'production dynamic priority region count');
  assert.equal(diagnostic.curated_source_groups,10);
  assert.equal(diagnostic.curated_source_links,20);
  assert.equal(diagnostic.blog_source_count,630);
  for(const name of ['server.js','index.html','data/seo-pages.json','data/priority-blog-links.json'])
   assert.match(diagnostic.deployment_hashes[name],/^[0-9a-f]{64}$/);
  const checks=[
   ['/', 'special-business-top-links-20261103'],
   ['/taksong/', 'specialized-business-taksong-hub'],
   ['/daeri/', 'real-original-daeri-links-20261102'],
   ['/region/', 'verified-naver-region-links-20261102'],
   ['/taksong/busan/', 'local-naver-originals'],
   ['/daeri/daegu/', 'local-naver-originals'],
   ['/health/seo-report/', '서버 파일 지문:']
  ];
  for(const [url,marker] of checks){
   const r=await request(port,url);
   assert.equal(r.status,200,url+' HTTP');
   assert(r.body.includes(marker),url+' missing '+marker);
   if(url.startsWith('/health/'))assert.match(String(r.headers['x-robots-tag']||''),/noindex/);
  }
  for(const file of ['/sitemap-priority.xml','/sitemap.xml']){
   const r=await request(port,file);
   assert.equal(r.status,200,file+' HTTP');
   for(const canonical of ['/taksong/','/daeri/'])assert(r.body.includes('https://jeongukdaeri.kr'+canonical),file+' missing '+canonical);
  }
  console.log('PASS: production server boots with '+expected.length+' priority regions; 630 existing blog links, 10 curated groups, 20 posts; core service, regional and XML routes accessible.');
 }finally{
  srv.kill('SIGTERM');
 }
}
main().catch(err=>{console.error('FAIL: production Node startup and route smoke test:',err.stack||err);process.exitCode=1});
