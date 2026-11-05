'use strict';
// Guard the customer-facing conversion path and mountain fare information.
// Runs against committed files; uses only Node built-ins.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const home=read('index.html');
const server=read('server.js');
assert(!home.includes('출발지의 탁 표시')&&!home.includes('도착지의 톨포'),'Corrupted ride history guidance must not appear on homepage');
assert(!home.includes('시·도·시·군·구')&&!server.includes('시·도·시·군·구'),'Duplicated administrative-region wording must not reappear');
const intro=home.indexOf('<div class="hero hero-with-photo">');
const firstFares=home.indexOf('id="mountain-cycling-fare-first-20261103"');
const search=home.indexOf('id="dynamic-service-card-search-20261103"');
assert(intro>0&&intro<firstFares&&firstFares<search,'Home should show booking hero, protected fares, then dynamic card search');
const quickFare=home.indexOf('id="homepage-fare-top"');
const specialistNav=home.indexOf('id="four-driver-intents-20261103"');
assert(intro<quickFare&&quickFare<firstFares&&firstFares<specialistNav&&specialistNav<search,
 'One-step departure/destination fare inputs must precede specialist mountain/cycling fare visuals');
assert.equal((home.match(/<form action="\/fare\/" method="get"/g)||[]).length,1,
 'Do not render two identical fare calculators on mobile');
assert(home.includes('<link rel="preload" as="image" href="/assets/vehicles/santafe-1811.webp" fetchpriority="high">'),
 'Preload the above-fold vehicle LCP image');
assert(home.includes('id="homepage-mobile-render-perf-20261104"')&&
 home.includes('content-visibility:auto;contain-intrinsic-size:auto 480px;'),
 'Large offscreen editorial sections should not delay mobile rendering');
assert((home.match(/id="general-taksong-service-focus-20261102"/g)||[]).length===1,
 'One concise regional and B2B resource navigation must remain');
assert(home.includes('id="top-fare-calculator"')&&home.includes('class="quick-booking"'),
 'Keep legacy fare anchors while removing the duplicate middle calculator');
const oldRepeat=home.slice(home.indexOf('id="long-distance-intercity-five-two"'),home.indexOf('id="field-notes"'));
assert(oldRepeat.length<2200,'Repeated long-distance keyword guide must remain consolidated');

const proofChoice=home.indexOf('id="service-choice-advantages-20261105"');
assert(proofChoice>firstFares&&proofChoice<specialistNav,
 'Actual fares must appear before comparison evidence, while specialist routes follow');
for(const link of ['/reviews/history/?kind=taksong','/reviews/history/?kind=daeri','/reviews/ride-record-stories/','/special/cycling-trail-transport/']){
 assert(home.includes('href="'+link+'"'),'Customer must find verified cases or specialist route: '+link);
}
assert(home.includes('실제 기록부터 비교하세요')&&home.includes('전화상담 1811-4294'),
 'First-screen customer choice must retain visible call and verifiable ride evidence');
assert(!home.includes('업계 1위')&&!home.includes('고수대리운전보다'),
 'Do not invent comparative market rank or unsupported competitor superiority');
assert(home.includes('/service/corporate/#corporate-postpaid-guide-20261105'),'Homepage must link conditional corporate postpaid guidance');
const corp=read('service/corporate/index.html');
assert(corp.includes('id="corporate-postpaid-guide-20261105"'),'Corporate page must show postpaid guidance first');
assert(corp.indexOf('id="corporate-postpaid-guide-20261105"')<corp.indexOf('id="corporate-image-and-consult-1811"'),'Postpaid process must appear before general corporate guide');
assert(corp.includes('후불 정산은 자동 승인되는 상품이 아닙니다'),'Never guarantee corporate credit or postpaid billing');
assert(corp.includes('id="corporate-inquiry-shortcuts-20261105"'),'Corporate page needs intent-first inquiry');
for(const t of ['/reviews/history/?kind=taksong','/reviews/history/?kind=daeri','/fare/?service=taksong','/service/daily-driver/']){
 assert(corp.includes(t),'Corporate customers need evidence, fare and service links: '+t);
}
assert(home.includes('/service/corporate/#corporate-inquiry-shortcuts-20261105'),'Homepage must offer direct corporate inquiry shortcut');

