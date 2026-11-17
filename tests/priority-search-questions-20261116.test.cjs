'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const path=require('node:path');
const data=require('../data/priority-search-questions-20261116.json');
const originals=require('../data/seo-reviewed-local-originals-20261116.json');
const root=path.join(__dirname,'..'),origin='http://127.0.0.1:39855';
const mapping=[
 ['세종특별자치시','daeri','/daeri/sejong/'],
 ['세종특별자치시','taksong','/taksong/sejong/'],
 ['부산광역시 기장군','taksong','/taksong/busan/gijang-gun/'],
 ['강원특별자치도 원주시','taksong','/taksong/gangwon/wonju-si/'],
 ['경상남도 진주시','taksong','/taksong/gyeongnam/jinju-si/'],
 ['전라남도 나주시','taksong','/taksong/jeonnam/naju-si/'],
 ['경상북도 김천시','taksong','/taksong/gyeongbuk/gimcheon-si/']
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
test('seven priority search intent guides are evidence-scoped and uniquely worded',()=>{
 assert.equal(data.items.length,7);
 const qs=new Set(),as=new Set(),scenarioNames=new Set(),scenarioCells=new Set();
 for(const [region,kind] of mapping){
  const doc=data.items.find(x=>x.region===region&&x.kind===kind);
  assert(doc);assert.equal(doc.questions.length,2);
  assert.equal(doc.scenarios.length,3,'exactly three distinct location-specific intake scenarios');
  for(const row of doc.scenarios){
   assert(row.scenario.length>=10&&row.location.length>=30&&row.prepare.length>=25,
    'scenario must offer substantial specific location and consultation facts');
   assert(!scenarioNames.has(row.scenario),'scenario heading must not be reused across localities');
   assert(!scenarioCells.has(row.location),'exact duplicate intake guidance');
   assert(!/(완료 운행했습니다|무조건 배차|즉시 배차 보장|항상 기사 상주)/.test(row.scenario+' '+row.location+' '+row.prepare),
    'unverified ride or dispatch claims not permitted');
   scenarioNames.add(row.scenario);scenarioCells.add(row.location);
  }
  assert(originals.items.some(x=>x.region===region&&x.kind===kind),'must have reviewed source');
  assert(/^\/(?:service|business)\//.test(doc.relatedPath));
  for(const {q,a} of doc.questions){
   assert(q.length>=25&&a.length>=80,'substantial customer-specific Q&A');
   assert(!qs.has(q)&&!as.has(a),'no templated duplicate');
   assert(!/(실제 완료 운행했습니다|무조건 배차|즉시 배차 보장)/.test(a));
   qs.add(q);as.add(a);
  }
 }
});
test('seven priority canonical pages show distinct question section and preserve actual source links',async()=>{
 const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'39855',PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ok=false;
  for(let i=0;i<75;i++){
   if(child.exitCode!==null)throw Error('server exited');
   try{if((await fetch(origin+'/health',{signal:AbortSignal.timeout(1100)})).ok){ok=true;break}}catch{}
   await sleep(250);
  }
  assert(ok);
  for(const [region,kind,route] of mapping){
   const res=await fetch(origin+route,{signal:AbortSignal.timeout(18000)});
   assert.equal(res.status,200,route);
   const html=await res.text();
   const section=html.match(/<section id="priority-search-questions-20261116"[\s\S]*?<\/section>/)?.[0];
   assert(section,route+' FAQ visible in server HTML');
   const doc=data.items.find(x=>x.region===region&&x.kind===kind);
   for(const {q,a} of doc.questions){assert(section.includes(q),q);assert(section.includes(a),a)}
   assert(section.includes('id="priority-scenario-guide-20261117"'),route+' scenario table required');
   assert(section.includes('<caption>')&&section.includes('scope="col"'),route+' semantic table required');
   const scenarioBlock=section.split('id="priority-scenario-guide-20261117"')[1]||'';
   const body=scenarioBlock.split('<tbody>')[1]?.split('</tbody>')[0]||'';
   assert.equal((body.match(/<tr>/g)||[]).length,3,route+' exactly three real decision rows');
   for(const row of doc.scenarios){
    assert(body.includes(row.scenario),route+' must distinguish specific place');
    assert(body.includes(row.location),route+' must show concrete local intake facts');
    assert(body.includes(row.prepare),route+' must show next booking details');
   }
   assert(section.includes('href="'+doc.relatedPath+'"'));
   assert(html.includes('id="priority-original-sources"'),route+' source link preserved');
   assert(html.includes('href="https://jeongukdaeri.kr'+route+'"'),route+' self canonical');
   assert(!/<meta name="robots" content="noindex/.test(html));
  }
 }finally{child.kill()}
});
