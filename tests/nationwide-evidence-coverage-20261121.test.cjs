'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
test('all 17 provinces and all 2900 original region-service guides are included in a national source audit',()=>{
 execFileSync(process.execPath,['scripts/ai-index-quality-triage.mjs'],{cwd:root,timeout:45000,stdio:'pipe'});
 const national=read('ai-index-nationwide-coverage.json');
 const base=read('ai-index-quality-review.json');
 assert.equal(national.officialProvinceCount,17);
 assert.equal(national.provinceBreakdown.length,17);
 assert.equal(new Set(national.provinceBreakdown.map(x=>x.province)).size,17);
 assert.equal(national.sourceFiles,33);
 assert.equal(national.totals.reviewed,2900);
 assert.deepEqual(national.totals,base.totals);
 assert.equal(national.records.length,2900,'Never silently lose source records');
 assert.equal(national.nationalReviewQueueCount,national.totals.needsReview);
 assert.equal(national.balancedQueue.length,national.totals.needsReview,
  'Do not truncate the nationwide backlog to 100 keyword targets');
 assert.equal(national.records.filter(x=>x.issues.length).length,national.totals.needsReview);
 assert.equal(national.records.filter(x=>!x.issues.length).length,national.totals.fullyPassing);
 assert.equal(national.provinceBreakdown.reduce((sum,x)=>sum+x.total,0)
  +national.missingProvinceCount,2900,'Account for all regions, even invalid province names');
 const pairs=new Set(national.records.map(x=>x.kind+'|'+x.region));
 assert.equal(pairs.size,2900,'Service and locality identity must stay unique');
 const fullKey=x=>x.source+'|'+x.position+'|'+x.kind+'|'+x.keyword;
 const reviewKeys=new Set(national.records.filter(x=>x.issues.length).map(fullKey));
 assert.equal(new Set(national.balancedQueue.map(fullKey)).size,national.totals.needsReview);
 assert(national.balancedQueue.every(x=>reviewKeys.has(fullKey(x))),
  'No invented review candidate may enter a source-derived queue');
 for(const item of national.records){
  assert(['daeri','taksong'].includes(item.kind));
  assert(item.source.startsWith('data/naver-regional-focus-'));
  assert.equal(item.naverIndexed,null);
  assert(!Object.hasOwn(item,'privateAddress'));
  assert(!Object.hasOwn(item,'customer'));
  assert(!Object.hasOwn(item,'rideDate'));
 }
 for(const province of national.provinceBreakdown){
  assert.deepEqual(Object.keys(province.services).sort(),['daeri','taksong']);
  assert.equal(province.total,province.services.daeri.total+province.services.taksong.total);
  assert.equal(province.passing+province.review,province.total);
 }
 // In the first round, each available province/service can appear at most once.
 const occupied=national.provinceBreakdown.flatMap(x=>['daeri','taksong'].filter(k=>x.services[k].review)
  .map(kind=>x.province+'|'+kind));
 const first=national.balancedQueue.slice(0,occupied.length)
  .map(x=>x.province+'|'+x.kind);
 assert.equal(new Set(first).size,occupied.length);
 assert.deepEqual([...first].sort(),[...occupied].sort());
 for(const field of ['naverRealIndexed','naverRealImpressions','naverRealClicks','naverRealCtr'])
  assert.equal(national[field],null,'Do not substitute editorial counts for official Naver measurements');
 const csv=fs.readFileSync(path.join(root,'ai-index-nationwide-queue.csv'),'utf8');
 assert(csv.startsWith('province,kind,region,keyword,'));
 assert.equal(csv.trimEnd().split('\n').length,national.totals.needsReview+1);
 const markdown=fs.readFileSync(path.join(root,'ai-index-nationwide-coverage.md'),'utf8');
 assert(markdown.includes('17개 시·도'));
 assert(national.provinceBreakdown.every(x=>markdown.includes(x.province)));
});
