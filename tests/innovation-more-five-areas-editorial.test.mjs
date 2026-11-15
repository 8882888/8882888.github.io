import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const rows=JSON.parse(fs.readFileSync(path.join(root,'data/priority-regions.json'),'utf8')).pages;
const areas=[
 ['전북특별자치도 전주시',['만성동','효자동','이서면']],
 ['전북특별자치도 완주군',['이서면','삼례','봉동']],
 ['충청북도 진천군',['덕산읍','진천읍','맹동면']],
 ['충청북도 음성군',['맹동면','금왕읍','덕산읍']],
 ['대구광역시 동구',['신서혁신도시','동대구역','안심']]
];
const select=(region,kind)=>rows.find(row=>row.region===region&&row.kind===kind);
test('five more innovation/service areas have individually researched preparation notes',()=>{
 const intros=[];
 for(const [region,places] of areas){
  for(const kind of ['daeri','taksong']){
   const info=select(region,kind);
   assert.ok(info,'Missing approved priority region '+region+' / '+kind);
   assert.ok(info.detail.length>=240,'Too short to give real service guidance for '+region+'/'+kind);
   assert.ok(places.filter(place=>info.detail.includes(place)).length>=2,'Missing actual place distinctions '+region+'/'+kind);
   assert.doesNotMatch(info.detail,/일대에서 공공기관·법인차량|특히 혁신도시 공공기관·업무시설/,
    'Remaining copied innovation city paragraph: '+region+'/'+kind);
   assert.doesNotMatch(info.detail,/배차\s*(?:100%|확약|보장)|100%\s*배차|실제\s*운행\s*완료했습니다/,
    'Unverified dispatch or completed-trip guarantee in '+region+'/'+kind);
   intros.push(info.detail.slice(0,100));
  }
 }
 assert.equal(intros.length,10);
 assert.equal(new Set(intros).size,10,'All ten user-facing guide introductions must be different');
});
test('driver service and vehicle delivery guides give distinct customer preparation',()=>{
 for(const [region] of areas){
  const daeri=select(region,'daeri').detail;
  const taksong=select(region,'taksong').detail;
  assert.match(daeri,/(대리운전|회식)/);
  assert.match(daeri,/(목적지|출발)/);
  assert.match(taksong,/(차량|열쇠|키)/);
  assert.match(taksong,/(인수|인계|수령|출고)/);
  assert.notEqual(daeri,taksong);
 }
});

test('eight subdistrict service guides keep practical, non-repeated booking and handover guidance',()=>{
 const files=['twelfth-daeri-100','twelfth-taksong-100','fourteenth-daeri-100','fourteenth-taksong-100'];
 const curated=files.flatMap(name=>JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-'+name+'.json'),'utf8')).priority);
 const cases=[
  ['원주반곡동법인카드대리운전','daeri',['혁신도시','지하주차장']],
  ['원주반곡동차량탁송','taksong',['혁신도시','차량','인계']],
  ['원주지정면대리운전회사','daeri',['지정면','기업도시']],
  ['원주지정면탁송','taksong',['지정면','가곡리']],
  ['세종종촌동대리운전회사','daeri',['종촌동','복합커뮤니티센터']],
  ['세종종촌동차량탁송','taksong',['종촌동','지하주차장']],
  ['세종다정동법인대리운전','daeri',['다정동','가온마을']],
  ['세종다정동차량탁송','taksong',['다정동','가온마을']]
 ];
 const signatures=[];
 for(const [keyword,kind,phrases] of cases){
  const matches=curated.filter(item=>item.keyword===keyword&&item.kind===kind);
  assert.equal(matches.length,1,'Must map to one legal locality: '+keyword);
  const row=matches[0];
  assert.ok(row.pickup.length>=80,'Pickup preparation is too generic for '+keyword);
  assert.ok(row.handover.length>=75,'Handover preparation is too generic for '+keyword);
  const guide=row.pickup+' '+row.handover;
  for(const phrase of phrases)assert.ok(guide.includes(phrase),'Missing actual location/service detail '+phrase+' '+keyword);
  assert.doesNotMatch(guide,/100%\\s*배차|무조건\\s*배차|즉시\\s*배차\\s*보장|운행완료했습니다/);
  assert.notEqual(row.pickup,row.handover);
  signatures.push(row.pickup.slice(0,80)+'|'+row.handover.slice(0,75));
 }
 assert.equal(new Set(signatures).size,8,'No locality should repeat the same pickup/hand-over template');
});
