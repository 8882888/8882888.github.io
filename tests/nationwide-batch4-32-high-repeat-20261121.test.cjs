'use strict';
// National service-guide edit guard. These are prospective customer checklists,
// not fabricated completed trips or verified Naver Search Advisor metrics.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const files={
  'fourteenth-daeri':[1402,1418,1425,1431,1495,1437,1458,1463,1469,1473,1477,1481,1486,1492,1497],
  'thirteenth-daeri':[1297],
  'thirteenth-taksong':[1105,1115,1123,1125,1193,1197,1191,1134,1151,1158,1163,1167,1170,1175,1182,1188]
};
const load=label=>JSON.parse(fs.readFileSync(path.join(root,'data','naver-regional-focus-'+label+'-100.json'),'utf8')).priority;
const oldDaeri='심야 출발은 정확한 귀가 목적지·경유 여부와 주차장 출차 가능시간을 정한 뒤 기사 접근·복귀를 상담합니다.';
const oldTaksong='회사 차량 반출 승인과 키 담당자를 정하고 정확한 차고지 위치 및 목적지 수령 시간을 협의합니다.';
test('original 100-entry sources, identifiers, province names, service links survive national batch',()=>{
 for(const [label,ids] of Object.entries(files)){
  const records=load(label);
  assert.equal(records.length,100,label+' original length changed');
  assert.equal(new Set(records.map(x=>x.id)).size,100,label+' duplicate source IDs');
  assert.ok(records.every(x=>x.region&&x.keyword&&['daeri','taksong'].includes(x.kind)&&x.related.startsWith('/')));
  assert.equal(new Set(ids).size,ids.length);
  for(const id of ids)assert.ok(records.some(x=>x.id===id),'Missing original '+id);
 }
});
test('all 32 replacement guides have distinct grounded service & locality text, not synthetic reviews',()=>{
 const rows=Object.entries(files).flatMap(([label,ids])=>ids.map(id=>load(label).find(x=>x.id===id)));
 assert.equal(rows.length,32);
 const prov=new Set(),pickup=new Set(),handover=new Set();
 const perService={daeri:0,taksong:0};
 for(const r of rows){
  const local=r.region.split(/\s+/).at(-1);
  prov.add(r.region.split(/\s+/)[0]);perService[r.kind]++;
  assert.ok(r.pickup.length>=110 && r.handover.length>=100,'Short localized detail '+r.id);
  assert.ok(r.pickup.includes(local)&&r.handover.includes(local),'Locality omitted '+r.id);
  assert.notEqual(r.handover,oldDaeri);
  assert.notEqual(r.handover,oldTaksong);
  assert.doesNotMatch(r.pickup+' '+r.handover,/(?:운행\s*완료했|실제\s*완료\s*후기|즉시배차\s*보장|상주기사가\s*항상|100%\s*배차)/,'Unsupported operational promise '+r.id);
  assert.ok(!pickup.has(r.pickup),'Duplicate pickup: '+r.id);
  assert.ok(!handover.has(r.handover),'Duplicate handover: '+r.id);
  pickup.add(r.pickup);handover.add(r.handover);
 }
 assert.deepEqual(perService,{daeri:16,taksong:16});
 assert.equal(prov.size,16,'All provinces except already reviewed Sejong should receive balanced edits');
});
test('editing metrics and locality-masked repeated text improve without touching Naver actual-data fields',()=>{
 const quality=JSON.parse(fs.readFileSync(path.join(root,'ai-index-quality-review.json'),'utf8'));
 const reuse=JSON.parse(fs.readFileSync(path.join(root,'ai-index-template-reuse.json'),'utf8'));
 assert.equal(reuse.sourceFiles,33);
 assert.equal(reuse.totalRecords,2900);
 assert.equal(reuse.officialProvinces,17);
 assert.equal(reuse.missingProvinceCount,0);
 assert.ok(reuse.affectedDistinctGuideCount<=2037,
   'Template audit should drop by >=32 guides from the PR #331 baseline of 2069');
 assert.equal(reuse.naverIndexed,null);
 assert.equal(reuse.naverImpressions,null);
 assert.equal(reuse.naverClicks,null);
 assert.equal(reuse.naverCtr,null);
 assert.ok(quality.needsReview<=2390,'Editorial review backlog should fall by >=32 from 2422');
});
