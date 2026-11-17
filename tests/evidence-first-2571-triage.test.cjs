'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
test('2,900 regional pages are triaged without pretending to have Naver index data',()=>{
 execFileSync(process.execPath,['scripts/ai-index-quality-triage.mjs'],{cwd:root,stdio:'pipe',timeout:30000});
 const report=JSON.parse(fs.readFileSync(path.join(root,'ai-index-quality-review.json'),'utf8'));
 const e=JSON.parse(fs.readFileSync(path.join(root,'ai-index-evidence-priority.json'),'utf8'));
 assert.equal(report.totals.reviewed,2900);
 // Preserve the published historical baseline, while allowing actual editorial
 // improvements to reduce the current queue. Source-evidence crosswalks alone
 // must never change the measured pass/fail totals.
 const historicalBaseline={reviewed:2900,needsReview:2571,fullyPassing:329};
 const evidencedEdits=28;
 assert.equal(report.totals.needsReview+report.totals.fullyPassing,historicalBaseline.reviewed);
 assert.ok(report.totals.needsReview<=historicalBaseline.needsReview-evidencedEdits,
  '28 revised, source-reviewed guides must reduce rather than silently rename the 2571 baseline');
 assert.ok(report.totals.fullyPassing>=historicalBaseline.fullyPassing+evidencedEdits,
  '28 revised guides must meet the existing quality rubric');
 assert.deepEqual(e.totals,report.totals);
 assert.equal(e.naverIndexed,null);
 assert.equal(e.googleIndexed,null);
 assert.equal(e.queue.length,100);
 const c=e.evidenceCounts;
 assert.equal(Object.values(c).reduce((n,x)=>n+x.total,0),2900);
 assert.equal(Object.values(c).reduce((n,x)=>n+x.needsReview,0),report.totals.needsReview);
 assert.ok(c['published-reference-linked'].total>=5);
 assert.ok(c['reviewed-editorial-guidance'].total>=30);
 assert.ok(c['additional-local-evidence-needed'].total>=2000);
 const lookup=x=>[x.kind,x.region].join('|');
 for(const x of e.queue){
  assert.equal(x.naverIndexed,null);
  assert.ok(Array.isArray(x.issues)&&x.issues.length);
  assert.ok(['published-reference-linked','reviewed-editorial-guidance','additional-local-evidence-needed'].includes(x.evidenceTier));
  for(const ref of x.originalSources||[]){
   assert.ok(/^https:\/\/blog\.naver\.com\/wjdtnr4757\/\d+$/.test(ref.url),'sources must be existing owned articles');
   assert.ok(['city_or_origin','city_guide','related_service','regional_guide'].includes(ref.scope),'do not collapse general guides into verified ride proof');
  }
 }
 assert.ok(e.queue.every((row,i)=>i===0||
  ({'published-reference-linked':0,'reviewed-editorial-guidance':1,'additional-local-evidence-needed':2}[e.queue[i-1].evidenceTier] <=
   {'published-reference-linked':0,'reviewed-editorial-guidance':1,'additional-local-evidence-needed':2}[row.evidenceTier])));
 assert.ok(e.warning.includes('No automatic publication'));
 assert.ok(fs.readFileSync(path.join(root,'ai-index-evidence-priority.csv'),'utf8').startsWith('evidenceTier,'));
});
