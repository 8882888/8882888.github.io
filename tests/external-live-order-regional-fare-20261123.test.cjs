'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=JSON.parse(read('data/external-live-daeri-order-snapshot-20261123.json'));
const fare=read('fare/index.html');
const begin=fare.indexOf('<section id="fare-local-daeri-corridors-20261123"');
const end=fare.indexOf('</section>',begin);
const section=begin>=0&&end>begin?fare.slice(begin,end):'';

test('external live intake is a dated snapshot, not Smart24 completed rides',()=>{
 assert.equal(source.records.length,5,'exactly five observed order intake records');
 assert.match(source.source,/order intake snapshot/i);
 assert.match(source.caution,/not verified dispatch/i);
 assert.match(source.caution,/or Smart24 order/i);
 assert.match(source.publication_policy,/not present source.s recommended prices as Smart24/i);
 const unique=new Set();
 for(const record of source.records){
  assert.match(record.received_at,/^2026-11-23 \d{2}:\d{2}:\d{2}$/);
  assert(Number.isFinite(record.distance_km_external)&&record.distance_km_external>0);
  assert(Number.isInteger(record.recommended_fare_krw_external)&&record.recommended_fare_krw_external>0);
  assert(Array.isArray(record.regional_keywords)&&record.regional_keywords.length>=3);
  assert(!/\d{2,}-\d+$/.test(record.origin+record.destination),
   'do not publish the external order street-building-number details');
  const route=record.origin+' → '+record.destination;
  assert(!unique.has(route),'no duplicate origin-destination observations');
  unique.add(route);
 }
});

test('five observed regional corridors are all daeri-only calculator presets',()=>{
 assert(section,'existing canonical /fare/ must contain source-derived section');
 const buttons=[...section.matchAll(/<button type="button" data-fare-service="daeri" data-fare-from="([^"]+)" data-fare-to="([^"]+)">/g)];
 assert.equal(buttons.length,5);
 const terms=['예산군 삽교읍 목리','서해구 청라동','중구 봉래동2가','강남구 역삼동','삼척시 남양동'];
 terms.forEach(term=>assert(section.includes(term),'missing live order area '+term));
 assert(fare.includes("button.dataset.fareService==='daeri'?'daeri':'taksong'"),
   'route presets must pick daeri while pre-existing mountain/cycling ones remain taksong');
 assert(fare.includes('data-fare-from="양양 오색 주차장"'),
   'do not remove mountain transport presets');
 assert(fare.indexOf('id="quote-form"')<begin,
   'customer calculator remains above long SEO text');
});

test('real, pre-existing regional guide links connect the five corridors',()=>{
 const paths=[
  '/daeri/chungnam/yesan-gun/','/daeri/chungnam/seosan-si/',
  '/daeri/incheon/seohae-gu/','/daeri/gyeonggi/siheung-si/',
  '/daeri/seoul/jung-gu/','/daeri/chungnam/cheonan-si/',
  '/daeri/seoul/gangnam-gu/','/daeri/chungbuk/cheongju-si/',
  '/daeri/gangwon/samcheok-si/'
 ];
 for(const p of paths)assert(section.includes('href="'+p+'"'),'missing verified guide link '+p);
 assert.equal([...section.matchAll(/<a href="\/daeri\//g)].length,paths.length);
 assert(!section.includes('rel="nofollow"'),'regional internal links should remain crawlable');
});

test('historical third-party displayed fares are not advertised as current Smart24 quotes',()=>{
 assert.match(section,/오더 접수 ≠ 배차·운행완료/);
 assert.match(section,/실시간 연동 피드가 아닌/);
 assert.match(section,/스마트24/);
 assert(!/32\.83|23\.95|109\.78|124\.13|25\.68/.test(section),
   'third-party distance should not masquerade as the calculated current route');
 assert(!/40,000원|35,000원|100,000원/.test(section),
   'third-party displayed fares cannot be advertised as Smart24 quote');
 assert(section.includes('href="tel:18114294"'),'customer has actual consultation path');
});
