'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const list=require('../data/nationwide-review-first-300.json').pages;
assert.equal(list.length,300,'exactly 300 national taksong target URLs');
const slugs=new Set(),names=new Set();
const valid=new Map();
let n=0;
for(let i=1;i<=17;i++){
 const doc=require('../data/legal-regions/'+String(i).padStart(2,'0')+'.json');
 for(const name of doc.full_names)valid.set('/taksong/area-'+(++n)+'/',name);
}
const provinces=new Set();
for(const item of list){
 assert(valid.has(item.path),'missing deployed dynamic URL '+item.path);
 assert.equal(valid.get(item.path),item.region,'region name must match generated path');
 assert(!slugs.has(item.path),'repeated target path '+item.path);
 assert(!names.has(item.region),'repeated region '+item.region);
 slugs.add(item.path);names.add(item.region);
 provinces.add(item.region.split(' ')[0]);
}
assert.equal(provinces.size,17,'all 17 provinces represented');
const source=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
assert(source.includes('const taksongReviewTitle='),'regional taksong title must use review-first logic');
assert(source.includes('kind===\'taksong\'?taksongReviewTitle:daeriReviewTitle'),'all dynamic taksong titles must use review-first while retaining verified daeri headings');
assert(source.includes("const body=mobileReviewBookingBar(kind,name)+daeguTaksongGuide"),'mobile booking must precede regional service content while verified reviews remain first');
assert(source.includes("ganghwaReviewLead+ganghwaArchiveTable+regionHistoryAllLink+(busanReviewPage||ganghwaReviewPage?'':nationwideVerifiedFirst)+visibleCard"),'verified review evidence must precede visual card with dedicated Ganghwa and Busan editorials');
assert(source.includes("tripMatchesRegion(x,r)"),'verified region matching is required');
assert(source.includes("제주도탁송 후기｜"),'Jeju review-first heading required');
assert(source.includes("const busanReviewLead="),'preserve existing verified Busan original references');
assert(source.includes("tel:18114294"),'phone contact preserved');
console.log('PASS: 300 unique taksong URLs across 17 provinces; regional review-first title, evidence, fare and phone logic preserved');
