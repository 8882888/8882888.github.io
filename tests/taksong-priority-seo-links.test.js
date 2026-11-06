'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const server = fs.readFileSync(path.join(root,'server.js'),'utf8');
const home = fs.readFileSync(path.join(root,'index.html'),'utf8');
const rules = JSON.parse(fs.readFileSync(path.join(root,'data/seo-pages.json'),'utf8'));
const sitemap = fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
const priority = [
  ['/taksong/busan/','부산탁송'],
  ['/taksong/daegu/','대구탁송'],
  ['/taksong/ulsan/','울산탁송'],
  ['/taksong/gyeongnam/changwon-si/','창원탁송'],
  ['/taksong/sejong/','세종탁송'],
  ['/taksong/gangwon/sokcho-si/','속초탁송'],
  ['/taksong/gangwon/gangneung-si/','강릉탁송'],
  ['/설악산탁송/','설악산종주 차량탁송']
];
const panel=server.slice(server.indexOf('const taksongTrustFirst='),server.indexOf('const body=taksongTrustFirst+'));
assert(panel.length>1000,'Taksong trust panel missing');
for(const [url,label] of priority){
 assert(panel.includes('href="'+url+'">'+label+'</a>'),'Missing intended transport link '+label);
}
assert(server.includes("const body=taksongTrustFirst+operationalNotice"),'Transport trust content must be first');
assert(home.includes('id="taksong-first-trust-home-20261106"'),'Home transport navigation missing');
assert(home.includes('href="/taksong/"'),'Transport hub link missing');
assert(sitemap.includes('https://jeongukdaeri.kr/taksong/'),'Transport hub not indexed in sitemap source');
const rule=rules.pages.find(x=>x.path==='/taksong/');
assert(rule && rule.title.includes('탁송') && rule.description.includes('운행기록'),'Transport title and description missing');
assert(!panel.includes('100% 최상위') && !panel.includes('확정 배차'),'No unsupported guarantees');
console.log('PASS: eight transport priority links, canonical hub discovery and evidence-first messaging');
