'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const rows=JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-50.json'),'utf8')).priority;
const selected=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,40,41,42,43];
test('20 source-editorial priority 부산·대구 guides have distinct useful handover and a valid service link',()=>{
 assert.equal(rows.length,50);
 const pickups=new Set(),handovers=new Set();
 for(const i of selected){
  const r=rows[i],place=r.region.split(/\s+/).at(-1),text=[r.topic,r.pickup,r.handover].join(' ');
  assert(r.topic.length>=13,i+': concise but descriptive topic');
  assert(r.pickup.length>=80,i+': pickup context');
  assert(r.handover.length>=75,i+': handover context');
  assert(text.includes(place),i+': actual administrative locality named');
  assert(/^\/(?:service|business)\//.test(r.related)&&r.related.endsWith('/'),i+': relevant existing service link');
  assert(!/(?:100%\s*보장|즉시\s*배차\s*보장|상시\s*상주|무조건\s*배차)/.test(text),i+': do not invent dispatch guarantees');
  assert(!pickups.has(r.pickup),i+': unique pickup not repeated');
  assert(!handovers.has(r.handover),i+': unique handover not repeated');
  pickups.add(r.pickup);handovers.add(r.handover);
 }
});
test('existing verified data remains separate from editorial guide; no artificial ride records',()=>{
 const source=fs.readFileSync(path.join(root,'server.js'),'utf8');
 assert(source.includes("const historicalRides=(Array.isArray(rides)?rides:[]).map("));
 assert(source.includes("naverFocus50Guide(r,kind)"));
});
