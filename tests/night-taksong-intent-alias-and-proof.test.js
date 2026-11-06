'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const keyword=require('../lib/keyword-card-expansion');
const night=read('special/24-hour-service/index.html');
const home=read('index.html');
const seo=JSON.parse(read('data/seo-pages.json'));
for(const term of ['24시탁송','24시탁소','전국24시탁소','24시간탁소','전국24시탁송','24탁송']){
 const hit=keyword.resolve(term);
 assert(hit&&hit.url==='/special/24-hour-service/','24-hour typo/keyword must reach relevant transport page: '+term);
}
assert(night.includes('24시탁송·전국24시탁송'),'Night page has specific search title and copy');
assert(night.includes('id="night-taksong-review-discovery-20261106"'),'Visible evidence-first night transport section missing');
assert(night.includes('href="/reviews/history/?kind=taksong"'),'Night page needs real completed-transport evidence link');
assert(night.includes('href="/fare/?service=taksong"'),'Night page needs matching estimated fare');
assert(night.includes('24시·야간 운행을 완료했다는 증거가 아니며'),'Do not imply every historical taksong case was completed at night');
assert(night.includes('<link rel="canonical" href="https://jeongukdaeri.kr/special/24-hour-service/"'),'Original canonical must remain');
assert(home.includes('href="/special/24-hour-service/"'),'Home needs navigable 24-hour link');
assert(seo.pages.find(x=>x.path==='/daeri/').title.includes('실제 운행후기'),'National driver page remains review-first');
console.log('PASS: nationwide 24-hour taksong, typo alias, evidence-first route and canonical');
