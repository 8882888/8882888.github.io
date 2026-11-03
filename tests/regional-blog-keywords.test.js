#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const m=require('../lib/regional-blog-keywords');
assert.equal(m.suffixes.length,63,'all 63 user-entered suffixes must be included');
assert.equal(new Set(m.suffixes.map(x=>x.suffix)).size,63,'no duplicate suffix');
for(const {suffix,kind} of m.suffixes){
 for(const area of ['부산','서울강남','대구광역시','세종특별자치시조치원읍']){
  const q=area+suffix,p=m.parse(q);
  assert.ok(p,'missing keyword '+q);
  assert.equal(p.region,area,'correct locality '+q);
  assert.equal(p.suffix,suffix,'longest suffix match '+q);
  assert.equal(p.kind,kind,'correct service '+q);
 }
}
assert.equal(m.parse('탁송'),null,'unqualified keyword is not a locality');
assert.equal(m.parse('대리운전'),null,'unqualified driver keyword is not a locality');
assert.equal(m.parse('동구탁송').region,'동구','ambiguous short names must be handled by legal-region lookup');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const provinceT=m.render({name:'부산',kind:'taksong',scope:'province',esc});
const provinceD=m.render({name:'부산',kind:'daeri',scope:'province',esc});
assert.ok(provinceT.includes('부산탁송')&&provinceT.includes('부산렌트카탁송'));
assert.ok(!provinceT.includes('부산법인카드대리운전'));
assert.ok(provinceD.includes('부산법인카드대리운전')&&provinceD.includes('부산골프장왕복기사'));
assert.ok(!provinceD.includes('부산화물차탁송'));
assert.ok(!m.render({name:'부산광역시 강서구 명지동',kind:'taksong',scope:'neighborhood',esc}),
 'avoid repetitive village doorway-content sections');
assert.ok(provinceT.includes('당시')&&provinceD.includes('승인'),'historic fare and corporate approval disclaimers');
assert.ok(provinceT.includes('/fare/')&&provinceT.includes('/reviews/history/'),'service navigation present');
console.log('PASS: 63 exact user-supplied locality suffixes × four geographic forms, grouped non-spam regional blog guidance');
