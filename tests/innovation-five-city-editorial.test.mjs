import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pages=JSON.parse(fs.readFileSync(path.join(root,'data/priority-regions.json'),'utf8')).pages;
const cases=[
 ['세종특별자치시',['정부세종청사','나성동','조치원읍']],
 ['강원특별자치도 원주시',['원주기업도시','혁신도시']],
 ['경상남도 진주시',['충무공동','평거동','상대동']],
 ['전라남도 나주시',['빛가람동','나주역','송월동']],
 ['경상북도 김천시',['율곡동','김천구미역','평화동']]
];
const get=(kind,region)=>pages.find(row=>row.kind===kind&&row.region===region);
test('five high-priority locality pairs each have distinct, substantive public service guidance',()=>{
 const signatures=[];
 for(const [region,cues] of cases){
  for(const kind of ['daeri','taksong']){
   const row=get(kind,region);
   assert.ok(row,`Missing ${kind} ${region}`);
   assert.ok(row.detail.length>=220,`Thin ${kind} ${region}`);
   assert.ok(cues.filter(cue=>row.detail.includes(cue)).length>=2,`Missing local context for ${kind} ${region}`);
   assert.ok(row.topic.length>=13,`Missing descriptive topic ${kind} ${region}`);
   assert.doesNotMatch(row.detail,/일대에서 공공기관·법인차량|특히 혁신도시 공공기관·업무시설|같은 문구 자동 삽입/,
    `Reused formulaic innovation-city paragraph in ${kind} ${region}`);
   assert.doesNotMatch(row.detail,/100%\s*(?:배차|운행).*보장|당일\s*즉시\s*배차\s*보장|확정\s*고정\s*요금/,
    `Unsupported dispatch guarantee in ${kind} ${region}`);
   signatures.push(row.detail.slice(0,90));
  }
 }
 assert.equal(signatures.length,10);
 assert.equal(new Set(signatures).size,10,'First-page visible guidance must not have a shared duplicate introduction');
});
test('taksong and daeri text has different actual service preparation information',()=>{
 for(const [region] of cases){
  const t=get('taksong',region).detail, d=get('daeri',region).detail;
  assert.match(t,/(차량|열쇠|키|출고)/);
  assert.match(t,/(인수|인계|수령)/);
  assert.match(d,/(대리운전|회식|모임|귀가)/);
  assert.match(d,/(출발|목적지)/);
  assert.notEqual(d,t);
 }
});
test('curated pages remain connected to existing public canonical route renderers',()=>{
 const src=fs.readFileSync(path.join(root,'server.js'),'utf8');
 assert.match(src,/function priorityLocalGuide\(r,kind\)/);
 assert.match(src,/priorityByKey\.get\(kind\+'\|'\+r\.full_name\)/);
 assert.match(src,/id="priority-region-guide"/);
});
