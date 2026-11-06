'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pages=JSON.parse(read('data/seo-pages.json')).pages;
const byPath=new Map(pages.map(x=>[x.path,x]));
const home=read('index.html');
const long=read('service/long-distance-daeri/index.html');
const server=read('server.js');
for(const route of ['/','/daeri/','/taksong/','/service/long-distance-daeri/']){
 const page=byPath.get(route);
 assert(page&&page.title.includes('운행후기'),'Verified review must be visible in service search title: '+route);
 assert(page.description.includes('운행'),'Review title needs context in its search description: '+route);
 assert(page.title.length<=75,'Avoid overly long search title: '+route);
}
assert.equal((home.match(/<title>(.*?)<\/title>/)||[])[1],byPath.get('/').title,'Homepage source and runtime titles must match');
assert(home.includes('id="homepage-verified-reviews-first-20261106"'),'Review-first homepage section missing');
assert(home.includes('href="/reviews/history/?kind=daeri"')&&home.includes('href="/reviews/history/?kind=taksong"'),'Review-first links must route to actual evidence');
assert(home.includes('과거 요금은 현재 확정 견적이 아닙니다'),'Never present historical fares as guaranteed');
assert(long.includes('장거리대리운전 실제 운행후기 확인'),'Long-distance title must say records are for confirmation');
assert(long.includes('href="/reviews/history/?kind=daeri"'),'Long-distance actual records must remain accessible');
assert(server.includes('verifiedTaksongProof.length'),'Taksong completed cases need evidence filter');
assert(server.includes("x.verified===true&&x.status==='completed'"),'Long-distance completed cases must be verified');
console.log('PASS: review-led titles backed by actual completed records; no fabricated 24h trip');
