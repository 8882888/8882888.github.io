'use strict';
const fs=require('node:fs');
const key='e8b417d6a2034fc79d8e6b150ac29f43';
const origin='https://jeongukdaeri.kr';
const base=['/','/daeri/','/taksong/','/recruit/taksong/','/recruit/daeri/'];
async function main(){
 const changed=(process.env.CHANGED_FILES||'').split(/\s+/).filter(Boolean);
 const manually=(process.env.INDEXNOW_URLS||'').split(/[\s,]+/).filter(Boolean);
 let paths=manually.length?manually:(changed.includes('server.js')?base:[]);
 if(!manually.length&&changed.some(x=>x.includes('ride-history')||x.includes('review-drafts')||x.includes('public-reviewed-rides'))){
   const xmlResponse=await fetch(origin+'/sitemap.xml',{signal:AbortSignal.timeout(20000)});
   if(!xmlResponse.ok)throw Error('Sitemap unavailable: '+xmlResponse.status);
   const xml=await xmlResponse.text();
   const reviewUrls=[...xml.matchAll(/<loc>(https:\/\/jeongukdaeri\\.kr\/reviews\/[a-f0-9]{16}\/)<\/loc>/g)].map(x=>x[1]);
   paths=[...paths,'/reviews/',...reviewUrls.slice(-23)];
 }

 if(!paths.length){console.log('No eligible changed URLs; skipping IndexNow');return}
 const urls=[...new Set(paths.map(x=>new URL(x,origin).href))].filter(x=>{const u=new URL(x);return u.origin===origin&&u.pathname.endsWith('/')&&u.search===''&&u.hash===''}).slice(0,25);
 if(!urls.length){console.log('No valid URLs');return}
 const keyUrl=origin+'/'+key+'.txt';
 const verification=await fetch(keyUrl,{signal:AbortSignal.timeout(15000)});
 if(!verification.ok||(await verification.text()).trim()!==key)throw Error('IndexNow ownership file not available on production: '+verification.status);
 const response=await fetch('https://searchadvisor.naver.com/indexnow',{method:'POST',headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify({host:'jeongukdaeri.kr',key,keyLocation:keyUrl,urlList:urls}),signal:AbortSignal.timeout(25000)});
 console.log('Naver IndexNow response',response.status,'URLs',urls.length,urls.join(' '));
 if(![200,202].includes(response.status))throw Error('Naver IndexNow request rejected: '+response.status+' '+(await response.text()).slice(0,250));
}
main().catch(err=>{console.error(err);process.exitCode=1});
