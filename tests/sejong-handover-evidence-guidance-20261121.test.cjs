'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const sources=[
 ['daeri','data/naver-regional-focus-nineteenth-daeri-100.json'],
 ['taksong','data/naver-regional-focus-nineteenth-taksong-100.json']
];
const expected=new Map([
 ['세종해밀동법인카드대리운전',{kind:'daeri',terms:['해밀동','법인카드','결제','영수증','목적지','출입구']}],
 ['세종금남면국곡리골프장대리운전',{kind:'daeri',terms:['국곡리','골프','주차','출발','일일기사','배차']}],
 ['세종해밀동중고차탁송',{kind:'taksong',terms:['해밀동','중고차','열쇠','정당한','명의이전','수령인']}],
 ['세종금남면국곡리렌트카탁송',{kind:'taksong',terms:['국곡리','렌트카','렌터카','반납','검수','주행']}]
]);
test('four priority local guides state real booking checkpoints, not fabricated trips',()=>{
 let verified=0;
 for(const [kind,filename] of sources){
  const rows=JSON.parse(fs.readFileSync(path.join(root,filename),'utf8')).priority;
  assert.equal(rows.length,100,filename+' original 100 keyword entries must remain');
  assert.equal(new Set(rows.map(row=>row.keyword)).size,100,'no duplicate keyword additions');
  for(const row of rows){
   const rule=expected.get(row.keyword);
   if(!rule)continue;
   verified++;
   assert.equal(row.kind,kind,'original service mapping must remain');
   assert.equal(rule.kind,kind,'incorrect keyword/service attribution');
   assert(row.region.includes('세종특별자치시'),'never change this region to a different area');
   assert(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75,
    row.keyword+' needs meaningful and distinct customer guidance');
   const joined=[row.topic,row.pickup,row.handover].join(' ');
   for(const term of rule.terms)assert(joined.includes(term),row.keyword+' missing service-specific checkpoint: '+term);
   assert(!/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*보장/u.test(joined),
    row.keyword+' must not invent archived prices, completed trips or guaranteed dispatch');
   assert(!/혁신도시\s*안에서\s*운행\s*완료/u.test(joined),
    'citywide or locality guidance is not proof of a specific-district trip');
  }
 }
 assert.equal(verified,4,'all four approved customer-oriented guides must exist');
});
