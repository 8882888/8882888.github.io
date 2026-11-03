'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const data=JSON.parse(fs.readFileSync('data/region-journey-links.json','utf8')).pages;
const posts=JSON.parse(fs.readFileSync('blog/posts.json','utf8'));
const byId=new Map(posts.map(post=>[String(post.id),post]));
assert.equal(data.length,10,'only ten priority regional landing pages may be changed');
const paths=new Set(),sourceIds=new Set();
for(const entry of data){
 assert(!paths.has(entry.path),'duplicate regional landing: '+entry.path);paths.add(entry.path);
 assert.equal(entry.originals.length,2,'two existing Naver originals: '+entry.path);
 assert.equal(entry.handover.length,3,'three distinct practical handover tips: '+entry.path);
 assert.equal(new Set(entry.handover).size,3,'duplicate handover instructions: '+entry.path);
 for(const note of entry.handover)assert(note.length>=25,'too little handover information: '+entry.path);
 for(const source of entry.originals){
  assert(/^\d{12}$/.test(String(source.id)),'invalid Naver original ID: '+source.id);
  const post=byId.get(String(source.id));
  assert(post&&post.url==='https://blog.naver.com/wjdtnr4757/'+source.id,'unverified or missing Naver original: '+source.id);
  assert(!sourceIds.has(source.id),'one original repeatedly used as unique evidence: '+source.id);
  sourceIds.add(source.id);
  assert(source.note.length>=25,'missing regional explanation for original: '+source.id);
  assert(/탁송/.test(post.title),'original not relevant to taksong: '+source.id);
 }
}
assert.equal(sourceIds.size,20);
console.log('PASS: ten canonical taksong pages link twenty distinct existing Naver posts with contextual notes and unique handover guidance; no fabricated evidence');
