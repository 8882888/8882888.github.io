'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const load=x=>JSON.parse(fs.readFileSync(path.join(ROOT,x),'utf8'));
const directory=path.join(ROOT,'data');
const files=fs.readdirSync(directory).filter(name=>/^naver-regional-focus-.*\.json$/.test(name)&&!name.includes('candidates')).sort();
const rows=files.flatMap(file=>load('data/'+file).priority.map((row,index)=>({...row,file,position:index+1})));
const curated=new Map(load('data/priority-regions.json').pages.map(x=>[x.kind+'|'+x.region,x]));
const reviewedOriginals=load('data/seo-reviewed-local-originals-20261116.json').items;
const selection={
 'naver-regional-focus-50.json':[17,22,26,29,31,33,35,45,47,48,49,50],
 'naver-regional-focus-next-50.json':[60,72,80,86,92,93],
 'naver-regional-focus-third-50.json':[106,135,148],
 'naver-regional-focus-fourth-50.json':[156,157,168,169,191,193,196]
};
const selected=new Set(Object.entries(selection).flatMap(([file,ids])=>ids.map(id=>file+'#'+id)));
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const signature=s=>crypto.createHash('sha256').update(clean(s)).digest('hex').slice(0,16);
const duplicateCounts=new Map();
for(const row of rows)for(const field of ['pickup','handover']){
 const key=field+':'+signature(row[field]);
 duplicateCounts.set(key,(duplicateCounts.get(key)||0)+1);
}
const unsafeClaim=/100%\s*(?:보장|배차)|즉시\s*배차\s*보장|상시\s*상주|무조건\s*배차/;
function issues(row){
 const result=[];
 const region=clean(row.region),keyword=clean(row.keyword),topic=clean(row.topic),pickup=clean(row.pickup),handover=clean(row.handover),related=clean(row.related);
 if(!region||!keyword)result.push('missing_region_or_keyword');
 if(topic.length<13)result.push('thin_topic');
 if(pickup.length<80)result.push('thin_pickup_context');
 if(handover.length<75)result.push('thin_handover_context');
 if(!related)result.push('missing_related_service_link');
 if(duplicateCounts.get('pickup:'+signature(pickup))>1)result.push('repeated_pickup_text');
 if(duplicateCounts.get('handover:'+signature(handover))>1)result.push('repeated_handover_text');
 if(unsafeClaim.test([topic,pickup,handover].join(' ')))result.push('review_unverified_dispatch_claim');
 const locality=region.split(/\s+/).at(-1);
 if(locality&&![topic,pickup,handover].join(' ').includes(locality))result.push('last_locality_not_in_guidance');
 return result;
}
test('all source records preserved and 28 human-reviewed region guides meet existing content rubric',()=>{
 assert.equal(rows.length,2900,'no rows added, removed or lost');
 assert.equal(new Set(rows.map(x=>x.kind+'|'+x.region)).size,2900);
 assert.equal(selected.size,28);
 const chosen=rows.filter(x=>selected.has(x.file+'#'+x.id));
 assert.equal(chosen.length,28,'all selected records remain in their original source files');
 for(const row of chosen){
  assert(curated.has(row.kind+'|'+row.region),'existing reviewed editorial source: '+row.keyword);
  assert.deepEqual(issues(row),[],row.keyword+' should have real locality details, enough depth and a relevant canonical service path');
  assert.match(row.related,/^\/(?:service|business)\/[a-z0-9/-]+\/$/,'existing service guide');
  assert(!/운행(?:완료|확정)|배차완료|정비센터\s*공식\s*제휴|실제\s*완료\s*후기/.test([row.topic,row.pickup,row.handover].join(' ')),row.keyword+' cannot invent completion or partnership');
  assert(row.pickup.includes(row.region.split(/\s+/).at(-1)),row.keyword+' must identify a real region in pickup');
  // The same city may be described by an existing guide or related post, but
  // neither is itself proof that a specific trip occurred.
  const originals=reviewedOriginals.filter(x=>x.kind===row.kind&&x.region===row.region);
  for(const source of originals)assert(['city_guide','regional_guide','city_or_origin','related_service'].includes(source.scope),'preserve source scope');
 }
 const pass=rows.filter(x=>issues(x).length===0).length;
 const needsReview=rows.length-pass;
 assert(pass>=357,'no drop below 329 baseline + 28 newly reviewed guides');
 console.log(JSON.stringify({scope:'editorial source heuristic, not Naver index',total:rows.length,passed:pass,needsReview,comparedBaseline:{passed:329,needsReview:2571},expectedNewPasses:28},null,2));
});
test('new paragraphs are not interchangeable boilerplate across the 28 reviewed service pages',()=>{
 const chosen=rows.filter(x=>selected.has(x.file+'#'+x.id));
 assert.equal(new Set(chosen.map(x=>signature(x.pickup))).size,28);
 assert.equal(new Set(chosen.map(x=>signature(x.handover))).size,28);
 assert.equal(new Set(chosen.map(x=>x.keyword)).size,28);
 for(const row of chosen){
  assert(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75);
  assert(row.pickup!==row.handover);
 }
});

test('reviewed locality guidance is visible in crawler-facing HTML rather than source files alone',async()=>{
 const {spawn}=require('node:child_process');
 const port=39876,host='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server.js'],{cwd:ROOT,env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let started=false;
  for(let i=0;i<90;i++){
   if(child.exitCode!==null)throw Error('local source server exited '+child.exitCode);
   try{const r=await fetch(host+'/health',{signal:AbortSignal.timeout(1200)});if(r.ok){started=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,225));
  }
  assert(started,'local source server started');
  for(const id of [17,26,60,86,148,196]){
   const source=rows.find(x=>x.id===id);
   assert(source,'selected source '+id);
   const lookup=await fetch(host+'/?q='+encodeURIComponent(source.keyword),{redirect:'manual',signal:AbortSignal.timeout(12000)});
   assert.equal(lookup.status,302,source.keyword+' canonical keyword resolution');
   const location=decodeURI(lookup.headers.get('location')||'');
   assert(location.startsWith('/'),source.keyword+' must resolve to a same-site canonical');
   const response=await fetch(host+location,{signal:AbortSignal.timeout(20000)});
   assert.equal(response.status,200,source.keyword+' live HTML');
   assert(!/noindex/i.test(response.headers.get('x-robots-tag')||''),source.keyword+' is not hidden by X-Robots-Tag');
   const html=await response.text();
   assert(html.includes(source.topic),source.keyword+' source-specific title must be rendered');
   assert(html.includes(source.pickup),source.keyword+' pickup instructions must be rendered');
   assert(html.includes(source.handover),source.keyword+' destination handover instructions must be rendered');
   assert(html.includes('href="'+source.related+'"'),source.keyword+' related canonical service link');
   assert(html.includes('tel:18114294'),source.keyword+' preserves customer contact');
  }
 }finally{child.kill();}
});
