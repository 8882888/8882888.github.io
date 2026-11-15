#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const crypto=require('node:crypto');
// Cloudtype's /health release is sha256(server.js)[:16].
// Use the exact same production contract, not an inferred GitHub commit id.
const official='https://jeongukdaeri.kr';
const expected='sha256-'+crypto.createHash('sha256').update(fs.readFileSync(require('node:path').join(__dirname,'..','server.js'))).digest('hex').slice(0,16);
const strict=process.argv.includes('--strict');
const maxAttempts=strict?24:1;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const meta=html=>html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]||'';
(async()=>{
 let got='',error='';
 for(let n=1;n<=maxAttempts;n++){
  try{
   const url=official+'/health?cache-bust='+Date.now();
   const response=await fetch(url,{signal:AbortSignal.timeout(14000),headers:{'Cache-Control':'no-cache'}});
   if(!response.ok)throw Error('HTTP '+response.status);
   const health=await response.json();
   got=String(health.release||'');
   console.log(JSON.stringify({attempt:n,expected,live:got,match:expected===got}));
   if(got===expected){
    for(const path of ['/daeri/gyeonggi/','/daeri/gangwon/','/taksong/gyeonggi/','/taksong/chungbuk/']){
     const res=await fetch(official+path+'?release-verification='+Date.now(),{signal:AbortSignal.timeout(16000),headers:{'Cache-Control':'no-cache'}});
     if(!res.ok)throw Error(path+' HTTP '+res.status);
     const description=meta(await res.text());
     if(description.length>160)throw Error(path+' old meta description still in production '+description.length);
     console.log('LIVE',path,'meta chars',description.length);
    }
    console.log('PASS Cloudtype server.js release and four updated province snippets');
    return;
   }
   error='live revision '+got+' differs from '+expected;
  }catch(e){error=e.message;console.warn('Probe',n,'failed:',error)}
  if(n<maxAttempts)await pause(12000);
 }
 console.error('UNVERIFIED Cloudtype rollout:',error,'; strict='+strict);
 if(strict)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
