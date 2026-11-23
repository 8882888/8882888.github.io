'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=require('../data/chungbuk-innovation-corridors-20261123.json');
const {create}=require('../lib/chungbuk-innovation-corridors.cjs');
const legal=['11','01','02','03','06'].flatMap(k=>JSON.parse(read('data/legal-regions/'+k+'.json')).full_names);
const regions=[],regionByFullName=new Map();
for(const full of legal){
 const name=full.split(' ').at(-1);
 const level=full.split(' ').length===1?'시도':/리$/.test(name)?'리':
  /읍$/.test(name)?'읍':/면$/.test(name)?'면':
  /구$/.test(name)?'구':/군$/.test(name)?'군':
  /시$/.test(name)?'시':'동';
 const r={full_name:full,name,level,slug:'fake-'+regions.length};
 regionByFullName.set(full,r);regions.push(r);
}
const servicePath=(r,k)=>'/'+k+'/regression/'+r.slug+'/';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const render=create({regions,regionByFullName,servicePath,esc});
test('3-city and eight-county source census yields exactly 24 existing canonical service URLs',()=>{
 const municipal=regions.filter(r=>r.full_name.startsWith('충청북도 ')&&['시','군'].includes(r.level));
 assert.equal(municipal.length,11);
 assert.equal(municipal.filter(r=>r.level==='시').length,3);
 assert.equal(municipal.filter(r=>r.level==='군').length,8);
 assert.equal(data.rows.length,11);
 assert.equal(new Set(data.rows.map(r=>r.region)).size,11);
 assert.deepEqual(new Set(data.rows.map(r=>r.region)),new Set(municipal.map(r=>r.full_name)));
 assert.equal(render.sourceCount,11);
 assert.equal(render.canonicalPaths.length,24);
 assert.equal(new Set(render.canonicalPaths).size,24);
});
test('Innovation City is legally in Jincheon Deoksan and Eumseong Maengdong, not a 12th city',()=>{
 assert.equal(data.innovation.jincheon,'충청북도 진천군 덕산읍');
 assert.equal(data.innovation.eumseong,'충청북도 음성군 맹동면');
 for(const full of [data.innovation.jincheon,data.innovation.eumseong])
  assert(regionByFullName.has(full),'source-backed legal 읍/면');
 assert(!data.rows.some(x=>x.region==='충청북도 충북혁신도시'));
 assert(data.geographic_source.includes('chungbuk.go.kr'));
});
test('all 22 municipal service pages link legal local routes and two Innovation City origins in both directions',()=>{
 let count=0;
 for(const row of data.rows){
  const region=regionByFullName.get(row.region);
  assert(region);
  for(const p of row.local)assert(regionByFullName.has(row.region+' '+p));
  for(const p of [...row.neighbors,...row.long])
   assert(regionByFullName.has(p));
  for(const kind of ['daeri','taksong']){
   const html=render.regionSection(region,kind);
   assert.equal((html.match(/id="chungbuk-innovation-corridors-20261123"/g)||[]).length,1);
   assert(html.includes(row[kind]));
   assert(html.includes('지역')&&html.includes('장거리'));
   assert(html.includes('/fare/?service='+kind+'&amp;from='));
   for(const p of row.local)
    assert(html.includes(encodeURIComponent(row.region+' '+p)),'missing local subregion');
   for(const p of [...row.neighbors,...row.long])
    assert(html.includes(encodeURIComponent(p)),'missing region '+p);
   for(const dest of [data.innovation.jincheon,data.innovation.eumseong]){
    assert(html.includes(encodeURIComponent(row.region)+'&amp;to='+encodeURIComponent(dest)),
      'source county → innovation direction missing');
    assert(html.includes(encodeURIComponent(dest)+'&amp;to='+encodeURIComponent(row.region)),
      'innovation → source county direction missing');
   }
   assert(html.includes('고객 예상요금조회 입력 예시'));
   assert(html.includes('배차완료')&&html.includes('운행완료'));
   assert(html.includes('API 장애'));
   assert(html.includes('tel:18114294'));
   assert(html.includes(servicePath(region,kind==='daeri'?'taksong':'daeri')));
   const meta=render.searchMeta(region,kind);
   assert(meta.title.includes(kind==='daeri'?'대리운전':'탁송'));
   assert(meta.description.includes('1811-4294'));
   assert([...meta.title].length<=80);
   count++;
  }
 }
 assert.equal(count,22);
});
test('Jincheon and Eumseong pages prominently distinguish the two Innovation City sectors',()=>{
 for(const county of ['진천군','음성군']){
  const region=regionByFullName.get('충청북도 '+county);
  for(const kind of ['daeri','taksong']){
   const html=render.regionSection(region,kind);
   assert(html.includes('충북혁신도시 핵심 출발지'));
   assert(html.includes('진천군 덕산읍과 음성군 맹동면'));
   assert(html.includes('공공기관'));
   const meta=render.searchMeta(region,kind);
   assert(meta.title.includes('충북혁신도시'));
   assert(meta.description.includes('진천 덕산읍↔음성 맹동면'));
  }
 }
});
test('provincial hub links all existing 11 city-county pages and the Deoksan-Maengdong route twice',()=>{
 const province=regionByFullName.get('충청북도');
 for(const kind of ['daeri','taksong']){
  const html=render.regionSection(province,kind);
  assert(html.includes('id="chungbuk-innovation-hub-20261123"'));
  for(const row of data.rows)
   assert(html.includes(servicePath(regionByFullName.get(row.region),kind)));
  assert(html.includes(encodeURIComponent(data.innovation.jincheon)+'&amp;to='+encodeURIComponent(data.innovation.eumseong)));
  assert(html.includes(encodeURIComponent(data.innovation.eumseong)+'&amp;to='+encodeURIComponent(data.innovation.jincheon)));
  assert(html.includes('3개 시·8개 군'));
  const meta=render.searchMeta(province,kind);
  assert(meta.title.includes('충북혁신도시'));
  assert(meta.description.includes('1811-4294'));
 }
});
test('server retains approved Innovation City search focus and earlier national service guides',()=>{
 const server=read('server.js');
 assert(server.includes("require('./lib/chungbuk-innovation-corridors.cjs').create"));
 assert(server.includes('chungbukInnovationGuides.regionSection(r,kind)'));
 assert.equal(server.split('chungbukInnovationGuides.regionSection(r,kind)').length-1,1);
 assert(server.includes('chungbukInnovationSearchMeta?.title'));
 assert(server.includes('chungbukInnovationSearchMeta?.description'));
 assert(server.includes('const chungbukInnovationSearchMeta=(!priorityMeta&&!focus50Info&&!historicalTitleTrip&&!verifiedTitleTrip&&!verifiedDaeriTitleTrip)'));
 for(const old of [
  'chungnamDaejeonGuides',
  'jeonbukServiceGuides',
  'jeonnamGwangjuServiceGuides',
  'gyeongbukDaeguGuides',
  'gyeongnamServiceGuides'
 ])assert(server.includes(old+'.regionSection(r,kind)'));
 const focus=read('lib/innovation-search-focus.js');
 assert(focus.includes("region:'충청북도 진천군'"));
 assert(focus.includes("region:'충청북도 음성군'"));
 assert.deepEqual(data.rows.filter(r=>/진천군|음성군/.test(r.region)).length,2);
});
