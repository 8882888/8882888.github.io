'use strict';
// Tests a read-only locality-masked nationwide repetition report.
// It is neither an indexing score nor an automatic rewrite queue.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const reportPath = path.join(root,'ai-index-template-reuse.json');

test('all 2900 source guides and all 17 legal provinces enter masked template audit',()=>{
  assert.ok(fs.existsSync(reportPath),'Run the template audit before this test');
  const d=JSON.parse(fs.readFileSync(reportPath,'utf8'));
  assert.equal(d.sourceFiles,33);
  assert.equal(d.totalRecords,2900);
  assert.equal(d.totalParagraphs,5800);
  assert.equal(d.officialProvinces,17);
  assert.equal(d.missingProvinceCount,0);
  assert.equal(d.provinceBreakdown.length,17);
  assert.equal(d.provinceBreakdown.reduce((n,x)=>n+x.total,0),2900);
  assert.ok(d.affectedDistinctGuideCount >=0 && d.affectedDistinctGuideCount <=2900);
  assert.ok(d.repeatedParagraphInstances >= d.affectedDistinctGuideCount);
  assert.ok(d.repeatedTemplateGroups >0,'Synthetic locality swaps should not hide all real boilerplate');
  for (const province of d.provinceBreakdown) {
    assert.ok(province.total>=province.affected);
    assert.ok(province.total>0);
  }
  for (const field of ['pickup','handover']){
    assert.ok(d.affectedByField[field]>=0);
    assert.ok(d.affectedByField[field]<=2900);
  }
  assert.equal(d.naverIndexed,null);
  assert.equal(d.naverImpressions,null);
  assert.equal(d.naverClicks,null);
  assert.equal(d.naverCtr,null);
  assert.equal(d.nationalRepeatReviewQueueCount,d.affectedDistinctGuideCount);
  const queue=fs.readFileSync(path.join(root,'ai-index-template-reuse-queue.csv'),'utf8').trimEnd().split('\n');
  assert.equal(queue.length,d.affectedDistinctGuideCount+1,'Complete queue must not be truncated to top 100');
  assert.equal(queue[0],'province,kind,region,id,source,position,maxGroupSize,groupCount,fields,groupHashes');

});
test('groups identify distinct localities while preserving diagnostic-only source scope',()=>{
  const d=JSON.parse(fs.readFileSync(reportPath,'utf8'));
  assert.ok(d.topGroups.length>0);
  assert.ok(d.topGroups.length<=100);
  for (const g of d.topGroups) {
    assert.ok(['daeri','taksong'].includes(g.kind));
    assert.ok(['pickup','handover'].includes(g.field));
    assert.ok(g.count>=2 && g.distinctRegions>=2);
    assert.ok(g.provinceCount>=1 && g.provinceCount<=17);
    assert.match(g.hash,/^[a-f0-9]{16}$/);
    assert.ok(g.examples.length>=1 && g.examples.length<=6);
    assert.ok(g.examples.every(x=>x.source.startsWith('data/naver-regional-focus-')));
    assert.ok(!('naverIndexed' in g),'Never attribute search-index status to a template');
  }
  assert.match(d.method,/masking/);
  assert.match(d.note,/never modified/);
});
