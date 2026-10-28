'use strict';
const assert = require('node:assert/strict');
const {inspect} = require('../scripts/naver-web-monitor');
const items = [{link:'https://example.com/',title:'other'},{link:'https://jeongukdaeri.kr/daeri/',title:'<b>전국</b> 대리운전'},{link:'https://jeongukdaeri.kr.evil.example/',title:'wrong'},{link:'bad url'},{link:'https://www.jeongukdaeri.kr/',title:'home'}];
assert.deepEqual(inspect(items).map(x => x.position), [2,5]);
assert.equal(inspect(items)[0].title, '전국 대리운전');
assert.deepEqual(inspect([]), []);
assert.deepEqual(inspect([{link:'https://gosudaeri.com/'},{link:'https://gosudaeri.com.evil.test/'}], 'gosudaeri.com').map(x=>x.position),[1]);
assert.equal(require('../scripts/naver-web-monitor').QUERIES.length,24);
const {pageEvidence} = require('../scripts/naver-web-monitor');
const evidence = pageEvidence([{query:'domain',matches:[{url:'https://jeongukdaeri.kr/daeri?ref=a',position:6,title:'old title'},{url:'https://jeongukdaeri.kr/service/daeri/',position:3,title:'different page'}]}]);
assert.equal(evidence.find(p=>p.path==='/daeri/').status,'observed-in-api-results');
assert.equal(evidence.find(p=>p.path==='/daeri/').found[0].title,'old title');
assert.equal(evidence.find(p=>p.path==='/fare/').status,'not-observed-in-these-results');
assert.equal(pageEvidence([{query:'failed',error:'HTTP 500'}]).length,12);
assert.equal(pageEvidence([{query:'부산탁송',matches:[{url:'https://jeongukdaeri.kr/taksong/busan/',position:4,title:'부산탁송'}]}]).find(p=>p.path==='/taksong/busan/').found[0].position,4);
assert.ok(require('../scripts/naver-web-monitor').QUERIES.includes('강원도탁송'));

console.log('Naver web result matching passed');
