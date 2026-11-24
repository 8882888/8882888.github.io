'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {create}=require('../lib/gijang-deep-local-seo-20261124.cjs');
const legal=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data/legal-regions/02.json'),'utf8')).full_names;
const root='부산광역시 기장군';
const full=[root,root+' 기장읍',root+' 정관읍',root+' 일광읍',root+' 장안읍',root+' 철마면'];
const map=new Map(full.map((full_name,i)=>[full_name,{full_name,name:full_name.split(' ').at(-1),slug:'test-'+i}]));
const paths=new Map(full.map((name,i)=>[name,'/busan/gijang-gun/'+(i===0?'':name.split(' ').at(-1)+'-test/')]));
const esc=x=>String(x).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
const servicePath=(r,kind)=>'/'+kind+paths.get(r.full_name);
const seo=create({regionByFullName:map,servicePath,esc});
test('six Gijang legal localities, both existing services, no additional indexed doorway pages',()=>{
 assert.deepEqual([...seo.regions],full);
 for(const name of full)assert.ok(legal.includes(name),'unknown locality: '+name);
 const titles=new Set(),descs=new Set();
 for(const name of full)for(const kind of ['daeri','taksong']){
  const region=map.get(name),html=seo.section(region,kind),meta=seo.meta(region,kind);
  assert.match(html,/id="gijang-local-intent-20261124"/);
  assert.match(html,new RegExp(region.name+(kind==='daeri'?'대리운전':'탁송')));
  assert.match(html,new RegExp('/fare/\\?service='+kind));
  assert.match(html,/기장군 기존 완료 운행기록 검색/);
  assert.match(html,/tel:18114294/);
  assert.match(html,/예시이며 실제 완료 운행/);
  assert.match(html,/구간은 예약 문의를 돕는 이동 예시/);
  assert.doesNotMatch(html,/현재 \d+만원|주행거리 \d+km|상주기사 보장|즉시 배차 보장|완료했습니다/);
  assert.equal((html.match(/<section\b/g)||[]).length,1);
  assert.equal((html.match(/<\/section>/g)||[]).length,1);
  if([root,root+' 정관읍'].includes(name)){
   assert.equal(meta,null,'must preserve approved existing Gijang hub and Jeonggwan titles');
  } else {
   assert.ok(meta,'township requires unique search meta: '+name+kind);
   assert.ok(meta.title.startsWith(region.name+(kind==='daeri'?'대리운전':'탁송')));
   assert.match(meta.description,/1811-4294/);
   assert.ok([...meta.description].length<=170);
   assert.ok(!titles.has(meta.title),'duplicated title: '+meta.title);
   assert.ok(!descs.has(meta.description),'duplicated description: '+meta.description);
   titles.add(meta.title);descs.add(meta.description);
  }
 }
 assert.equal(titles.size,8);
 assert.equal(descs.size,8);
});
test('district hub connects five canonical 읍면 pages and service switch',()=>{
 for(const kind of ['daeri','taksong']){
  const html=seo.section(map.get(root),kind);
  assert.equal((html.match(/<li><a href=/g)||[]).length,5);
  for(const name of full.slice(1))assert.ok(html.includes(servicePath(map.get(name),kind)));
  assert.ok(html.includes(servicePath(map.get(root),kind==='taksong'?'daeri':'taksong')));
 }
});
test('unrelated districts and unsupported service types stay unchanged',()=>{
 assert.equal(seo.meta({full_name:'부산광역시 해운대구'},'daeri'),null);
 assert.equal(seo.section({full_name:'부산광역시 해운대구'},'daeri'),'');
 for(const name of full){
  assert.equal(seo.section(map.get(name),'daily'),'');
  assert.equal(seo.meta(map.get(name),'daily'),null);
 }
});
test('server retains local seo without changing existing canonical routes',()=>{
 const server=fs.readFileSync(path.resolve(__dirname,'../server.js'),'utf8');
 assert.ok(server.includes("gijangDeepSeo.section(r,kind)+haeundaeLocalSeo.section(r,kind)"));
 assert.ok(server.includes("const gijangDeepSeo=require('./lib/gijang-deep-local-seo-20261124.cjs')"));
 assert.ok(server.includes('gijangDeepMeta?.title||haeundaeLocalMeta?.title'));
 assert.ok(server.includes('gijangDeepMeta?.description||haeundaeLocalMeta?.description'));
 assert.ok(server.includes("const gijangTaksongPage=kind==='taksong'&&r.full_name==='부산광역시 기장군'"));
});
