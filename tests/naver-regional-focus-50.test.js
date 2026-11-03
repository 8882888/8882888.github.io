#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const data=require('../data/naver-regional-focus-50.json');
const areas=data.priority;
assert.equal(data.version,1);
assert.equal(areas.length,50,'50 SEO tasks must map to existing regional service pages');
assert.equal(areas.filter(x=>x.kind==='taksong').length,40);
assert.equal(areas.filter(x=>x.kind==='daeri').length,10);
assert.equal(new Set(areas.map(x=>x.region+'|'+x.kind)).size,50,'do not make duplicate SEO doorway pages');
assert.equal(new Set(areas.map(x=>x.keyword)).size,50,'unique targeted customer search phrases');
for(const [index,row] of areas.entries()){
 assert.equal(row.id,index+1);
 assert.ok(row.keyword.length>=4&&row.topic.length>=4);
 assert.ok(row.pickup.length>=35&&row.handover.length>=30,'specific useful customer guidance '+row.keyword);
 assert.ok(row.region.length>=4,'legal region name');
 assert.doesNotMatch(row.pickup+row.handover,/실제 운행 완료했|배차완료|확정요금|기사 상주 확정/);
}
const incheon=areas.find(x=>x.keyword==='인천서해구탁송');
assert.equal(incheon?.region,'인천광역시 서해구','respect 2026 real district name');
console.log('PASS: 50 editorial locality SEO targets, 40 taksong and 10 daeri, no duplicate location pages or fabricated trips');
