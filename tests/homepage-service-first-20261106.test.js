'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const home=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
const fixed=home.indexOf('id="homepage-primary-services-20261106"');
const start=home.indexOf('id="smart24-service-first-20261106"');
const fare=home.indexOf('id="homepage-fare-top"');
const regional=home.indexOf('id="dynamic-service-card-search-20261103"');
assert(fixed>0&&start>fixed&&fare>start&&regional>fare,'Fixed menu, customer actions, fare search and regional search must appear in order');
assert(home.includes('#homepage-primary-services-20261106{position:sticky!important;top:0!important;z-index:1100!important'),'Service menu must remain pinned at the top');
assert(home.includes('grid-template-columns:repeat(4,minmax(0,1fr))!important'),'Four fixed services must fit desktop');
assert(home.includes('grid-template-columns:repeat(2,minmax(0,1fr))'),'Mobile fixed menu must remain two columns');
const hero=home.slice(start, fare);
for(const href of ['/daeri/','/taksong/','/service/corporate/','/service/golf/','tel:18114294','#homepage-fare-top','/reviews/history/']){
 assert(hero.includes('href="'+href+'"'),'Missing first-screen customer route: '+href);
}
assert(hero.includes('최종 요금과 배차 가능 여부는 상담 후 안내합니다'),'No guarantees of price or dispatch');
assert(!hero.includes('<h1>'),'Keep a single main document heading rather than duplicate service H1');
assert.equal((home.match(/<form action="\/fare\/" method="get"/g)||[]).length,1,'One fare calculator, no duplicate forms');
assert(server.includes("headers['cache-control']='no-store, max-age=0, must-revalidate'"),'Homepage must bypass stale caches');
assert(server.includes('cachedHomepageSignature!==signature'),'Server should reload updated homepage assets');
console.log('PASS: pinned four-service nav, first-screen contact and fare actions, single quote form, no false promises');
