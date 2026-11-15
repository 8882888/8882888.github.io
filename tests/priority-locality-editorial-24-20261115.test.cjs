'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const cases={
 'seventh-100':[
  ['세종나성동탁송업체','taksong',['나성동','반출 승인']],
  ['세종조치원읍탁송회사','taksong',['조치원역','주차장']],
  ['세종나성동법인대리운전','daeri',['나성동','법인대리운전']],
  ['세종조치원읍대리운전','daeri',['조치원역','장거리대리운전']]
 ],
 'fifteenth-daeri-100':[
  ['세종소담동대리운전','daeri',['소담동','출차 게이트']],
  ['강원원주시소초면장거리대리운전','daeri',['소초면','장거리대리운전']]
 ],
 'fifteenth-taksong-100':[
  ['세종소담동탁송','taksong',['소담동','로드탁송']],
  ['강원원주시소초면사고대차탁송','taksong',['소초면','렌터카']]
 ],
 'sixteenth-daeri-100':[
  ['세종대평동골프대리운전','daeri',['대평동','골프']],
  ['세종아름동기업대리운전','daeri',['아름동','법인카드']],
  ['세종금남면주말대리운전','daeri',['금남면','주말']],
  ['전남나주시송월동일일기사대리운전','daeri',['송월동','일일기사']]
 ],
 'sixteenth-taksong-100':[
  ['세종대평동화물차탁송','taksong',['대평동','톤급']],
  ['세종아름동기업탁송','taksong',['아름동','반출 승인']],
  ['세종금남면차량탁송','taksong',['금남면','도로명주소']],
  ['전남나주시송월동서비스센터탁송','taksong',['송월동','정비']]
 ],
 'seventeenth-daeri-100':[
  ['세종연서면장거리대리운전','daeri',['연서면','장거리대리운전']],
  ['세종소정면심야대리운전','daeri',['소정면','심야']],
  ['세종부강면일일기사대리운전','daeri',['부강면','대기']],
  ['강원원주시인동기업대리운전','daeri',['인동','법인카드']]
 ],
 'seventeenth-taksong-100':[
  ['세종연서면탁송업체','taksong',['연서면','차량']],
  ['세종소정면법인차량탁송','taksong',['소정면','법인']],
  ['세종부강면야간탁송','taksong',['부강면','야간']],
  ['강원원주시인동차량탁송','taksong',['인동','주차']]
 ]
};
const all=Object.entries(cases).flatMap(([file,rows])=>rows.map(row=>({file,keyword:row[0],kind:row[1],required:row[2]})));
const risk=/100%\s*(?:배차|보장)|무조건\s*배차|즉시\s*배차\s*보장|운행\s*완료(?:했습니다|됐습니다)|기사\s*상시\s*상주/;
test('24 approved Sejong, Wonju and Naju guide revisions are non-generic and unique',()=>{
 assert.equal(all.length,24);
 const intros=[],handoverTexts=[],identities=[];
 const data=new Map(Object.keys(cases).map(short=>[short,JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-'+short+'.json'),'utf8')).priority]));
 for(const spec of all){
  const rows=data.get(spec.file).filter(x=>x.keyword===spec.keyword&&x.kind===spec.kind);
  assert.equal(rows.length,1,'One canonical entry expected for '+spec.keyword);
  const row=rows[0];
  assert.ok(row.topic.length>=18,'Brief, generic topic: '+spec.keyword);
  assert.ok(row.pickup.length>=130,'Pickup lacks actionable locality context: '+spec.keyword);
  assert.ok(row.handover.length>=125,'Handover lacks practical conditions: '+spec.keyword);
  assert.ok(/^\//.test(row.related),'A supported existing service link is required: '+spec.keyword);
  const text=[row.topic,row.pickup,row.handover].join(' ');
  const locality=row.region.split(/\s+/).at(-1);
  assert.ok(text.includes(locality),'Actual admin locality is absent: '+spec.keyword);
  for(const word of spec.required)assert.ok(text.includes(word),'Missing specific local/service detail '+word+' for '+spec.keyword);
  assert.doesNotMatch(text,risk,'No unverified rides, permanent drivers, or guaranteed dispatch: '+spec.keyword);
  assert.notEqual(row.pickup,row.handover,'A copied section is not substantive: '+spec.keyword);
  intros.push(row.pickup);
  handoverTexts.push(row.handover);
  identities.push(row.kind+'|'+row.region);
 }
 assert.equal(new Set(intros).size,24,'No repeated customer pickup guidance');
 assert.equal(new Set(handoverTexts).size,24,'No repeated customer handover advice');
 assert.equal(new Set(identities).size,24,'No duplicate locality/service records');
});
test('rural Sejong pages retain different logistical details from nearby urban service pages',()=>{
 const byKeyword=new Map(all.map(spec=>{
  const entries=JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-'+spec.file+'.json'),'utf8')).priority;
  return [spec.keyword,entries.find(x=>x.keyword===spec.keyword)];
 }));
 for(const [urban,rural] of [['세종소담동대리운전','세종소정면심야대리운전'],['세종나성동탁송업체','세종연서면탁송업체'],['세종조치원읍탁송회사','세종금남면차량탁송']]){
  assert.notEqual(byKeyword.get(urban).pickup,byKeyword.get(rural).pickup,'Keep distinct rural vehicle access notes');
  assert.notEqual(byKeyword.get(urban).handover,byKeyword.get(rural).handover);
 }
});
