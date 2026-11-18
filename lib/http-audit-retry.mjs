// Bounded, read-only retry for production HTTP audits. This is not a web crawler
// or an indexing submission. Retry only network failures and transient HTTP.
const TRANSIENT_STATUSES=new Set([408,425,429,500,502,503,504]);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export async function fetchHttpWithRetry(url,{
 fetchImpl=globalThis.fetch,
 timeoutMs=22000,
 maxAttempts=3,
 retryDelayMs=750,
 delay=sleep,
 headers={},
 redirect='manual'
}={}){
 if(typeof fetchImpl!=='function'||typeof delay!=='function')throw new TypeError('fetchImpl and delay must be functions');
 if(!Number.isSafeInteger(maxAttempts)||maxAttempts<1||maxAttempts>4)throw new RangeError('maxAttempts must be 1..4');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<100||timeoutMs>120000)throw new RangeError('timeoutMs must be 100..120000');
 if(!Number.isSafeInteger(retryDelayMs)||retryDelayMs<0||retryDelayMs>30000)throw new RangeError('retryDelayMs must be 0..30000');
 for(let attempt=1;attempt<=maxAttempts;attempt++){
  try{
   // A new AbortSignal is created on every attempt. Reusing the timed-out signal
   // would make all subsequent retries fail immediately.
   const response=await fetchImpl(url,{signal:AbortSignal.timeout(timeoutMs),redirect,headers});
   const body=await response.text();
   if(TRANSIENT_STATUSES.has(response.status)&&attempt<maxAttempts){
    await delay(retryDelayMs*attempt);
    continue;
   }
   return {status:response.status,body,headers:response.headers,attempts:attempt};
  }catch(error){
   if(attempt===maxAttempts)throw error;
   await delay(retryDelayMs*attempt);
  }
 }
 throw new Error('Unreachable retry state');
}
