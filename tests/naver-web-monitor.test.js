'use strict';
const assert = require('node:assert/strict');
const {inspect} = require('../scripts/naver-web-monitor');
const items = [{link:'https://example.com/',title:'other'},{link:'https://jeongukdaeri.kr/daeri/',title:'<b>전국</b> 대리운전'},{link:'https://jeongukdaeri.kr.evil.example/',title:'wrong'},{link:'bad url'},{link:'https://www.jeongukdaeri.kr/',title:'home'}];
assert.deepEqual(inspect(items).map(x => x.position), [2,5]);
assert.equal(inspect(items)[0].title, '전국 대리운전');
assert.deepEqual(inspect([]), []);
assert.deepEqual(inspect([{link:'https://gosudaeri.com/'},{link:'https://gosudaeri.com.evil.test/'}], 'gosudaeri.com').map(x=>x.position),[1]);
const {QUERIES} = require('../scripts/naver-web-monitor');
for (const query of ['전국대리운전', '24시탁송', '전국대리운전·24시탁송']) assert.ok(QUERIES.includes(query));
assert.equal(new Set(QUERIES).size, QUERIES.length);
const {pageEvidence} = require('../scripts/naver-web-monitor');
const evidence = pageEvidence([{query:'domain',matches:[{url:'https://jeongukdaeri.kr/daeri?ref=a',position:6,title:'old title'},{url:'https://jeongukdaeri.kr/service/daeri/',position:3,title:'different page'}]}]);
assert.equal(evidence.find(p=>p.path==='/daeri/').status,'observed-in-api-results');
assert.equal(evidence.find(p=>p.path==='/daeri/').found[0].title,'old title');
assert.equal(evidence.find(p=>p.path==='/fare/').status,'not-observed-in-these-results');
assert.equal(pageEvidence([{query:'failed',error:'HTTP 500'}]).length,require('../scripts/naver-web-monitor').CORE_PAGES.length);
assert.equal(pageEvidence([{query:'부산탁송',matches:[{url:'https://jeongukdaeri.kr/taksong/busan/',position:4,title:'부산탁송'}]}]).find(p=>p.path==='/taksong/busan/').found[0].position,4);
for(const keyword of ['서울대리운전','부산대리운전','해운대대리운전','대구대리운전','인천대리운전','용인대리운전','속초대리운전','강원도대리운전']) assert.ok(QUERIES.includes(keyword),'monitor nationwide regional driver search '+keyword);
assert.ok(require('../scripts/naver-web-monitor').CORE_PAGES.includes('/daeri/daegu/'));
assert.ok(require('../scripts/naver-web-monitor').QUERIES.includes('강원도탁송'));
for(const q of ['설악산탁송','지리산탁송','자전거길종주탁송','동해안자전거길종주탁송','섬진강자전거길종주탁송','영산강자전거길종주탁송','금강자전거길종주탁송','낙동강자전거길종주탁송']) assert.ok(QUERIES.includes(q),'monitor priority route: '+q);
for(const page of ['/설악산탁송/','/지리산탁송/','/taksong/gyeongnam/changwon-si/','/route-taksong/','/route-taksong/centers/']) assert.ok(require('../scripts/naver-web-monitor').CORE_PAGES.includes(page),'monitor dedicated page: '+page);

