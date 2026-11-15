import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/priority-regions.json'),'utf8'));
const entries=data.pages||[];
const key=row=>row.kind+'|'+row.region;
const places={
 '부산광역시':['서면','해운대','광안리','기장'],
 '대구광역시':['동성로','수성못','범어동'],
 '강원특별자치도 속초시':['청초호','대포항','설악동'],
 '대전광역시':['둔산동','봉명동','유성구'],
 '울산광역시':['삼산동','방어진','언양'],
 '경상남도 창원시':['상남동','중앙동','마산','진해'],
 '강원특별자치도 강릉시':['경포','안목','주문진']
};

test('curated locality guides keep unique region/service identities',()=>{
 assert.ok(entries.length>=59,'Unexpected loss of existing curated region entries');
 assert.equal(new Set(entries.map(key)).size,entries.length,'Duplicate region/service pairs');
 for(const row of entries){
  assert.ok(['daeri','taksong'].includes(row.kind));
  assert.ok(row.region && row.topic && row.detail);
 }
});

test('seven refined local daeri guides retain real place context, not unrelated boilerplate',()=>{
 for(const [region,landmarks] of Object.entries(places)){
  const entry=entries.find(x=>x.kind==='daeri'&&x.region===region);
  assert.ok(entry,'Missing '+region+' daeri guide');
  assert.ok(landmarks.some(place=>entry.detail.includes(place)),'No distinctive place guidance for '+region);
  assert.ok(entry.detail.length>=130,'Thin place guidance for '+region);
  assert.ok(!entry.detail.includes('특히 혁신도시 공공기관·업무시설'),'Unrelated innovation-city template in '+region);
 }
});

test('curated guidance never asserts guaranteed dispatch or artificial ride completion',()=>{
 for(const row of entries){
  assert.doesNotMatch(row.detail,/100%\\s*(?:배차|운행)\\s*(?:보장|완료)|무조건\\s*배차|가상\\s*운행\\s*완료/);
 }
});
