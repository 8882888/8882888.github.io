'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,'homepage H1 should be unique');
const sections=['smart24-customer-journeys-20261106','smart24-customer-faq-20261106','provincial-food-districts-20261106','search-intent-discovery-20261106'];
for(const id of sections)assert(html.includes('id="'+id+'"'),'missing homepage customer-facing section: '+id);
assert(html.indexOf('smart24-customer-journeys-20261106')<html.indexOf('innovation-search-focus'),'customer navigation should appear before deep regional guides');
assert(html.indexOf('provincial-food-districts-20261106')<html.indexOf('<footer>'),'food links should appear in primary content, not after footer');
assert(html.indexOf('search-intent-discovery-20261106')<html.indexOf('<footer>'),'recruitment links should appear in primary content, not after footer');
for(const uri of ['/service/corporate/','/service/golf/','/service/daily-driver/','/recruit/daeri/','/recruit/taksong/','/reviews/history/','/fare/']){
 assert(html.includes('href="'+uri+'"'),'missing user-intent link: '+uri);
}
for(const slug of ['busan','daegu','ulsan','changwon','daejeon']){
 const uri='/daeri/food-district/'+slug+'/';
 assert(html.includes('href="'+uri+'"'),'missing city discovery path: '+uri);
 assert(!sitemap.includes('https://jeongukdaeri.kr'+uri),
  'Node-only food district pages must not be listed as missing static Pages URLs: '+uri);
}
assert(html.includes('실제 배차 시각')&&html.includes('현재 기사 수급'),'must disclose price and availability uncertainty');
assert(!html.includes('대리고와 제휴'),'competitor affiliation must not be suggested');
console.log('PASS: competitive benchmark navigation, FAQ, 5 city guides and conservative evidence disclosures');
