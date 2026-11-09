'use strict';
// Guard the exact regression that placed the fifth service OUTSIDE the grid.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const home=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
const start=home.indexOf('<nav id="homepage-primary-services-20261106"');
const end=home.indexOf('</nav>',start);
const nav=home.slice(start,end);
const gridStart=nav.indexOf('<div ',nav.indexOf('<nav'));
const gridEnd=nav.indexOf('</div>',gridStart);
const grid=nav.slice(gridStart,gridEnd);
const items=[['대리운전','/daeri/'],['자동차탁송','/taksong/'],['법인대리운전','/service/corporate/'],['골프대리운전','/service/golf/'],['장거리대리운전','/service/long-distance-daeri/']];
assert(start>0&&end>start&&gridStart>=0&&gridEnd>gridStart,'Five-item navigation/grid must exist');
for(const [label,url] of items){assert(grid.includes('href="'+url+'"')&&grid.includes('>'+label+'</a>'),'Link must be INSIDE fixed grid: '+label)}
assert.equal((grid.match(/<a href="/g)||[]).length,5,'Exactly five fixed grid items');
assert(!nav.slice(gridEnd).includes('<a href='),'No stray link outside the five-item grid');
assert(home.includes('#homepage-primary-services-20261106 .homepage-primary-service-grid{grid-template-columns:repeat(5,minmax(0,1fr))!important}'),'Desktop five columns');
assert(home.includes('@media(max-width:739px){#homepage-primary-services-20261106 .homepage-primary-service-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}'),'Mobile five items in compact rows');
assert(home.includes('position:sticky!important;top:0!important'),'Top-level navigation stays sticky');
assert(home.includes('id="nationwide-live-locality-form-20261107"'),'Current nationwide locality discovery search must exist');
for(const url of ['/taksong/busan/','/taksong/daegu/','/taksong/ulsan/','/taksong/gangwon/sokcho-si/','/taksong/jeju/','/taksong/sejong/']){
 assert(home.includes(url),'Regional discovery link missing: '+url);
}
assert(server.includes("'/service/long-distance-daeri/'"),'Server fallback must check the fifth service too');
assert(home.includes('href="tel:18114294"'),'Real customer telephone CTA required');
console.log('PASS: exact five in-grid buttons + sticky desktop/mobile + regional access + contact');
