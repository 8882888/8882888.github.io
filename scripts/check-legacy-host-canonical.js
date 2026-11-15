#!/usr/bin/env node
'use strict';
// Diagnostic only: legacy GitHub Pages host must not claim SEO canonical ownership.
// A 200 response with correct canonical is an unresolved consolidation risk,
// but not proof of a Google or Naver indexing failure.
const old='https://8882888.github.io';
const official='https://jeongukdaeri.kr';
const paths=['/','/special/24-hour-service/'];
const canonical=html=>(html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)/i)||[])[1]||'';
async function get(url){
 const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(16000),headers:{'User-Agent':'Smart24-Legacy-Canonical-ReadOnly/1.0'}});
 return {status:r.status,location:r.headers.get('location'),html:r.status===200?await r.text():''};
}
(async()=>{
 let failed=false;
 for(const p of paths){
  const url=old+p,target=official+p;
  try{
   const r=await get(url);
   if([301,308,302,307].includes(r.status)&&new URL(r.location,url).href===target){
    console.log('PASS legacy redirects to official: '+p+' HTTP '+r.status);
   }else if(r.status===200){
    const c=canonical(r.html);
    if(c===target)console.log('WARN legacy serves HTTP 200 duplicate with correct canonical: '+p);
    else {console.error('FAIL legacy wrong canonical: '+p+' -> '+(c||'none'));failed=true}
   }else if(r.status===404){
    console.log('INFO legacy page unavailable (no duplicate): '+p);
   }else{
    console.error('FAIL unexpected legacy HTTP status '+r.status+' '+p);
    failed=true;
   }
   const current=await get(target);
   if(current.status!==200)throw Error('official '+p+' HTTP '+current.status);
   if(canonical(current.html)!==target){
    console.error('FAIL official canonical does not match '+target+': '+canonical(current.html));failed=true;
   }else console.log('PASS official canonical: '+target);
  }catch(e){console.error('FAIL '+p+' '+e.message);failed=true}
 }
 if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
