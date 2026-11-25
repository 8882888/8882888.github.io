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
 return {status:r.status,location:r.headers.get('location'),hostMode:r.headers.get('x-smart24-host-mode'),html:r.status===200?await r.text():''};
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

 // Supplement the two original strict checks with read-only alias probes.
 // A failed DNS/TLS request is not proof of a redirect or of a search penalty.
 const aliases=[
  {name:'legacy GitHub Pages',base:old,paths:['/','/region/','/special/','/region/seoul-daeri-taksong/','/region/incheon-daeri-taksong/','/region/gyeonggi-daeri-taksong/','/service/daeri/']},
  {name:'www',base:'https://www.jeongukdaeri.kr',paths:['/','/daeri/','/taksong/','/robots.txt','/sitemap-all.xml']},
  {name:'Cloudtype direct',base:'https://port-0-smart24-taksong-backup-mviupa4l4c8a9dbf.sel3.cloudtype.app',paths:['/','/daeri/','/taksong/','/robots.txt','/sitemap-all.xml']}
 ];
 const results=await Promise.all(aliases.flatMap(alias=>alias.paths.map(async p=>{
  const url=alias.base+p,target=official+p;
  try{
   const r=await get(url);
   const location=r.location?new URL(r.location,url).href:null;
   const c=canonical(r.html)||null;
   const status=[301,308].includes(r.status)&&location===target?'PERMANENT_REDIRECT':
    r.status===404?'NOT_FOUND':r.status===200?'SERVES_200':
    [302,307].includes(r.status)?'TEMPORARY_REDIRECT':'OTHER_RESPONSE';
   const robots=p==='/robots.txt'&&r.status===200?
    r.html.split(/\r?\n/).map(line=>line.trim()).filter(line=>/^(User-agent|Allow|Disallow|Sitemap):/i.test(line)).slice(0,30):undefined;
   return {alias:alias.name,url,http:r.status,location,canonical:c,status,robots};
  }catch(e){return {alias:alias.name,url,status:'UNREACHABLE',error:String(e.message)}}
 })));
 for(const result of results)console.log('ALIAS_PROBE '+JSON.stringify(result));
 // Check what the application actually receives without exposing raw proxy headers.
 for(const base of [official,aliases[2].base]){
  try{const r=await get(base+'/health');console.log('HOST_MODE '+JSON.stringify({base,http:r.status,mode:r.hostMode||'not-deployed'}))}
  catch(e){console.log('HOST_MODE '+JSON.stringify({base,status:'UNREACHABLE',error:String(e.message)}))}
 }
 // Do not mark an existing release healthy from alias HTTP status alone.

 if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
