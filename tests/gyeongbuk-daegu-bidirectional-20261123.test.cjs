'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const source=require('../data/gyeongbuk-daegu-bidirectional-20261123.json');
const {create}=require('../lib/gyeongbuk-daegu-bidirectional.cjs');
const provinces=['15','03','01','02','06','07'];
const legal=provinces.flatMap(c=>JSON.parse(read('data/legal-regions/'+c+'.json')).full_names);
const regions=[],byFull=new Map();
for(const full of legal){
 const name=full.split(' ').at(-1);
 const level=full.split(' ').length===1?'시도':/리$/.test(name)?'리':
  /읍$/.test(name)?'읍':/면$/.test(name)?'면':
  /구$/.test(name)?'구':/군$/.test(name)?'군':
  /시$/.test(name)?'시':'동';
 const r={full_name:full,name,level,slug:'dummy'+regions.length};
 regions.push(r);byFull.set(full,r);
}
const servicePath=(r,k)=>'/'+k+'/region/'+r.slug+'/';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const renderer=create({regions,regionByFullName:byFull,servicePath,esc});
test('Gyeongbuk 22 localities, Daegu nine boroughs and two hubs keep exactly 66 existing canonical paths',()=>{
 const gb=regions.filter(x=>x.full_name.startsWith('경상북도 ')&&['시','군'].includes(x.level));
 const dg=regions.filter(x=>x.full_name.startsWith('대구광역시 ')&&['구','군'].includes(x.level));
 assert.equal(gb.length,22);
 assert.equal(dg.length,9);
 assert.equal(source.gyeongbuk.length,22);
 assert.equal(source.daegu.length,9);
 assert.equal(new Set([...source.gyeongbuk,...source.daegu].map(x=>x.region)).size,31);
 assert.equal(renderer.sourceCount,31);
 assert.equal(renderer.canonicalPaths.length,66);
 assert.equal(new Set(renderer.canonicalPaths).size,66);
 assert.equal(source.gyeongbuk.filter(x=>x.requires_ferry).length,1);
});
test('44 Gyeongbuk service pages show distinct regional, Daegu-forward, reverse and long-distance guidance',()=>{
 let count=0;
 for(const row of source.gyeongbuk){
  assert(byFull.has(row.region));
  assert(row.local.every(a=>byFull.has(row.region+' '+a)));
  assert(row.neighbors.every(n=>byFull.has(n)));
  assert(byFull.has(row.daegu));
  for(const kind of ['daeri','taksong']){
   const html=renderer.regionSection(byFull.get(row.region),kind);
   assert.equal((html.match(/id="gyeongbuk-daegu-bidirectional-20261123"/g)||[]).length,1);
   assert(html.includes(row[kind]));
   assert(html.includes('대리운전·장거리대리운전')||html.includes('지역간탁송·자동차탁송'));
   assert(html.includes(encodeURIComponent(row.region+' '+row.local[0])));
   assert(html.includes(encodeURIComponent(row.region+' '+row.local[1])));
   assert(html.includes('tel:18114294'));
   assert(html.includes('배차완료·운행완료'));
   const meta=renderer.searchMeta(byFull.get(row.region),kind);
   assert(meta.title.includes(kind==='daeri'?'대리운전':'탁송'));
   assert(meta.description.includes('1811-4294'));
   if(!row.requires_ferry){
    assert(html.includes(encodeURIComponent(row.region)+'&amp;to='+encodeURIComponent(row.daegu)));
    assert(html.includes(encodeURIComponent(row.daegu)+'&amp;to='+encodeURIComponent(row.region)));
    for(const near of row.neighbors)assert(html.includes(encodeURIComponent(near)));
    for(const long of row.long)assert(html.includes(encodeURIComponent(long)));
   }
   count++;
  }
 }
 assert.equal(count,44);
});
test('18 Daegu district/county service pages link Gyeongbuk in both route directions',()=>{
 let count=0;
 for(const row of source.daegu){
  for(const kind of ['daeri','taksong']){
   const html=renderer.regionSection(byFull.get(row.region),kind);
   assert(html.includes(row[kind]));
   assert(html.includes('지역간탁송')||html.includes('장거리대리운전'));
   assert(html.includes('/fare/?service='+kind+'&amp;from='));
   assert(html.includes(encodeURIComponent(row.region+' '+row.local[0])));
   for(const n of [...row.gyeongbuk,...row.metroNeighbors,...row.long])
    assert(html.includes(encodeURIComponent(n)),'missing route '+row.region+' -> '+n);
   for(const n of row.gyeongbuk){
    assert(html.includes(encodeURIComponent(n)+'&amp;to='+encodeURIComponent(row.region)),
       'reverse route from Gyeongbuk to Daegu must exist '+n);
   }
   count++;
  }
 }
 assert.equal(count,18);
});
test('Ulleung island transport does not imply an uninterrupted road fare to Daegu or mainland',()=>{
 const row=source.gyeongbuk.find(x=>x.region==='경상북도 울릉군');
 assert(row&&row.requires_ferry);
 for(const kind of ['daeri','taksong']){
  const html=renderer.regionSection(byFull.get(row.region),kind);
  const urlPrefix='/fare/?service='+kind+'&amp;from=';
  assert.equal(html.split(urlPrefix).length-1,1,
    'only Ulleung internal route may use continuous road fare quote');
  for(const n of [row.daegu,...row.neighbors,...row.long])
   assert(!html.includes(encodeURIComponent(row.region)+'&amp;to='+encodeURIComponent(n)),
     'cross-water mainland quote must be suppressed');
  assert(html.includes('차량 선적')||html.includes('차량 선적 가능한'));
  assert(html.includes('도서 구간 육지 연결 도로요금 계산 불가'));
  assert(html.includes('tel:18114294'));
 }
});
test('two regional hubs list all existing locality service URLs and Daegu↔Gyeongbuk intent',()=>{
 for(const [full,rows] of [['경상북도',source.gyeongbuk],['대구광역시',source.daegu]]){
  for(const kind of ['daeri','taksong']){
   const html=renderer.regionSection(byFull.get(full),kind);
   assert(html.includes('id="gyeongbuk-daegu-regional-hub-20261123"'));
   for(const row of rows)assert(html.includes(servicePath(byFull.get(row.region),kind)));
   assert(html.includes('대구에서 경산·구미·칠곡·영천·청도'));
   assert(html.includes('울릉도'));
   const meta=renderer.searchMeta(byFull.get(full),kind);
   assert(meta.description.includes('대구↔경북'));
  }
 }
});
test('existing validated priority pages and earlier regional source work remain intact',()=>{
 const server=read('server.js');
 assert(server.includes("require('./lib/gyeongbuk-daegu-bidirectional.cjs').create"));
 assert(server.includes("const gyeongbukDaeguSearchMeta=(!priorityMeta&&!focus50Info&&!historicalTitleTrip"));
 assert(server.includes('gyeongbukDaeguSearchMeta?.title'));
 assert(server.includes('gyeongbukDaeguSearchMeta?.description'));
 assert.equal(server.split('gyeongbukDaeguGuides.regionSection(r,kind)').length-1,1);
 for(const existing of ['jeonbukServiceGuides','jeonnamGwangjuServiceGuides','gyeongnamServiceGuides'])
  assert(server.includes(existing+'.regionSection(r,kind)'));
});
