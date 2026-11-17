import test from 'node:test';
import assert from 'node:assert/strict';
import {compareFourOfficialKpis,markdownFourKpis,validateOwnerKpis} from '../scripts/measure-naver-four-official-kpis-20261118.mjs';
const owner=(windowStart,windowEnd,clicks,impressions,indexed,observedAt)=>({
 sourceType:'owner_reported_naver_searchadvisor',
 site:'https://jeongukdaeri.kr',
 search:{scope:'WEB_SEARCH_ONLY',updatedAt:windowEnd,periodStart:windowStart,periodEnd:windowEnd,
  device:'PC+모바일',clicks,impressions},
 index:indexed===null?null:{observedAt,indexed}
});
test('not supplying owner snapshots must never invent a numerical increase of zero',()=>{
 const x=compareFourOfficialKpis(null,null);
 assert.equal(x.status,'NO_VERIFIED_OWNER_REPORT_PAIR');
 for(const v of ['indexed','clicks','impressions'])assert.equal(x.metrics[v].delta,null);
 assert.equal(x.metrics.ctrPercent.deltaPercentagePoints,null);
 assert.match(markdownFourKpis(x),/미확인/);
 assert.doesNotMatch(markdownFourKpis(x),/\| 색인 건수 \| 14 \|/);
});
test('exact official dates and counts yield four actual arithmetic differences, not sample data in production',()=>{
 const old=owner('2026-09-01','2026-09-30',50,1000,18,'2026-10-01');
 const next=owner('2026-10-01','2026-10-30',80,1200,25,'2026-11-01');
 const r=compareFourOfficialKpis(old,next);
 assert.equal(r.status,'EXACT_ARITHMETIC_NONOVERLAPPING_WINDOWS_NOT_ATTRIBUTABLE');
 assert.equal(r.metrics.indexed.delta,7);
 assert.equal(r.metrics.impressions.delta,200);
 assert.equal(r.metrics.clicks.delta,30);
 assert.equal(r.metrics.ctrPercent.before,5);
 assert.equal(r.metrics.ctrPercent.after,6.67);
 assert.equal(r.metrics.ctrPercent.deltaPercentagePoints,1.67);
 assert.match(markdownFourKpis(r),/\+1\.67%p/);
 assert.equal(r.overlap,false);
});
test('same recent-30-day date windows may overlap; report arithmetic but never causal increase',()=>{
 const old=owner('2026-09-01','2026-09-30',50,1000,18,'2026-10-01');
 const next=owner('2026-09-15','2026-10-14',54,1050,18,'2026-10-15');
 const r=compareFourOfficialKpis(old,next);
 assert.equal(r.overlap,true);
 assert.equal(r.status,'EXACT_ARITHMETIC_OVERLAPPING_WINDOWS_NOT_ATTRIBUTABLE');
 assert.equal(r.metrics.clicks.delta,4);
 assert.equal(r.metrics.indexed.delta,0);
 assert.match(markdownFourKpis(r),/겹칩니다/);
});
test('exact search difference can be reported while missing index counts remain unverified',()=>{
 const old=owner('2026-09-01','2026-09-30',50,1000,null);
 const next=owner('2026-10-01','2026-10-30',80,1200,null);
 const r=compareFourOfficialKpis(old,next);
 assert.equal(r.metrics.indexed.delta,null);
 assert.equal(r.metrics.impressions.delta,200);
 assert.equal(r.metrics.ctrPercent.deltaPercentagePoints,1.67);
});
test('different devices, different durations and backwards chronological windows are not comparable',()=>{
 const old=owner('2026-09-01','2026-09-30',50,1000,null);
 const alternative=owner('2026-10-01','2026-10-30',80,1200,null);
 for(const mismatch of [{...alternative,search:{...alternative.search,device:'모바일'}},
  {...alternative,search:{...alternative.search,periodStart:'2026-10-02'}},
  owner('2026-08-01','2026-08-30',30,800,null)]){
  const r=compareFourOfficialKpis(old,mismatch);
  assert.equal(r.status,'INCOMPARABLE_SEARCH_DEVICE_PERIOD_OR_CHRONOLOGY');
  assert.equal(r.metrics.clicks.delta,null);
 }
});
test('a report from Naver VIEW or invented site data cannot become official output',()=>{
 const original=owner('2026-09-01','2026-09-30',50,1000,18,'2026-10-01');
 for(const invalid of [
  {...original,sourceType:'synthetic_yeti'},
  {...original,site:'https://other.example'},
  {...original,search:{...original.search,scope:'VIEW'}},
  {...original,search:{...original.search,clicks:60,impressions:50}},
  {...original,search:{...original.search,clicks:50.5}},
  {...original,search:{...original.search,periodStart:'2026-02-30'}},
  {...original,index:{observedAt:'2026-10-01',indexed:null}},
  {...original,search:{...original.search,ctrPercent:12}}
 ])assert.throws(()=>validateOwnerKpis(invalid));
});
test('dated but nonchronological site index snapshots do not produce a false index delta',()=>{
 const old=owner('2026-09-01','2026-09-30',50,1000,18,'2026-11-01');
 const next=owner('2026-10-01','2026-10-30',80,1200,25,'2026-10-31');
 const r=compareFourOfficialKpis(old,next);
 assert.equal(r.metrics.indexed.delta,null);
});
