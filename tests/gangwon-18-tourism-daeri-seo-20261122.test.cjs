'use strict';
// Real official Gangwon 18 cities/counties; no fake rides, hotels or local offices.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const guide=require('../data/gangwon-tourism-daeri-18-20261122.json');
const tourist=require('../data/tourist-daeri-places-20261114.json');
const {create}=require('../lib/gangwon-tourism-daeri.cjs');
const legal=JSON.parse(fs.readFileSync(path.join(root,'data/legal-regions','09.json'),'utf8'));
const official=fs.readdirSync(path.join(root,'data/legal-regions')).filter(x=>/^\d{2}\.json$/.test(x)).sort()
 .flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'data/legal-regions',f),'utf8')).full_names);
const gn=official.filter(x=>x.startsWith('강원특별자치도 '));
const city=gn.filter(x=>x.split(' ').length===2&&/[시군]$/.test(x));
const regions=[{full_name:'강원특별자치도',name:'강원특별자치도',level:'시도'},
 ...city.map(full=>({full_name:full,name:full.split(' ').at(-1),level:/시$/.test(full)?'시':'군'}))];
const regionByFullName=new Map(regions.map(x=>[x.full_name,x]));
const escapeHtml=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const servicePath=(r,k)=>'/'+k+'/gangwon/mock-'+r.name+'/';
const pages=create({regions,regionByFullName,servicePath,esc:escapeHtml});
test('Official legal Gangwon list is exactly 7 cities and 11 counties and all 18 original guide keys match',()=>{
 assert.equal(city.length,18);
 assert.equal(city.filter(x=>x.endsWith('시')).length,7);
 assert.equal(city.filter(x=>x.endsWith('군')).length,11);
 assert.equal(guide.items.length,18);
 assert.equal(new Set(guide.items.map(x=>x.region)).size,18);
 assert.deepEqual([...guide.items.map(x=>x.region)].sort(),[...city].sort());
 assert.equal(pages.sourceCount,18);
});
test('each existing 18 municipal canonical HTML contains localized attractions, meal districts, hotels, pensions, golf and long-distance details',()=>{
 const outputs=new Set(),urlset=new Set();
 for(const item of guide.items){
  const region=regionByFullName.get(item.region);
  const html=pages.regionSection(region,'daeri');
  assert.ok(html.length>1450,'Too short local booking information '+item.region);
  assert.ok(html.includes(item.pickup), 'Missing original location-specific car handover advice '+item.region);
  for(const word of ['관광지','유원지','맛집','호텔','펜션','골프장','장거리대리운전','기사','/service/long-distance-daeri/','/service/golf/']){
   assert.ok(html.includes(word),'Missing semantic service information '+item.region+': '+word);
  }
  for(const attraction of item.attractions){
   assert.ok(html.includes(attraction),'Omitted source attraction '+attraction);
  }
  assert.ok(html.includes(item.food)&&html.includes(item.lodging)&&html.includes(item.golf));
  assert.match(html,/확정요금이 아닙니다|확정요금·기사 실시간 위치/);
  assert.ok(!outputs.has(html),'Identical supposedly city-specific text');
  outputs.add(html);
  assert.ok(pages.regionSection(region,'taksong')==='','Tourism-dedicated daeri content must not contaminate taksong canonical');
  urlset.add(servicePath(region,'daeri'));
 }
 assert.equal(outputs.size,18);assert.equal(urlset.size,18);
});
test('Gangwon province hub has 18 real HTML service links, one for each existing city/county',()=>{
 const province=regionByFullName.get('강원특별자치도');
 const html=pages.regionSection(province,'daeri');
 const links=[...html.matchAll(/<a href="(\/daeri\/gangwon\/mock-[^"]+)"/g)].map(x=>x[1]);
 assert.equal(links.length,18);
 assert.equal(new Set(links).size,18);
 assert.ok(html.includes('강원도대리운전 18개 시·군'));
 assert.ok(html.includes('골프장')&&html.includes('장거리대리운전')&&html.includes('호텔'));
 assert.ok(html.includes('관광지 이름')===false); // province uses service disclaimer, not fabricated bookings
 assert.equal(pages.regionSection(province,'taksong'),'');
});
test('Tourist landmark exact-match search expansion covers all 18 without new indexable place URLs',()=>{
 const gw=tourist.places.filter(x=>x.region.startsWith('강원특별자치도 '));
 assert.ok(gw.length>=48,'Original 6 Gangwon places plus 42 checked landmarks');
 assert.equal(new Set(gw.map(x=>x.region)).size,18);
 assert.equal(new Set(tourist.places.map(x=>x.name)).size,tourist.places.length);
 assert.ok(gw.every(x=>city.includes(x.region)&&Array.isArray(x.aliases)));
 const names=new Set(gw.map(x=>x.name));
 for(const x of ['속초관광수산시장','강릉중앙시장','인구해변','정선아리랑시장','웰리힐리파크','하이원리조트','화천산천어파크골프장'])
  assert.ok(names.has(x),'Historic or specific original place missing: '+x);
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
 assert.match(server,/gangwonTourismDaeri\.regionSection\(r,kind\)/);
 assert.match(server,/const gangwonTourismDaeri=require\('\.\/lib\/gangwon-tourism-daeri\.cjs'\)/);
 assert.ok(!server.includes('sitemap-gangwon-tourism-daeri.xml'),'Do not generate a new mass keyword sitemap');
});
test('Only genuine tourism and reservation guidance, not invented completed fares or office claims',()=>{
 for(const x of guide.items){
  const detail=JSON.stringify(x);
  assert.doesNotMatch(detail,/(?:운행완료|배차완료|100%\s*즉시배차|상주기사\s*확보|당시\s*\d+(?:만원|원))/);
  assert.ok(x.pickup.length>=35);
  assert.ok(x.longDistance.includes('방면'));
 }
});
