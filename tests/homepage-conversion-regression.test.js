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
assert(intro>0&&intro<firstFares&&firstFares<search,'Home should show booking hero, fares, then dynamic card search');
const quickFare=home.indexOf('id="homepage-fare-top"');
const specialistNav=home.indexOf('id="four-driver-intents-20261103"');
assert(intro<firstFares&&firstFares<quickFare&&quickFare<specialistNav&&specialistNav<search,
 'Actual departure/destination fare inputs must appear immediately after protected mountain/cycling fare tables');
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

assert.equal(home.split('<h1').length-1,1,'Home should have a single primary heading');
assert(home.includes('href="tel:18114294"'),'Homepage must link to phone consultation');
assert(home.includes('class="mobile-consult-actions"'),'Mobile call/fare actions missing');
assert(home.includes('<a href="/fare/">예상요금 바로보기</a>'),'Mobile fare shortcut missing');
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
const rides=JSON.parse(read('data/ride-history.json'));
assert(Array.isArray(rides)&&rides.length===2591,'The 2,591 original ride records must be preserved');
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
