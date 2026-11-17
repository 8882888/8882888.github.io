'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {archiveEvidenceIndex,renderEvidenceDirectory}=require('../lib/archived-ride-evidence-directory.cjs');
const ROOT=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const history=read('data/ride-history.json');
const batches=Array.from({length:9},(_,i)=>
 read('data/regional-review-links-batch-'+String(i+1).padStart(3,'0')+'-'+(i===8?'191':'300')+'.json')).flatMap(x=>x.items);
const dir=path.join(ROOT,'data/legal-regions');
const fullNames=fs.readdirSync(dir).filter(x=>/^\d{2}\.json$/.test(x)).flatMap(x=>read('data/legal-regions/'+x).full_names);
const known=new Map(fullNames.map(region=>[region,{full_name:region}]));
const coverage=archiveEvidenceIndex(batches,known);
const API='http://127.0.0.1:39879',PORT='39879';
test('classify actual archived records into known legal regions without guessing unknown places',()=>{
 assert.equal(history.length,2591);
 assert.equal(batches.length,2591);
 assert.equal(coverage.overview.total,2591);
 assert.equal(coverage.overview.regionUnresolved,2183,'never infer 2183 unknown trip geographies');
 assert.equal(coverage.overview.classified+coverage.overview.unmappedRegion+coverage.overview.invalidReference,408);
 assert(coverage.overview.classified>300,'recognize most exact archive-to-legal-region pairs');
 assert(coverage.overview.uniqueRegionService>80,'enough distinct source-backed region types');
 assert.equal(coverage.sections.daeri[0].region,'인천광역시 강화군');
 assert.equal(coverage.sections.daeri[0].archiveIds.length,42);
 assert.equal(coverage.sections.taksong[0].region,'인천광역시 연수구');
 assert.equal(coverage.sections.taksong[0].archiveIds.length,40);
 for(const kind of ['daeri','taksong']){
  const selected=coverage.sections[kind];
  assert(selected.length>4&&selected.length<=20);
  assert(selected.every(z=>z.kind===kind&&z.archiveIds.length>=2));
  assert.equal(new Set(selected.map(x=>x.region)).size,selected.length);
  assert(selected.every(z=>z.urls.every(u=>/^\/reviews\/history\/excel-\d{4}\/$/.test(u))));
 }
 console.log(JSON.stringify({scope:'classified archived ride source; NOT Naver index or new completed rides',
  coverage:coverage.overview,linkedTopRegionGroups:{
   daeri:coverage.sections.daeri.length,taksong:coverage.sections.taksong.length
  }}));
});
test('safe markup links existing pages and archive evidence but not unresolved records',()=>{
 const output=renderEvidenceDirectory('taksong',coverage,{
  servicePath:(r,k)=>'/'+k+'/'+r.full_name+'/',
  esc:s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')
 });
 assert(output.includes('인천광역시 연수구 자동차탁송'));
 assert(output.includes('기존 기록 중 지역 분류 40건'));
 assert(output.includes('/reviews/history/excel-0434/'));
 assert(!output.includes('null 자동차탁송'));
 assert(!output.includes('운행완료 40건'));
 assert(output.includes('현지 기사 상주·현재 배차'));
});
test('national service hubs display classified archival evidence with actual working canonical links',async()=>{
 const app=spawn(process.execPath,['server.js'],{
  cwd:ROOT,env:{...process.env,PORT,PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'
 });
 try{
  let ready=false;
  for(let t=0;t<120;t++){
   if(app.exitCode!==null)throw Error('Node server crashed '+app.exitCode);
   try{if((await fetch(API+'/health',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break}}catch{}
   await new Promise(resolve=>setTimeout(resolve,200));
  }
  assert(ready,'local real Node SSR starts');
  for(const [kind,expected] of [
   ['daeri','/daeri/incheon/ganghwa-gun/'],
   ['taksong','/taksong/incheon/yeonsu-gu/']
  ]){
   const r=await fetch(API+'/'+kind+'/',{signal:AbortSignal.timeout(30000)});
   assert.equal(r.status,200);
   const html=await r.text();
   assert.equal(html.split('id="classified-archive-locality-links"').length-1,1);
   assert(html.includes('href="'+expected+'"'),kind+' classified source connects existing regional canonical');
   assert(html.includes('id="naver-focused-regional-discovery"'),'original curated hub retained');
   const sourceFirst=html.indexOf('id="classified-archive-locality-links"'),generic=html.indexOf('id="naver-focused-regional-discovery"');
   assert(sourceFirst<generic,'archive-backed links appear before generic region catalog');
   assert(html.includes('href="tel:18114294"'),'contact retained');
   assert(html.includes('<meta name="robots" content="index,follow,max-image-preview:large">'),'hub indexable');
   const next=await fetch(API+expected,{signal:AbortSignal.timeout(25000)});
   assert.equal(next.status,200,kind+' existing evidence-region route works');
   assert((await next.text()).includes('href="/reviews/history/'),'real record navigation remains available');
  }
 }finally{app.kill()}
});
