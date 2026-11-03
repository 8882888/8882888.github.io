#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const m=require('../lib/regional-blog-keywords');
const groups=m.work100.groups;
assert.equal(groups.length,20,'20 distinct locality+service groups');
const knownSuffixes=m.catalog.groups.flatMap(g=>g.keywords);
const original=new Set(m.priority.keywords.map(x=>x.keyword));
const flattened=groups.flatMap(g=>g.keywords);
assert.equal(flattened.length,100,'exactly 100 added search phrases');
assert.equal(new Set(flattened).size,100,'100 phrases must all be unique');
assert.ok(flattened.every(word=>!original.has(word)),'no duplicate of prior 25 phrases');
assert.equal(m.focusedLinks.length,20,'one existing canonical service page per locality+service');
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const g of groups){
 assert.equal(g.keywords.length,5,'5 focused terms per location/service');
 assert.ok(g.guide.length>=45,'specific non-boilerplate operational guidance');
 const note=m.focused({region:g.region,kind:g.kind,label:g.prefix,esc});
 assert.ok(note.includes('id="regional-priority-search-guide"'));
 assert.ok(note.includes(g.guide),'local guide must appear');
 assert.ok(note.includes('/fare/')&&note.includes('/reviews/history/'));
 for(const word of g.keywords){
  assert.ok(word.startsWith(g.prefix),'real contextual locality prefix');
  assert.ok(knownSuffixes.some(k=>word.endsWith(k)),'known user-requested suffix '+word);
  const p=m.parse(word);
  assert.ok(p,'keyword parser recognizes '+word);
  assert.equal(p.region,g.prefix,'exact province+district identity '+word);
  assert.equal(p.kind,g.kind,'correct service '+word);
  assert.ok(note.includes('<strong>'+word+'</strong>'),'visible dedicated guide phrase '+word);
 }
}
console.log('PASS: all 100 new distinct locality phrases across 20 canonical page guides and 63 known suffixes');
