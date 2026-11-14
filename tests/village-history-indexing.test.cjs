'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
const start=source.indexOf('function regionPage(r){');
const end=source.indexOf('\nfunction ',start+1);
const regionPage=source.slice(start,end);
test('village region hub considers preserved completed history before noindex',()=>{
 assert.ok(start>0,'regionPage renderer must exist');
 assert.match(regionPage,/regionalServiceEvidence\(r,'taksong'\)/);
 assert.match(regionPage,/regionalServiceEvidence\(r,'daeri'\)/);
 assert.match(regionPage,/!matches\.length&&!archivedVillageTrips\.length/);
 assert.match(regionPage,/archived-village-ride-evidence/);
 assert.match(regionPage,/\/reviews\/history\//);
});
test('source-empty villages remain noindex and global service pages are unchanged',()=>{
 assert.match(regionPage,/<meta name="robots" content="noindex,follow">/);
 assert.match(source,/if\(r\.level==='리'&&!priorityByKey\.has\(kind\+'\|'\+r\.full_name\)/);
 assert.match(source,/source-empty-village-20261107/);
 assert.match(source,/2591/,'preserved historical ride inventory unchanged');
});

test('evidence-backed village hubs are in the verified sitemap, never empty village templates',()=>{
 const start=source.indexOf("if(pathname==='/sitemap-verified-regions.xml')");
 const end=source.indexOf("const localityMapMatch=",start);
 assert.ok(start>0&&end>start,'verified sitemap handler is present');
 const handler=source.slice(start,end);
 assert.match(handler,/eligibleVillageServiceKeys\(\)/);
 assert.match(handler,/eligibleVillageKeys\.has\(kind\+'\|'\+r\.full_name\)/);
 assert.match(handler,/\.map\(r=>canonical\(r\.slug\)\)/);
 assert.match(handler,/\.\.\.supported,\.\.\.verifiedVillageHubs/);
});

test('sitemap exclusion and village HTML use same service-specific real ride evidence gates',()=>{
 const page=source.slice(source.indexOf('function servicePage(r,kind)'),source.indexOf('function regionPage(r)'));
 assert.match(page,/publicRides\.some\(x=>x\.service===kind&&tripMatchesRegion\(x,r\)\)/);
 const xml=source.slice(source.indexOf("if(type.startsWith('application/xml;'))"),
  source.indexOf("// Negotiate compression for large HTML only"));
 assert.match(xml,/!focus50ByKey\.has\(service\[1\]\+'\|'\+r\.full_name\)/);
 assert.match(xml,/const confirmed=publicRides\.some\(x=>x\.service===kind&&tripMatchesRegion\(x,r\)\)/);
 assert.match(xml,/!regionalServiceEvidence\(r,kind\)\.length/);
});
