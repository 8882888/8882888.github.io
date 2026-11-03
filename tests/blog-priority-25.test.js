#!/usr/bin/env node
'use strict';
// An exact source-of-truth check for user-entered phrases, not SEO ranking.
const assert=require('node:assert/strict');
const m=require('../lib/regional-blog-keywords');
const list=m.priority.keywords;
assert.equal(list.length,25);
assert.equal(new Set(list.map(x=>x.keyword)).size,25);
assert.equal(m.focusedLinks.length,20);
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const seen=new Set();
for(const row of list){
 const parsed=m.parse(row.keyword);
 assert.ok(parsed,'keyword must match one of 63 suffixes: '+row.keyword);
 assert.equal(parsed.kind,row.kind,'do not mix taksong and daeri: '+row.keyword);
 const key=row.region+'|'+row.kind;
 seen.add(key);
 const html=m.focused({region:row.region,kind:row.kind,label:row.region,esc});
 assert.ok(html.includes(row.keyword),'focused guide should visibly contain '+row.keyword);
 assert.ok(html.includes('id="regional-priority-search-guide"'));
 assert.ok(html.includes('예상요금 확인')&&html.includes('실제 운행기록'));
 assert.ok(!html.includes('실제 운행완료 후기입니다'),'do not invent a trip');
}
assert.equal(seen.size,16,'25 original phrases still point to 16 prior canonical pages');
assert.ok(!m.focused({region:'강원특별자치도 춘천시',kind:'daeri',label:'춘천시',esc}),'do not repeat identical SEO section on unrelated pages');
const busan=m.focused({region:'부산광역시',kind:'taksong',label:'부산',esc});
assert.ok(busan.includes('부산탁송업체')&&busan.includes('부산탁송회사'));
assert.ok(!busan.includes('부산대리운전회사'),'do not conflate services');
const jeju=m.focused({region:'제주특별자치도',kind:'taksong',label:'제주도',esc});
assert.ok(jeju.includes('제주항')&&jeju.includes('선적'));
console.log('PASS: 25 exact priority locality search phrases and 16 distinct contextual canonical guides');
