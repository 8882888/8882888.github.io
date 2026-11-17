'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {createSourceBackedContext}=require('../lib/source-backed-local-context.cjs');
const root=path.resolve(__dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const sources=load('data/verified-archive-local-context-second-six-20261117.json').items;
const first=load('data/verified-archive-local-context-20261117.json').items;
const raw=load('data/ride-history.json');
const archived=Array.from({length:9},(_,i)=>
 load('data/regional-review-links-batch-'+String(i+1).padStart(3,'0')+'-'+(i===8?'191':'300')+'.json')).flatMap(x=>x.items);
const legal=fs.readdirSync(path.join(root,'data/legal-regions')).filter(x=>/^\d{2}\.json$/.test(x))
 .flatMap(x=>load('data/legal-regions/'+x).full_names);
const regionMap=new Map(legal.map(full_name=>[full_name,{full_name}]));
const kw={
 '인천광역시 강화군':'강화대리운전','경기도 화성시':'화성탁송',
 '충청북도 음성군':'음성탁송','대구광역시 달서구':'대구달서구탁송',
 '전라남도 광양시':'광양탁송','강원특별자치도 양양군':'양양탁송'
};
const safety=/배차완료|운행완료|공식\s*제휴|상시\s*상주|확정\s*요금/;
test('second curated set matches exact original archives without fabricated claims',()=>{
 assert.equal(sources.length,6);
 assert.equal(sources.reduce((n,item)=>n+item.evidenceIds.length,0),17);
 assert.equal(new Set(sources.map(x=>x.kind+'|'+x.region)).size,6);
 assert.equal(new Set(first.map(x=>x.kind+'|'+x.region).concat(sources.map(x=>x.kind+'|'+x.region))).size,12);
 assert.equal(raw.length,2591);
 const result=createSourceBackedContext(sources,archived,raw,regionMap);
 assert.equal(result.size,6);
 for(const item of sources){
  assert(item.heading.length>=15&&item.context.length>=75&&item.preparation.length>=75,item.region+' meaningful specific guidance');
  assert(!safety.test(item.context+' '+item.preparation),item.region+' prohibited unsupported claims');
  assert(new Set(item.evidenceIds).size===item.evidenceIds.length,item.region+' duplicate archive references');
  assert(kw[item.region],item.region+' explicit query');
 }
 const badDate=structuredClone(sources);
 badDate[0].evidenceDates[0]='2020-01-01';
 assert.throws(()=>createSourceBackedContext(badDate,archived,raw,regionMap),/date mismatch/);
 const badOrigin=structuredClone(sources);
 badOrigin[1].requiredTokens[0]='존재하지않는출발원문';
 assert.throws(()=>createSourceBackedContext(badOrigin,archived,raw,regionMap),/cue mismatch/);
});
test('six EXISTING canonical pages put dated original customer preparation before generic guidance',async()=>{
 const PORT=39882,host='http://127.0.0.1:'+PORT;
 const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(PORT),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<110;i++){
   if(child.exitCode!==null)throw Error('server crashed '+child.exitCode);
   try{if((await fetch(host+'/health',{signal:AbortSignal.timeout(1100)})).ok){ready=true;break}}catch{}
   await new Promise(resolve=>setTimeout(resolve,200));
  }
  assert(ready,'source server ready');
  for(const item of sources){
   const keyword=kw[item.region];
   const lookup=await fetch(host+'/?q='+encodeURIComponent(keyword),{redirect:'manual',signal:AbortSignal.timeout(12000)});
   assert.equal(lookup.status,302,item.region+' query redirects');
   const location=lookup.headers.get('location')||'';
   assert(location.startsWith('/'+item.kind+'/'),item.region+' existing service canonical');
   assert(!location.includes('?'),item.region+' canonical not a query URL');
   const page=await fetch(host+location,{signal:AbortSignal.timeout(24000)});
   assert.equal(page.status,200,item.region+' canonical HTTP 200');
   const html=await page.text(), id='id="source-backed-local-journey-20261117"';
   assert.equal(html.split(id).length-1,1,item.region+' exactly one source section');
   assert(html.includes(item.heading)&&html.includes(item.context)&&html.includes(item.preparation),item.region+' original paragraphs in server HTML');
   const beforeGeneric=html.indexOf(id),generic=html.indexOf('id="regional-taksong-quick-start"');
   if(generic!==-1)assert(beforeGeneric>=0&&beforeGeneric<generic,item.region+' source evidence appears first');
   for(const id of item.evidenceIds)assert(html.includes('href="/reviews/history/'+id+'/"'),item.region+' original '+id);
   assert(html.includes('<link rel="canonical" href="https://jeongukdaeri.kr'+location+'">'),item.region+' self canonical');
   assert(!/noindex/i.test(page.headers.get('x-robots-tag')||''),item.region+' index header');
   assert(html.includes('href="tel:18114294"'),'phone preserved');
   assert(html.includes('href="/fare/?service='+item.kind+'&amp;from='),'quote preserved');
  }
 }finally{child.kill()}
});