for(const t of ['후불 정산 전화문의 1811-4294','/fare/?service=daeri','/reviews/history/?kind=daeri'])assert(corp.includes(t),'Corporate decision path missing '+t);
for(const t of ['id="ride-review-direct-booking-20261105"','id="verified-ride-booking-shortcuts-20261105"','법인 후불 정산 조건 확인','전화 예약상담 1811-4294']){
 assert(server.includes(t),'Review-to-booking path missing '+t);
}
assert.equal(home.split('<h1').length-1,1,'Home should have a single primary heading');
assert(home.includes('href="tel:18114294"'),'Homepage must link to phone consultation');
assert(home.includes('class="mobile-consult-actions"'),'Mobile call/fare actions missing');
assert(home.includes('<a href="#homepage-fare-top">출발·도착지 요금입력</a>'),'One-tap mobile fare form anchor missing');
assert(home.includes('<a class="btn" href="#homepage-fare-top">출발·도착 예상요금</a>'),'Hero quote CTA must open same-page form');
assert(home.includes('id="mobile-conversion-first-100-20261104"'),'Compact mobile conversion layout must be present');
assert(home.includes('data-card-preview-form'),'Dynamic keyword card search missing');
assert(home.includes('/assets/vehicles/santafe-1811.webp'),'Homepage hero visual missing');
const heroImage=home.slice(home.indexOf('src="/assets/vehicles/santafe-1811.webp"'),home.indexOf('>',home.indexOf('src="/assets/vehicles/santafe-1811.webp"'))+1);
assert(heroImage.includes('loading="eager"')&&heroImage.includes('fetchpriority="high"'),'Hero visual must be requested promptly on mobile');
assert(!home.includes('id="homepage-mountain-fare-shortcuts-202611"'),'Repeated mountain shortcut section returned');
assert(!home.includes('id="regional-taksong-search-guide"'),'Repeated regional route block returned');
assert(home.includes('id="home-business-service-links-20261104"'),'Consolidated B2B service navigation missing');
for(const oldId of ['service-center-home-priority-20261102','fleet-export-dealer-home-20261102','rental-capital-special-home-20261102']){
 assert(!home.includes('id="'+oldId+'"'),'Repeated B2B block returned: '+oldId);
}
for(const img of ['/assets/seoraksan-taksong-fares.svg','/assets/jirisan-taksong-fares.svg','/assets/cycling-routes/nationwide-taksong.svg']){
 assert(home.includes(img),'Homepage original fare visual missing: '+img);
}
const farePages=[
 ['설악산탁송/index.html','mountain-route-fare-table-202611','seoraksan-taksong-fares.svg'],
 ['지리산탁송/index.html','mountain-route-fare-table-202611','jirisan-taksong-fares.svg'],
 ['special/cycling-trail-transport/index.html','cycling-route-fare-table-202611',null]
];
for(const [file,anchor,image] of farePages){
 const html=read(file);
 assert(html.includes('id="'+anchor+'"'),file+' fare anchor missing');
 if(image)assert(html.includes(image),file+' fare poster missing');
 assert(html.includes('1811-4294'),file+' consultation phone missing');
}
for(const file of ['service/golf/index.html','service/corporate/index.html','service/daily-driver/index.html']){
 assert(read(file).includes('1811-4294'),file+' phone missing');
}
const busanEditorial=read('region/busan-daeri-taksong/index.html');
const busanTitle='부산탁송 후기';
assert(busanEditorial.includes('<title>'+busanTitle),'Busan regional title should lead with a true review topic');
const busanFirstReview=busanEditorial.indexOf('id="busan-taksong-real-review-first-20261104"');
assert(busanEditorial.indexOf('<h1>')<busanFirstReview&&
 busanFirstReview<busanEditorial.indexOf('id="keyword-image-first-202611"')&&
 busanFirstReview<busanEditorial.indexOf('id="busan-intent-reviews-partners-20261102"'),
 'Busan original reviews must precede generic service copy and promotional image');
const busanHash=busanEditorial.match(/<p class="busan-local-taksong-tags">([^<]+)<\/p>/);
assert(busanHash,'Busan region-local hash tags absent');
assert.equal(busanHash[1].trim().split(/\s+/).length,30,'Exactly 30 Busan taksong hashtags');
assert(new Set(busanHash[1].trim().split(/\s+/)).size===30,'Duplicate Busan hashtags');
for(const tag of ['#부산탁송','#부산시탁송','#부산기장군탁송','#부산강서구탁송','#부산연산동탁송'])
 assert(busanHash[1].includes(tag),'Essential Busan keyword tag missing '+tag);
