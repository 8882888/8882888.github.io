'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=require('../data/gyeonggi-truck-bus-regional-20261123.json');
const truck=require('../data/nationwide-truck-types-20261122.json');
const {create,BUS_ANCHOR,HEAVY}=require('../lib/regional-commercial-truck-bus-taksong.cjs');
const {createNationwideLocalityExplorer}=require('../lib/nationwide-locality-explorer');
const docs=fs.readdirSync(path.join(root,'data/legal-regions')).filter(x=>/^\d{2}\.json$/.test(x)).sort();
const fulls=docs.flatMap(p=>JSON.parse(read('data/legal-regions/'+p)).full_names);
const regions=[],byFull=new Map(),bySlug=new Map(),childrenByParent=new Map();
for(const full of fulls){
 const parts=full.split(' '),name=parts.at(-1),parent=byFull.get(parts.slice(0,-1).join(' '));
 const level=parts.length===1?'시도':/리$/.test(name)?'리':/읍$/.test(name)?'읍':
  /면$/.test(name)?'면':/구$/.test(name)?'구':/군$/.test(name)?'군':/시$/.test(name)?'시':'동';
 const r={full_name:full,name,level,slug:'source-'+(regions.length+1),parent_slug:parent?.slug||null};
 regions.push(r);byFull.set(full,r);bySlug.set(r.slug,r);
 if(parent){if(!childrenByParent.has(parent.slug))childrenByParent.set(parent.slug,[]);childrenByParent.get(parent.slug).push(r)}
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const servicePath=(r,k)=>'/'+k+'/existing/'+r.slug+'/';
const explorer=createNationwideLocalityExplorer({regions,bySlug,childrenByParent,servicePath,escapeHtml:esc});
const guide=create({regions,regionByFullName:byFull,servicePath,esc,nationwideExplorer:explorer});
const target=name=>servicePath(byFull.get(name),'taksong');
const excluded=['경기도 용인시','경기도 화성시','경기도 평택시','경기도 안성시'];
test('reuse 26 cargo body classes, 27 search tonnages, 14 bus types and 17 original provinces',()=>{
 assert.equal(truck.types.length,26);
 assert.equal(truck.weights.length,27);
 assert.equal(source.bus_types.length,14);
 assert.equal(guide.busTypeCount,14);
 assert.equal(docs.length,17);
 assert.equal(guide.sourceCount,27);
 assert.equal(new Set(source.bus_types.flatMap(x=>x.aliases)).size,source.bus_types.flatMap(x=>x.aliases).length);
 assert.equal(source.seats.length,13);
});
test('27 focused Gyeonggi municipalities only, preserving the previous four exclusions',()=>{
 const gy=regions.filter(r=>r.full_name.startsWith('경기도 ')&&['시','군'].includes(r.level));
 assert.equal(gy.length,31);
 assert.equal(guide.canonicalPaths.length,28);
 assert.equal(new Set(guide.canonicalPaths).size,28);
 const included=gy.filter(r=>!excluded.includes(r.full_name));
 assert.deepEqual(new Set(source.rows.map(x=>x.region)),new Set(included.map(x=>x.full_name)));
 for(const r of included)assert(guide.canonicalPaths.includes(target(r.full_name)));
 assert(guide.canonicalPaths.includes(target('경기도')));
 for(const name of excluded){
  assert.equal(guide.regionSection(byFull.get(name),'taksong'),'');
  assert(!guide.canonicalPaths.includes(target(name)));
 }
});
test('all 27 cities have distinct local truck and bus body guidance and genuine fare inputs',()=>{
 let count=0;
 const original=JSON.parse(read('data/gyeonggi-27-municipal-corridors-20261123.json'));
 for(const row of source.rows){
  const r=byFull.get(row.region),html=guide.regionSection(r,'taksong');
  const base=original.rows.find(x=>x.region===row.region);
  assert(base,'original evidence locality missing '+row.region);
  assert.equal((html.match(/id="gyeonggi-truck-bus-20261123"/g)||[]).length,1);
  assert(html.includes(row.truck),row.region+' truck detail');
  assert(html.includes(row.bus),row.region+' bus detail');
  assert(html.includes('1톤')&&html.includes('25톤'));
  assert(html.includes('카고')&&html.includes('윙바디')&&html.includes('냉동탑차'));
  assert(html.includes('전세버스')&&html.includes('통학버스')&&html.includes('셔틀버스'));
  assert(html.includes('버스 차량만 이동')&&html.includes('여객운송'));
  assert(html.includes('등록증')&&html.includes('면허')&&html.includes('보험'));
  assert(html.includes(encodeURIComponent(row.region+' '+base.local[0])));
  assert(html.includes(encodeURIComponent(base.neighbors[0])));
  assert(html.includes(target(base.neighbors[0])));
  assert(html.includes(HEAVY)&&html.includes(BUS_ANCHOR));
  assert(html.includes('1811-4294'));
  assert(!/배차완료\s*[:：]/.test(html));
  assert.equal(guide.regionSection(r,'daeri'),'');
  count++;
 }
 assert.equal(count,27);
});
test('bus query aliases and seating order route to one existing region canonical, not invented vehicle pages',()=>{
 const queries=[
  ['버스탁송',BUS_ANCHOR],
  ['전국전세버스탁송',BUS_ANCHOR],
  ['승합차탁송',BUS_ANCHOR],
  ['수원버스탁송',target('경기도 수원시')],
  ['수원45인승전세버스탁송',target('경기도 수원시')],
  ['45인승전세버스수원탁송',target('경기도 수원시')],
  ['전세버스45인승수원탁송',target('경기도 수원시')],
  ['버스수원25인승탁송',target('경기도 수원시')],
  ['경기도 수원시 관광버스 차량탁송',target('경기도 수원시')],
  ['부산25인승통근버스탁송',target('부산광역시')],
  ['경기도 포천시 이동면 셔틀버스탁송',target('경기도 포천시 이동면')]
 ];
 for(const [phrase,expected] of queries)assert.equal(guide.resolve(phrase),expected,phrase);
});
test('no false charter/passenger transport, invented routes, unregistered service or ambiguous Gwangju alias',()=>{
 for(const value of ['서울버스대절','서울전세버스대여','서울버스승객운송탁송','서울에서부산까지45인승버스탁송',
   '25톤버스탁송','1톤트럭탁송','광주버스탁송','광주시버스탁송']){
  assert.equal(guide.resolve(value),null,'unsafe or ambiguous '+value);
 }
 assert.equal(guide.resolve('경기도 광주시 버스탁송'),target('경기도 광주시'));
 assert.equal(guide.resolve('광주광역시 버스탁송'),target('광주광역시'));
});
test('bus and truck hub is navigable and never implies booked rides or fixed cost',()=>{
 const hub=guide.hubSection(),gyHub=guide.regionSection(byFull.get('경기도'),'taksong');
 assert(hub.includes('id="national-bus-vehicle-taksong-20261123"'));
 for(const type of source.bus_types)assert(hub.includes(type.name+'탁송'));
 for(const n of source.seats)assert(hub.includes(n+'인승버스탁송'));
 for(const p of regions.filter(r=>r.level==='시도'))
  assert(hub.includes('href="'+target(p.full_name)+'"'));
 assert(gyHub.includes('27개 시'));
 for(const row of source.rows)assert(gyHub.includes('href="'+target(row.region)+'"'));
 for(const name of excluded)assert(!gyHub.includes('href="'+target(name)+'"'));
 for(const h of [hub,gyHub]){
  assert(h.includes('1811-4294'));
  assert(!/확정요금\s*[:：]\s*[0-9]/.test(h));
 }
});
test('existing title hierarchy and ride history retained and bus route connected to shared search & source SEO suite',()=>{
 const server=read('server.js');
 assert(server.includes("require('./lib/regional-commercial-truck-bus-taksong.cjs').create"));
 assert(server.includes('regionalCommercialVehicles.regionSection(r,kind)'));
 assert(server.includes('regionalCommercialVehicles.hubSection()'));
 assert(server.includes('regionalCommercialVehicles.resolve(searchIntent)'));
 assert(server.includes('gyeonggi27Guides.regionSection(r,kind)'));
 assert(server.includes('gyeonggiSouthHwaseoGuides.regionSection(r,kind)'));
 assert(server.includes('regionalReviewBatch300.length!==2591'));
 assert(!read('robots.txt').includes('national-bus-vehicle-taksong-20261123'));
 const s=read('lib/gyeonggi-27-municipal-corridors.cjs');
 assert(s.includes("지역탁송·화물차·버스탁송"));
 const scripts=JSON.parse(read('package.json')).scripts;
 assert(scripts['check:seo'].includes('gyeonggi-truck-bus-regional-20261123.test.cjs'));
});
