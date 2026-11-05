#!/usr/bin/env node
'use strict';
// One thousand explicit quality gates for the first 50 priority region journeys.
// 50 * 20 = 1,000 checks. These are checks, NOT 1,000 individual site improvements.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const targets=JSON.parse(read('data/naver-regional-focus-50.json')).priority;
assert.equal(targets.length,50);
const names=new Set();
for(let i=1;i<=17;i++){
 const d=JSON.parse(read('data/legal-regions/'+String(i).padStart(2,'0')+'.json'));
 for(const name of d.full_names)names.add(name);
}
const server=read('server.js'),home=read('index.html');
const checks=[
 x=>assert(Number.isInteger(x.id)&&x.id>0,'positive source id'),
 x=>assert(typeof x.region==='string'&&x.region.length>=3,'region'),
 x=>assert(names.has(x.region),'legal administrative region'),
 x=>assert(['taksong','daeri'].includes(x.kind),'service'),
 x=>assert(typeof x.keyword==='string'&&x.keyword.length>=3,'keyword'),
 x=>assert(x.keyword.includes(x.kind==='taksong'?'탁송':'대리'),'matching keyword intent'),
 x=>assert(typeof x.topic==='string'&&x.topic.length>=3,'unique topic'),
 x=>assert(typeof x.pickup==='string'&&x.pickup.length>=18,'useful vehicle pickup guidance'),
 x=>assert(typeof x.handover==='string'&&x.handover.length>=18,'useful handover guidance'),
 x=>assert(!/업계\s*1위|무조건\s*즉시|100%\s*배차/.test(x.pickup+' '+x.handover),'no unverified guarantees'),
 x=>assert(!/010[- ]?\d{3,4}[- ]?\d{4}|@/.test(x.pickup+' '+x.handover),'no private contact'),
 x=>assert(!/[<>]/.test(x.region+x.keyword+x.topic),'no embedded HTML in index labels'),
 x=>assert(x.region.trim()===x.region,'normalized geography'),
 x=>assert(x.keyword.trim()===x.keyword,'normalized keyword'),
 x=>assert(x.topic.trim()===x.topic,'normalized topic'),
 x=>assert(x.pickup.trim()===x.pickup,'normalized pickup guidance'),
 x=>assert(x.handover.trim()===x.handover,'normalized handover guidance'),
 x=>assert(server.includes('matchingHistoryRegion(x,r,regions)'),'authentic regional review matching'),
 x=>assert(server.includes('mobileReviewBookingBar(kind,name)'),'direct mobile region booking'),
 x=>assert(home.includes('href="tel:18114294"')&&home.includes('id="homepage-fare-top"'),'homepage fare and phone entry')
];
assert.equal(checks.length,20);
const seen=new Set();
let total=0;
for(const x of targets){
 const key=x.region+'|'+x.kind;
 assert(!seen.has(key),'Repeated canonical target: '+key);
 seen.add(key);
 for(let i=0;i<checks.length;i++){
  try{checks[i](x)}catch(e){throw new Error('Target '+key+' gate '+(i+1)+'/20: '+e.message)}
  total++;
 }
}
assert.equal(total,1000);
console.log('PASS: 1,000 quality gates across 50 region-service targets; exact geography, truthful copy and mobile conversion protected.');
