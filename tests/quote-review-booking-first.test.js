'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const fare=fs.readFileSync(path.join(root,'fare/index.html'),'utf8');
const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
const corporate=fs.readFileSync(path.join(root,'service/corporate/index.html'),'utf8');
const main=fare.indexOf('<main>'),quote=fare.indexOf('<form id="quote-form">');
const keyword=fare.indexOf('id="regional-route-keyword-search"');
assert(main>0&&quote>main&&quote<keyword,'Fare form must precede long keyword guidance');
assert(quote-main<100,'The fare form must be the first main content block');
assert.equal(fare.split('id="quote-form"').length-1,1,'Only one quote form');
assert(fare.includes('id="fare-mobile-consult-20261107"')&&fare.includes('class="fare-mobile-actions"'),
 'Mobile estimator must retain fixed quote and official phone actions');
assert(fare.includes('result-contact-note')&&fare.includes('이 구간 요금·배차 전화상담 1811-4294'),
 'A successful calculated quote must immediately offer a one-tap phone consultation');
assert(server.includes('function mobileRegionConversion(')&&server.includes("encodeURIComponent(region.full_name)"),
 'Every canonical administrative service page must carry its verified departure locality into the quote');

for(const item of ['id="service"','id="from"','id="to"','id="submit"','id="result"','tel:18114294',"preset.get('service')", "preset.get(id)"]){
 assert(fare.includes(item),'Missing booking parameter or action '+item);
}
assert(server.includes('aria-label="실제 완료 운행후기 검색"'),'Review search needs accessible form');
assert(server.includes('type="search" maxlength="40" autocomplete="off"'),'Native mobile review search');
assert(server.includes('id="priority-locality-customer-checklist-20261105"'),'Regional checklist');
assert(server.includes('mobileReviewBookingBar(kind,name)'),'Mobile regional booking');
assert(corporate.includes('id="corporate-first-action-20261105"'),'Corporate contract CTA');
assert(corporate.includes('후불 정산은 자동 승인되는 상품이 아닙니다'),'Conditional credit reminder');
console.log('PASS: quote is first, preset fields preserved, review search and contact in one journey');
