'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const home=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
const fare=home.indexOf('id="homepage-fare-top"');
const regionSearch=home.indexOf('id="nationwide-live-locality-form-20261107"');
const nav=home.indexOf('id="homepage-primary-services-20261106"');
const hero=home.indexOf('class="hero hero-with-photo"');
const reviews=home.indexOf('id="homepage-verified-reviews-first-20261106"');
const find=home.indexOf('id="keyword-service-navigation-20261106"');
assert(fare>0&&nav>fare&&regionSearch>nav&&hero>regionSearch&&reviews>hero&&find>reviews,
 'Keep homepage fare-first placement, current regional search, primary service navigation, verified reviews and keyword routing');
const primary=home.slice(home.indexOf('<nav id="homepage-primary-services-20261106"'),home.indexOf('</nav>',nav));
for(const href of ['/daeri/','/taksong/','/service/corporate/','/service/golf/','/service/long-distance-daeri/'])assert(primary.includes('href="'+href+'"'),'Missing customer service: '+href);
assert.equal((home.match(/<h1>/g)||[]).length,1,'One visible document H1 required');
assert(home.includes('data-card-preview-form')&&home.includes('data-card-preview-output'),
 'Keep working regional keyword search with exact text-only preview and explicit service selection');
assert(home.includes('action="/keyword-search/"'),'Keyword search must route to dedicated service pages');
assert(home.includes('id="mountain-cycling-fare-first-20261103"'),'Keep mountain and bicycle fare information');
assert(home.includes('tel:18114294')&&home.includes('/reviews/history/'),'Keep booking and verified rides');
assert(!home.includes('지역·코스·서비스 키워드별 동적 명함 자동보기'),'Retired headline must not reappear');
assert(!home.includes('지역별 명함 자동확장 보기'),'Retired auto-expand button caption must not reappear');
assert(server.includes('cachedHomepageSignature!==signature'),'Keep deployment homepage refresh mechanism');
assert(server.includes('removeRetiredHomepageCopy(html)'),'Keep live homepage wording cleanup if a legacy file is served');
console.log('PASS: fare-first homepage, primary service navigation, current keyword search and retired wording removed');
