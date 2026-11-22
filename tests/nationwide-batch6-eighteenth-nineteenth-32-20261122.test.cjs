'use strict';
// Sixth editorial batch: 16 provinces x two services; no invented rides/fare/availability.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const selected={
 daeri:{eighteenth:[2201,2206,2207,2210,2212,2214,2219,2229,2233,2234,2236,2239,2242,2244,2249],nineteenth:[2439]},
 taksong:{eighteenth:[2101,2106,2107,2110,2112,2114,2119,2129,2133,2134,2136,2139,2142,2144,2149],nineteenth:[2339]}
};
const read=(kind,batch)=>JSON.parse(fs.readFileSync(path.join(root,'data','naver-regional-focus-'+batch+'-'+kind+'-100.json'),'utf8')).priority;
test('all four original source files retain exactly 100 nonduplicated verified region/service identities',()=>{
 for(const kind of ['daeri','taksong'])for(const batch of ['eighteenth','nineteenth']){
  const rows=read(kind,batch);
  assert.equal(rows.length,100,kind+' '+batch);
  assert.equal(new Set(rows.map(x=>x.id)).size,100);
  assert.ok(rows.every(x=>x.kind===kind&&x.keyword&&x.region&&x.topic&&x.related.startsWith('/')));
 }
});
test('16 provinces have two genuinely distinct, service-specific pickup and handover explanations',()=>{
 const pick=new Set(),hand=new Set(),byService={},serviceProvinces={};
 for(const kind of ['daeri','taksong']){
  const provinces=new Set();
  let count=0;
  for(const [batch,ids] of Object.entries(selected[kind])){
   const rows=read(kind,batch);
   for(const id of ids){
    const x=rows.find(row=>row.id===id);
    assert.ok(x,'Missing original '+kind+'/'+batch+'/'+id);
    const locality=x.region.split(/\s+/).at(-1);
    assert.ok(x.pickup.length>=120&&x.handover.length>=120,'Thin editorial copy '+id);
    assert.ok(x.pickup.includes(locality)&&x.handover.includes(locality),'Omitted source-specific locality '+id);
    assert.ok(!pick.has(x.pickup),'Recycled pickup copy '+id);
    assert.ok(!hand.has(x.handover),'Recycled handover copy '+id);
    assert.doesNotMatch(x.pickup+' '+x.handover,/100%\s*배차|항상\s*상주|배차\s*완료했습니다|운행을\s*완료했습니다|기록요금\s*\d|현재\s*고정요금/, 'Invented completed ride or rate guarantee '+id);
    pick.add(x.pickup);hand.add(x.handover);provinces.add(x.region.split(/\s+/)[0]);count++;
   }
  }
  assert.equal(count,16);
  assert.equal(provinces.size,16,'One per province, excluding already reviewed Sejong');
  serviceProvinces[kind]=provinces;byService[kind]=count;
 }
 assert.deepEqual([...serviceProvinces.daeri].sort(),[...serviceProvinces.taksong].sort());
 assert.equal(byService.daeri+byService.taksong,32);
 assert.ok(!serviceProvinces.daeri.has('세종특별자치시'),'Leave all existing fully reviewed Sejong content unchanged');
 for(const [id,kind] of [[2217,'daeri'],[2117,'taksong']]){
  const item=read(kind,'eighteenth').find(x=>x.id===id);
  assert.ok(item.pickup.length>150&&item.handover.length>150);
 }
});
test('full nationwide editorial review and repeat detection actually improve; never claim Naver indexed metrics',()=>{
 const quality=JSON.parse(fs.readFileSync(path.join(root,'ai-index-quality-review.json'),'utf8'));
 const repeated=JSON.parse(fs.readFileSync(path.join(root,'ai-index-template-reuse.json'),'utf8'));
 assert.equal(quality.totals.reviewed,2900);
 assert.equal(quality.totals.needsReview+quality.totals.fullyPassing,2900);
 assert.ok(quality.totals.fullyPassing>=574,'Must add 32 uniquely valid editorial guides over 542 baseline');
 assert.ok(quality.totals.needsReview<=2326,'Must reduce editorial review queue by at least 32');
 assert.equal(repeated.sourceFiles,33);
 assert.equal(repeated.totalRecords,2900);
 assert.equal(repeated.officialProvinces,17);
 assert.equal(repeated.missingProvinceCount,0);
 assert.ok(repeated.affectedDistinctGuideCount<=2021,'Template-reuse influence cannot regress from 2021');
 for(const key of ['naverIndexed','naverImpressions','naverClicks','naverCtr'])assert.equal(repeated[key],null);
});
