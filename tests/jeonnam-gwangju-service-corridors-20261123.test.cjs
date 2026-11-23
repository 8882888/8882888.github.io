'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const data=JSON.parse(read('data/jeonnam-gwangju-service-corridors-20261123.json'));
const {create}=require('../lib/jeonnam-gwangju-service-corridors.cjs');
const legal=[
 ...JSON.parse(read('data/legal-regions/14.json')).full_names,
 ...JSON.parse(read('data/legal-regions/05.json')).full_names
];
const all=[...new Set([...legal,'서울특별시','부산광역시','대구광역시'])];
const byFull=new Map(),regions=[];
for(const [i,full] of all.entries()){
 const parts=full.split(' '),name=parts.at(-1);
 const level=parts.length===1?'시도':/[리]$/.test(name)?'리':/[읍]$/.test(name)?'읍':/[면]$/.test(name)?'면':
   /[구]$/.test(name)?'구':/[군]$/.test(name)?'군':/[시]$/.test(name)?'시':'동';
 const r={full_name:full,name,level,slug:'stub-'+(i+1)};
 byFull.set(full,r);regions.push(r);
}
const esc=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const url=(r,kind)=>'/'+kind+'/regression/'+r.slug+'/';
const render=create({regions,regionByFullName:byFull,servicePath:url,esc});
const jeonnam=data.regions.filter(x=>x.region.startsWith('전라남도 '));
const gwangju=data.regions.filter(x=>x.region.startsWith('광주광역시 '));
test('22 official Jeonnam municipalities and five Gwangju districts are covered exactly once',()=>{
 assert.equal(jeonnam.length,22);
 assert.equal(gwangju.length,5);
 assert.equal(data.regions.length,27);
 assert.equal(new Set(data.regions.map(x=>x.region)).size,27);
 assert.equal(render.sourceCount,27);
 assert.equal(render.canonicalPaths.length,58);
 assert.equal(new Set(render.canonicalPaths).size,58);
 for(const row of data.regions){
  assert(byFull.has(row.region));
  assert.equal(row.local.length,2);
  for(const a of row.local)assert(byFull.has(row.region+' '+a),'invalid legal subregion '+row.region+' '+a);
  assert.equal(new Set(row.nearby).size,2);
  row.nearby.forEach(n=>assert(byFull.has(n)&&n!==row.region,'invalid adjacent region '+n));
  assert(row.daeri.length>=75&&row.taksong.length>=75);
  assert.notEqual(row.daeri,row.taksong);
 }
});
test('54 existing local service pages expose separate regional, neighboring and long-distance intent',()=>{
 const seen=new Set();
 for(const row of data.regions){
  for(const kind of ['daeri','taksong']){
   const html=render.regionSection(byFull.get(row.region),kind);
   assert.equal((html.match(/id="jeonnam-gwangju-corridors-20261123"/g)||[]).length,1);
   assert(html.includes(row[kind]),'original guidance not present '+row.region+'/'+kind);
   assert(html.includes('href="/fare/?service='+kind+'&amp;from='));
   assert(html.includes(encodeURIComponent(row.region+' '+row.local[0])));
   assert(html.includes(encodeURIComponent(row.region+' '+row.local[1])));
   row.nearby.forEach(n=>assert(html.includes(encodeURIComponent(n)),'missing neighbor '+n));
   const endpoints=row.region.startsWith('전라남도 ')?
    ['광주광역시','서울특별시','부산광역시','대구광역시']:
    ['전라남도 목포시','전라남도 여수시','서울특별시','부산광역시','대구광역시'];
   endpoints.forEach(n=>assert(html.includes(encodeURIComponent(n)),'missing long-distance endpoint '+n));
   assert(html.includes('실제 완료 운행')&&html.includes('요금')&&html.includes('1811-4294'));
   assert(html.includes('검증 가능한 원본 운행기록 별도 검색'));
   assert(html.includes('href="'+url(byFull.get(row.region),kind==='daeri'?'taksong':'daeri')+'"'));
   assert(!html.includes('40,000원')&&!html.includes('배차완료 사례'));
   const sign=row.region+'|'+kind;
   assert(!seen.has(sign));seen.add(sign);
   const meta=render.searchMeta(byFull.get(row.region),kind);
   assert(meta.title.includes(kind==='daeri'?'대리운전':'탁송'));
   assert([...meta.title].length<=80);
   assert(meta.description.includes('1811-4294'));
  }
 }
 assert.equal(seen.size,54);
});
test('the two provincial hubs link every existing legal municipality and the other province',()=>{
 for(const [full,expected,other] of [['전라남도',jeonnam,'광주광역시'],['광주광역시',gwangju,'전라남도']]){
  for(const kind of ['daeri','taksong']){
   const html=render.regionSection(byFull.get(full),kind);
   assert(html.includes('id="jeonnam-gwangju-hub-20261123"'));
   for(const x of expected)assert(html.includes('href="'+url(byFull.get(x.region),kind)+'"'),'missing hub link '+x.region);
   assert(html.includes(url(byFull.get(other),kind)),'province bridge missing');
   const meta=render.searchMeta(byFull.get(full),kind);
   assert(meta.title.includes(kind==='daeri'?'대리운전':'탁송'));
   assert(meta.description.includes('1811-4294'));
  }
 }
});
test('site injects at most one locale guide section in the existing customer-first regional page',()=>{
 const server=read('server.js');
 assert(server.includes("require('./lib/jeonnam-gwangju-service-corridors.cjs').create"));
 assert(server.includes('jeonnamGwangjuServiceGuides.regionSection(r,kind)'));
 assert(server.includes('jeonnamGwangjuSearchMeta?.title'));
 assert(server.includes('jeonnamGwangjuSearchMeta?.description'));
 assert.equal(server.split('jeonnamGwangjuServiceGuides.regionSection(r,kind)').length-1,1);
 assert(server.includes("gyeongnamServiceGuides.regionSection(r,kind)"),'protect existing Gyeongnam work');
 assert(server.includes("!priorityMeta&&!focus50Info&&!historicalTitleTrip"),
   'do not overwrite verified source case titles');
 assert.equal(JSON.parse(read('data/ride-history.json')).length,2591,
   'existing original ride history must not be modified to fabricate source support');
});
