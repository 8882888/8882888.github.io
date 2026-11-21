'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const cases=[
 {kind:'daeri',keyword:'전남나주시남평읍골프장대리운전',region:'전라남도 나주시 남평읍',terms:['골프','주차','일일기사','목적지','견적']},
 {kind:'daeri',keyword:'경남진주시정촌면호텔대리운전',region:'경상남도 진주시 정촌면',terms:['숙박시설','주차장','출발','복귀','제휴']},
 {kind:'taksong',keyword:'전남나주시남평읍중고차탁송',region:'전라남도 나주시 남평읍',terms:['중고차','반출','키','명의이전','수령인']},
 {kind:'taksong',keyword:'경남진주시정촌면중고차매매탁송',region:'경상남도 진주시 정촌면',terms:['중고차','출고','매매단지','인수','계약']}
];
test('Four existing Jinju and Naju service guides stay factual and avoid invented sales, rides, prices',()=>{
 const rows=new Map();
 for(const kind of ['daeri','taksong']){
  const file=path.join(root,'data/naver-regional-focus-twentieth-'+kind+'-100.json');
  const data=JSON.parse(fs.readFileSync(file,'utf8')).priority;
  assert.equal(data.length,100,kind+' record inventory must be preserved');
  assert.equal(new Set(data.map(x=>x.keyword)).size,100,kind+' keywords stay unique');
  rows.set(kind,data);
 }
 let checked=0;
 for(const x of cases){
  const found=rows.get(x.kind).filter(y=>y.keyword===x.keyword);
  assert.equal(found.length,1,'missing existing source '+x.keyword);
  const y=found[0];
  checked++;
  assert.equal(y.kind,x.kind);
  assert.equal(y.region,x.region);
  assert(y.related?.startsWith('/'),'related canonical link must not be removed');
  assert(y.topic.length>=13&&y.pickup.length>=80&&y.handover.length>=75);
  const prose=[y.topic,y.pickup,y.handover].join(' ');
  for(const term of x.terms)assert(prose.includes(term),x.keyword+' missing '+term);
  assert(!/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/u.test(prose),
   'Never invent a fare, completed ride or guaranteed staffing: '+x.keyword);
  assert(!/실제\s*운행\s*후기|완료\s*운행\s*기록/u.test(prose),
   'General preparation guidance does not prove any archived trip');
 }
 assert.equal(checked,4);
});