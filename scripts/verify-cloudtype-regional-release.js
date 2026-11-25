#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const crypto=require('node:crypto');
// Cloudtype /health fingerprints server.js and the independent regional evidence module.
// Use the exact same production contract, not an inferred GitHub commit id.
const official='https://jeongukdaeri.kr';
const expected='sha256-'+crypto.createHash('sha256').update(fs.readFileSync(require('node:path').join(__dirname,'..','server.js'))).digest('hex').slice(0,16);
const regionalModule=require('node:path').join(__dirname,'..','lib','regional-evidence-journeys.cjs');
const expectedRegional='sha256-'+crypto.createHash('sha256').update(fs.readFileSync(regionalModule)).digest('hex').slice(0,16);
const expectedRegionPages=require(regionalModule).plans.length*2;
const localityModule=require('node:path').join(__dirname,'..','lib','nationwide-locality-explorer.js');
const expectedLocality='sha256-'+crypto.createHash('sha256').update(fs.readFileSync(localityModule)).digest('hex').slice(0,16);
const legalRoot=require('node:path').join(__dirname,'..','data','legal-regions');
const expectedLocalities=new Set(Array.from({length:17},(_,i)=>JSON.parse(fs.readFileSync(require('node:path').join(legalRoot,String(i+1).padStart(2,'0')+'.json'),'utf8')).full_names).flat()).size;
const localityMatches=health=>health?.localitySearch?.revision===expectedLocality&&health.localitySearch.regionCount===expectedLocalities;
const regionalMatches=health=>health?.regionalEvidence?.revision===expectedRegional&&health.regionalEvidence.activeRegionServicePages===expectedRegionPages;
if(process.argv.includes('--self-test')){
 const assert=require('node:assert/strict');
 assert.equal(regionalMatches({}),false);
 assert.equal(regionalMatches({regionalEvidence:{revision:expectedRegional,activeRegionServicePages:expectedRegionPages-2}}),false);
 assert.equal(regionalMatches({regionalEvidence:{revision:'sha256-stale',activeRegionServicePages:expectedRegionPages}}),false);
 assert.equal(regionalMatches({regionalEvidence:{revision:expectedRegional,activeRegionServicePages:expectedRegionPages}}),true);
 assert.equal(localityMatches({}),false);
 assert.equal(localityMatches({localitySearch:{revision:expectedLocality,regionCount:expectedLocalities-1}}),false);
 assert.equal(localityMatches({localitySearch:{revision:'sha256-stale',regionCount:expectedLocalities}}),false);
 assert.equal(localityMatches({localitySearch:{revision:expectedLocality,regionCount:expectedLocalities}}),true);
 console.log('PASS nationwide locality rollout guard');
 console.log('PASS regional rollout guard rejects missing, stale and incomplete content evidence');
 process.exit(0);
}
const baselinePath=require('node:path').join(__dirname,'..','server.main-baseline.js');
const baseline=fs.existsSync(baselinePath)?'sha256-'+crypto.createHash('sha256').update(fs.readFileSync(baselinePath)).digest('hex').slice(0,16):null;
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
   console.log(JSON.stringify({attempt:n,expected,baselineMain:baseline,live:got,match:expected===got,baselineMainMatchesLive:baseline===got,expectedRegional,expectedRegionPages,liveRegional:health.regionalEvidence?.revision??null,liveRegionPages:health.regionalEvidence?.activeRegionServicePages??null,regionalMatch:regionalMatches(health),expectedLocality,expectedLocalities,liveLocality:health.localitySearch?.revision??null,liveLocalities:health.localitySearch?.regionCount??null,localityMatch:localityMatches(health)}));
   if(got===expected&&regionalMatches(health)&&localityMatches(health)){
    for(const path of ['/daeri/gyeonggi/','/daeri/gangwon/','/taksong/gyeonggi/','/taksong/chungbuk/']){
     const res=await fetch(official+path+'?release-verification='+Date.now(),{signal:AbortSignal.timeout(16000),headers:{'Cache-Control':'no-cache'}});
     if(!res.ok)throw Error(path+' HTTP '+res.status);
     const description=meta(await res.text());
     if(description.length>160)throw Error(path+' old meta description still in production '+description.length);
     console.log('LIVE',path,'meta chars',description.length);
    }
    console.log('PASS Cloudtype server.js release and four updated province snippets');
    console.log('PASS Cloudtype regional content release',expectedRegional,'active pages',expectedRegionPages);
    console.log('PASS Cloudtype nationwide locality search',expectedLocality,'loaded regions',expectedLocalities);
    return;
   }
   error=got!==expected?'live revision '+got+' differs from '+expected:!regionalMatches(health)?'regional evidence revision or active page count does not match expected content':'nationwide locality search revision or region count does not match expected source';
  }catch(e){error=e.message;console.warn('Probe',n,'failed:',error)}
  if(n<maxAttempts)await pause(12000);
 }
 console.error('UNVERIFIED Cloudtype rollout:',error,'; strict='+strict);
 if(strict)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
