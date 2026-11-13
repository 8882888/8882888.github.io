'use strict';
const {createHash}=require('node:crypto');
const {readFileSync}=require('node:fs');
const {setTimeout:delay}=require('node:timers/promises');

const base=new URL(process.argv[2]||'https://jeongukdaeri.kr');
const expected='sha256-'+createHash('sha256').update(readFileSync(require.resolve('../server.js'))).digest('hex').slice(0,16);

async function read(path){
 const url=new URL(path,base);
 const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(10000),cache:'no-store'});
 if(response.status!==200)throw Error(path+' returned HTTP '+response.status);
 return response.text();
}

async function main(){
 for(let attempt=1;attempt<=12;attempt++){
  try{
   const health=JSON.parse(await read('/health'));
   if(health.release!==expected)throw Error('Expected '+expected+', received '+(health.release||'no release fingerprint'));
   const root=await read('/sitemap-all.xml');
   if(!/<sitemapindex\b/i.test(root))throw Error('Invalid sitemap index');
   for(const path of ['/sitemap-regional-guides.xml','/sitemap-history-1.xml']){
    if(!root.includes(new URL(path,base).href))throw Error('Missing sitemap: '+path);
    const xml=await read(path);
    if(!/<urlset\b/i.test(xml)||!/<loc>https?:\/\//i.test(xml))throw Error('Empty or invalid sitemap: '+path);
   }
   console.log(JSON.stringify({origin:base.origin,release:expected,verified:true}));
   return;
  }catch(error){
   console.error('Attempt '+attempt+'/12: '+error.message);
   if(attempt===12)throw error;
   await delay(10000);
  }
 }
}
main().catch(()=>{process.exitCode=1;});
