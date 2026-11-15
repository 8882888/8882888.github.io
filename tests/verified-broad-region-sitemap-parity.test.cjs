'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const {matchingHistoryRegion,PROVINCE_ALIASES}=require('../lib/regional-history-evidence');
const {buildBroadRegionCandidateIndex,candidateBroadRegionsForFields,verifiedBroadRegionServiceKeys}=require('../lib/verified-broad-region-evidence');

const files=fs.readdirSync(path.join(root,'data/legal-regions')).filter(name=>/^\d{2}\.json$/.test(name)).sort();
assert.equal(files.length,17);
const all=[],seen=new Set();
for(const file of files){
 const {full_names}=JSON.parse(fs.readFileSync(path.join(root,'data/legal-regions',file),'utf8'));
 for(const full_name of full_names){
  if(seen.has(full_name))continue;seen.add(full_name);
  const name=full_name.split(' ').at(-1);
  const level=full_name.indexOf(' ')===-1?'시도':/리$/.test(name)?'리':/읍$/.test(name)?'읍':/면$/.test(name)?'면':/구$/.test(name)?'구':/군$/.test(name)?'군':/시$/.test(name)?'시':'동';
  all.push({name,level,full_name});
 }
}
const broad=all.filter(region=>['시도','시','군','구'].includes(region.level));
const cases=JSON.parse(fs.readFileSync(path.join(root,'data/ride-history.json'),'utf8'));
const canonical=JSON.parse(fs.readFileSync(path.join(root,'data/seo-history-duplicates.json'),'utf8')).canonicalById;
const rides=cases.map((r,i)=>{
 const dep=String(r.departure||''),dest=String(r.destination||'');
 const mixed=/탁송\s*\+\s*대리|대리\s*\+\s*탁송/.test(dep);
 const service=mixed?'mixed':/(?:^|\/)\s*탁(?:\/|송|$)/.test(dep)||/톨포/.test(dest)?'taksong':'daeri';
 const id='excel-'+String(i+1).padStart(4,'0');
 return {id,service,departure:'공개',destination:'공개',rawDeparture:dep,rawDestination:dest};
}).filter(x=>!canonical[x.id]||canonical[x.id]===x.id);

test('prefix index never omits a place named in complete original dispatch fields',()=>{
 const index=buildBroadRegionCandidateIndex(all,PROVINCE_ALIASES);
 assert.equal(index.supportedRegions.length,broad.length);
 for(const fields of [
  ['서울 마포구','경기도 고양시'],
  ['전북특별자치도 전주시','전라북도 익산시'],
  ['김해공항(부산 강서구)','경상남도 김해시'],
  ['제주공항','제주특별자치도 제주시'],
  ['강원도 속초시','경기도 광주시'],
  ['광주광역시','경기 광주시'],
  ['대구 동구 신서혁신도시','울산 중구 우정혁신도시'],
  ['원주 혁신도시','세종특별자치시 종촌동']
 ]){
  const candidates=candidateBroadRegionsForFields(fields,index);
  for(const region of broad){
   if(matchingHistoryRegion({rawDeparture:fields[0],rawDestination:fields[1]},region,all))
    assert.ok(candidates.has(region),'Lost a valid region candidate: '+region.full_name+' from '+fields.join('/'));
  }
 }
});

test('verified sitemap source eligibility exactly equals exhaustive original ride evidence checks',()=>{
 assert.ok(rides.length>1000,'Must use actual retained history records');
 const got=verifiedBroadRegionServiceKeys(all,rides,matchingHistoryRegion,PROVINCE_ALIASES);
 const expected=new Set();
 // Original O(regions * rides) route eligibility logic, retained as test-only oracle.
 for(const region of broad){
  for(const kind of ['taksong','daeri']){
   if(rides.some(ride=>ride.service===kind&&ride.departure!=='지역 비공개'&&ride.destination!=='지역 비공개'&&matchingHistoryRegion(ride,region,all)))
    expected.add(kind+'|'+region.full_name);
  }
 }
 assert.deepEqual([...got].sort(),[...expected].sort(),'Every canonical original-ride backed region-service URL must remain eligible; no unsupported URL may be added');
});

test('private or unclassified records cannot enter sitemap even if region appears in raw notes',()=>{
 const cases=[
  {service:'taksong',rawDeparture:'경상북도 김천시',rawDestination:'세종시',departure:'지역 비공개',destination:'공개'},
  {service:'mixed',rawDeparture:'서울특별시',rawDestination:'대전광역시',departure:'공개',destination:'공개'},
  {service:'daeri',rawDeparture:'지역 비공개',rawDestination:'지역 비공개',departure:'지역 비공개',destination:'지역 비공개'}
 ];
 assert.equal(verifiedBroadRegionServiceKeys(all,cases,matchingHistoryRegion,PROVINCE_ALIASES).size,0);
 const source=fs.readFileSync(path.join(root,'server.js'),'utf8');
 const handler=source.slice(source.indexOf("if(pathname==='/sitemap-verified-regions.xml')"),source.indexOf('const localityMapMatch=',source.indexOf("if(pathname==='/sitemap-verified-regions.xml')")));
 assert.match(handler,/verifiedBroadRegionServiceKeys\(regions,indexableHistoricalRides,matchingHistoryRegion,PROVINCE_ALIASES\)/);
 assert.match(handler,/eligibleVillageServiceKeys\(\)/);
 assert.match(handler,/\.\.\.supported,\.\.\.verifiedVillageHubs/);
});
