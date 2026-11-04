'use strict';
const assert=require('node:assert/strict');
const source=require('../data/ride-history.json');
const audit=require('../data/unresolved-review-audit-batch-001-300.json');
const first=require('../data/regional-review-links-batch-001-300.json');
const second=require('../data/regional-review-links-batch-002-300.json');
const {matchingHistoryRegion}=require('../lib/regional-history-evidence');
const regions=[];
let n=0;
for(let i=1;i<=17;i++){
 const d=require('../data/legal-regions/'+String(i).padStart(2,'0')+'.json');
 for(const full_name of d.full_names){
  const name=full_name.split(' ').at(-1);
  const level=full_name.split(' ').length===1?'시도':name.endsWith('시')?'시':name.endsWith('군')?'군':name.endsWith('구')?'구':name.endsWith('읍')?'읍':name.endsWith('면')?'면':name.endsWith('동')?'동':'리';
  regions.push({full_name,name,level,slug:'area-'+(++n)});
 }
}
const byFull=new Map(regions.map(r=>[r.full_name,r]));
const past=new Set([...first.items,...second.items].filter(x=>x.region).map(x=>x.id));
assert.equal(audit.items.length,300);
assert.equal(new Set(audit.items.map(x=>x.id)).size,300);
let confirmed=0,rejected=0;
for(const row of audit.items){
 assert(!past.has(row.id),'audited source was previously region-labeled');
 assert(/^excel-\d{4}$/.test(row.id));
 const idx=Number(row.id.slice(6))-1,sourceRow=source[idx];
 assert(sourceRow,'missing original ride '+row.id);
 assert.equal(row.date,sourceRow.date);
 assert.equal(row.reviewUrl,'/reviews/history/'+row.id+'/');
 assert(!('rawDeparture' in row||'rawDestination' in row||'fare' in row),'no sensitive dispatch notes in audit');
 const record={rawDeparture:sourceRow.departure,rawDestination:sourceRow.destination};
 for(const name of row.regionCandidates){
  const region=byFull.get(name);
  assert(region,'candidate must resolve to legal geography '+name);
  if(matchingHistoryRegion(record,region,regions))confirmed++;else rejected++;
 }
}
assert.equal(audit.explicitRegionCandidates,audit.items.filter(x=>x.regionCandidates.length).length);
assert.equal(audit.nationalOnly,audit.items.filter(x=>!x.regionCandidates.length).length);
console.log('PASS: 300 source IDs preserved, '+confirmed+' matched regional candidates, '+rejected+' unsafe candidates withheld.');
