import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pages=JSON.parse(fs.readFileSync(path.join(root,'data/priority-regions.json'),'utf8')).pages;
const targets=[
 ['부산광역시','taksong',['부산항','감만동','해운대','기장군']],
 ['울산광역시','taksong',['온산','방어진','달천동','언양']],
 ['대구광역시','taksong',['범어동','만촌동','상인동','침산동']],
 ['강원특별자치도 속초시','taksong',['오색','한계령','백담사','소공원']],
 ['강원특별자치도 강릉시','taksong',['경포대','주문진','강릉항','동해안']],
 ['대전광역시','taksong',['둔산동','유성구','월평동','대덕구']],
 ['경상남도 창원시','taksong',['성산구','마산','진해']],
 ['부산광역시 영도구','daeri',['동삼혁신지구','태종대','영도']],
 ['부산광역시 영도구','taksong',['동삼혁신지구','태종대','영도']],
 ['울산광역시 중구','taksong',['우정혁신도시','성남동','태화강']]
];
test('ten major city and port region guides provide non-recycled service-specific handover detail',()=>{
 const intros=[];
 for(const [region,kind,places] of targets){
  const row=pages.find(x=>x.region===region&&x.kind===kind);
  assert.ok(row,region+' '+kind+' missing');
  assert.ok(row.detail.length>=245,region+' '+kind+' detail is too thin');
  assert.ok(places.filter(p=>row.detail.includes(p)).length>=2,region+' '+kind+' specific places missing');
  assert.doesNotMatch(row.detail,/일대에서 공공기관·법인차량|특히 혁신도시 공공기관·업무시설/,
   region+' '+kind+' retains duplicate bulk template');
  assert.doesNotMatch(row.detail,/(?:100%|무조건)\s*배차|(?:운행|배차)\s*완료했습니다|기사\s*상주\s*보장/,
   region+' '+kind+' unsupported guarantee');
  if(kind==='taksong'){
   assert.match(row.detail,/(키|열쇠|인수|인계)/);
   assert.match(row.detail,/(차량|탁송|출고)/);
  }else{
   assert.match(row.detail,/(귀가|대리운전)/);
   assert.match(row.detail,/(출발|목적지)/);
  }
  intros.push(row.detail.slice(0,110));
 }
 assert.equal(new Set(intros).size,10,'All introductions must be unique for users and crawlers');
});
test('coastal destination advice distinguishes mountain/cycling transfer from completed service claims',()=>{
 for(const region of ['강원특별자치도 속초시','강원특별자치도 강릉시']){
  const note=pages.find(x=>x.region===region&&x.kind==='taksong').detail;
  assert.match(note,/종주/);
  assert.match(note,/(주차장|차량 주차)/);
  assert.doesNotMatch(note,/종주(?:탁송)?\s*(?:완료|배차완료)/);
 }
});
