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
   // Cache may not change any visible content or evidence URL.
   if(a.body!==b.body){
    console.error('FAIL rendered content changed:',route,'baseline',hash(a.body),'new',hash(b.body));
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
  if(different)throw Error(different+' service pages differ after evidence cache');
  console.log('PASS: four regional HTML pages contain unchanged exact evidence and markup');
 }finally{
  base.kill();
  current?.kill();
 }
})().catch(err=>{console.error(err);process.exitCode=1});
