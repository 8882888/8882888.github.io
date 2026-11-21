'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const rides=[...JSON.parse(fs.readFileSync(path.join(root,'data/public-reviewed-rides-202610.json'),'utf8')),...JSON.parse(fs.readFileSync(path.join(root,'data/verified-ride-publication-queue.json'),'utf8'))];
const published=JSON.parse(fs.readFileSync(path.join(root,'data/published-ride-case-ids.json'),'utf8'));
const feed=fs.readFileSync(path.join(root,'lib/published-case-feed.js'),'utf8');
const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
const id=x=>crypto.createHash('sha256').update(['date','service','departure','destination','fare'].map(k=>String(x[k]??'')).join('|')).digest('hex').slice(0,16);
test('published case feed exports the exact fields needed for canonical matching',()=>{
 assert.match(feed,/rideDate:ride\.date,service:ride\.service,\s*departure:ride\.departure,destination:ride\.destination,fare:ride\.fare,/);
});
test('all currently published cases resolve to one enriched canonical route using the full source identity',()=>{
 assert.ok(published.length>0);
 const byId=new Map(rides.map(x=>[id(x),x]));
 const mapAt=server.indexOf('const publishedCaseByRideKey=new Map(publishedCaseEntries.map');
 const feedAt=server.indexOf('const publishedCaseEntries=loadPublishedCases(ROOT);');
 const urlAt=server.indexOf('const rideUrl=x=>{');
 assert.ok(feedAt>=0&&mapAt>feedAt,'canonical lookup must be built after the published-case feed loads');
 assert.ok(urlAt>=0&&urlAt<mapAt,'rideUrl closes over the published lookup but is not invoked during module initialization');
 assert.match(server,/const key=\[x\.date,x\.service,x\.departure,x\.destination,x\.fare\|\|''\]\.map\(v=>String\(v\?\?''\)\)\.join\('\|'\)/);
 assert.match(server,/return match\?\.path\|\|['"]\/reviews\//);
 for(const entry of published){
  const ride=byId.get(entry.id);
  assert.ok(ride,'published id resolves to a complete source record');
  const expected='/reviews/verified/'+entry.id+'/';
  const key=[ride.date,ride.service,ride.departure,ride.destination,ride.fare].join('|');
  assert.ok(server.includes('publishedCaseByRideKey.get(key)'),'regional route uses the canonical bridge');
  assert.ok(fs.existsSync(path.join(root,expected,'index.html')),'enriched canonical page exists');
 }
});
test('regional pages, review lists and sitemap all use the same rideUrl resolver',()=>{
 assert.match(server,/href=\"'\+rideUrl\(x\)\+'\"/,'regional review cards use rideUrl');
 assert.match(server,/base\+rideUrl\(x\)/,'legacy dynamic route declares enriched page as canonical when a published match exists');
 assert.match(server,/publicRides\.slice\(0,60\)\.map\(rideUrl\)/,'main sitemap maps ride URLs through the canonical resolver');
 assert.match(server,/publishedCaseEntries\.slice\(0,40\)\.map\(x=>x\.path\)/,'published canonical pages remain directly discoverable');
});
