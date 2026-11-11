'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
const robots=fs.readFileSync(path.join(root,'robots.txt'),'utf8');
const reviewed=JSON.parse(fs.readFileSync(path.join(root,'data/priority-regions.json'),'utf8')).pages;

test('every declared sitemap has an explicit server route',()=>{
 const routes=[...robots.matchAll(/^Sitemap:\s+https:\/\/jeongukdaeri\.kr(\/[^\s]+)$/gm)].map(m=>m[1]);
 assert.equal(routes.length,7,'keep seven published sitemap declarations');
 for(const route of routes){
  assert.ok(server.includes("pathname==='"+route+"'"),'missing sitemap handler: '+route);
 }
});
test('sitemap index includes reviewed routes and history inventory',()=>{
 for(const route of ['/sitemap-reviewed-routes.xml','/sitemap-history.xml','/sitemap-priority.xml']){
  assert.ok(server.includes("'"+route+"'"),'missing sitemap index reference: '+route);
 }
 assert.ok(server.includes("'/sitemap-history-'+(i+1)+'.xml'"),'history shards must remain reachable');
});
test('reviewed regional sitemap is backed by source-reviewed pages only',()=>{
 assert.ok(server.includes('priorityRegionalPages.flatMap(entry=>'),'reviewed sitemap must use curated records');
 assert.ok(server.includes('regionByFullName.get(entry.region)'),'region names must resolve to canonical regions');
 assert.ok(server.includes('servicePath(region,entry.kind)'),'sitemap must use canonical service routes');
 assert.ok(reviewed.length>0);
 const keys=new Set();
 for(const entry of reviewed){
  assert.ok(['daeri','taksong'].includes(entry.kind));
  assert.ok(entry.region&&entry.topic&&entry.detail);
  const key=entry.kind+'|'+entry.region;
  assert.ok(!keys.has(key),'duplicate reviewed route '+key);
  keys.add(key);
 }
});

