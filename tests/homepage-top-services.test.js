'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=source.indexOf('<nav id="homepage-primary-services-20261106"');
const end=source.indexOf('</nav>',start);
assert(start>=0&&end>start,'Top-level service navigation missing');
const nav=source.slice(start,end);
const expected=[
 ['/daeri/','대리운전'],
 ['/taksong/','자동차탁송'],
 ['/service/corporate/','법인대리운전'],
 ['/service/golf/','골프대리운전']
];
for(const [url,name] of expected)assert(nav.includes('href="'+url+'"')&&nav.includes('>'+name+'</a>'),'Missing service: '+name);
assert(source.indexOf('</header>')<start,'Navigation must be after site header');
assert(start<source.indexOf('id="homepage-fare-top"'),'Navigation must precede fare search');
assert(nav.includes('aria-label="주요 운전 서비스 바로가기"'),'Navigation accessible label missing');
assert(nav.includes('position:sticky;top:0;z-index:1100'),'Service buttons must remain visible while scrolling');
assert(source.includes('.section-jump{top:178px}')&&source.includes('.section-jump{top:96px}'),'Existing sticky in-page links must not be covered by primary service menu');
assert(source.includes('#homepage-primary-services-20261106 a:focus-visible'),'Keyboard focus must remain visible');

assert(source.includes('grid-template-columns:repeat(4,minmax(0,1fr))!important'),'Desktop four-column navigation missing');
assert(nav.includes('grid-template-columns:repeat(2,minmax(0,1fr))'),'Mobile two-column navigation missing');
assert.equal((source.match(/id="homepage-primary-services-20261106"/g)||[]).length,1,'Only one primary navigation allowed');
const server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
assert(server.includes("cachedHomepageSignature!==signature"),'Server must refresh cached homepage after file updates');
assert(server.includes("if(!html.includes(start))html=html.replace('</header>','</header>'+fixedNav)"),'Server must restore four links even if generated homepage omitted them');
assert(server.includes("headers['x-smart24-primary-nav']='four-services-sticky-20261106'"),'Homepage must expose diagnostic navigation version');
assert(server.includes("headers['cache-control']='no-store, max-age=0, must-revalidate'"),'Home menu must not be served from stale intermediate caches');
console.log('PASS: four primary services available above fare search on desktop and mobile');
