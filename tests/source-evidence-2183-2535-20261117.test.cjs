'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
test('generate separate human-only review queues for all 2183 unresolved archives and 2535 weak regional guides',()=>{
 const result=execFileSync(process.execPath,['scripts/triage-unresolved-rides-and-content.mjs'],{
  cwd:root,encoding:'utf8',timeout:120000,maxBuffer:1024*1024*3});
 const output=JSON.parse(result);
 assert.equal(output.archive.total,2591);
 assert.equal(output.archive.alreadyClassified,408);
 assert.equal(output.archive.unresolved,2183);
 assert.equal(Object.values(output.archive.reviewStages).reduce((a,b)=>a+b,0),2183);
 assert.equal(output.content.all,2900);
 assert.equal(output.content.passed,365);
 assert.equal(output.content.needsReview,2535);
 const first=read('ride-2183-original-evidence-triage.json');
 const second=read('content-2535-evidence-first-review.json');
 assert.equal(first.records.length,2183);
 assert.equal(first.inventory.invalidClassification,0);
 assert.equal(first.confirmedNewRegions,0,'do not autofill any historical trip location');
 assert.equal(new Set(first.records.map(x=>x.archiveId)).size,2183);
 for(const record of first.records){
  assert.equal(record.confirmedRegion,null);
  assert.equal(record.requiresHumanConfirmation,true);
  assert.equal(record.source,'ride-history.json');
  assert(!Object.hasOwn(record,'departure')&&!Object.hasOwn(record,'destination'),
   'do not export raw personal travel route or addresses to review reports');
  assert(record.originHints.every(x=>typeof x==='string'&&x.length>2));
  assert(record.destinationHints.every(x=>typeof x==='string'&&x.length>2));
 }
 assert.equal(second.prioritizedPending.length,2535);
 assert.equal(second.totals.passed,365);
 assert.equal(second.totals.needsReview,2535);
 assert.equal(new Set(second.prioritizedPending.map(x=>x.kind+'|'+x.region)).size,2535);
 assert.equal(Object.values(second.evidenceCounts).reduce((n,x)=>n+x.needsReview,0),2535);
 assert.equal(Object.values(second.evidenceCounts).reduce((n,x)=>n+x.all,0),2900);
 for(const x of second.prioritizedPending){
  assert(x.issueCount>0);
  assert.equal(x.naverIndexed,null);
  assert.equal(x.completedTripProven,null);
  assert(!Object.hasOwn(x,'fare')&&!Object.hasOwn(x,'departure')&&!Object.hasOwn(x,'destination'));
 }
 const csv=fs.readFileSync(path.join(root,'ride-2183-original-evidence-triage.csv'),'utf8').trimEnd().split('\n');
 const csvQuality=fs.readFileSync(path.join(root,'content-2535-evidence-first-review.csv'),'utf8').trimEnd().split('\n');
 assert.equal(csv.length,2184);
 assert.equal(csvQuality.length,2536);
 const baseline=read('data/naver-searchadvisor-official-baseline.json');
 assert.equal(baseline.latestOfficialSnapshot,null,'no fake current owner-authenticated Search Advisor data');
 console.log(JSON.stringify({sourceReviewOnly:true,
  archiveUnresolved:first.records.length,sourceQualityReview:second.prioritizedPending.length,
  statusCounts:first.stageCounts,evidenceCounts:second.evidenceCounts,
  currentNaverOfficial:null},null,2));
});