test('cycling center discovery stays in priority and main sitemaps',()=>{
 const main=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
 const priority=fs.readFileSync(path.join(root,'sitemap-priority.xml'),'utf8');
 const url='<loc>https://jeongukdaeri.kr/route-taksong/centers/</loc>';
 assert.ok(main.includes(url),'main sitemap must include cycling center guide');
 assert.ok(priority.includes(url),'priority sitemap must include cycling center guide');
 const page=fs.readFileSync(path.join(root,'route-taksong/centers/index.html'),'utf8');
 assert.ok(page.includes('rel="canonical" href="https://jeongukdaeri.kr/route-taksong/centers/"'),'canonical must point to indexable base URL');
 assert.ok(page.includes('action="/route-taksong/centers/" method="get"'),'search must submit query before fragment');
 assert.ok(page.includes('name="q"'),'search input must be submitted as q');
 assert.equal((page.match(/href="\?q=[^"]+#result"/g)||[]).length,25,'retain 25 center shortcuts');
 const shortcuts=[...page.matchAll(/href="\?q=([^"#]+)#result"/g)].map(match=>decodeURIComponent(match[1]));
 assert.equal(new Set(shortcuts).size,25,'center shortcuts must be unique');
 const script=page.slice(page.indexOf('const officialCenters='),page.indexOf('</script>'));
 for(const name of shortcuts){
  assert.ok(script.includes("'"+name+"'"),'search data missing center shortcut: '+name);
 }

});

test('all sitemap index entries are declared and handled',()=>{
 const indexStart=server.indexOf("const rootSitemaps=pathname==='/sitemap-all.xml'");
 assert.ok(indexStart>=0,'sitemap-all index handler must exist');
 const indexCode=server.slice(indexStart,server.indexOf("const xml=",indexStart));
 const expected=['/sitemap-priority.xml','/sitemap.xml','/sitemap-reviewed-routes.xml','/sitemap-taksong.xml','/sitemap-daeri.xml','/sitemap-history.xml'];
 for(const route of expected){
  assert.ok(indexCode.includes("'"+route+"'"),'sitemap-all missing '+route);
  assert.ok(robots.includes('Sitemap: https://jeongukdaeri.kr'+route),'robots missing '+route);
 }
 assert.ok(server.includes("const historySitemapMatch=pathname.match("),'history shard route must exist');
 assert.ok(server.includes("if(segment>total)return respond(res,404"),'history shards must reject out-of-range requests');
});

test('dynamic sitemap retains cycling guide before 499-URL cutoff',()=>{
 const start=server.indexOf("if(pathname==='/sitemap.xml')");
 assert.ok(start>=0,'dynamic main sitemap handler must exist');
 const end=server.indexOf("const urls=[...new Set(focused)].slice(0,499)",start);
 assert.ok(end>start,'main sitemap URL limit must remain explicit');
 const focused=server.slice(start,end);
 for(const route of ['/route-taksong/','/route-taksong/centers/','/special/cycling-trail-transport/']){
  assert.ok(focused.includes("'"+route+"'"),'dynamic sitemap missing cycling route '+route);
 }
 assert.ok(focused.indexOf("'/route-taksong/centers/'")<focused.indexOf('...provinceRegions.flatMap('),
  'cycling center guide must precede province and locality expansion');
 assert.ok(focused.indexOf("'/special/cycling-trail-transport/'")<focused.indexOf('...provinceRegions.flatMap('),
  'cycling service guide must precede province and locality expansion');
});

test('automobile delivery service guides precede province expansion in dynamic sitemap',()=>{
 const start=server.indexOf("if(pathname==='/sitemap.xml')");
 const end=server.indexOf("const urls=[...new Set(focused)].slice(0,499)",start);
 assert.ok(start>=0&&end>start,'dynamic sitemap source must be present');
 const focused=server.slice(start,end);
 const province=focused.indexOf('...provinceRegions.flatMap(');
 assert.ok(province>0,'province expansion must exist');
 for(const route of [
  '/service/taksong/','/service/taksong-purpose/','/service/long-distance-taksong/','/service/heavy-truck-taksong/',
  '/taksong/types/','/taksong/jeju/','/reviews/taksong/','/fare/',
  '/business/rental-car/','/business/used-car/','/business/auction/','/business/export-port/'
 ]){
  const index=focused.indexOf("'"+route+"'");
  assert.ok(index>=0&&index<province,'priority automobile delivery guide missing or delayed: '+route);
 }
});

test('priority taksong locality discovery uses real legal regions before broad expansion',()=>{
 const start=server.indexOf("if(pathname==='/sitemap.xml')");
 const end=server.indexOf("const urls=[...new Set(focused)].slice(0,499)",start);
 assert.ok(start>=0&&end>start,'dynamic sitemap handler exists');
 const focused=server.slice(start,end);
 const first=focused.indexOf("'부산광역시','대구광역시','울산광역시','세종특별자치시'");
 const province=focused.indexOf('...provinceRegions.flatMap(');
 assert.ok(first>=0&&first<province,'priority taksong localities must precede broad province list');
 assert.ok(focused.includes(".map(name=>regionByFullName.get(name)).filter(Boolean).map(r=>servicePath(r,'taksong'))"),
  'priority taksong regions must resolve official regions, never invent URL slugs');
 for(const name of ['경상남도 창원시','경상남도 진주시','경상북도 김천시','강원특별자치도 원주시','전라남도 나주시']){
  assert.ok(focused.includes("'"+name+"'"),'missing priority innovation-city taksong '+name);
 }
});


test('local service-center taksong discovery links to the purpose-specific handover guide',()=>{
 assert.ok(server.includes("['정비·서비스센터 차량 인계','/service/taksong-purpose/']"),
  'regional service-center links must not point only to the generic taksong landing page');
});

test('vehicle guide navigation does not promise removed promotional images',()=>{
 assert.ok(server.includes('차종·차량 크기별 인수 조건과 예약 준비사항을 확인하세요'),
  'vehicle guide must explain available booking information');
 assert.ok(!server.includes('차종별 소개 이미지를 확인하세요'),
  'vehicle guide must not promise images that are intentionally hidden');
});

test('vehicle guide includes actionable handover details without promotional imagery',()=>{
 for(const phrase of ['차량의 정확한 주차 위치','차량 키 전달 방법','시동·주행 가능 상태','정비 입출고나 렌트카 반납']){
  assert.ok(server.includes(phrase),'missing handover information: '+phrase);
 }
 assert.ok(server.includes("kind==='taksong'?'자동차탁송 인수·인계 전 확인':'대리운전 출발 전 확인'"),
  'vehicle guide heading must reflect the actual service');
});

test('chauffeur and taksong vehicle guides use distinct operational checklists',()=>{
 assert.ok(server.includes("kind==='taksong'?'<ol><li>차량의 정확한 주차 위치"),
  'taksong-only handover checklist must be conditional');
 assert.ok(server.includes(":'<ol><li>출발지의 정확한 위치와 주차장 출입 방법"),
  'chauffeur checklist must describe driver pickup rather than vehicle delivery');
});
