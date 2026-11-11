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
  '/service/taksong/','/service/long-distance-taksong/','/service/heavy-truck-taksong/',
  '/taksong/types/','/taksong/jeju/','/reviews/taksong/','/fare/',
  '/business/rental-car/','/business/used-car/','/business/auction/','/business/export-port/'
 ]){
  const index=focused.indexOf("'"+route+"'");
  assert.ok(index>=0&&index<province,'priority automobile delivery guide missing or delayed: '+route);
 }
});
