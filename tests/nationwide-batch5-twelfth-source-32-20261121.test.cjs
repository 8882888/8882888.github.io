'use strict';
// Fifth nationwide round: preserve IDs and improve real customer guidance,
// without invented jobs, fares, Search Advisor metrics or local branches.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const ids={
 daeri:[1001,1013,1023,1031,1039,1053,1061,1065,1070,1074,1079,1084,1089,1094,1097,1099],
 taksong:[901,913,923,931,939,953,961,965,970,974,979,984,989,994,997,999]
};
const read=kind=>JSON.parse(fs.readFileSync(path.join(root,'data','naver-regional-focus-twelfth-'+kind+'-100.json'),'utf8')).priority;
test('original 100+100 source guides cover every legal province and retain service/keyword/related URL',()=>{
 for(const kind of ['daeri','taksong']){
  const rows=read(kind);
  assert.equal(rows.length,100);
  assert.equal(new Set(rows.map(x=>x.id)).size,100);
  assert.equal(new Set(rows.map(x=>x.region.split(/\s+/)[0])).size,17);
  assert.ok(rows.every(x=>x.kind===kind&&x.keyword&&x.region&&x.related.startsWith('/')));
 }
});
test('16 provinces x 2 services gain individual pickup/handover detail without invented completed rides',()=>{
 const provinces=new Set(),pickups=new Set(),handovers=new Set();
 let edits=0;
 for(const kind of ['daeri','taksong']){
  const rows=read(kind);
  for(const id of ids[kind]){
   const row=rows.find(x=>x.id===id);
   assert.ok(row,'Missing source ID '+id);
   const locality=row.region.split(/\s+/).at(-1);
   assert.ok(row.pickup.length>=100&&row.handover.length>=100,'Thin local service guidance '+id);
   assert.ok(row.pickup.includes(locality)&&row.handover.includes(locality),'Source locality omitted '+id);
   assert.doesNotMatch(row.pickup+' '+row.handover,/100%\s*(?:보장|배차)|상시\s*상주|배차\s*완료한\s*실제\s*후기|운행을\s*완료했습니다|반드시\s*배차/,'Unsupported ride or dispatch claim '+id);
   assert.ok(!pickups.has(row.pickup),'Duplicated pickup guidance '+id);
   assert.ok(!handovers.has(row.handover),'Duplicated handover guidance '+id);
   pickups.add(row.pickup);handovers.add(row.handover);
   provinces.add(row.region.split(/\s+/)[0]);edits++;
  }
 }
 assert.equal(edits,32);
 assert.equal(provinces.size,16);
 assert.ok(read('daeri').find(x=>x.id===1100).handover.length>75,'Keep reviewed Sejong daeri');
 assert.ok(read('taksong').find(x=>x.id===1000).handover.length>75,'Keep reviewed Sejong taksong');
});
test('editorial and nationwide repeated-content diagnostics reconcile to original sources, not indexed URLs',()=>{
 const quality=JSON.parse(fs.readFileSync(path.join(root,'ai-index-quality-review.json'),'utf8'));
 const repeated=JSON.parse(fs.readFileSync(path.join(root,'ai-index-template-reuse.json'),'utf8'));
 assert.equal(quality.totals.reviewed,2900);
 assert.equal(quality.totals.fullyPassing+quality.totals.needsReview,2900);
 assert.ok(quality.totals.needsReview<=2390,'Editorial backlog must not regress');
 assert.equal(repeated.sourceFiles,33);
 assert.equal(repeated.totalRecords,2900);
 assert.equal(repeated.officialProvinces,17);
 assert.equal(repeated.missingProvinceCount,0);
 assert.ok(repeated.affectedDistinctGuideCount<=2037,'Repeated guidance influence must not grow');
 assert.equal(repeated.naverIndexed,null);
 assert.equal(repeated.naverImpressions,null);
 assert.equal(repeated.naverClicks,null);
 assert.equal(repeated.naverCtr,null);
});
