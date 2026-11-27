#!/usr/bin/env node
'use strict';
// Test evidence cache against source-main to rule out dropped/invented rides.
const {spawn}=require('node:child_process');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const routes=[
 '/daeri/gyeonggi/',
 '/taksong/chungbuk/',
 '/daeri/sejong/',
 '/taksong/busan/gijang-gun/'
];
const hash=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,16);
// Editorial blog recommendations may legitimately change between commits.
// Protect the actual completed-ride evidence and referenced record IDs instead
// of blocking unrelated corrections because every byte of HTML changed.
function rideEvidence(html){
 const ids=['priority-verified-rides','regional-archive-matched-ride-links'];
 const pieces=ids.map(id=>{
  const matched=html.match(new RegExp('<section id="'+id+'"[^>]*>([\\s\\S]*?)<\\/section>'));
  return matched?matched[1]:null;
 });
 // Compare distinct record identifiers, not how often an existing record is linked.
 const historyIds=[...new Set([...html.matchAll(/href="\/reviews\/history\/([^"/?#]+)\/"/g)].map(m=>m[1]))].sort();
 const count=html.match(/공개된 실제 완료 운행\s+(\d+)건/);
 return JSON.stringify({pieces,historyIds,completedVisible:count?Number(count[1]):null});
}
const median=arr=>{const s=[...arr].sort((a,b)=>a-b);return s[Math.floor(s.length/2)]};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchHtml(port,route){
 const begin=performance.now();
 const res=await fetch('http://127.0.0.1:'+port+route,{signal:AbortSignal.timeout(20000)});
 const body=await res.text();
 if(res.status!==200)throw Error(route+' HTTP '+res.status);
 return {body,ms:Math.round(performance.now()-begin)};
}
async function boot(filename,port){
 const child=spawn(process.execPath,[filename],{
  cwd:root,stdio:'ignore',env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'}
 });
 for(let tries=0;tries<110;tries++){
  if(child.exitCode!==null)throw Error(filename+' exited with '+child.exitCode);
  try{
   const res=await fetch('http://127.0.0.1:'+port+'/health',{signal:AbortSignal.timeout(900)});
   if(res.status===200)return child;
  }catch{}
  await pause(300);
 }
 child.kill();
 throw Error(filename+' startup timeout');
}
(async()=>{
 const baseline='server.main-baseline.js';
 if(!fs.existsSync(path.join(root,baseline)))throw Error('CI must create baseline with git show origin/main:server.js');
 const base=await boot(baseline,39581);
 let current;
 try{
  current=await boot('server.js',39582);
  let different=0;
  for(const route of routes){
   const a=await fetchHtml(39581,route),b=await fetchHtml(39582,route);
   // Published editorial text can change, but completed ride evidence cannot silently drift.
   if(rideEvidence(a.body)!==rideEvidence(b.body)){
    console.error('FAIL verified ride evidence changed:',route,'baseline',hash(rideEvidence(a.body)),'new',hash(rideEvidence(b.body)));
    different++;
   }
   const origTimes=[],newTimes=[];
   for(let i=0;i<3;i++){
    origTimes.push((await fetchHtml(39581,route)).ms);
    newTimes.push((await fetchHtml(39582,route)).ms);
   }
   console.log(JSON.stringify({
    route,baselineHtmlHash:hash(a.body),newHtmlHash:hash(b.body),
    baselineMedianMs:median(origTimes),cachedMedianMs:median(newTimes),
    bytes:Buffer.byteLength(b.body)
   }));
  }
  if(different)throw Error(different+' regional completed-ride evidence sets differ');
  console.log('PASS: four regional pages preserve completed-ride evidence; unrelated editorial updates allowed');
 }finally{
  base.kill();
  current?.kill();
 }
})().catch(err=>{console.error(err);process.exitCode=1});
