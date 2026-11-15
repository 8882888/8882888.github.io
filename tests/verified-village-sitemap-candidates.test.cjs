'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {buildVillagePrefixIndex,villageCandidatesForFields}=require('../lib/verified-village-candidates');
const root=path.resolve(__dirname,'..');

const legal=fs.readdirSync(path.join(root,'data/legal-regions'))
 .filter(name=>/^\d{2}\.json$/.test(name))
 .sort()
 .flatMap(name=>JSON.parse(fs.readFileSync(path.join(root,'data/legal-regions',name),'utf8')).full_names||[]);
const villages=[...new Set(legal)].filter(name=>name.split(' ').at(-1).endsWith('리'))
 .map(full_name=>({full_name,name:full_name.split(' ').at(-1),level:'리'}));
const oldCandidates=fields=>villages.filter(region=>
 fields.some(field=>String(field||'').includes(region.name)));
const keys=items=>[...items].map(item=>item.full_name).sort();

test('village candidate index preserves all 17-province names and handles duplicate village names',()=>{
 assert.ok(villages.length>1000,'Expected full original legal village inventory');
 const index=buildVillagePrefixIndex(villages);
 const examples=[
  ['경상북도 안동시 길안면 구수리에서 탁송','대구 수성구 범어동'],
  ['강원특별자치도 양양군 서면 오색리','속초시 설악동'],
  ['삼산리 101','청라대로 1'],
  ['김해공항(부산 강서구)','원주 혁신도시'],
  ['기장군 기장읍 대라리','세종특별자치시 종촌동'],
  ['가상리','오류리']
 ];
 for(const fields of examples){
  assert.deepEqual(keys(villageCandidatesForFields(fields,index)),keys(oldCandidates(fields)),
   'No village with a matching original field may be skipped: '+fields.join('/'));
 }
 const aliases=[{full_name:'A 리',name:'리'},{full_name:'B 상리',name:'상리'}];
 assert.deepEqual(keys(villageCandidatesForFields(['상리','리'],buildVillagePrefixIndex(aliases))),keys(aliases));
});

test('real original dispatch field candidates are identical to exhaustive name scanning',()=>{
 const rides=JSON.parse(fs.readFileSync(path.join(root,'data/ride-history.json'),'utf8')).slice(0,90);
 const index=buildVillagePrefixIndex(villages);
 for(const [i,ride] of rides.entries()){
  const fields=[ride.departure,ride.destination];
  assert.deepEqual(keys(villageCandidatesForFields(fields,index)),keys(oldCandidates(fields)),
   'Published ride '+i+' must retain the same potential locality matches');
 }
});

test('existing exact regional evidence gate and verified village sitemap remain intact',()=>{
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
 const fn=server.slice(server.indexOf('function eligibleVillageServiceKeys()'),server.indexOf('const localitySitemapLevels='));
 assert.match(fn,/villageCandidatesForFields\(fields,candidatesByPrefix\)/);
 assert.match(fn,/buildVillagePrefixIndex\(villages\)/);
 assert.match(fn,/matchingHistoryRegion\(ride,region,regions\)/);
 assert.match(fn,/ride\.departure==='지역 비공개'\|\|ride\.destination==='지역 비공개'/);
 const handler=server.slice(server.indexOf("if(pathname==='/sitemap-verified-regions.xml')"),server.indexOf('const localityMapMatch=',server.indexOf("if(pathname==='/sitemap-verified-regions.xml')")));
 assert.match(handler,/eligibleVillageServiceKeys\(\)/);
 assert.match(handler,/\.\.\.supported,\.\.\.verifiedVillageHubs/);
});
