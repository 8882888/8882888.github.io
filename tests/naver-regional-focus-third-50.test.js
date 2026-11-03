#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const a=require('../data/naver-regional-focus-50.json').priority;
const b=require('../data/naver-regional-focus-next-50.json').priority;
const c=require('../data/naver-regional-focus-third-50.json').priority;
const combined=[...a,...b,...c];
assert.equal(a.length,50);assert.equal(b.length,50);assert.equal(c.length,50);
assert.equal(c.filter(x=>x.kind==='taksong').length,30);
assert.equal(c.filter(x=>x.kind==='daeri').length,20);
assert.equal(new Set(combined.map(x=>x.kind+'|'+x.region)).size,150,'one canonical per area and service');
assert.equal(new Set(combined.map(x=>x.keyword)).size,150,'unique search keywords');
const valid=['/service/taksong/','/service/long-distance-taksong/','/service/heavy-truck-taksong/','/service/golf/','/service/corporate/','/service/daily-driver/','/business/used-car/','/business/rental-car/','/business/export-port/','/route-taksong/'];
for(let i=0;i<c.length;i++){
 const x=c[i];assert.equal(x.id,i+101);
 assert.ok(x.region.length>=4&&x.keyword.length>=4&&x.topic.length>=4);
 assert.ok(x.pickup.length>=35&&x.handover.length>=30,'specific unique customer advice '+x.keyword);
 assert.ok(valid.includes(x.related),'related service URL '+x.keyword);
 assert.ok(!/확정 배차|운행 완료했습니다|고정 기사 상주/.test(x.pickup+' '+x.handover));
}
console.log('PASS third batch 50/50; cumulative 150 unique region/service SEO targets');
