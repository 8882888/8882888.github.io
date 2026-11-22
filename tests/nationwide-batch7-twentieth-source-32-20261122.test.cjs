'use strict';
// Seventh evidence-first regional rewrite: 16 provinces x 2 services. Not Naver metrics.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const ids={
 daeri:[2601,2611,2618,2625,2631,2635,2639,2645,2663,2670,2675,2680,2685,2688,2692,2697],
 taksong:[2501,2511,2518,2525,2531,2535,2539,2545,2563,2570,2575,2580,2585,2588,2592,2597]
};
const read=kind=>JSON.parse(fs.readFileSync(path.join(root,'data','naver-regional-focus-twentieth-'+kind+'-100.json'),'utf8')).priority;
test('original 2x100 source records and identity, service and canonical links are unchanged',()=>{
 for(const kind of ['daeri','taksong']){
  const rows=read(kind);
  assert.equal(rows.length,100);
  assert.equal(new Set(rows.map(x=>x.id)).size,100);
  assert.equal(new Set(rows.map(x=>x.region.split(/\s+/)[0])).size,17);
  assert.ok(rows.every(x=>x.kind===kind&&x.id&&x.region&&x.keyword&&x.related?.startsWith('/')));
 }
});
test('each service gets 16 unique locality-specific pickup and handover passages, never invented actual rides',()=>{
 const provincesByKind={};
 const pickup=new Set(),handover=new Set();
 for(const kind of ['daeri','taksong']){
  const rows=read(kind), provinces=new Set();
  for(const id of ids[kind]){
   const x=rows.find(x=>x.id===id);
   assert.ok(x,'Original record missing '+id);
   const locality=x.region.split(/\s+/).at(-1);
   assert.ok(x.pickup.length>=115&&x.handover.length>=115,'Insufficient original detail '+id);
   assert.ok(x.pickup.includes(locality)&&x.handover.includes(locality),'Missing distinct locality '+id);
   assert.ok(!pickup.has(x.pickup),'Duplicated pickup '+id);
   assert.ok(!handover.has(x.handover),'Duplicated handover '+id);
   pickup.add(x.pickup);handover.add(x.handover);
   assert.doesNotMatch(x.pickup+' '+x.handover,/100%\s*(?:배차|보장)|항상\s*상주|실제\s*운행을\s*완료|운행기록\s*\d+건|기록요금\s*\d+원|반드시\s*기사\s*배정/,'Unverified dispatch or fare '+id);
   provinces.add(x.region.split(/\s+/)[0]);
  }
  provincesByKind[kind]=provinces;
  assert.equal(provinces.size,16,'One source per province excluding reviewed Sejong');
  assert.ok(!provinces.has('세종특별자치시'));
 }
 assert.deepEqual([...provincesByKind.daeri].sort(),[...provincesByKind.taksong].sort());
 for(const [id,kind] of [[2643,'daeri'],[2543,'taksong']]){
  const sejong=read(kind).find(x=>x.id===id);
  assert.ok(sejong.pickup.length>145&&sejong.handover.length>145,'Keep reviewed Sejong entirely intact');
 }
});
test('nationwide full quality and normalized template check improves against sixth round',()=>{
 const q=JSON.parse(fs.readFileSync(path.join(root,'ai-index-quality-review.json'),'utf8'));
 const d=JSON.parse(fs.readFileSync(path.join(root,'ai-index-template-reuse.json'),'utf8'));
 assert.equal(q.totals.reviewed,2900);
 assert.equal(q.totals.needsReview+q.totals.fullyPassing,2900);
 assert.ok(q.totals.fullyPassing>=606,'Must improve over sixth-round 574 by at least 32');
 assert.ok(q.totals.needsReview<=2294,'Must improve sixth-round 2326 queue by at least 32');
 assert.equal(d.sourceFiles,33);
 assert.equal(d.totalRecords,2900);
 assert.equal(d.officialProvinces,17);
 assert.equal(d.missingProvinceCount,0);
 assert.ok(d.affectedDistinctGuideCount<=1989,'Do not increase sixth-round 1989 repeated-guide impact');
 for(const k of ['naverIndexed','naverImpressions','naverClicks','naverCtr'])assert.equal(d[k],null,'Official Search Advisor value not accessible: '+k);
});
