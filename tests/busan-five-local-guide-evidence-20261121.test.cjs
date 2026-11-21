'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const expected=[
 ['eighth','부산기장읍탁송회사','부산광역시 기장군 기장읍','taksong',['기장시장','주차장','반출','수령인','복귀']],
 ['eighth','부산녹산동탁송','부산광역시 강서구 녹산동','taksong',['녹산동','게이트','승인','수령','법인차량']],
 ['eighth','부산온천동자동차탁송','부산광역시 동래구 온천동','taksong',['온천동','주차권','키','출고','수령인']],
 ['eighth','부산기장읍대리운전업체','부산광역시 기장군 기장읍','daeri',['기장시장','출발','목적지','법인카드','복귀']],
 ['ninth','부산일광읍탁송회사','부산광역시 기장군 일광읍','taksong',['일광읍','일광역','주차장','차량','수령']]
];
test('five existing Busan guides preserve identities and provide distinct locality-specific booking instructions',()=>{
 const groups=new Map();
 for(const batch of ['eighth','ninth']){
  const rows=JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-'+batch+'-100.json'),'utf8')).priority;
  assert.equal(rows.length,100,'Preserve all original 100 guides in '+batch);
  assert.equal(new Set(rows.map(x=>x.keyword)).size,100,'Do not add duplicate keywords in '+batch);
  groups.set(batch,rows);
 }
 const topics=[],pickups=[],handovers=[];
 for(const [batch,keyword,region,kind,terms] of expected){
  const found=groups.get(batch).filter(x=>x.keyword===keyword);
  assert.equal(found.length,1,'Keep original keyword: '+keyword);
  const row=found[0];
  assert.equal(row.region,region,'Keep original legal region for '+keyword);
  assert.equal(row.kind,kind,'Do not reclassify service '+keyword);
  assert(row.related?.startsWith('/'),'Keep useful source service link for '+keyword);
  assert(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75,
   'Full topic, pickup, and handover practical value required for '+keyword);
  const whole=[row.topic,row.pickup,row.handover].join(' ');
  for(const term of terms)assert(whole.includes(term),keyword+' missing practical term '+term);
  assert(!/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/u.test(whole),
   'No invented fare, trip or guaranteed staffing for '+keyword);
  assert(!/실제\s*운행\s*후기|완료\s*운행\s*기록/u.test(whole),
   'Local service advice cannot be presented as completed travel evidence');
  topics.push(row.topic);pickups.push(row.pickup);handovers.push(row.handover);
 }
 assert.equal(new Set(topics).size,5,'Each local title must be distinct');
 assert.equal(new Set(pickups).size,5,'Each location must have its own pickup context');
 assert.equal(new Set(handovers).size,5,'Each service requires its own handover context');
});