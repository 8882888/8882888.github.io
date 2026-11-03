#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const base=require('../data/naver-regional-focus-50.json').priority;
const next=require('../data/naver-regional-focus-next-50.json').priority;
assert.equal(base.length,50);
assert.equal(next.length,50);
assert.equal(next.filter(x=>x.kind==='taksong').length,30);
assert.equal(next.filter(x=>x.kind==='daeri').length,20);
const combined=[...base,...next];
assert.equal(new Set(combined.map(x=>x.kind+'|'+x.region)).size,100,'No repeat location-service focus pages');
assert.equal(new Set(combined.map(x=>x.keyword)).size,100,'No duplicate regional keyword targets');
const validRelated=new Set(['/service/taksong/','/service/long-distance-taksong/','/business/used-car/','/business/rental-car/','/business/export-port/','/service/corporate/','/service/daily-driver/','/service/golf/']);
for(let i=0;i<50;i++){
 const item=next[i];
 assert.equal(item.id,i+51);
 assert.ok(item.region.length>3&&item.keyword.length>3&&item.topic.length>4);
 assert.ok(item.pickup.length>=35&&item.handover.length>=30,'Local booking value '+item.keyword);
 assert.ok(validRelated.has(item.related),'Correct specialized service URL '+item.keyword);
 assert.doesNotMatch(item.pickup+item.handover,/기사 상주 확정|실제 운행완료했다고|예약 확정|지점 운영합니다/);
}
const incheon=next.filter(x=>x.region.startsWith('인천광역시'));
assert.ok(incheon.some(x=>x.region==='인천광역시 검단구'));
assert.ok(incheon.some(x=>x.region==='인천광역시 영종구'));
assert.ok(incheon.some(x=>x.region==='인천광역시 제물포구'));
console.log('PASS 50 second-batch SEO pages (30 taksong, 20 daeri), unique from original 50, official metro districts, service-fit links');
