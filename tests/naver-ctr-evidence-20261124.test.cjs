'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const docs={
 corporate:read('service/corporate/index.html'),
 taksong:read('service/taksong/index.html')
};
const priority=JSON.parse(read('data/naver-priority-meta-80-20261116.json')).pages;
const baseline=JSON.parse(read('data/naver-search-advisor-baseline-20261123.json'));
const server=read('server.js');
const coreRules=JSON.parse(read('data/seo-pages.json')).pages;
function title(doc){return doc.match(/<title>([^<]+)<\/title>/)?.[1]}
function meta(doc,name){
 return doc.match(new RegExp('<meta\\s+(?:name|property)="'+name+'"\\s+content="([^"]+)"'))?.[1];
}
test('Naver source snapshot has matching dates, precision, 10 top queries and 10 docs',()=>{
 assert.equal(baseline.updatedAt,'2026-11-23');
 assert.equal(baseline.window,'최근 30일');
 assert.equal(baseline.siteMetrics.clicksRawLabel,'1.4백');
 assert.equal(baseline.siteMetrics.impressionsRawLabel,'5.9천');
 assert.equal(baseline.siteMetrics.displayedAverageCtrPercent,2.3);
 assert.equal(baseline.topDocuments.length,10);
 assert.equal(baseline.topQueries.length,10);
 const byPath=new Map(baseline.topDocuments.map(x=>[x.path,x]));
 assert.deepEqual(['/taksong/gangwon/gangreung-si/','/service/taksong/','/service/corporate/'].map(p=>byPath.get(p).ctrPercent),[0.7,1.6,0.5]);
 assert.equal(byPath.get('/').clicks,78);
 assert.equal(baseline.ctrExperiment.modifiedPaths.length,3);
});
test('Corporate national keyword intent: 80-char runtime override matches static head and OG',()=>{
 const short=priority.find(x=>x.path==='/service/corporate/');
 assert.ok(short);
 assert.ok([...short.description].length<=80);
 assert.match(short.description,/^전국 법인대리운전·법인카드대리운전/);
 assert.match(short.description,/후불 정산 가능 조건/);
 assert.equal(meta(docs.corporate,'description'),short.description);
 assert.equal(meta(docs.corporate,'og:description'),short.description);
 assert.match(title(docs.corporate),/^법인대리운전 \| 법인카드·후불정산/);
 assert.equal(meta(docs.corporate,'og:title'),title(docs.corporate));
 assert.match(docs.corporate,/<h1>법인대리운전/);
 assert.match(docs.corporate,/href="tel:18114294"/);
 assert.match(docs.corporate,/후불 이용은 계약 및 심사·협의 후 가능 여부가 결정됩니다/);
 assert.match(docs.corporate,/<link rel="canonical" href="https:\/\/jeongukdaeri.kr\/service\/corporate\/"/);
});
test('Service-center content CTR: title, OG and H1 consistently identify auto delivery',()=>{
 const doc=docs.taksong;
 assert.match(title(doc),/^서비스센터탁송 \| 정비센터 입고·출고·자동차탁송/);
 assert.equal(meta(doc,'og:title'),title(doc));
 assert.match(meta(doc,'description'),/^서비스센터탁송·정비센터탁송/);
 assert.equal(meta(doc,'description'),meta(doc,'og:description'));
 assert.match(doc,/<h1>서비스센터탁송 · 자동차탁송 예약과 차량 인수·인계<\/h1>/);
 assert.match(doc,/업체 공식 서비스센터와 제휴하거나 해당 브랜드가 탁송을 직접 제공한다는 의미가 아닙니다/);
 assert.match(doc,/href="tel:18114294"/);
 assert.match(doc,/<link rel="canonical" href="https:\/\/jeongukdaeri.kr\/service\/taksong\/"/);
});
test('Gangneung new search title preserves the priority region detail and verified ride separation',()=>{
 const part=server.slice(server.indexOf('const gangneungSearchTitle='),server.indexOf('const gangwonProvinceDaeri='));
 assert.ok(part.includes('강릉탁송 | 강릉항·경포·주문진 차량인수·요금'));
 assert.ok(!part.includes('강릉탁송 실제 후기·요금 | 용인→강릉'));
 const p=JSON.parse(read('data/priority-regions.json')).pages.find(x=>x.region==='강원특별자치도 강릉시'&&x.kind==='taksong');
 const newDescription='강릉항·주문진·동해안 종주 차량회수 자동차탁송·입출고 상담. 강릉 경포대와 주문진·강릉항 차량 인수, 용인→강릉 기존 완료기록과 현재 요금조회 1811-4294.';
 assert.ok(server.includes(newDescription));
 assert.ok(newDescription.includes(p.topic));
 assert.ok(newDescription.includes(p.detail.split(/[.!?。]/)[0].trim().slice(0,16)));
 assert.ok(newDescription.length<170);
 assert.ok(server.includes("const gangneungSearchDesc=r.full_name==='강원특별자치도 강릉시'"));
});
test('Homepage and broad national hubs remain untouched in centrally audited SEO configuration',()=>{
 const byPath=new Map(coreRules.map(p=>[p.path,p]));
 assert.equal(byPath.get('/daeri/').title,'전국대리운전 예약·예상요금 | 심야·장거리·골프장');
 assert.equal(byPath.get('/taksong/').title,'전국 자동차탁송 요금·실제 운행후기 | 전국대리운전');
 assert.equal(priority.length,16);
 assert.equal(new Set(priority.map(p=>p.path)).size,16);
 assert.equal(baseline.ctrExperiment.controlPaths.includes('/'),true);
});

test('Nov 25 owner supplied diagnosis is separate from TOP table and crawl graphs',()=>{
 const s=JSON.parse(read('data/naver-search-advisor-baseline-20261125.json'));
 assert.equal(s.sourceType,'owner_reported_naver_searchadvisor');
 assert.equal(s.updatedAt,'2026-11-25');
 assert.equal(s.diagnosis.updatedAt,'2026-11-25');
 assert.deepEqual([s.diagnosis.indexed,s.diagnosis.collectionLimited,s.diagnosis.excluded,s.diagnosis.seoIssues],[14,0,0,0]);
 assert.equal(s.diagnosis.indexedUrls,null);
 assert.equal(s.crawl.updatedAt,'2026-11-26');
 assert.equal(s.crawl.completed,null);assert.equal(s.crawl.limited,null);
 assert.deepEqual([s.siteMetrics.clicksRawLabel,s.siteMetrics.impressionsRawLabel,s.siteMetrics.displayedAverageCtrPercent],['1.5백','6.7천',2.2]);
 assert.equal(s.topQueries.length,10);assert.equal(s.topDocuments.length,10);
 const g=s.topDocuments.find(p=>p.path==='/daeri/gangwon/gangreung-si/');
 assert.deepEqual([g.clicks,g.impressions,g.ctrPercent],[2,2054,0.1]);
 assert.equal(s.priorityReview.paths[0],g.path);
 assert.equal(s.priorityReview.technicalCrawlabilityIsNotOfficialIndexing,true);
});
