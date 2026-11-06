'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const record=JSON.parse(read('data/cycling-search-keywords-20261106.json'));
const lib=read('lib/keyword-card-expansion.js');
const page=read('special/cycling-trail-transport/index.html');
const all=Object.values(record.groups).flat();
assert.equal(all.length,23,'23 unique requested terms after removing repeated 섬진강종주');
assert.equal(new Set(all).size,23,'No duplicated phrases');
assert.deepEqual(Object.keys(record.groups),['섬진강','낙동강','국토종주','백두대간']);
assert.equal(record.aliases['섬신강종주탁송'],'섬진강종주탁송','Search typo normalization must have a valid target');
assert(!all.includes('섬진강종주탁송')||lib.includes('섬진강종주탁송'),'Canonical alias target must route to Seomjin');
assert(page.includes('id="cycling-four-major-keyword-intents-20261106"'),'User-facing course guidance missing');
for(const [group,words] of Object.entries(record.groups)){
 assert(page.includes('<h3>'+group)||page.includes(group+'자전거길'),'Missing course introduction '+group);
 for(const word of words){
  assert(page.includes(word),'Requested search term missing from indexable course content: '+word);
  assert(lib.includes("'"+word+"'"),'Requested search term missing from dynamic keyword match: '+word);
 }
}
const anchored=page.indexOf('id="cycling-route-fare-table-202611"');
const additions=page.indexOf('id="cycling-four-major-keyword-intents-20261106"');
assert(anchored>=0&&additions>anchored,'Original route fares must remain before additional SEO guidance');
assert(page.includes('공식 국토종주 인증코스')&&page.includes('산 능선 자전거 통행 가능'),'Avoid false Baekdudaegan certified-bike-route promise');
assert(page.includes('실제 운행을 증명하는 후기가 아니라'),'Do not invent completed cycling rides');
assert(page.includes('tel:18114294'),'Keep official consultation');
assert.equal(record.canonical_page,'/special/cycling-trail-transport/');
console.log('PASS: all 23 unique cycling keyword variants, typo, route facts and visible guide');
