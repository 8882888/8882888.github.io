'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const server = fs.readFileSync(path.join(root,'server.js'),'utf8');
const home = fs.readFileSync(path.join(root,'index.html'),'utf8');
const rules = JSON.parse(fs.readFileSync(path.join(root,'data/seo-pages.json'),'utf8'));
const sitemap = fs.readFileSync(path.join(root,'sitemap-priority.xml'),'utf8');
const priority = [
  ['/taksong/busan/','부산탁송'],
  ['/taksong/daegu/','대구탁송'],
  ['/taksong/ulsan/','울산탁송'],
  ['/taksong/gyeongnam/changwon-si/','창원탁송'],
  ['/taksong/sejong/','세종탁송'],
  ['/taksong/gangwon/sokcho-si/','속초탁송'],
  ['/taksong/gangwon/gangreung-si/','강릉탁송'],
  ['/설악산탁송/','설악산종주 차량탁송']
];
const panel=server.slice(server.indexOf('const taksongTrustFirst='),server.indexOf('const body=answerFirst+'));
assert(panel.length>1000,'Taksong trust panel missing');
for(const [url,label] of priority){
 assert(panel.includes('href="'+url+'">'+label+'</a>'),'Missing intended transport link '+label);
}
assert(server.includes("taksongTrustFirst+nationwideServiceIntentHub(kind)+operationalNotice"),'Transport trust proof must precede nationwide keyword and operational notice panels');
assert(home.includes('id="taksong-first-trust-home-20261106"'),'Home transport navigation missing');
assert(home.includes('href="/taksong/"'),'Transport hub link missing');
assert(sitemap.includes('<loc>https://jeongukdaeri.kr/taksong/</loc>'),'Taksong canonical hub must remain in the priority inventory even when the Pages build rewrites sitemap.xml');
assert(sitemap.includes('<loc>https://jeongukdaeri.kr/taksong/busan/gijang-gun/</loc>'),'Exact Gijang county guide must remain in priority discovery inventory');
assert(server.includes("const gijangTaksongPage=kind==='taksong'&&r.full_name==='부산광역시 기장군'"),'Gijang county must have its own unambiguous SEO target');
assert(server.includes("gijangTaksongPage?'기장군탁송 | 부산 기장읍·정관읍·일광읍 차량 인수·요금 안내'"),'Gijang title must preserve the exact county keyword');
const rule=rules.pages.find(x=>x.path==='/taksong/');
assert(rule && rule.title.includes('탁송') && /운행(?:기록|후기)/.test(rule.description),'Transport title and description missing');
assert(!panel.includes('100% 최상위') && !panel.includes('확정 배차'),'No unsupported guarantees');
console.log('PASS: eight transport priority links, canonical hub discovery and evidence-first messaging');
