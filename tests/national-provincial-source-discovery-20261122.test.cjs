'use strict';
// A normal HTML crawl bridge to original booking guides, never fabricated rides.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const {IDS,createBridge}=require('../lib/original-provincial-guidance-bridge.cjs');
const data=kind=>JSON.parse(fs.readFileSync(path.join(ROOT,'data','naver-regional-focus-twentieth-'+kind+'-100.json'),'utf8')).priority;
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names=fs.readdirSync(path.join(ROOT,'data/legal-regions')).filter(x=>/^\d{2}\.json$/.test(x)).sort()
 .flatMap(file=>JSON.parse(fs.readFileSync(path.join(ROOT,'data/legal-regions',file),'utf8')).full_names);
const regions=new Map(names.map(full=>[full,{full_name:full,level:full.indexOf(' ')<0?'시도':full.endsWith('리')?'리':'지역'}]));
const pathFor=(r,kind)=>'/'+kind+'/test-legal-'+(names.indexOf(r.full_name)+1)+'/';
const bridge=()=>createBridge({daeri:data('daeri'),taksong:data('taksong'),
 regionByFullName:regions,servicePath:pathFor,esc:escapeHtml});
test('exactly 17 real distinct province-localities per existing service',()=>{
 const v=bridge();
 const official=names.filter(x=>!x.includes(' '));
 assert.equal(official.length,17);
 assert.equal(IDS.daeri.length,17);
 assert.equal(IDS.taksong.length,17);
 for(const kind of ['daeri','taksong']){
  const entries=v.byService[kind];
  assert.equal(entries.length,17);
  assert.deepEqual(entries.map(x=>x.province),official);
  assert.equal(new Set(entries.map(x=>x.url)).size,17);
  for(const x of entries){
   assert.ok(regions.has(x.region));
   assert.ok(x.url.startsWith('/'+kind+'/'));
   assert.ok(x.pickup.length>=115);
   assert.ok(x.pickup.includes(x.region.split(/\s+/).at(-1)));
  }
 }
});
test('national service hubs expose only 17 normal HTML anchors with truthful evidence boundaries',()=>{
 const v=bridge();
 for(const kind of ['daeri','taksong']){
  const html=v.national(kind);
  const hrefs=[...html.matchAll(/<a href="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(hrefs.length,17);
  assert.deepEqual(hrefs,v.byService[kind].map(x=>x.url));
  assert.ok(html.includes('현지 지점·기사 상주 또는 실제 완료 운행을 뜻하지 않으며'));
  assert.doesNotMatch(html,/onclick=|javascript:|<iframe|기사\s*상주\s*보장/);
 }
});
test('each original province service hub has exactly one deep useful guide link; no village/noindex spam',()=>{
 const v=bridge();
 const provinces=[...regions.values()].filter(x=>x.level==='시도');
 for(const kind of ['daeri','taksong'])for(const province of provinces){
  const html=v.province(province,kind);
  const target=v.byService[kind].find(x=>x.province===province.full_name);
  assert.ok(target);
  assert.ok(html.includes('href="'+target.url+'"'));
  assert.equal([...html.matchAll(/<a href="\/(?:daeri|taksong)\/test-legal-/g)].length,1);
  assert.ok(html.includes(target.pickup));
  assert.ok(html.includes('완료 운행기록이나 확정요금이 아닙니다'));
  assert.ok(!target.region.endsWith('리'));
 }
 const village=[...regions.values()].find(x=>x.level==='리');
 assert.ok(village,'source registry must include village examples');
 assert.equal(v.province(village,'taksong'),'');
});
test('incomplete source rows cannot silently gain a discovery link',()=>{
 for(const kind of ['daeri','taksong']){
  const rows={daeri:data('daeri'),taksong:data('taksong')};
  const id=IDS[kind][0],x=rows[kind].find(x=>x.id===id);
  x.handover='short';
  assert.throws(()=>createBridge({...rows,regionByFullName:regions,servicePath:pathFor,esc:escapeHtml}),/Unreviewed or missing/);
 }
});
test('server adds HTML source bridge once on provincial hubs and the national service hubs',()=>{
 const source=fs.readFileSync(path.join(ROOT,'server.js'),'utf8');
 assert.match(source,/sourceGuidanceBridge\.national\(kind\)/);
 assert.match(source,/regionalQuickStart\+sourceGuidanceBridge\.province\(r,kind\)/);
 assert.match(source,/createOriginalGuidanceBridge\(\{daeri:naverFocusTwentiethDaeri100/);
});
