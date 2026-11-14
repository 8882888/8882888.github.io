// Retry only transient failures during a read-only, rate-limited audit.
const RETRYABLE_HTTP=new Set([429,500,502,503,504]);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function fetchWithRetry(url,fetcher,{attempts=3,wait=pause,delays=[400,1200]}={}){
 if(!Number.isInteger(attempts)||attempts<1||attempts>5)throw Error('Invalid audit retry limit');
 for(let n=1;n<=attempts;n++){
  try{
   const response=await fetcher(url);
   if(n<attempts&&RETRYABLE_HTTP.has(response.status)){
    try{await response.body?.cancel()}catch{}
    await wait(delays[Math.min(n-1,delays.length-1)]??400);
    continue;
   }
   return {response,attempts:n};
  }catch(error){
   if(n===attempts){if(error&&typeof error==='object')error.retryAttempts=n;throw error}
   await wait(delays[Math.min(n-1,delays.length-1)]??400);
  }
 }
 throw Error('Unreachable indexability retry state');
}
