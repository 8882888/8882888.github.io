#!/usr/bin/env node
'use strict';
// One explicitly scoped IndexNow diagnostic request. Do not bulk submit.
// Protocol: 200 submitted, 202 accepted/pending validation,
// 403 key inaccessible, 422 host/keyLocation mismatch, 429 rate limited.
const key='eb61a299742f4ae6a53efc03717a702a';
const base='https://jeongukdaeri.kr';
const target=base+'/reviews/taksong/'; // genuinely updated verified review hub
const submit=process.argv.includes('--submit-once');
(async()=>{
 const keyResponse=await fetch(base+'/'+key+'.txt',{signal:AbortSignal.timeout(14000),headers:{'Cache-Control':'no-cache'}});
 const body=(await keyResponse.text()).trim();
 console.log(JSON.stringify({ownershipFileStatus:keyResponse.status,contentType:keyResponse.headers.get('content-type'),keyMatches:body===key,keyBytes:body.length}));
 if(keyResponse.status!==200||body!==key)throw Error('ownership key not accessible or wrong content: do not submit');
 if(!submit){console.log('Read-only diagnostic complete; use --submit-once for exactly one changed URL');return}
 const endpoint=new URL('https://api.indexnow.org/indexnow');
 endpoint.searchParams.set('url',target);
 endpoint.searchParams.set('key',key);
 const response=await fetch(endpoint,{
  signal:AbortSignal.timeout(18000),
  redirect:'manual',
  headers:{'User-Agent':'Smart24-IndexNow-Single-URL-Diagnostic/1.0'}
 });
 const responseText=(await response.text()).slice(0,512);
 const map={200:'submitted',202:'accepted, key verification pending',400:'invalid params',403:'key not accepted',422:'invalid host, URL or key location',429:'rate limited'};
 console.log(JSON.stringify({endpoint:'api.indexnow.org',url:target,httpStatus:response.status,interpretation:map[response.status]||'unexpected response',responseText}));
 if(![200,202].includes(response.status))console.warn('INDEXNOW NOT CONFIRMED: diagnose source engine code before retrying');
})().catch(e=>{console.error('INDEXNOW DIAGNOSTIC ERROR',e.message);process.exitCode=1});
