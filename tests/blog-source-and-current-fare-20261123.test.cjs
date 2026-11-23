'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../lib/naver-blog-feed.js'),'utf8');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const topicModule=require('../lib/blog-search-topics');
const mockRequire=id=>{
  if(id==='node:https') return {get(){return {on(){return this;}};}};
  if(id==='./blog-search-topics') return topicModule;
  if(id==='../blog/posts.json') return [
    {title:'설악산 차량탁송 원문',url:'https://blog.naver.com/wjdtnr4757/224453077696',date:'2026-10-12'},
    {title:'잘못된 출처',url:'https://unsafe.example/post',date:'2026-10-12'}
  ];
  throw Error('Unknown dependency: '+id);
};
const mock={exports:{}};
new Function('module','exports','require',script)(mock,mock.exports,mockRequire);
const render=mock.exports({
  esc,
  layout:(title,description,body,canonical)=>({title,description,body,canonical}),
  phone:'1811-4294',host:'jeongukdaeri.kr',
  rideHighlights:[
    {id:'1001',date:'2026-11-17',departure:'강원 원주시',destination:'강원 횡성군',fare:'35,000원',service:'taksong'},
    {id:'1002',date:'2026-11-17',departure:'서울 강남구',destination:'서울 송파구',fare:'30,000원',service:'daeri'}
  ],
  dynamicSections:[]
});
test('blog entry clearly distinguishes source, historical prices, live quotes and original posts',async()=>{
  const page=await render();
  assert.equal(page.canonical,'https://jeongukdaeri.kr/blog/');
  assert.match(page.title,/전국대리운전/);
  assert.match(page.description,/당시 요금/);
  assert.match(page.body,/전국대리운전이 운영합니다/);
  assert.match(page.body,/id="automated-real-ride-blog-reviews"/);
  assert.match(page.body,/id="naver-original-posts"/);
  assert.match(page.body,/번개탁송대리운전 네이버 블로그 원문/);
  assert.match(page.body,/https:\/\/blog\.naver\.com\/wjdtnr4757\/224453077696/);
  assert(!page.body.includes('unsafe.example'),'unexpected external domains must not be rendered');
  assert(page.body.includes('href="/reviews/history/1001/"'));
  assert(page.body.includes('href="/reviews/history/1002/"'));
  assert(page.body.includes('운행일 2026-11-17 · 당시 요금'));
  assert(page.body.includes('자동차탁송 완료 기록'));
  assert(page.body.includes('대리운전 완료 기록'));
  assert(page.body.includes('href="/fare/?service=taksong"'));
  assert(page.body.includes('href="/fare/?service=daeri"'));
  assert(page.body.includes('href="tel:18114294"'));
  assert(page.body.includes('확정 견적은 아닙니다'));
  assert(page.body.includes('오늘 예약을 원하시나요?'));
  assert(!page.body.includes('오늘 발행된 전라도탁송'),'do not claim unverified publication dates');
  assert(!page.body.includes('실제 네이버 검색 유입어로'),'do not claim unverified traffic evidence');
  assert(!page.body.includes('스마트24 예약'),'keep the official brand consistent');
  assert(!page.body.includes('스마트24 1811-4294'),'no outdated booking brand');
});
