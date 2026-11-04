'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const records=require('../data/public-reviewed-rides-202610.json').filter(r=>r.verified===true&&r.status==='completed'&&['daeri','taksong'].includes(r.service));
const html=fs.readFileSync('reviews/ride-record-stories/index.html','utf8');
const server=fs.readFileSync('server.js','utf8');
assert.equal(records.length,23,'only 23 verified public completions currently');
assert.equal(records.filter(r=>r.service==='daeri').length,15);
assert.equal(records.filter(r=>r.service==='taksong').length,8);
assert.equal((html.match(/<article class="case">/g)||[]).length,records.length,'every verified completion needs story');
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
console.log('PASS: 15 daeri + 8 taksong confirmed narrative reviews, truthful location and fare; nationwide title rules preserved');
