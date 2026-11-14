import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fetchWithRetry} from '../scripts/indexability-retry.mjs';
const noop=async()=>{};
test('a normal HTTP 200 needs one request',async()=>{
 let count=0;
 const result=await fetchWithRetry('https://example.test',async()=>{count++;return {status:200}}, {wait:noop});
 assert.equal(result.attempts,1);assert.equal(count,1);
});
test('transient fetch exceptions recover with a bounded retry',async()=>{
 let count=0;
 const result=await fetchWithRetry('https://example.test',async()=>{
  if(++count<3)throw new TypeError('fetch failed');return {status:200};
 },{wait:noop});
 assert.equal(result.attempts,3);assert.equal(result.response.status,200);
});
test('retryable 503 responses are cancelled before next request',async()=>{
 let count=0,cancelled=0;
 const result=await fetchWithRetry('https://example.test',async()=>++count===1?
  {status:503,body:{cancel:async()=>cancelled++}}:{status:200},{wait:noop});
 assert.equal(result.attempts,2);assert.equal(cancelled,1);
});
test('permanent 404 is not retried',async()=>{
 let count=0;
 const result=await fetchWithRetry('https://example.test',async()=>{count++;return {status:404}},{wait:noop});
 assert.equal(result.response.status,404);assert.equal(count,1);
});
test('persistent failure reports exactly three attempts',async()=>{
 let count=0;
 await assert.rejects(fetchWithRetry('https://example.test',async()=>{
  count++;throw new TypeError('fetch failed');
 },{wait:noop}),error=>error.retryAttempts===3);
 assert.equal(count,3);
});
