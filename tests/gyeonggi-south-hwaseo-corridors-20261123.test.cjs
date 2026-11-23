'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const data=require('../data/gyeonggi-south-hwaseo-corridors-20261123.json');
const {create}=require('../lib/gyeonggi-south-hwaseo-corridors.cjs');
const legal=['09','01','02','06'].flatMap(k=>JSON.parse(read('data/legal-regions/'+k+'.json')).full_names);
const byFull=new Map(),regions=[];
for(const full of legal){
 const name=full.split(' ').at(-1);
 const level=full.split(' ').length===1?'시도':/리$/.test(name)?'리':
   /읍$/.test(name)?'읍':/면$/.test(name)?'면':
   /구$/.test(name)?'구':/군$/.test(name)?'군':
   /시$/.test(name)?'시':'동';
 const r={full_name:full,name,level,slug:'gyeonggi-south-'+regions.length};
 regions.push(r);byFull.set(full,r);
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const servicePath=(r,k)=>'/'+k+'/existing/'+r.slug+'/';
const render=create({regions,regionByFullName:byFull,servicePath,esc});
test('seven distinct existing legal regions preserve exactly 14 service canonicals',()=>{
 assert.equal(data.rows.length,7);
 assert.equal(render.sourceCount,7);
 assert.equal(render.canonicalPaths.length,14);
 assert.equal(new Set(render.canonicalPaths).size,14);
 assert.deepEqual(new Set(data.rows.map(x=>x.region)),new Set([
  '경기도 용인시','경기도 화성시','경기도 평택시','경기도 안성시',
  '경기도 수원시','경기도 수원시 팔달구','경기도 수원시 팔달구 화서동'
 ]));
 for(const row of data.rows){
  assert(byFull.has(row.region),'official legal region missing '+row.region);
  for(const k of ['daeri','taksong'])
   assert(render.canonicalPaths.includes(servicePath(byFull.get(row.region),k)));
 }
});
test('Yongin-Hwaseong-Pyeongtaek-Anseong regional route links are bidirectional in all 14 service sections',()=>{
 let pages=0;
 for(const row of data.rows){
  const rr=byFull.get(row.region);
  for(const k of ['daeri','taksong']){
   const html=render.regionSection(rr,k);
   assert.equal((html.match(/id="gyeonggi-south-hwaseo-corridors-20261123"/g)||[]).length,1);
   assert(html.includes(row[k]),row.region+' distinct '+k);
   assert(html.includes('tel:18114294'));
   assert(html.includes('지역간')&&html.includes('장거리'));
   assert(html.includes('접수 오더·배차완료·운행완료'));
   assert(html.includes('외부 도로거리 API 장애'));
   assert(html.includes('1811-4294'));
   for(const t of row.targets){
    assert(html.includes(encodeURIComponent(row.region)+'&amp;to='+encodeURIComponent(t)),
      row.region+' → '+t);
    assert(html.includes(encodeURIComponent(t)+'&amp;to='+encodeURIComponent(row.region)),
      t+' → '+row.region);
   }
   for(const t of row.long)
    assert(html.includes(encodeURIComponent(t)),row.region+' long destination '+t);
   for(const local of row.local)
    assert(html.includes(encodeURIComponent(row.hwaseo?local:row.region+' '+local)));
   const m=render.searchMeta(rr,k);
   assert(m.title.includes(k==='daeri'?'대리운전':'탁송'));
   assert(m.description.includes('1811-4294'));
   assert([...m.title].length<=80);
   assert(m.description.length>=70&&m.description.length<=160);
   assert(html.includes(servicePath(rr,k==='daeri'?'taksong':'daeri')));
   pages++;
  }
 }
 assert.equal(pages,14);
});
test('화서 means Suwon Paldal-gu Hwaseo-dong and must NOT be conflated with Hwaseong-si',()=>{
 const hwaseo=byFull.get('경기도 수원시 팔달구 화서동');
 const hwaseong=byFull.get('경기도 화성시');
 const paldal=byFull.get('경기도 수원시 팔달구');
 assert(hwaseo&&hwaseong&&paldal);
 assert.notEqual(hwaseo.full_name,hwaseong.full_name);
 for(const k of ['daeri','taksong']){
  const h=render.regionSection(hwaseo,k),city=render.regionSection(hwaseong,k);
  assert(h.includes('화서 ≠ 화성'));
  assert(h.includes('화서1동·화서2동'));
  assert(h.includes('화서동은 수원시 팔달구의 법정동'));
  assert(h.includes('동탄구·만세구·병점구·효행구'));
  assert(city.includes('현행 화성시 행정구역'));
  assert(city.includes('수원 화서동'));
  assert(h.includes(servicePath(hwaseong,k))&&city.includes(servicePath(hwaseo,k)));
  assert(render.searchMeta(hwaseo,k).title.startsWith(k==='daeri'?'화서동대리운전':'화서동탁송'));
  assert(render.searchMeta(hwaseong,k).title.startsWith(k==='daeri'?'화성대리운전':'화성탁송'));
 }
});
test('all four official 2026 Hwaseong city general districts exist, with no invented old-location alias',()=>{
 for(const name of ['동탄구','만세구','병점구','효행구'])
  assert(byFull.has('경기도 화성시 '+name),'missing current 2026 administrative district '+name);
 assert.deepEqual(data.currentHwaseongGu,['동탄구','만세구','병점구','효행구']);
 assert(!data.rows.some(r=>r.region==='경기도 화서시'));
});
test('source data are only prospective customer quote examples, with no fabricated prices or completed rides',()=>{
 const allHtml=data.rows.flatMap(r=>['daeri','taksong'].map(k=>
  render.regionSection(byFull.get(r.region),k))).join('\n');
 assert(!/^\s*확정요금\s*:/m.test(allHtml));
 assert(!/\b\d{1,3}(?:,\d{3})*원\b/.test(allHtml),
   'cannot make up a firm won amount for unstated route');
 assert(allHtml.includes('기록')||allHtml.includes('실제'));
 assert(data.status.includes('not logged received orders'));
 assert(data.status.includes('not logged received orders')||
   data.status.includes('not actual')); // no claim of historical dispatch
});
test('priority verified case meta and every prior regional SEO module remain intact',()=>{
 const server=read('server.js');
 assert(server.includes("require('./lib/gyeonggi-south-hwaseo-corridors.cjs').create"));
 assert(server.includes('gyeonggiSouthHwaseoSearchMeta?.title'));
 assert(server.includes('gyeonggiSouthHwaseoSearchMeta?.description'));
 assert(server.includes('const gyeonggiSouthHwaseoSearchMeta=(!priorityMeta&&!focus50Info&&!historicalTitleTrip&&!verifiedTitleTrip&&!verifiedDaeriTitleTrip)'));
 assert.equal(server.split('gyeonggiSouthHwaseoGuides.regionSection(r,kind)').length-1,1);
 for(const module of ['chungbukInnovationGuides','chungnamDaejeonGuides','gyeongbukDaeguGuides','jeonbukServiceGuides','jeonnamGwangjuServiceGuides','gyeongnamServiceGuides']){
  assert(server.includes(module+'.regionSection(r,kind)'),module+' must remain');
 }
 const packageJson=JSON.parse(read('package.json'));
 assert(packageJson.scripts['check:seo'].includes('gyeonggi-south-hwaseo-corridors-20261123.test.cjs'));
});
