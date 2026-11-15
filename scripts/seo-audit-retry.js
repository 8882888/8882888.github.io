'use strict';
// Read-only audit network helper. A single transient transport failure must not
// masquerade as an SEO/canonical defect; persistent failures remain failures.
function isTransientTransportError(error){
 const marker=[error?.name,error?.message,error?.cause?.code,error?.cause?.message].filter(Boolean).join(' ');
 return /fetch failed|timeout|timed out|aborted|ECONNRESET|ETIMEDOUT|EAI_AGAIN|UND_ERR/i.test(marker);
}
async function fetchSeoWithRetry(url,options={},config={}){
 const request=config.fetchImpl||globalThis.fetch;
 const wait=config.wait||((ms)=>new Promise(resolve=>setTimeout(resolve,ms)));
 const warn=config.warn||((message)=>console.error(message));
 const timeoutMs=config.timeoutMs||15000;
 const {signal:ignoredSignal,...requestOptions}=options;
 for(let attempt=1;attempt<=2;attempt++){
  try{
   return await request(url,{...requestOptions,signal:AbortSignal.timeout(timeoutMs)});
  }catch(error){
   if(attempt===2||!isTransientTransportError(error))throw error;
   const pathname=new URL(String(url)).pathname;
   warn('SMART24_SEO_TRANSIENT_RETRY '+pathname+': '+String(error?.message||error).slice(0,160));
   await wait(600);
  }
 }
 throw Error('Unreachable: SEO fetch completed without response');
}
module.exports={fetchSeoWithRetry,isTransientTransportError};
