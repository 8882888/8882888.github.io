'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
const rides=JSON.parse(fs.readFileSync(path.join(root,'data/ride-history.json'),'utf8'));
assert.equal(rides.length,2591,'Do not inflate actual completed ride counts');
assert.match(home,/<title>전국대리운전 실제 운행후기·24시탁송 \| 전국탁송 스마트24<\/title>/,'Home title must preserve agreed review-first search headline');
assert(home.includes('2,591건 실제 운행후기')&&home.includes('href="/reviews/history/"'),
 'First screen must link the verified 2,591-ride archive without requiring a duplicate claim');
assert(home.includes('2,591건 실제 운행후기'),'First screen CTA should link actual archive');
assert(home.includes('href="/reviews/history/"'),'Actual ride CTA remains directly clickable');
assert(home.includes('href="#homepage-fare-top"'),'Fare calculator remains one click away');
assert(home.includes('href="tel:18114294"'),'Actual booking phone remains directly clickable');
assert(home.includes('최종 요금은 별도 확정합니다'),'Honest current pricing notice remains visible');
assert(!home.includes('업계 1위')&&!home.includes('대리고보다'),'No unsupported ranking or superiority claims');
assert(home.includes('<link rel="canonical" href="https://jeongukdaeri.kr/">'),'Original canonical domain is preserved');
console.log('PASS: source-backed 2,591 ride proof, concise national service title and one-tap quote/phone');