for(const id of ['224445300887','224433939509','224452085535']){
 assert(busanEditorial.includes('https://blog.naver.com/wjdtnr4757/'+id),'Published Busan review missing '+id);
}
const serverBusan=read('server.js');
assert(serverBusan.includes('busanReviewPage?busanReviewTitle:kind===\'taksong\'?taksongReviewTitle:daeriReviewTitle'),
 'Dynamic canonical Busan page must display a genuine review topic in title and H1');
assert(serverBusan.includes("busanReviewLead+companySection"),
 'Canonical Busan actual reviews must appear above generic company keyword sections');
assert(serverBusan.includes('busan-local-taksong-tags'),'Canonical Busan hashtags missing');
const rides=JSON.parse(read('data/ride-history.json'));
assert(Array.isArray(rides)&&rides.length===2591,'The 2,591 original ride records must be preserved');
const rideStart=home.indexOf('<section id="ride-history"');
const rideScriptStart=home.indexOf('<script>',rideStart);
const rideScriptEnd=home.indexOf('</script>',rideScriptStart);
assert(rideStart>=0&&rideScriptStart>rideStart&&rideScriptEnd>rideScriptStart,
 'Home ride history script must be present after preserved records section');
const rideScript=home.slice(rideScriptStart+'<script>'.length,rideScriptEnd);
new (require('node:vm').Script)(rideScript,{filename:'homepage-inline-ride-history.js'});
assert(rideScript.includes("const observer=new IntersectionObserver")&&
 rideScript.includes("void loadHistory()")&&rideScript.includes("rootMargin:'500px 0px'"),
 'Expensive public records should be loaded only near the history section or on search');
assert(rideScript.includes('visible=filtered.slice(0,80)')&&
 rideScript.includes('body.replaceChildren(fragment)'),
 'Homepage must cap the rendered rows and use one fragment while retaining all searchable records');
assert(home.includes('/reviews/history/">전체 2,591건 운행기록 검색하기'),
 'Full completed-trip search must remain accessible even when homepage table is limited');
const tickerStart=home.lastIndexOf('<script>',home.indexOf('async function loadTripTicker()'));
const tickerEnd=home.indexOf('</script>',tickerStart);
assert(tickerStart>0&&tickerEnd>tickerStart,'Deferred completed-ride ticker script must exist');
const tickerScript=home.slice(tickerStart+'<script>'.length,tickerEnd);
new (require('node:vm').Script)(tickerScript,{filename:'homepage-lazy-trip-ticker.js'});
assert(tickerScript.includes("observer.observe(ticker)")&&
 tickerScript.includes("rootMargin:'450px 0px'"),'Below-fold trip ticker must not fetch before scrolling');


const exact=require(path.join(root,'lib/exact-keyword-card.js'));
for(const [keyword,region,kind] of [
 ['부산렌트카탁송','부산광역시','taksong'],
 ['서울강남골프장대리운전','서울특별시 강남구','daeri']
]){
 const svg=exact.render({keyword,region,kind,phone:'1811-4294'});
 assert(svg.includes(keyword)&&svg.includes(region)&&svg.includes('1811-4294'),keyword+' exact card incorrect');
 assert(!svg.includes('강릉스마트대리운전'),keyword+' wrong legacy brand in image');
}
assert(server.includes('naverFocus2900.length!==2900'),'Curated keyword count guard missing');
assert(server.includes("if(sameOne(phrase))return make("),'Exact locality card coverage missing');
assert(read('assets/region-card-preview.js').includes('if(!exact&&!pngFallback'),'Never use a wrong fallback image for an exact search');
const dynamic=require(path.join(root,'lib/keyword-card-expansion.js'));
const testHtml='<html><body><h1>서비스 요금표</h1><p>원본 요금</p></body></html>';
for(const name of ['/설악산탁송/','/지리산탁송/','/special/cycling-trail-transport/','/service/golf/','/service/corporate/','/service/daily-driver/']){
 assert.equal(dynamic.enhance(testHtml,name),testHtml,'Unwanted image inserted before original fare/service visual: '+name);
}
console.log('PASS: homepage conversion, 3 fare pages, business card accuracy, 2,591 original rides');
