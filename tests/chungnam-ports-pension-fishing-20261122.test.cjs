'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const legal=JSON.parse(fs.readFileSync(path.join(root,'data/legal-regions/12.json'),'utf8')).full_names;
const data=require('../data/chungnam-ports-pension-fishing-20261122.json');
const {create}=require('../lib/chungnam-port-service-guides.cjs');
const regions=[],byFull=new Map();
for(const full of legal){
 const parts=full.split(' '),name=parts.at(-1),parent=byFull.get(parts.slice(0,-1).join(' '));
 const level=parts.length===1?'시도':/리$/.test(name)?'리':/읍$/.test(name)?'읍':/면$/.test(name)?'면':/구$/.test(name)?'구':/군$/.test(name)?'군':/시$/.test(name)?'시':'동';
 const region={full_name:full,name,level,slug:'test-'+regions.length,parent_slug:parent?.slug||null};
 regions.push(region);byFull.set(full,region);
}
const esc=x=>String(x).replace(/[&<>"']/g,y=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[y]));
const servicePath=(r,k)=>'/'+k+'/chungnam/mock-'+r.slug+'/';
const guide=create({regions,regionByFullName:byFull,servicePath,esc});
const cities=regions.filter(x=>x.full_name.startsWith('충청남도 ')&&['시','군'].includes(x.level));
test('15 legal Chungnam cities/counties and 18 true port addresses, not a false Dangjin Samgilpo location',()=>{
 assert.equal(legal.length,2275);
 assert.equal(cities.length,15);
 assert.equal(cities.filter(x=>x.level==='시').length,8);
 assert.equal(cities.filter(x=>x.level==='군').length,7);
 assert.equal(guide.sourceCount,15);
 assert.equal(guide.portList.length,18);
 assert.deepEqual(new Set(data.municipalities.map(x=>x.region)),new Set(cities.map(x=>x.full_name)));
 for(const p of data.ports){
  assert.ok(byFull.has(p.parent),'Unknown coast locality '+p.name+': '+p.parent);
  if(p.village)assert.ok(byFull.has(p.parent+' '+p.village),'Unknown coastal village '+p.name);
  assert.ok(p.source.startsWith('https://'));
 }
 assert.equal(guide.portList.find(x=>x.name==='삼길포항').parent,'충청남도 서산시 대산읍');
 assert.equal(guide.portList.find(x=>x.name==='삼길포항').village,'화곡리');
 assert.equal(guide.portList.find(x=>x.name==='장고항').parent,'충청남도 당진시 석문면');
});
test('all 15 municipalities render unique, useful and service-specific local advice and existing legal-area links',()=>{
 for(const kind of ['taksong','daeri']){
  const outputs=new Set(),titles=new Set();
  for(const item of data.municipalities){
   const city=byFull.get(item.region),html=guide.regionSection(city,kind);
   assert.ok(html.length>1250,'Missing local booking advice '+item.region+' '+kind);
   assert.ok(html.includes(item[kind]),'Missing distinct source guidance '+item.region+' '+kind);
   assert.ok(html.includes('/fare/?service='+kind));
   assert.ok(html.includes('장거리')&&html.includes('1811-4294'));
   for(const area of item.areas)assert.ok(html.includes(area+(kind==='daeri'?'대리운전':'탁송')),'Lost legal locality '+area);
   assert.ok(!outputs.has(html),'Duplicated municipality copy '+item.region);
   outputs.add(html);
   const meta=guide.searchMeta(city,kind);
   assert.ok(meta&&meta.title.includes(kind==='daeri'?'대리운전':'탁송'));
   assert.ok(meta.description.includes('1811-4294'));
   assert.ok(!titles.has(meta.title),'Duplicated title '+meta.title);
   titles.add(meta.title);
  }
  assert.equal(outputs.size,15);
 }
});
test('harbor and pension/fishing exact queries reuse original region canonicals for both services',()=>{
 const seosan=byFull.get('충청남도 서산시 대산읍'),dangjin=byFull.get('충청남도 당진시 석문면');
 assert.equal(guide.resolve('삼길포항대리운전'),servicePath(seosan,'daeri'));
 assert.equal(guide.resolve('삼길포항탁송'),servicePath(seosan,'taksong'));
 assert.equal(guide.resolve('당진삼길포항대리운전'),servicePath(seosan,'daeri'));
 assert.equal(guide.resolve('당진에서삼길포항대리운전'),servicePath(seosan,'daeri'));
 assert.equal(guide.resolve('삼길포항에서당진대리운전'),servicePath(seosan,'daeri'));
 assert.equal(guide.resolve('장고항대리운전'),servicePath(dangjin,'daeri'));
 assert.equal(guide.resolve('왜목마을낚시터대리운전'),servicePath(dangjin,'daeri'));
 assert.equal(guide.resolve('왜목항팬션대리운전'),servicePath(dangjin,'daeri'));
 assert.equal(guide.resolve('도비도항낙시터탁송'),servicePath(dangjin,'taksong'));
 for(const p of data.ports){
  const target=byFull.get(p.parent);
  for(const kind of ['daeri','taksong']){
   const service=kind==='daeri'?'대리운전':'탁송';
   assert.equal(guide.resolve(p.name+service),servicePath(target,kind));
   assert.ok(guide.regionSection(target,kind).includes(p.name+service));
  }
 }
});
test('province navigation links all 15 legal municipalities, 18 port names, and only existing town-level sitemap targets',()=>{
 const expected=2*(15+1+new Set(data.ports.map(p=>p.parent)).size);
 assert.equal(expected,58,'15 cities/counties, 1 province and 13 unique harbor 읍면동 parents, times two services');
 assert.equal(guide.canonicalPaths.length,expected);
 assert.equal(new Set(guide.canonicalPaths).size,58);
 for(const kind of ['taksong','daeri']){
  const html=guide.regionSection(byFull.get('충청남도'),kind);
  assert.ok(html.includes('삼길포항은 당진시가 아닌 서산시 대산읍 화곡리'));
  for(const c of cities)assert.ok(html.includes(servicePath(c,kind)));
  for(const p of data.ports)assert.ok(html.includes(p.name+(kind==='daeri'?'대리운전':'탁송')));
 }
 for(const p of guide.canonicalPaths){
  assert.match(p,/^\/(?:daeri|taksong)\/chungnam\/mock-test-\d+\/$/);
  assert.ok(!p.includes('리/'),'No autogenerated village doorway');
 }
});
test('preserve actual rides, original province sitemaps and 8 robots declarations; metadata must not replace evidence titles',()=>{
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
 assert.match(server,/chungnamPortGuides\.regionSection\(r,kind\)/);
 assert.match(server,/chungnamPortGuides\.resolve\(searchIntent\)/);
 assert.match(server,/chungnamPortGuides\.searchMeta\(r,kind\)/);
 assert.match(server,/!priorityMeta&&!focus50Info&&!historicalTitleTrip/);
 assert.match(server,/sitemap-chungnam-port-guides\.xml/);
 const robots=fs.readFileSync(path.join(root,'robots.txt'),'utf8');
 assert.equal((robots.match(/^Sitemap:/gm)||[]).length,8);
 for(const item of data.municipalities){
  assert.doesNotMatch(JSON.stringify(item),/운행완료|배차완료|고정\s*요금|100%\s*즉시배차|상주기사 확보/);
 }
});

test('harbor 읍면동 SEO titles and parent links use real places, preserving noindex village policy',()=>{
 const towns=[...new Set(data.ports.map(x=>x.parent))].map(p=>byFull.get(p));
 assert.equal(towns.length,13);
 const titles=new Set();
 for(const town of towns){
  for(const kind of ['taksong','daeri']){
   const meta=guide.searchMeta(town,kind),html=guide.regionSection(town,kind);
   assert.ok(meta&&meta.title.includes(kind==='taksong'?'탁송':'대리운전'));
   assert.ok(meta.description.includes('1811-4294'));
   assert.ok(html.includes('지역 전체'));
   assert.ok(html.includes('충남 항구·낚시터'));
   assert.ok(!titles.has(meta.title),'Duplicate local harbor meta '+town.full_name);
   titles.add(meta.title);
  }
 }
 const samgil=guide.searchMeta(byFull.get('충청남도 서산시 대산읍'),'daeri');
 assert.match(samgil.title,/삼길포항대리운전/);
 assert.match(samgil.description,/서산/);
 const dangjin=guide.searchMeta(byFull.get('충청남도 당진시 석문면'),'daeri');
 assert.ok(dangjin.title.includes('장고항')&&dangjin.title.includes('왜목항'));
 assert.equal(guide.searchMeta(byFull.get('충청남도 서산시 대산읍 화곡리'),'daeri'),null);
});
