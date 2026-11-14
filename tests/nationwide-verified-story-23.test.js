'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');

const records=require('../data/public-reviewed-rides-202610.json')
  .filter(r=>r.verified===true&&r.status==='completed'&&['daeri','taksong'].includes(r.service));
const html=fs.readFileSync('reviews/ride-record-stories/index.html','utf8');
const server=fs.readFileSync('server.js','utf8');

// Keep the original minimum evidence baseline, but do not break publishing
// when newly verified completed rides are added to the source archive.
const daeri=records.filter(r=>r.service==='daeri');
const taksong=records.filter(r=>r.service==='taksong');
assert(records.length>=23,'verified public completion baseline must not decrease below 23');
assert(daeri.length>=15,'verified daeri completion baseline must not decrease below 15');
assert(taksong.length>=8,'verified taksong completion baseline must not decrease below 8');

// The published page must contain exactly one completed-ride article per
// current verified record. Dispatch-only records use a separate CSS class.
const published=(html.match(/<article class="case">/g)||[]).length;
assert.equal(published,records.length,'every current verified completion needs one story article');
for(const record of records){
  assert(html.includes(record.departure)&&html.includes(record.destination)&&html.includes(record.fare),
    'verified story missing '+record.departure+'→'+record.destination);
}
assert(html.includes('전체 2,591건의 원시 배차기록이 모두 운행완료로 검증됐다는 뜻은 아닙니다.'));
assert(!html.includes('서울→부산 대리운전 15만원 완료'),'unverified user example must not be claimed');
assert(server.includes('const daeriReviewTitle='),'daeri pages must be review-led');
assert(server.includes('const taksongReviewTitle='),'taksong pages must be review-led');
assert(server.includes("tripMatchesRegion(x,r)"),'titles must use valid geographic matching');
assert(server.includes("tel:18114294"),'consultation CTA kept');
console.log(`PASS: ${daeri.length} daeri + ${taksong.length} taksong = ${records.length} verified narrative reviews, truthful locations/fares, preserved 2,591 raw records and 1811-4294`);
