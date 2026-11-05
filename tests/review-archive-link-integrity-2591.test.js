#!/usr/bin/env node
'use strict';
// Protect the completed-ride archive -> local evidence -> fare/booking journey.
// Historical source data stays untouched; unverified geography is not invented.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const original=JSON.parse(read('data/ride-history.json'));
assert.equal(original.length,2591,'Never silently change the historical 2,591 records');
const all=[];
for(let batch=1;batch<=9;batch++){
 const tail=batch===9?'191':'300';
 const file='data/regional-review-links-batch-'+String(batch).padStart(3,'0')+'-'+tail+'.json';
 const doc=JSON.parse(read(file));
 assert.equal(doc.items.length,batch===9?191:300,file+' batch size');
 for(const row of doc.items){
  assert.match(row.id,/^excel-\d{4}$/);
  assert.equal(row.url,'/reviews/history/'+row.id+'/','Canonical review detail URL');
  assert.equal(row.source,'ride-history.json','No invented provenance');
  assert(!('rawDeparture' in row||'rawDestination' in row||'customerPhone' in row),'Never copy raw dispatch notes into link manifests');
  const idx=Number(row.id.slice(6))-1;
  assert(idx>=0&&idx<original.length,'Review link must point to an existing archived case');
  assert.equal(row.date,original[idx].date,'The original date cannot be rewritten');
  if(!row.region)assert(row.regionStatus!=='verified','Unresolved region must never be claimed verified');
  all.push(row);
 }
}
assert.equal(all.length,2591);
assert.equal(new Set(all.map(x=>x.id)).size,2591,'Do not duplicate archived cases');
assert.deepEqual(all.map(x=>Number(x.id.slice(6))).sort((a,b)=>a-b),Array.from({length:2591},(_,i)=>i+1),
 'Every archived source ID must remain reachable');
const catalog=JSON.parse(read('data/review-source-catalog-20261105.json'));
assert.equal(catalog.counts.historical,2591);
assert.equal(catalog.counts.separatelyVerified,39);
assert.equal(catalog.counts.totalReferenced,2630);
assert(catalog.counts.targetGapAtLeast>=270,'Do not publish an unsupported 2,900-rides claim');
const server=read('server.js');
for(const token of [
 'matchingHistoryRegion(x,r,regions)',
 '/reviews/history/',
 'id="ride-review-direct-booking-20261105"',
 '/service/corporate/#corporate-postpaid-guide-20261105',
 'tel:18114294',
 '/fare/?service='
])assert(server.includes(token),'Review-region-booking route missing '+token);
assert(server.includes('regionSlug?bySlug.get(regionSlug):null'),'History region filter must resolve a legal region slug');
assert(server.includes(`esc(old.date)+' · <a href="/fare/?service='+kind`),'Regional ride cards need direct fare links');
assert(server.includes('encodeURIComponent(old.departure'), 'Regional fare links need case origin');
assert(server.includes('encodeURIComponent(old.destination'), 'Regional fare links need case destination');
assert(server.includes(`>예상요금 조회</a> · <a href="tel:18114294">예약상담`),'Regional cards need one-tap booking');

for(const token of [
 'function mobileReviewBookingBar(kind',
 'min-height:48px',
 'class="review-mobile-booking-bar"',
 'aria-label="모바일 운행후기 바로 예약"',
 "mobileReviewBookingBar(x.service,x.departure",
 "mobileReviewBookingBar(kind,matchedRegion?matchedRegion.full_name:'')",
 "const body=mobileReviewBookingBar(kind,name)+daeguTaksongGuide",
 'href="tel:18114294">전화 예약상담'
])assert(server.includes(token),'Mobile conversion regression: '+token);
console.log('PASS: 2,591 distinct source-linked reviews, 9 archive batches, privacy/region safeguards and fare/booking paths');
