'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const cases=[
 {file:'twentieth-daeri',keyword:'세종연동면법인카드대리운전',region:'세종특별자치시 (직할) 연동면',kind:'daeri',terms:['법인카드','승인','영수증','출발','복귀']},
 {file:'twentieth-daeri',keyword:'세종금남면금천리골프장대리운전',region:'세종특별자치시 (직할) 금남면 금천리',kind:'daeri',terms:['골프','주차','일일기사','목적지','예약']},
 {file:'twentieth-taksong',keyword:'세종연동면법인차량탁송',region:'세종특별자치시 (직할) 연동면',kind:'taksong',terms:['법인','반출 승인','열쇠','수령','주행']},
 {file:'twentieth-taksong',keyword:'세종금남면금천리중고차탁송',region:'세종특별자치시 (직할) 금남면 금천리',kind:'taksong',terms:['중고차','소유자','반출','명의이전','인계']},
 {file:'sixteenth-daeri',keyword:'강원원주시원동단체대리운전',region:'강원특별자치도 원주시 원동',kind:'daeri',terms:['단체','차량','주차장','목적지','동시 배차']},
 {file:'sixteenth-taksong',keyword:'강원원주시원동탁송업체',region:'강원특별자치도 원주시 원동',kind:'taksong',terms:['정비','검사','출고 승인','주행','수령']}
];
test('Six existing Sejong and Wonju locality guides improve practical handover without fake trips or fares',()=>{
 const groups=new Map();
 for(const item of cases){
  const key=item.file;
  if(!groups.has(key)){
   const rows=JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-'+key+'-100.json'),'utf8')).priority;
   assert.equal(rows.length,100,'Do not add or delete regional records in '+key);
   assert.equal(new Set(rows.map(x=>x.keyword)).size,100,'Keyword uniqueness must be preserved in '+key);
   groups.set(key,rows);
  }
  const found=groups.get(key).filter(x=>x.keyword===item.keyword);
  assert.equal(found.length,1,'Expected one original guide for '+item.keyword);
  const row=found[0];
  assert.equal(row.region,item.region,'Original legal locality cannot change');
  assert.equal(row.kind,item.kind,'Service type cannot change');
  assert(row.related?.startsWith('/'),'Keep existing useful related canonical service link');
  assert(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75,
   'Missing practical pickup or handover context: '+item.keyword);
  const body=[row.topic,row.pickup,row.handover].join(' ');
  for(const term of item.terms)assert(body.includes(term),item.keyword+' needs '+term);
  assert(!/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|즉시\s*배차\s*보장|100%\s*(?:배차|보장)/u.test(body),
   'Unverified completed trips, fares or unconditional guarantees are forbidden: '+item.keyword);
  assert(!/해당\s*지역에서\s*운행을\s*완료했습니다/u.test(body),
   'Guide does not prove any historical ride in this locality');
 }
 assert.equal(cases.length,6);
});