for(const path of ['/reviews/history/','/reviews/ride-record-stories/','/reviews/verified/','/special/cycling-trail-transport/','/service/long-distance-taksong/']) assert.ok(require('../scripts/naver-web-monitor').CORE_PAGES.includes(path),'high-intent page search evidence '+path);
for(const query of ['오색탁송','백담사탁송','영덕탁송','경포대탁송','자동차탁송운행완료후기']) assert.ok(QUERIES.includes(query),'high-intent actual ride search '+query);
for (const query of ['기장군탁송','기장읍탁송','정관탁송','정관읍탁송','일광탁송','일광읍탁송','기장군로드탁송','로드탁송']) assert.ok(QUERIES.includes(query),'missing hyperlocal road-taksong query: '+query);
assert.ok(require('../scripts/naver-web-monitor').CORE_PAGES.includes('/taksong/busan/gijang-gun/'),'Gijang-gun landing must be monitored');
for(const q of ['해운대구탁송','우동탁송','중동탁송','좌동탁송','강서구탁송','명지동탁송','녹산동탁송','사하구탁송','하단동탁송','다대동탁송']) assert.ok(QUERIES.includes(q),'district road-taksong query '+q);
for(const p of ['/taksong/busan/haeundae-gu/','/taksong/busan/gangseo-gu/','/taksong/busan/saha-gu/']) assert.ok(require('../scripts/naver-web-monitor').CORE_PAGES.includes(p),'district page monitored '+p);
for(const query of ['동래구탁송','온천동탁송','사직동탁송','금정구탁송','장전동탁송','구서동탁송','북구탁송','화명동탁송','덕천동탁송','연제구탁송','연산동탁송','수영구탁송','광안동탁송','민락동탁송']) assert.ok(QUERIES.includes(query),'missing hyperlocal Busan taksong query: '+query);
for(const path of ['/taksong/busan/dongnae-gu/','/taksong/busan/geumjeong-gu/','/taksong/busan/buk-gu/','/taksong/busan/yeonje-gu/','/taksong/busan/suyeong-gu/']) assert.ok(require('../scripts/naver-web-monitor').CORE_PAGES.includes(path),'missing monitored Busan district: '+path);
for(const q of ['부산진구탁송','대연동탁송','토성동탁송','초량동탁송','남포동탁송']) assert.ok(QUERIES.includes(q),'central Busan search '+q);
for(const q of ['수성구탁송','범어동탁송','달서구탁송','상인동탁송','대구북구탁송','침산동탁송','대구동구탁송','신천동탁송','대구중구탁송','삼덕동탁송']) assert.ok(QUERIES.includes(q),'Daegu taksong query '+q);
for(const p of ['/taksong/daegu/suseong-gu/','/taksong/daegu/dalseo-gu/','/taksong/daegu/buk-gu/','/taksong/daegu/dong-gu/','/taksong/daegu/jung-gu/']) assert.ok(require('../scripts/naver-web-monitor').CORE_PAGES.includes(p),'Daegu taksong region '+p);

for(const q of ['창원탁송','창원전국탁송','부산전국탁송','설악산탁송 요금표','지리산탁송 요금표'])assert.ok(QUERIES.includes(q),'region-first Naver monitoring query '+q);
const encodedResult=pageEvidence([{query:'설악산탁송',matches:[{url:'https://jeongukdaeri.kr/%EC%84%A4%EC%95%85%EC%82%B0%ED%83%81%EC%86%A1/',position:3,title:'설악산탁송 요금표'}]}]);
assert.equal(encodedResult.find(p=>p.path==='/설악산탁송/').found[0].position,3,'monitor URL-encoded Korean canonical path');
const {legacyDriverEvidence}=require('../scripts/naver-web-monitor');
const legacy=legacyDriverEvidence([
 {query:'전국대리운전',matches:[{url:'https://jeongukdaeri.kr/service/daeri/',position:1,title:'전국대리운전'}]},
 {query:'설악산탁송',matches:[{url:'https://jeongukdaeri.kr/설악산탁송/',position:2,title:'설악산탁송'},{url:'https://jeongukdaeri.kr/special/nationwide-daeri/',position:5,title:'전국대리운전'}]}
]);
assert.equal(legacy.length,2,'detect duplicate nationwide driver URLs in returned web results');
assert.deepEqual(legacy.map(x=>x.position),[1,5]);

const {selectQueries}=require('../scripts/naver-web-monitor');
const planned=selectQueries(new Date('2026-11-02T00:00:00Z'));
assert.equal(planned.length,20,'daily Naver checks use 10 priority and 10 rotating keywords');
assert.equal(new Set(planned).size,planned.length,'all daily Naver queries are distinct');
for(const key of ['설악산탁송','지리산탁송','오색탁송','한계령탁송','부산탁송','대구탁송','창원탁송','기장군탁송'])
 assert.ok(planned.includes(key),'always check critical route: '+key);
const nextDay=selectQueries(new Date('2026-11-03T00:00:00Z'));
assert.ok(nextDay.some(x=>!planned.includes(x)),'nonpriority checks must rotate over days');
console.log('Naver web result matching passed');
