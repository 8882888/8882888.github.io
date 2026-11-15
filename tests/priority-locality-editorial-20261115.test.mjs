import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const specs=[
 ['sixth-100','세종시탁송','taksong',['나성동','조치원읍','세종특별자치시']],
 ['sixth-100','세종법인대리운전','daeri',['나성동','조치원읍','법인카드']],
 ['next-50','원주탁송','taksong',['반곡동','단계동','원주시']],
 ['next-50','진주탁송','taksong',['충무공동','가좌동','진주시']],
 ['third-50','원주일일기사','daeri',['반곡동','대기','식대']],
 ['fourth-50','나주탁송','taksong',['빛가람동','영산포','나주시']],
 ['fourth-50','김천탁송','taksong',['율곡동','어모면','김천시']],
 ['fifth-daeri-50','나주법인카드대리운전','daeri',['빛가람동','법인카드','정산']],
 ['fifteenth-daeri-100','세종반곡동대리업체','daeri',['반곡동','집현동','장거리대리운전']],
 ['fifteenth-daeri-100','세종집현동대리운전업체','daeri',['집현동','반곡동','행정동']],
 ['fifteenth-taksong-100','세종반곡동장거리탁송','taksong',['반곡동','장거리탁송','항만']],
 ['fifteenth-taksong-100','세종집현동차량탁송','taksong',['집현동','반곡동','반출']],
 ['thirteenth-daeri-100','나주빛가람동법인대리운전','daeri',['빛가람동','법인','광주']],
 ['thirteenth-daeri-100','진주하대동대리운전','daeri',['하대동','사천','출차']],
 ['thirteenth-taksong-100','나주빛가람동자동차탁송','taksong',['빛가람동','공공기관','반출']],
 ['thirteenth-taksong-100','진주하대동차량탁송','taksong',['하대동','진주','사천']]
];
const fileNames=[...new Set(specs.map(([key])=>key))];
const fileData=new Map(fileNames.map(key=>[key,
 JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-'+key+'.json'),'utf8')).priority]));
const risk=/(?:100%\s*(?:배차|보장)|즉시\s*배차\s*보장|무조건\s*배차|상시\s*상주|실제\s*운행을\s*완료했습니다)/;
test('16 priority Sejong, Wonju, Jinju, Naju and Gimcheon guides pass the source editorial review gates',()=>{
 assert.equal(specs.length,16);
 const pickupSignatures=[],handoverSignatures=[],locationKindKeys=[];
 for(const [source,keyword,kind,details] of specs){
  const rows=fileData.get(source).filter(item=>item.keyword===keyword&&item.kind===kind);
  assert.equal(rows.length,1,'Exactly one matching published guide for '+keyword);
  const item=rows[0];
  assert.ok(item.topic?.length>=13,'Substantive distinct topic required: '+keyword);
  assert.ok(item.pickup?.length>=80,'Pickup location/context too short: '+keyword);
  assert.ok(item.handover?.length>=75,'Actual handover guidance too short: '+keyword);
  assert.ok(item.related?.startsWith('/'),'Internal service link required: '+keyword);
  assert.ok(item.pickup.includes(item.region.trim().split(/\s+/).at(-1))||
    item.handover.includes(item.region.trim().split(/\s+/).at(-1))||
    item.topic.includes(item.region.trim().split(/\s+/).at(-1)),
   'Last locality must appear visibly for '+keyword);
  const guide=[item.topic,item.pickup,item.handover].join(' ');
  for(const term of details)assert.ok(guide.includes(term),'Missing specific local/service fact '+term+' for '+keyword);
  assert.doesNotMatch(guide,risk,'Do not invent completed rides or guaranteed drivers: '+keyword);
  assert.notEqual(item.pickup,item.handover,'Pickup and handover must do different jobs: '+keyword);
  pickupSignatures.push(item.pickup);
  handoverSignatures.push(item.handover);
  locationKindKeys.push(item.kind+'|'+item.region);
 }
 assert.equal(new Set(pickupSignatures).size,16,'No duplicated pickup paragraphs');
 assert.equal(new Set(handoverSignatures).size,16,'No duplicated handover paragraphs');
 assert.equal(new Set(locationKindKeys).size,16,'No duplicate region/service landing page');
});
test('Sejong Bangok-dong and Jiphyeon-dong stay distinct after the 2026 administrative change',()=>{
 for(const kind of ['daeri','taksong']){
  const source=kind==='daeri'?'fifteenth-daeri-100':'fifteenth-taksong-100';
  const rows=fileData.get(source);
  const bangok=rows.find(x=>x.region.endsWith('반곡동'));
  const jiphyeon=rows.find(x=>x.region.endsWith('집현동'));
  assert.ok(bangok&&jiphyeon,'Both Sejong official neighborhoods must exist in '+kind);
  assert.notEqual(bangok.region,jiphyeon.region);
  assert.notEqual(bangok.pickup,jiphyeon.pickup);
  assert.ok(bangok.pickup.includes('반곡동')&&jiphyeon.pickup.includes('집현동'));
 }
});
