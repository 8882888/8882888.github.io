'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=require('../data/jeonbuk-daeri-taksong-local-corridors-20261123.json');
const {create}=require('../lib/jeonbuk-daeri-taksong-corridors.cjs');
const legal=[
 ...JSON.parse(read('data/legal-regions/13.json')).full_names,
 ...JSON.parse(read('data/legal-regions/01.json')).full_names,
 ...JSON.parse(read('data/legal-regions/02.json')).full_names,
 ...JSON.parse(read('data/legal-regions/03.json')).full_names,
 ...JSON.parse(read('data/legal-regions/05.json')).full_names,
 ...JSON.parse(read('data/legal-regions/06.json')).full_names
];
const byFull=new Map(),regions=[];
for(const full of legal){
 const part=full.split(' '),name=part.at(-1);
 const level=part.length===1?'시도':/리$/.test(name)?'리':/읍$/.test(name)?'읍':
  /면$/.test(name)?'면':/구$/.test(name)?'구':/군$/.test(name)?'군':
  /시$/.test(name)?'시':'동';
 const r={full_name:full,name,level,slug:'test-region-'+regions.length};
 byFull.set(full,r);regions.push(r);
}
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const servicePath=(r,kind)=>'/'+kind+'/region/'+r.slug+'/';
const render=create({regions,regionByFullName:byFull,servicePath,esc});
test('all 14 Jeonbuk municipalities retain existing daeri/taksong canonical pages',()=>{
 const cities=regions.filter(r=>r.full_name.startsWith('전북특별자치도 ')&&
   ['시','군'].includes(r.level));
 assert.equal(cities.length,14);
 assert.equal(cities.filter(r=>r.level==='시').length,6);
 assert.equal(cities.filter(r=>r.level==='군').length,8);
 assert.equal(data.rows.length,14);
 assert.equal(new Set(data.rows.map(r=>r.region)).size,14);
 assert.deepEqual(new Set(data.rows.map(r=>r.region)),new Set(cities.map(r=>r.full_name)));
 assert.equal(render.sourceCount,14);
 assert.equal(render.canonicalPaths.length,30);
 assert.equal(new Set(render.canonicalPaths).size,30);
 assert.equal(data.legacy_name,'전라북도');
 assert.equal(data.province,'전북특별자치도');
 assert.equal(data.province_effective,'2024-01-18');
});
test('28 regional pages offer short, two neighboring and two long-distance routes with distinct service advice',()=>{
 let count=0;
 for(const item of data.rows){
  assert.equal(item.local.length,2);
  assert.notEqual(item.local[0],item.local[1]);
  assert(item.local.every(a=>byFull.has(item.region+' '+a)));
  assert(item.nearby.every(n=>byFull.has(n)&&n!==item.region));
  assert(item.long.every(n=>byFull.has(n)&&n!==item.region));
  for(const kind of ['daeri','taksong']){
   const html=render.regionSection(byFull.get(item.region),kind);
   assert.equal((html.match(/id="jeonbuk-mobility-corridors-20261123"/g)||[]).length,1);
   assert(html.includes(item[kind]),item.region+'/'+kind+' unique source prose');
   assert(html.includes('/fare/?service='+kind+'&amp;from='));
   assert(html.includes(encodeURIComponent(item.region+' '+item.local[0])));
   assert(html.includes(encodeURIComponent(item.region+' '+item.local[1])));
   for(const destination of [...item.nearby,...item.long])
    assert(html.includes(encodeURIComponent(destination)),item.region+' → '+destination);
   assert(html.includes('단거리')&&html.includes('인접지역')&&html.includes('장거리'));
   assert(html.includes('실제 스마트24 접수 오더·배차완료·운행완료'));
   assert(html.includes('tel:18114294'));
   assert(html.includes('기존 원본 운행기록 별도 검색'));
   const meta=render.searchMeta(byFull.get(item.region),kind);
   assert(meta&&meta.title.includes(kind==='daeri'?'대리운전':'탁송'));
   assert(meta.description.includes('1811-4294'));
   count++;
  }
 }
 assert.equal(count,28);
});
test('Dedeogyusan and Yuksimnyeong remain distinct mountain trail transport locations',()=>{
 const row=data.rows.find(x=>x.region==='전북특별자치도 무주군');
 assert(row&&row.taksong.includes('육십령')&&row.taksong.includes('장수·함양권'));
 const html=render.regionSection(byFull.get(row.region),'taksong');
 for(const keyword of ['덕유산탁송','무주탁송','육십령탁송'])assert(html.includes(keyword));
 assert(html.includes('무주군 내부 장소로 오인하지 않'));
});
test('province hubs preserve 14 municipalities and legacy Jeollabuk-do search word',()=>{
 const province=byFull.get('전북특별자치도');
 for(const kind of ['daeri','taksong']){
  const html=render.regionSection(province,kind);
  assert(html.includes('id="jeonbuk-14-city-county-service-hub-20261123"'));
  for(const item of data.rows){
   assert(html.includes(servicePath(byFull.get(item.region),kind)),item.region);
  }
  assert(html.includes('전라북도'));
  assert(html.includes('전북특별자치도'));
  assert(html.includes('14개 시·군'));
 }
});
test('source-backed priority meta/complete rides and Gyeongnam and Jeonnam remain protected',()=>{
 const server=read('server.js');
 assert(server.includes("require('./lib/jeonbuk-daeri-taksong-corridors.cjs').create"));
 assert(server.includes('jeonbukServiceGuides.regionSection(r,kind)'));
 assert(server.includes('jeonbukSearchMeta?.title'));
 assert(server.includes('jeonbukSearchMeta?.description'));
 assert(server.includes('const jeonbukSearchMeta=(!priorityMeta&&!focus50Info&&!historicalTitleTrip&&!verifiedTitleTrip&&!verifiedDaeriTitleTrip)'));
 assert.equal(server.split('jeonbukServiceGuides.regionSection(r,kind)').length-1,1);
 assert(server.includes('jeonnamGwangjuServiceGuides.regionSection(r,kind)'));
 assert(server.includes('gyeongnamServiceGuides.regionSection(r,kind)'));
 assert.equal(render.canonicalPaths.length,30);
});
