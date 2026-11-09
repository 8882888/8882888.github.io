'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {stripPersonVehicleImages,isSafeVisual}=require('../lib/visual-policy');
const safePaths=[
 '/card/area-494-taksong-brand-v6.png',
 '/assets/smart24-daeri-brand.png',
 '/assets/smart24-taksong-brand.png',
 '/assets/service-taksong-visual.svg',
 '/assets/cycling-routes/eastcoast-taksong.svg',
 '/assets/seoraksan-taksong-fares.svg'
];
for(const p of safePaths)assert.equal(isSafeVisual(p),true,'verified text-only visual '+p);
for(const p of [
 '/assets/photos/busan-rainy-dongnae.avif',
 '/assets/seoraksan-taksong-original-fare.png',
 '/assets/jirisan-taksong-original-fare.png',
 '/assets/smart24-business-card-art.webp',
 'https://other.example/photos/people.jpg'
])assert.equal(isSafeVisual(p),false,'reject photos/posters '+p);
const original='<!doctype html><html><head><meta property="og:image" content="https://jeongukdaeri.kr/assets/smart24-business-card-art.webp">'+
 '<script type="application/ld+json">{"@type":"WebPage","name":"요금 안내","image":"https://jeongukdaeri.kr/assets/smart24-business-card-art.webp"}</script></head><body>'+
 '<picture><source srcset="/assets/photos/driver.avif"><img src="/assets/photos/driver.avif"></picture>'+
 '<figure><img src="/assets/seoraksan-taksong-original-fare.png"><figcaption>실제 요금은 별도 확인</figcaption></figure>'+
 '<img src="/assets/smart24-daeri-brand.png"><a href="/fare/">예상요금 조회</a>'+
 '<script>const template="<img src=\\"/assets/photos/dynamic.avif\\">";</script></body></html>';
const result=stripPersonVehicleImages(original);
assert.ok(!result.includes('<img src="/assets/photos/driver.avif">'));
assert.ok(!result.includes('<img src="/assets/seoraksan-taksong-original-fare.png">'));
assert.ok(!result.includes('<meta property="og:image"'));
assert.ok(!result.includes('"image":"https://jeongukdaeri.kr/assets/smart24-business-card-art.webp"'));
assert.ok(result.includes('<img src="/assets/smart24-daeri-brand.png">'));
assert.ok(result.includes('<figcaption>실제 요금은 별도 확인</figcaption>'));
assert.ok(result.includes('<a href="/fare/">예상요금 조회</a>'));
assert.ok(result.includes('const template='),'inline client JavaScript remains intact');
const mixed='<picture><source srcset="/assets/photos/unreviewed-van.webp"><source srcset="/card/area-494-taksong-brand-v6.webp"><img src="/card/area-494-taksong-brand-v6.png" srcset="/assets/photos/driver.avif 2x" alt="지역 상담"></picture>';
const mixedResult=stripPersonVehicleImages(mixed);
assert.ok(!mixedResult.includes('unreviewed-van.webp')&&!mixedResult.includes('driver.avif'),'unsafe source/srcset removed');
assert.ok(mixedResult.includes('/card/area-494-taksong-brand-v6.webp')&&mixedResult.includes('<img src="/card/area-494-taksong-brand-v6.png"'),'safe responsive picture retained');
const index=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert.equal((index.match(/<img[^>]+src="\/assets\/photos\//g)||[]).length,0,'homepage AI photos physically removed from HTML');
for(const p of ['service-taksong-visual.svg','service-daeri-visual.svg','service-golf-visual.svg']){
 const svg=fs.readFileSync(path.join(__dirname,'../assets',p),'utf8');
 assert.ok(svg.includes('<svg')&&!/<image\b|<circle\b|<ellipse\b/.test(svg),'text-only brand SVG '+p);
}
for(const p of ['nationwide','eastcoast','yeongsan','seomjin','geumgang','ocheon']){
 const svg=fs.readFileSync(path.join(__dirname,'../assets/cycling-routes',p+'-taksong.svg'),'utf8');
 assert.ok(svg.includes('<svg')&&!/<image\b|<circle\b|<ellipse\b/.test(svg),'vehicle-free cycling infographic '+p);
}
console.log('PASS sitewide vehicle/person picture filtering, preserved text cards and live SVG asset safety');
