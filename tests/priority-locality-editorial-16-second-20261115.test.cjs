'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const expected={
 'eighteenth-daeri-100':[
  ['세종금남면감성리숙박시설대리운전','daeri',['감성리','숙박시설','기사']],
  ['세종부강면갈산리야간장거리대리운전','daeri',['갈산리','장거리대리운전','복귀']]
 ],
 'eighteenth-taksong-100':[
  ['세종금남면감성리검사소탁송','taksong',['감성리','검사','접수']],
  ['세종부강면갈산리차량탁송','taksong',['갈산리','소유자','인계']]
 ],
 'nineteenth-daeri-100':[
  ['강원원주시문막읍법인대리운전회사','daeri',['문막읍','법인카드','장거리']],
  ['서울강동구성내동대리운전','daeri',['성내동','주차장','경유']],
  ['서울송파구장지동법인대리운전','daeri',['장지동','정산','출발']],
  ['서울은평구갈현동법인카드대리운전','daeri',['갈현동','결제','주차']],
  ['서울강서구염창동골프장대리운전','daeri',['염창동','라운딩','대기']],
  ['서울동작구흑석동일일기사대리운전','daeri',['흑석동','일일기사','대기시간']]
 ],
 'nineteenth-taksong-100':[
  ['강원원주시문막읍탁송회사','taksong',['문막읍','소유자','기사']],
  ['서울강동구성내동탁송업체','taksong',['성내동','수령인','출고']],
  ['서울송파구장지동장거리탁송','taksong',['장지동','차량','기사']],
  ['서울은평구갈현동중고차탁송','taksong',['갈현동','명의이전','매매']],
  ['서울강서구염창동렌트카탁송','taksong',['염창동','렌터카','계약']],
  ['서울동작구흑석동사고대차탁송','taksong',['흑석동','렌터카','반납']]
 ]
};
const sourceMap=new Map(Object.entries(expected).map(([key])=>[key,JSON.parse(fs.readFileSync(
 path.join(root,'data/naver-regional-focus-'+key+'.json'),'utf8')).priority]));
const possibleFake=/100%\\s*(?:배차|보장)|즉시\\s*배차\\s*보장|기사\\s*상시\\s*상주|운행(?:을)?\\s*완료했습니다|무조건\\s*배차/;
test('16 edited Sejong rural, Wonju Munmak and Seoul locality guides remain useful and unique',()=>{
 const all=Object.entries(expected).flatMap(([file,rows])=>rows.map(([keyword,kind,phrases])=>({file,keyword,kind,phrases})));
 assert.equal(all.length,16);
 const pickups=[],handovers=[],regionKeys=[];
 for(const item of all){
  const matches=sourceMap.get(item.file).filter(row=>row.keyword===item.keyword&&row.kind===item.kind);
  assert.equal(matches.length,1,'Guide keyword must map exactly once: '+item.keyword);
  const row=matches[0];
  assert.ok(row.topic.length>=18,'Local topic too short: '+item.keyword);
  assert.ok(row.pickup.length>=135,'Pickup conditions too short: '+item.keyword);
  assert.ok(row.handover.length>=135,'Handover conditions too short: '+item.keyword);
  assert.ok(row.related.startsWith('/'),'Existing related service link missing: '+item.keyword);
  const text=[row.topic,row.pickup,row.handover].join(' ');
  const lastLocality=row.region.trim().split(/\\s+/).at(-1);
  assert.ok(text.includes(lastLocality),'Missing locality: '+item.keyword);
  for(const phrase of item.phrases)assert.ok(text.includes(phrase),'Missing relevant service/region fact '+phrase+' for '+item.keyword);
  assert.doesNotMatch(text,possibleFake,'Do not promise drivers or invent completed rides: '+item.keyword);
  assert.notEqual(row.pickup,row.handover,'Pickup and handover must be substantively different: '+item.keyword);
  pickups.push(row.pickup);handovers.push(row.handover);regionKeys.push(row.kind+'|'+row.region);
 }
 assert.equal(new Set(pickups).size,16,'No duplicated pickup paragraphs');
 assert.equal(new Set(handovers).size,16,'No duplicated handover paragraphs');
 assert.equal(new Set(regionKeys).size,16,'No duplicated locality+service records');
});
test('subdistrict with no proven local ride is not confused with an approved indexing target',()=>{
 const sourceRows=[...sourceMap.get('eighteenth-daeri-100'),...sourceMap.get('eighteenth-taksong-100')];
 const twoVillages=sourceRows.filter(row=>/감성리|갈산리/.test(row.keyword));
 assert.equal(twoVillages.length,4);
 assert.ok(twoVillages.every(x=>/리$/.test(x.region)),'Those four source-only localities are villages, not verified indexed URLs');
 const approved=JSON.parse(fs.readFileSync(path.join(root,'data/priority-regions.json'),'utf8')).pages;
 assert.ok(twoVillages.every(x=>!approved.some(p=>p.region===x.region&&p.kind===x.kind)),
  'Source-only village editorial corrections must never create unreviewed 59-page priority URLs');
});
