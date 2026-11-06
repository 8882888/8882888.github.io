'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const home=read('index.html');
const seo=JSON.parse(read('data/seo-pages.json'));
const catalog=JSON.parse(read('data/seo-keywords.json'));
const expansion=require('../lib/keyword-card-expansion');
const pages=new Map(seo.pages.map(p=>[p.path,p]));
for(const slug of ['/','/daeri/','/taksong/']){
 const item=pages.get(slug);
 assert(item && item.title && item.description,'Missing primary search metadata: '+slug);
 assert(item.title.length<85,'Search title must remain concise: '+slug);
}
assert(pages.get('/').title.startsWith('전국대리운전 실제 운행후기·24시탁송'),'National homepage target missing');
assert(pages.get('/daeri/').title.startsWith('전국대리운전 실제 운행후기'),'Designated-driver page target missing');
assert(pages.get('/taksong/').title.startsWith('전국자동차탁송 실제 운행후기'),'Vehicle transport page target missing');
assert(home.includes('<title>'+pages.get('/').title+'</title>'),'Homepage source and runtime metadata differ');
assert(home.includes('id="nationwide-24h-keyword-guide-20261106"'),'Visible primary search guide missing');
assert(home.includes('실제 배차 여부와 시간은 출발 지역 및 기사 수급에 따라 달라집니다.'),'Never promise guaranteed 24-hour dispatch');
assert(home.includes('href="/special/24-hour-service/"'),'24-hour query must link to relevant service guide');
assert(home.includes('href="/daeri/"')&&home.includes('href="/taksong/"'),'Keep primary service routes');
const test=[
 ['전국대리운전','/daeri/'],['전국대리','/daeri/'],['전국24시대리운전','/daeri/'],
 ['24시탁송','/special/24-hour-service/'],['24탁송','/special/24-hour-service/'],
 ['전국24시탁송','/special/24-hour-service/'],['24시간탁송','/special/24-hour-service/'],
 ['전국24시간탁송','/special/24-hour-service/'],['심야탁송','/special/24-hour-service/'],
 ['전국자동차탁송','/taksong/']
];
for(const [word,expected] of test){
 const match=expansion.resolve(word);
 assert(match&&match.url===expected,'Bad service intent for '+word);
 assert(catalog.keywords.some(k=>k.keyword===word),'Missing editorial keyword '+word);
}
assert.equal(catalog.total,catalog.keywords.length,'Keyword catalog count must equal entries');
console.log('PASS: nationwide driver and 24-hour taksong metadata, visible copy, keyword routes and no dispatch promises');
