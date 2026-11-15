'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {fetchSeoWithRetry,isTransientTransportError}=require('../scripts/seo-audit-retry');
const root=path.resolve(__dirname,'..');

test('one transient fetch failure is retried and recovered on exactly the same priority URL',async()=>{
 let attempts=0,waits=0;const attemptsSeen=[];
 const response={ok:true,status:200};
 const actual=await fetchSeoWithRetry(new URL('https://jeongukdaeri.kr/taksong/ulsan/jung-gu/'),
  {headers:{'user-agent':'Smart24-SEO-Audit/1.1'}},{
   fetchImpl:async(url,opts)=>{
    attemptsSeen.push({url:String(url),ua:opts.headers['user-agent'],freshSignal:!!opts.signal});
    attempts++;
    if(attempts===1)throw new TypeError('fetch failed');
    return response;
   },
   wait:async()=>{waits++;},warn:()=>{}
  });
 assert.equal(actual,response);
 assert.equal(attempts,2);
 assert.equal(waits,1);
 assert.deepEqual(attemptsSeen.map(x=>x.url),Array(2).fill('https://jeongukdaeri.kr/taksong/ulsan/jung-gu/'));
 assert.ok(attemptsSeen.every(x=>x.ua==='Smart24-SEO-Audit/1.1'&&x.freshSignal));
});

test('persistent transport failure is still a hard failure after one retry',async()=>{
 let attempts=0;
 await assert.rejects(fetchSeoWithRetry('https://jeongukdaeri.kr/daeri/jeonbuk/jeonju-si/',{},{
  fetchImpl:async()=>{attempts++;throw Object.assign(new Error('connection reset'),{cause:{code:'ECONNRESET'}});},
  wait:async()=>{},warn:()=>{}
 }),/connection reset/);
 assert.equal(attempts,2);
});

test('HTTP 404 or a non-transport programming error never triggers a retry',async()=>{
 let attempts=0;
 const response={status:404,ok:false};
 assert.equal(await fetchSeoWithRetry('https://jeongukdaeri.kr/not-found/',{},{
  fetchImpl:async()=>{attempts++;return response;},wait:async()=>{},warn:()=>{}
 }),response);
 assert.equal(attempts,1,'HTTP errors must be checked as actual HTTP status codes by the main audit');
 await assert.rejects(fetchSeoWithRetry('https://jeongukdaeri.kr/',{},{
  fetchImpl:async()=>{attempts++;throw new Error('invalid audit assertion');},wait:async()=>{},warn:()=>{}
 }),/invalid audit assertion/);
 assert.equal(attempts,2,'Programming errors must not be retried');
 assert.equal(isTransientTransportError(new TypeError('fetch failed')),true);
 assert.equal(isTransientTransportError(new Error('canonical mismatch')),false);
});

test('release-triggered Naver monitor compares the exact Cloudtype commit',()=>{
 const workflow=fs.readFileSync(path.join(root,'.github/workflows/naver-web-monitor.yml'),'utf8');
 const audit=fs.readFileSync(path.join(root,'scripts/seo-audit.js'),'utf8');
 assert.ok(workflow.includes('ref: ${{ github.event.workflow_run.head_sha || github.sha }}'));
 assert.match(workflow,/github\.event\.workflow_run\.conclusion == 'success'/);
 assert.ok(audit.includes("require('../scripts/seo-audit-retry')"));
 assert.match(audit,/await fetchSeoWithRetry\(url/);
});
