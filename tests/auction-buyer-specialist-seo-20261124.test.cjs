'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const auction=read('business/auction/index.html');
const scrapyard=read('business/scrapyard/index.html');
const title=auction.match(/<title>([^<]+)<\/title>/)?.[1];
const desc=auction.match(/<meta name="description" content="([^"]+)"/)?.[1];
const section=auction.match(/<section id="auction-three-business-customers-20261124"[\s\S]*?<\/section>/)?.[0];
test('Naver auction search metadata maps real buyer intent to one existing canonical',()=>{
 assert.equal(title,'경매장탁송 | 중고차딜러·폐차장·중고차수출업체 낙찰차 출고');
 assert.ok(desc?.startsWith('경매장탁송.'));
 for(const phrase of ['중고차딜러','폐차장','중고차수출업체','카카오 상담','1811-4294'])assert.ok(desc.includes(phrase),phrase);
 assert.ok([...desc].length>55&&[...desc].length<=80,'business Naver 80 character rule');
 assert.equal(auction.match(/<meta property="og:title" content="([^"]+)"/)?.[1],title);
 assert.equal(auction.match(/<meta property="og:description" content="([^"]+)"/)?.[1],desc);
 assert.ok(auction.includes('<link rel="canonical" href="https://jeongukdaeri.kr/business/auction/"'));
 assert.equal((auction.match(/<h1>/g)||[]).length,1);
 assert.ok(auction.includes('id="auction-industry-entry-20261124"'));
 const graph=JSON.parse(auction.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
 const page=graph.find(x=>x['@type']==='WebPage'),crumb=graph.find(x=>x['@type']==='BreadcrumbList'),service=graph.find(x=>x['@type']==='Service');
 assert.equal(page.name,title);assert.equal(page.description,desc);
 assert.equal(crumb.itemListElement[2].name,title);
 assert.equal(page.url,'https://jeongukdaeri.kr/business/auction/');
 assert.equal(service.provider.telephone,'1811-4294');
 assert.equal('offers' in service,false,'No fabricated fixed rates or business contracts');
});
test('Three buyer groups have independently useful legal and operational detail',()=>{
 assert.ok(section&&section.length>1200,'auction dealer/scrapyard/export specialist content');
 for(const x of ['중고차딜러·매매상사','폐차장·폐차업체','중고차수출업체·무역업체']){
  assert.ok(section.includes(x),'distinct commercial customer '+x);
 }
 assert.equal((section.match(/<h3>/g)||[]).length,4,'three buyer headings plus checklist');
 for(const x of ['성능점검','키','반출','번호판','도로주행','말소차','무번호판차',
 '송도유원지','평택항','통관·선박 선적','다대수·법인 반복 거래']){
  assert.ok(section.includes(x),'critical procedure '+x);
 }
 for(const href of ['/business/used-car/','/business/scrapyard/','/business/export-port/','/business/#b2b-inquiry','/fare/?service=taksong']){
  assert.ok(section.includes('href="'+href+'"'),'related canonical or quote '+href);
 }
 assert.ok(section.includes('경매장 공식 제휴·고정요금·즉시 출고를 주장하지 않습니다'));
 assert.ok(section.includes('차량번호 전체·신분증·소유자 개인정보'));
});
test('Kakao is accessible and safe alongside official phone before long original archive text',()=>{
 const link='href="https://open.kakao.com/o/sGV88r7h"';
 assert.equal(auction.split(link).length-1,3,'chat button first view, expert section, footer');
 assert.equal(auction.split('class="auction-kakao"').length-1,2);
 assert.ok(auction.indexOf('카카오 오픈채팅으로 경매장탁송 상담')<auction.indexOf('id="auction-step-by-step-20261117"'));
 assert.ok(auction.includes('카카오 안내 08:00~20:00'));
 assert.ok(auction.includes('target="_blank" rel="noopener noreferrer"'));
 assert.ok(auction.includes('@media(max-width:560px)'));
 assert.ok(auction.includes(':focus-visible'));
 assert.ok(auction.includes('min-height:52px'));
 assert.ok(auction.includes('href="tel:18114294"'));
});
test('Old evidence remains and inbound scrapyard route supports original business users without doorway URLs',()=>{
 for(const id of ['auction-step-by-step-20261117','auction-original-blog-guide',
 'auction-b2b-operating-guide-20261103','auction-practical-questions','auction-to-exporter-b2b-20261123'])
  assert.ok(auction.includes('id="'+id+'"'),'existing source-backed guide lost '+id);
 for(const blog of ['224421653506','224398306763','224362694070'])
  assert.ok(auction.includes('https://blog.naver.com/wjdtnr4757/'+blog),'original public post '+blog);
 assert.ok(scrapyard.includes('id="scrapyard-auction-inbound-20261124"'));
 assert.ok(scrapyard.includes('href="/business/auction/">폐차장 낙찰차량 경매장탁송 출고 절차'));
 assert.ok(scrapyard.includes('href="/business/#b2b-inquiry"'));
 assert.ok(scrapyard.includes('말소·무번호판·주행 불가 차량은 적법한 별도 운송'));
 assert.ok(read('business/used-car/index.html').includes('href="/business/auction/"'));
 assert.ok(read('business/export-port/index.html').includes('href="/business/auction/"'));
 assert.equal((read('robots.txt').match(/^Sitemap:/gm)||[]).length,8);
 assert.ok(read('package.json').includes('tests/auction-buyer-specialist-seo-20261124.test.cjs'));
});

test('Auction first-view booking shortcuts preserve original section and fare destinations',()=>{
 const nav=auction.match(/<nav id="auction-booking-jumps-20261125"[\s\S]*?<\/nav>/)?.[0]||'';
 for(const id of ['auction-three-business-customers-20261124','auction-step-by-step-20261117','auction-to-exporter-b2b-20261123']){
  assert.ok(nav.includes('href="#'+id+'"'));assert.equal(auction.split('id="'+id+'"').length,2);
 }
 assert.ok(nav.includes('href="/fare/?service=taksong"'));
});
