'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {loadPublishedCases}=require('../lib/published-case-feed');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'data/sitemap-url-owners.json');
const owners=JSON.parse(fs.readFileSync(file,'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'data/published-ride-case-ids.json'),'utf8'));
const cases=loadPublishedCases(root);
assert.equal(cases.length,manifest.length,'Refuse to register missing, duplicate or noncanonical published cases');
let added=0;
for(const ride of cases){
 const owner=owners[ride.path];
 assert(!owner||owner==='/sitemap-published.xml','Conflicting existing sitemap owner: '+ride.path);
 if(!owner){owners[ride.path]='/sitemap-published.xml';added++;}
}
if(added){
 const sorted=Object.fromEntries(Object.keys(owners).sort().map(key=>[key,owners[key]]));
 fs.writeFileSync(file,JSON.stringify(sorted,null,2)+'\n');
}
console.log('Verified published cases:',cases.length,'new sitemap owners:',added);
