'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/innovation-city-100.json'),'utf8'));
const entries=data.entries;
assert.equal(entries.length,100,'expected 100 innovation city locality-service guides');
const legal=new Set(fs.readdirSync(path.join(root,'data/legal-regions')).filter(x=>/^\d{2}\.json$/.test(x)).flatMap(file=>JSON.parse(fs.readFileSync(path.join(root,'data/legal-regions',file),'utf8')).full_names));
assert.equal(new Set(entries.map(x=>x.id)).size,100,'duplicate IDs');
assert.equal(new Set(entries.map(x=>x.region+'|'+x.locality+'|'+x.kind)).size,100,'duplicate region+place+kind');
const grouped=new Map();
for(const x of entries){
 assert(legal.has(x.region),'unknown legal region: '+x.region);
 assert(['daeri','taksong'].includes(x.kind),'invalid service: '+x.kind);
 assert(x.status==='service_guide_not_trip','never represent service advice as completed trips');
 assert(x.locality&&x.title&&x.keyword&&x.detail,'missing fields: '+x.id);
 assert(!/배차 완료|운행 완료했습니다|기사 상주합니다|확정요금/.test(x.detail),'unsubstantiated claims: '+x.id);
 const key=x.region+'|'+x.kind;grouped.set(key,(grouped.get(key)||0)+1);
}
assert.equal(grouped.size,20,'10 localities with two services expected');
for(const [key,count] of grouped)assert.equal(count,5,'exactly five place guides per region/service: '+key);
const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
for(const required of ['innovationCity100=load(\'data/innovation-city-100.json\')','function innovationCity100Panel','innovationCity100Panel(r,kind)','function innovationCityPanel']){
 assert(server.includes(required),'dynamic route connection lost: '+required);
}
console.log('PASS innovation-city-100: 100 unique legal-location customer guides, 20 groups, dynamic route wiring');
