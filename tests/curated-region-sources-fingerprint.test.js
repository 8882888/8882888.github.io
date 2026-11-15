'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {fingerprintCuratedRegionSources}=require('../lib/curated-region-sources-fingerprint');
const root=path.join(__dirname,'..');

test('fingerprint includes all published regional JSON sources, not just one historical file',()=>{
 const real=fingerprintCuratedRegionSources(root);
 assert.ok(real.count>=30,'All regional guide batches must contribute to fingerprint');
 assert.match(real.sha256,/^[a-f0-9]{64}$/);
 assert.deepEqual(fingerprintCuratedRegionSources(root),real,'Identical files must have the same deterministic digest');
 const verifier=fs.readFileSync(path.join(root,'tools/check_cloudtype_freshness.js'),'utf8');
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
 for(const src of [verifier,server]){
  assert.match(src,/fingerprintCuratedRegionSources/);
  assert.ok(src.includes('data/naver-regional-focus-*.json'),'Missing aggregate hash contract');
 }
 assert.match(verifier,/curated_region_file_count/,'Live file count must be compared');
 assert.match(server,/curated_region_file_count/,'Server must expose live file count');
});

test('editing any individual published region file changes the aggregate digest',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'smart24-region-hash-'));
 try{
  const dir=path.join(temp,'data');fs.mkdirSync(dir);
  const a='naver-regional-focus-twelfth-daeri-100.json';
  const b='naver-regional-focus-fourteenth-taksong-100.json';
  fs.writeFileSync(path.join(dir,a),'{"priority":[{"region":"A"}]}\n');
  fs.writeFileSync(path.join(dir,b),'{"priority":[{"region":"B"}]}\n');
  let first=fingerprintCuratedRegionSources(temp);
  assert.equal(first.count,2);
  fs.writeFileSync(path.join(dir,b),'{"priority":[{"region":"B","pickup":"new verified copy"}]}\n');
  let updated=fingerprintCuratedRegionSources(temp);
  assert.notEqual(first.sha256,updated.sha256,'Non-legacy region edits must invalidate production release identity');
  fs.writeFileSync(path.join(dir,a),'{"priority":[{"region":"A","handover":"edited"}]}\n');
  const revised=fingerprintCuratedRegionSources(temp);
  assert.notEqual(updated.sha256,revised.sha256);
  // Candidate drafts are never published and must not alter production identity.
  fs.writeFileSync(path.join(dir,'naver-regional-focus-twenty-first-candidates.json'),'{"draft":true}\n');
  assert.deepEqual(fingerprintCuratedRegionSources(temp),revised);
 }finally{
  fs.rmSync(temp,{recursive:true,force:true});
 }
});
