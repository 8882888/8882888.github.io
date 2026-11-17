'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {createSourceBackedContext}=require('../lib/source-backed-local-context.cjs');
const root=path.resolve(__dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const sources=load('data/verified-archive-local-context-20261117.json').items;
const raw=load('data/ride-history.json');
const archived=Array.from({length:9},(_,i)=>
 load('data/regional-review-links-batch-'+String(i+1).padStart(3,'0')+'-'+(i===8?'191':'300')+'.json')).flatMap(x=>x.items);
const legal=fs.readdirSync(path.join(root,'data/legal-regions')).filter(x=>/^\d{2}\.json$/.test(x))
 .flatMap(x=>load('data/legal-regions/'+x).full_names);
const regionMap=new Map(legal.map(full_name=>[full_name,{full_name}]));
test('six region-specific paragraphs have date, service, locality and original archival proof',()=>{
 const result=createSourceBackedContext(sources,archived,raw,regionMap);
 assert.equal(result.size,6);
 assert.equal(new Set(result.keys).size,6);
 assert.equal(sources.reduce((n,r)=>n+r.evidenceIds.length,0),13);
 for(const item of sources){
  assert(item.heading.length>=15&&item.context.length>=65&&item.preparation.length>=65,item.region+' substantial unique guidance');
  assert(!/공식\s*제휴|100%\s*배차|배차완료|운행완료/.test(item.context+' '+item.preparation),item.region+' no fabricated completion');
  assert(new Set(item.evidenceIds).size===item.evidenceIds.length,item.region+' distinct source IDs');
 }
 const mutated=structuredClone(sources);
 mutated[0].evidenceDates[0]='2024-01-01';
 assert.throws(()=>createSourceBackedContext(mutated,archived,raw,regionMap),/date mismatch/);
 const changed=structuredClone(sources);
 changed[1].requiredTokens[0]='광안리공식가짜출발지';
 assert.throws(()=>createSourceBackedContext(changed,archived,raw,regionMap),/cue mismatch/);
});
test('six existing canonical URLs expose original source context before generic booking section',async()=>{
 const PORT=39881,host='http://127.0.0.1:'+PORT;
 const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(PORT),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<110;i++){
   if(child.exitCode!==null)throw Error('server crashed '+child.exitCode);
   try{if((await fetch(host+'/health',{signal:AbortSignal.timeout(1100)})).ok){ready=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,200));
  }
  assert(ready,'real source server');
  for(const item of sources){
   const searchKeywords={
    '인천광역시 연수구':'인천연수구탁송',
    '경기도 오산시':'오산탁송','경기도 양주시':'양주탁송',
    '경상남도 밀양시':'밀양탁송','경기도 시흥시':'시흥탁송',
    '충청북도 충주시':'충주탁송'};
   const keyword=searchKeywords[item.region];
   const lookup=await fetch(host+'/?q='+encodeURIComponent(keyword),{redirect:'manual',signal:AbortSignal.timeout(12000)});
   assert.equal(lookup.status,302,item.region+' canonical query lookup');
   const destination=decodeURI(lookup.headers.get('location')||'');
   assert(destination.startsWith('/taksong/'),item.region+' existing taksong canonical');
   const response=await fetch(host+destination,{signal:AbortSignal.timeout(24000)});
   assert.equal(response.status,200,item.region+' existing original page');
   const html=await response.text();
   assert.equal(html.split('id="source-backed-local-journey-20261117"').length-1,1,item.region+' exactly one supported note');
   const i=html.indexOf('id="source-backed-local-journey-20261117"'),g=html.indexOf('id="regional-taksong-quick-start"');
   assert(i>0&&g>i,item.region+' evidence first');
   assert(html.includes(item.heading)&&html.includes(item.context)&&html.includes(item.preparation),item.region+' evidence and preparations in HTTP body');
   for(const id of item.evidenceIds)assert(html.includes('href="/reviews/history/'+id+'/"'),item.region+' original record '+id);
   assert(html.includes('<link rel="canonical" href="https://jeongukdaeri.kr'+destination+'">'),item.region+' canonical preserved');
   assert(!/noindex/i.test(response.headers.get('x-robots-tag')||''),item.region+' crawler open');
   assert(html.includes('href="tel:18114294"'),'phone preserved');
  }
 }finally{child.kill()}
});
