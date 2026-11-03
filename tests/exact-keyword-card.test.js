#!/usr/bin/env node
'use strict';
// 20 high-priority exact regional phrases, all validated against the
// established 63 suffix taxonomy; NO fabricated trips/doorway SEO pages.
const assert=require('node:assert/strict');
const moduleCard=require('../lib/exact-keyword-card');
const parser=require('../lib/regional-blog-keywords');
const words=require('../data/exact-image-priority-20.json');
assert.equal(words.length,20);
assert.equal(new Set(words).size,20);
for(const word of words){
 const intent=parser.parse(word);
 assert.ok(intent,'recognized keyword: '+word);
 const svg=moduleCard.render({keyword:word,region:intent.region,kind:intent.kind,phone:'1811-4294'});
 assert.ok(svg.includes('<title id="title">'+word+' | 스마트24'),'exact title '+word);
 assert.ok(svg.includes('>'+word+'</text>'),'exact visible text '+word);
 assert.match(svg,/width="1200" height="800"/);
 assert.ok(svg.includes('실제 운행 완료 사진 아님'));
}
const xss=moduleCard.render({keyword:'부산<svg onload=alert(1)>',region:'부산',kind:'taksong',phone:'1811-4294'});
assert.ok(!xss.includes('<svg onload='));
assert.ok(xss.includes('&lt;svg'));
console.log('PASS exact keyword card source 20/20 and XML escaping');
