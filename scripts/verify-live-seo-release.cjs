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
   const home=await read('/');
   const schemas=[...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].flatMap(match=>{
    try{return [JSON.parse(match[1])];}catch{return [];}
   });
   const homeUrl=new URL('/',base).href;
   if(!schemas.some(schema=>schema?.['@type']==='WebSite'&&schema.name==='스마트24 전국대리운전'&&schema.url===homeUrl)){
    throw Error('Homepage WebSite name or canonical URL is missing');
   }
   for(const [entry,keyword,destination] of [
    ['/','설악산탁송','/설악산탁송/'],
    ['/region/','설악산탁송','/설악산탁송/'],
    ['/keyword-search/','부산대리운전','/daeri/busan/'],
    ['/keyword-search/','부산탁송','/taksong/busan/']
   ]){
    const url=new URL(entry,base);
    url.searchParams.set('q',keyword);
    const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(10000),cache:'no-store'});
    const location=response.headers.get('location');
    await response.body?.cancel();
    if(response.status!==302||!location||new URL(location,url).href!==new URL(destination,base).href){
     throw Error(keyword+' on '+entry+' returned '+response.status+' '+(location||'without Location'));
    }
   }
   const root=await read('/sitemap-all.xml');
   if(!/<sitemapindex\b/i.test(root))throw Error('Invalid sitemap index');
   const localityLevels=['province','city','county','district','eup','myeon','dong'];
   const villageMap='/sitemap-localities-ri.xml';
   const hasVillageMap=root.includes(new URL(villageMap,base).href);
   if(hasVillageMap)localityLevels.push('ri');
   const localityCounts={};
   for(const level of localityLevels){
    const path='/sitemap-localities-'+level+'.xml';
    if(!root.includes(new URL(path,base).href))throw Error('Missing locality sitemap: '+level);
    const xml=await read(path);
    const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>new URL(match[1]));
    if(!/<urlset\b/i.test(xml)||!urls.length||
     urls.some(url=>url.origin!==base.origin||!/^\/(daeri|taksong)\//.test(url.pathname))){
     throw Error('Invalid locality URLs: '+level);
    }
    localityCounts[level]=urls.length;
   }
   if(!hasVillageMap)localityCounts.ri=0;
   for(const path of ['/sitemap-regional-guides.xml','/sitemap-history-1.xml']){
    if(!root.includes(new URL(path,base).href))throw Error('Missing sitemap: '+path);
    const xml=await read(path);
    if(!/<urlset\b/i.test(xml)||!/<loc>https?:\/\//i.test(xml))throw Error('Empty or invalid sitemap: '+path);
   }
   console.log(JSON.stringify({origin:base.origin,release:expected,verified:true,localityCounts}));
   return;
  }catch(error){
   console.error('Attempt '+attempt+'/12: '+error.message);
   if(attempt===12)throw error;
   await delay(10000);
  }
 }
}
main().catch(()=>{process.exitCode=1;});
