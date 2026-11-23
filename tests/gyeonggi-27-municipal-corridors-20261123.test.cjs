'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=require('../data/gyeonggi-27-municipal-corridors-20261123.json');
const {create}=require('../lib/gyeonggi-27-municipal-corridors.cjs');
const legal=['09','01','02','06'].flatMap(x=>JSON.parse(read('data/legal-regions/'+x+'.json')).full_names);
const regions=[],regionByFullName=new Map();
for(const full of legal){
 const name=full.split(' ').at(-1);
 const level=full.split(' ').length===1?'시도':/리$/.test(name)?'리':
  /읍$/.test(name)?'읍':/면$/.test(name)?'면':
  /구$/.test(name)?'구':/군$/.test(name)?'군':/시$/.test(name)?'시':'동';
 const r={full_name:full,name,level,slug:'test-'+regions.length};
 regions.push(r);regionByFullName.set(full,r);
}
const servicePath=(r,k)=>'/'+k+'/existing/'+r.slug+'/';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const guides=create({regions,regionByFullName,servicePath,esc});
const excluded=['경기도 용인시','경기도 화성시','경기도 평택시','경기도 안성시'];
test('Gyeonggi scope is exactly 31 official city/county regions less four excluded: 27',()=>{
 const official=regions.filter(r=>r.full_name.startsWith('경기도 ')&&['시','군'].includes(r.level));
 assert.equal(official.length,31);
 assert.equal(source.municipality_count,27);
 assert.equal(source.rows.length,27);
 assert.equal(guides.sourceCount,27);
 assert.equal(new Set(source.rows.map(r=>r.region)).size,27);
 assert.deepEqual(new Set(source.exclusions),new Set(excluded));
 assert.deepEqual(new Set(source.rows.map(r=>r.region)),
   new Set(official.map(r=>r.full_name).filter(r=>!excluded.includes(r))));
 for(const r of source.rows){
  assert(regionByFullName.has(r.region));
  for(const local of r.local)
   assert(regionByFullName.has(r.region+' '+local),'unknown local area '+r.region+' '+local);
  for(const target of [...r.neighbors,...r.long])
   assert(regionByFullName.has(target),'unknown destination '+target);
  assert(r.daeri.length>=85&&r.taksong.length>=85);
 }
});
test('27 cities/counties plus Gyeonggi hub preserve 56 original daeri/taksong canonical paths',()=>{
 const originals=[...source.rows.map(r=>r.region),'경기도'];
 assert.equal(guides.canonicalPaths.length,56);
 assert.equal(new Set(guides.canonicalPaths).size,56);
 for(const name of originals)for(const kind of ['daeri','taksong'])
  assert(guides.canonicalPaths.includes(servicePath(regionByFullName.get(name),kind)));
 for(const name of excluded)for(const kind of ['daeri','taksong']){
  assert.equal(guides.regionSection(regionByFullName.get(name),kind),'');
  assert.equal(guides.searchMeta(regionByFullName.get(name),kind),null);
 }
});
test('27 independently written service sections expose local, neighbor roundtrip and long-distance fare inputs',()=>{
 let rendered=0;
 for(const row of source.rows){
  const r=regionByFullName.get(row.region);
  for(const kind of ['daeri','taksong']){
   const html=guides.regionSection(r,kind),meta=guides.searchMeta(r,kind);
   assert.equal((html.match(/id="gyeonggi-27-municipal-corridors-20261123"/g)||[]).length,1);
   assert(html.includes(row[kind]),row.region+' does not contain own original guidance');
   assert(html.includes('지역')&&html.includes('장거리'));
   assert(html.includes('접수·배차·완료된 실제 운행기록'));
   assert(html.includes('예상요금·거리 조회'));
   assert(html.includes('tel:18114294'));
   assert(html.includes(servicePath(r,kind==='daeri'?'taksong':'daeri')));
   assert(html.includes(servicePath(regionByFullName.get('경기도'),kind)));
   for(const local of row.local)
    assert(html.includes(encodeURIComponent(row.region+' '+local)),row.region+' local '+local);
   for(const dest of row.neighbors){
    assert(html.includes(encodeURIComponent(row.region)+'&amp;to='+encodeURIComponent(dest)),row.region+' out '+dest);
    assert(html.includes(encodeURIComponent(dest)+'&amp;to='+encodeURIComponent(row.region)),row.region+' return '+dest);
    assert(html.includes(servicePath(regionByFullName.get(dest),kind)),row.region+' neighbor route');
   }
   for(const dest of row.long){
    assert(html.includes(encodeURIComponent(row.region)+'&amp;to='+encodeURIComponent(dest)),row.region+' long out '+dest);
    assert(html.includes(encodeURIComponent(dest)+'&amp;to='+encodeURIComponent(row.region)),row.region+' long back '+dest);
   }
   assert(meta.title.includes(kind==='daeri'?'대리운전':'탁송'));
   assert(meta.description.includes('1811-4294'));
   assert(meta.description.length>=70&&meta.description.length<=160,row.region+' desc');
   assert([...meta.title].length<=80);
   assert(!/확정요금\s*[:：]\s*[0-9]/.test(html));
   rendered++;
  }
 }
 assert.equal(rendered,54);
});
test('province hub links to exactly 27 existing municipal service pages, not excluded city guides',()=>{
 for(const kind of ['daeri','taksong']){
  const html=guides.regionSection(regionByFullName.get('경기도'),kind);
  assert(html.includes('27개 시'));
  assert(html.includes('지역')&&html.includes('장거리'));
  assert(html.includes('상담 1811-4294'));
  for(const row of source.rows)
   assert(html.includes('href="'+servicePath(regionByFullName.get(row.region),kind)+'"'));
  for(const excludedName of excluded)
   assert(!html.includes('href="'+servicePath(regionByFullName.get(excludedName),kind)+'"'));
 }
});
test('existing southern 4 focus plus Suwon Hwaseo and all other regional modules stay wired',()=>{
 const server=read('server.js');
 assert(server.includes("require('./lib/gyeonggi-27-municipal-corridors.cjs').create"));
 assert(server.includes('gyeonggi27Guides.regionSection(r,kind)'));
 assert(server.includes('gyeonggi27SearchMeta?.title'));
 assert(server.includes('gyeonggi27SearchMeta?.description'));
 assert(server.includes('const gyeonggi27SearchMeta=(!priorityMeta&&!focus50Info&&!historicalTitleTrip&&!verifiedTitleTrip&&!verifiedDaeriTitleTrip)'));
 for(const token of ['gyeonggiSouthHwaseoGuides','chungbukInnovationGuides','chungnamDaejeonGuides','gyeongbukDaeguGuides','jeonnamGwangjuServiceGuides'])
  assert(server.includes(token+'.regionSection(r,kind)'),token+' preserved');
 const check=JSON.parse(read('package.json')).scripts['check:seo'];
 assert(check.includes('gyeonggi-27-municipal-corridors-20261123.test.cjs'));
});
