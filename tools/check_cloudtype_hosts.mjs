#!/usr/bin/env node
/**
 * Read-only check of the official Cloudtype domain and the operator's
 * Cloudtype direct-host alias. Fingerprints prove only the named source files.
 * They do not prove Naver indexing or that every deployed artifact is current.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const sources=['server.js','data/priority-regions.json','data/seo-pages.json'];
const hashes=Object.fromEntries(await Promise.all(sources.map(async name=>
  [name,crypto.createHash('sha256').update(await fs.readFile(path.join(root,name))).digest('hex')])));
const hosts=[
  {key:'official',base:process.env.CLOUDTYPE_OFFICIAL_URL||'https://jeongukdaeri.kr'},
  {key:'direct',base:process.env.CLOUDTYPE_DIRECT_URL||'https://port-0-smart24-taksong-backup-mviupa4l4c8a9dbf.sel3.cloudtype.app'}
];
const results=await Promise.all(hosts.map(async host=>{
  const result={host:host.key,url:host.base,ok:false,mismatches:[]};
  try{
    const cleanHost=host.base.endsWith('/')?host.base.slice(0,-1):host.base;
    const url=cleanHost+'/health/seo.json?release_audit='+hashes['server.js'].slice(0,12);
    const response=await fetch(url,{signal:AbortSignal.timeout(15000),redirect:'follow',
      headers:{accept:'application/json','cache-control':'no-cache','user-agent':'Smart24-Cloudtype-Host-Audit/1.0'}});
    result.status=response.status;
    result.finalHost=new URL(response.url).hostname;
    if(!response.ok){result.error='HTTP '+response.status;return result;}
    const data=await response.json();
    const deployed=data.deployment_hashes||{};
    for(const name of sources){
      if(deployed[name]!==hashes[name])result.mismatches.push(name);
    }
    result.ok=result.mismatches.length===0;
  }catch(e){result.error=String(e?.message||e).slice(0,300);}
  return result;
}));
const report={at:new Date().toISOString(),source:'GitHub checkout vs Cloudtype health metadata',
  note:'Technical source fingerprint checks only; not Naver indexed URL counts, not proof of all deployed files.',
  sourceHashPrefixes:Object.fromEntries(sources.map(name=>[name,hashes[name].slice(0,16)])),results};
const dir=process.env.CLOUDTYPE_CHECK_REPORT_DIR||'reports';
await fs.mkdir(dir,{recursive:true});
await fs.writeFile(path.join(dir,'cloudtype-host-release-check.json'),JSON.stringify(report,null,2));
const lines=['## Cloudtype official and direct-host freshness','',
  'Compares source fingerprints for server.js, data/priority-regions.json, data/seo-pages.json only. Does not measure Naver indexing.',''];
for(const r of results)lines.push('- '+r.host+' ('+r.url+'): '+(r.ok?'PASS':'NOT VERIFIED')+
  ' · HTTP '+(r.status??'unavailable')+' · final host '+(r.finalHost||'unknown')+
  (r.mismatches.length?' · mismatches '+r.mismatches.join(', '):'')+
  (r.error?' · '+r.error:''));
if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,lines.join(String.fromCharCode(10))+String.fromCharCode(10));
console.log(JSON.stringify(report,null,2));
if(results.some(r=>!r.ok))process.exitCode=1;
