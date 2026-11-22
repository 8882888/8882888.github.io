'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const legal=JSON.parse(fs.readFileSync(path.join(root,'data/legal-regions/16.json'),'utf8')).full_names;
const guide=require('../data/gyeongnam-service-guides-18-20261122.json');
const {create}=require('../lib/gyeongnam-service-guides.cjs');
const regions=[],byFull=new Map();
for(const full of legal){
 const parts=full.split(' '),name=parts.at(-1),parent=byFull.get(parts.slice(0,-1).join(' '));
 const level=parts.length===1?'시도':/리$/.test(name)?'리':/읍$/.test(name)?'읍':/면$/.test(name)?'면':/구$/.test(name)?'구':/군$/.test(name)?'군':/시$/.test(name)?'시':'동';
 const r={full_name:full,name,level,slug:'area-'+(regions.length+1),parent_slug:parent?.slug||null};
 regions.push(r);byFull.set(full,r);
}
const esc=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const servicePath=(region,kind)=>'/'+kind+'/gyeongnam/mock-'+region.slug+'/';
const render=create({regions,regionByFullName:byFull,servicePath,esc});
const cities=regions.filter(r=>r.full_name.startsWith('경상남도 ')&&['시','군'].includes(r.level));
test('all 18 Gyeongnam cities and counties match legal list; existing URLs only',()=>{
 assert.equal(cities.length,18);
 assert.equal(cities.filter(r=>r.level==='시').length,8);
 assert.equal(cities.filter(r=>r.level==='군').length,10);
 assert.equal(guide.items.length,18);
 assert.deepEqual(new Set(guide.items.map(x=>x.region)),new Set(cities.map(x=>x.full_name)));
 assert.equal(render.sourceCount,18);
 assert.equal(render.canonicalPaths.length,38);
 assert.equal(new Set(render.canonicalPaths).size,38);
});
test('independent city/county content for both daeri and taksong with legal area links',()=>{
 for(const kind of ['taksong','daeri']){
  const seen=new Set();
  for(const row of guide.items){
   const r=byFull.get(row.region),html=render.regionSection(r,kind);
   assert.ok(html.length>1200,'Missing substantial local service advice: '+row.region+'/'+kind);
   assert.ok(html.includes(row[kind]));
   for(const area of row.areas)assert.ok(html.includes(area+(kind==='taksong'?'탁송':'대리운전')),'Missing locality '+area);
   assert.ok(html.includes('href="/fare/?service='+kind));
   assert.ok(html.includes('확정')&&html.includes('완료'));
   assert.ok(!seen.has(html),'Duplicated local service copy: '+row.region);
   seen.add(html);
  }
  assert.equal(seen.size,18);
 }
});
test('province hubs link all 18 municipal canonical pages and all five Changwon districts',()=>{
 const province=byFull.get('경상남도');
 for(const kind of ['taksong','daeri']){
  const html=render.regionSection(province,kind);
  assert.ok(html.includes('18개 시·군'));
  for(const r of cities)assert.ok(html.includes(servicePath(r,kind)));
  for(const area of ['마산합포구','마산회원구','성산구','의창구','진해구'])
   assert.ok(html.includes(area+(kind==='taksong'?'탁송':'대리운전')));
 }
});
test('no fabricated completed fares, branch promises or mass new locality pages',()=>{
 for(const row of guide.items){
  assert.doesNotMatch(JSON.stringify(row),/배차완료|운행완료|100%즉시배차|상주기사 확보/);
  assert.ok(row.areas.length>=3);
 }
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
 assert.match(server,/gyeongnamServiceGuides\.regionSection\(r,kind\)/);
 assert.match(server,/gyeongnamServiceGuides\.canonicalPaths/);
 assert.match(server,/sitemap-gyeongnam-guides\.xml/);
});
