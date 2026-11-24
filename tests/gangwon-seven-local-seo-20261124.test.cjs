'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {create}=require('../lib/gangwon-seven-local-seo-20261124.cjs');
const legal=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/legal-regions/10.json'),'utf8')).full_names;
const gw='강원특별자치도 ';
const names=[
 gw+'속초시',gw+'강릉시',gw+'태백시',gw+'평창군',gw+'평창군 대관령면',
 gw+'고성군',gw+'정선군',gw+'정선군 사북읍',gw+'정선군 고한읍'
];
const extras=[gw+'고성군 토성면',gw+'평창군 진부면'];
const regions=new Map([...names,...extras].map((full_name,i)=>[full_name,{full_name,name:full_name.split(' ').at(-1),level:/[읍면]$/.test(full_name)?'읍':'시',slug:'focus-'+i}]));
const esc=x=>String(x).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
const servicePath=(r,k)=>'/'+k+'/gangwon/'+encodeURIComponent(r.full_name)+'/';
const seo=create({regionByFullName:regions,servicePath,esc});
test('nine canonical legal regions, eighteen service guides, fourteen unique new meta variants',()=>{
 assert.deepEqual([...seo.regions],names);
 for(const name of names)assert.ok(legal.includes(name),'invalid legal region '+name);
 const titles=new Set(),descs=new Set();
 let htmlCount=0,metaCount=0;
 for(const name of names)for(const kind of ['daeri','taksong']){
  const r=regions.get(name),html=seo.section(r,kind),meta=seo.meta(r,kind);
  assert.match(html,/id="gangwon-seven-local-seo-20261124"/);
  assert.match(html,/\u003ch3\u003e/);
  assert.match(html,new RegExp('/fare/\\?service='+kind));
  assert.match(html,/실제 완료 운행기록 검색/);
  assert.match(html,/tel:18114294/);
  assert.match(html,/원본이 없는 실제 운행이나 km·요금은 만들지 않으며/);
  assert.equal((html.match(/<section\b/g)||[]).length,1);
  assert.equal((html.match(/<\/section>/g)||[]).length,1);
  if([gw+'속초시',gw+'강릉시'].includes(name)){
   assert.equal(meta,null,'preserve priority regional snippets');
  }else{
   assert.ok(meta);
   assert.ok(meta.title.includes(r.name),'title must match canonical district');
   assert.match(meta.description,/1811-4294/);
   assert.ok([...meta.description].length<170);
   assert.ok(!titles.has(meta.title),'duplicate page title');
   assert.ok(!descs.has(meta.description),'duplicate snippet');
   titles.add(meta.title);descs.add(meta.description);metaCount++;
  }
  htmlCount++;
 }
 assert.equal(htmlCount,18);
 assert.equal(metaCount,14);
});
test('Gangwon Land is attributed to Jeongseon Sabuk, not Taebaek or Gohan',()=>{
 const sb=seo.section(regions.get(gw+'정선군 사북읍'),'daeri');
 const ta=seo.section(regions.get(gw+'태백시'),'daeri');
 const gh=seo.section(regions.get(gw+'정선군 고한읍'),'daeri');
 assert.match(sb,/강원랜드대리운전/);
 assert.match(sb,/강원랜드는 강원특별자치도 정선군 사북읍/);
 assert.match(gh,/강원랜드 소재지와 혼동하지 않습니다/);
 assert.doesNotMatch(ta,/강원랜드는 강원특별자치도 태백시/);
});
test('Daegwallyeong is a Pyeongchang-myeon canonical service page, not an extra town',()=>{
 const p=seo.section(regions.get(gw+'평창군 대관령면'),'daeri');
 assert.match(p,/대관령대리운전/);
 assert.match(p,/대관령면\(횡계리·용산리 등\)/);
 assert.match(p,/강릉 방면 대관령 고갯길/);
});
test('Gangwon Goseong distinguished from Gyeongnam Goseong, unrelated locations untouched',()=>{
 const g=seo.meta(regions.get(gw+'고성군'),'taksong');
 assert.match(g.title,/강원고성군탁송/);
 assert.match(g.description,/강원도고성군탁송/);
 assert.equal(seo.meta({full_name:'경상남도 고성군'},'taksong'),null);
 assert.equal(seo.section({full_name:'경상남도 고성군'},'taksong'),'');
});
test('existing canonical wiring preserved and Gangneung priority description now audit compliant',()=>{
 const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
 assert.ok(server.includes("gangwonLocalSeo.section(r,kind)+gijangDeepSeo.section(r,kind)"));
 assert.ok(server.includes("const gangwonLocalSeo=require('./lib/gangwon-seven-local-seo-20261124.cjs')"));
 assert.ok(server.includes("gangwonLocalMeta?.title||gijangDeepMeta?.title"));
 assert.ok(server.includes("gangwonLocalMeta?.description||gijangDeepMeta?.description"));
 const priority=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/priority-regions.json'),'utf8')).pages.find(x=>x.kind==='daeri'&&x.region===gw+'강릉시');
 const first=priority.detail.split(/[.!?。]/)[0].trim().slice(0,16);
 const snippet='강릉대리운전｜경포·안목·교동·주문진 대리운전·법인·장거리 상담. 경포해변·안목해변의 음식점과 카페 차량 주차 위치 확인, 예약·요금 1811-4294.';
 assert.ok(server.includes(snippet));
 assert.ok(snippet.includes(priority.topic));
 assert.ok(snippet.includes(first));
 assert.ok(snippet.length<170);
});
