'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../lib/naver-blog-feed.js'),'utf8');
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const realTopicModule=require('../lib/blog-search-topics');
const mockRequire=id=>{
 if(id==='node:https') return {get(){return {on(){return this;}};}};
 if(id==='./blog-search-topics') return realTopicModule;
 if(id==='../blog/posts.json') return [
   {title:'설악산탁송 요금 안내',url:'https://blog.naver.com/wjdtnr4757/224453077696',date:'23시간 전'},
   {title:'외부 문서',url:'https://evil.example/123',date:'어제'}
 ];
 throw Error('Unexpected import: '+id);
};
const moduleMock={exports:{}};
new Function('module','exports','require',script)(moduleMock,moduleMock.exports,mockRequire);
const layout=(title,description,body,canonical)=>({title,description,body,canonical});
moduleMock.exports({esc,layout,phone:'1811-4294',host:'jeongukdaeri.kr',rideHighlights:[],dynamicSections:[]})().then(page=>{
 assert.equal(page.canonical,'https://jeongukdaeri.kr/blog/');
 assert.match(page.title,/공개 원문/);
 assert(page.body.includes('href="tel:18114294"'));
 assert(!page.body.includes('23시간 전'),'old relative dates must not be treated as current');
 assert(!page.body.includes('evil.example'),'untrusted blog origin is filtered');
 assert(page.body.includes('네이버 RSS를 확인할 수 없어'),'RSS status must be honest');
 assert(page.body.includes('설악산탁송 요금 안내'),'saved original should remain visible');
 console.log('PASS RSS fallback, no false freshness, original source preservation and phone link');
}).catch(e=>{console.error(e);process.exitCode=1;});
