'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const home=read('index.html'),corporate=read('service/corporate/index.html'),fare=read('fare/index.html');
const quote=home.indexOf('id="homepage-fare-top"');
const choice=home.indexOf('id="mobile-personal-corporate-choice-20261107"');
const regional=home.indexOf('id="smart24-kstyle-regional-categories-20261106"');
const menu=home.indexOf('id="homepage-primary-services-20261106"');
assert(quote>0&&menu>quote&&choice>menu&&regional>choice,
 'Mobile flow must show quote first, then service menu, then personal/corporate choice and region directory');
assert(home.includes('href="/service/corporate/#corporate-first-action-20261105"'),
 'Corporate visitor must reach direct consultation in one tap');
assert(home.includes('href="#homepage-fare-top"'),
 'Private visitor must reach quote without a new page');
assert(home.includes('id="homepage-mobile-personal-corporate-20261107"'),
 'Two mobile customer paths must adapt to narrow screens');
const first=corporate.indexOf('id="corporate-first-action-20261105"');
const faq=corporate.indexOf('id="corporate-mobile-faq-20261107"');
const post=corporate.indexOf('id="corporate-postpaid-guide-20261105"');
assert(first>0&&post>first&&faq>post,
 'Corporate consultation and postpaid conditions must precede optional FAQ');
const faqText=corporate.slice(faq,corporate.indexOf('</section>',faq));
assert((faqText.match(/<details>/g)||[]).length===5,
 'Corporate FAQ must have five concise mobile questions');
for(const phrase of ['계약 전에도','법인카드·후불','법인 차량탁송','월별 이용내역서','무엇을 먼저 준비']){
 assert(faqText.includes(phrase),'Corporate FAQ missing: '+phrase);
}
assert(faqText.includes('현재 이 페이지는 자동 청구서 발급·다운로드 서비스가 아닙니다.'),
 'Do not invent the competitor\'s account download functionality');
assert(faqText.includes('tel:18114294')&&faqText.includes('https://open.kakao.com/o/sGV88r7h'),
 'Corporate FAQ must close with usable contact options');
assert(fare.includes('거리와 예상요금을 임의로 표시하지 않습니다.'),
 'Routing-service outages may not show invented quotes');
assert(home.includes('2,591건')&&home.includes('href="tel:18114294"'),
 'Preserve evidence and real contact path');
console.log('PASS competitor-informed mobile personal vs corporate routing and five-question FAQ');
