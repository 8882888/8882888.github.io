import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fetchHttpWithRetry} from '../lib/http-audit-retry.mjs';

const answer=(status,text='ok')=>new Response(text,{status,headers:{'content-type':'text/html'}});
test('temporary 503 recovers with bounded retry and a fresh signal',async()=>{
 const signals=[],delays=[];let calls=0;
 const result=await fetchHttpWithRetry('https://example.invalid/',{
  fetchImpl:async (_url,options)=>{signals.push(options.signal);return answer(++calls===1?503:200)},
  delay:async ms=>{delays.push(ms)},retryDelayMs:500
 });
 assert.equal(result.status,200);
 assert.equal(result.attempts,2);
 assert.equal(calls,2);
 assert.deepEqual(delays,[500]);
 assert.notEqual(signals[0],signals[1]);
});
test('network exception recovers and does not reuse its aborted request signal',async()=>{
 let calls=0;
 const result=await fetchHttpWithRetry('https://example.invalid/',{
  fetchImpl:async()=>{if(++calls===1)throw new Error('ECONNRESET');return answer(200)},
  delay:async()=>{}
 });
 assert.equal(calls,2);
 assert.equal(result.attempts,2);
 assert.equal(result.status,200);
});
test('persistent network exception remains a hard failure after 3 attempts',async()=>{
 let calls=0;
 await assert.rejects(fetchHttpWithRetry('https://example.invalid/',{
  fetchImpl:async()=>{calls++;throw new Error('socket failure')},
  delay:async()=>{}
 }),/socket failure/);
 assert.equal(calls,3);
});
test('a real 404 is never retried and remains an HTTP error for classification',async()=>{
 let calls=0;
 const result=await fetchHttpWithRetry('https://example.invalid/',{
  fetchImpl:async()=>{calls++;return answer(404)},
  delay:async()=>{}
 });
 assert.equal(result.status,404);
 assert.equal(result.attempts,1);
 assert.equal(calls,1);
});
test('persistent 503 is returned as HTTP 503, not a false success',async()=>{
 let calls=0;
 const result=await fetchHttpWithRetry('https://example.invalid/',{
  fetchImpl:async()=>{calls++;return answer(503,'unavailable')},
  delay:async()=>{}
 });
 assert.equal(result.status,503);
 assert.equal(result.attempts,3);
 assert.equal(calls,3);
});
