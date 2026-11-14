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
   for(const [city,fullName] of [['여수','전라남도 여수시'],['부산','부산광역시'],['대구','대구광역시']]){
    for(const [from,to,origin,destination] of [
     ['서울',city,'서울특별시',fullName],[city,'서울',fullName,'서울특별시']
    ]){
     for(const [label,service] of [['탁송','taksong'],['대리운전','daeri']]){
      const entry=new URL('/keyword-search/',base);
      entry.searchParams.set('q',from+'에서 '+to+' '+label);
      const response=await fetch(entry,{redirect:'manual',signal:AbortSignal.timeout(10000)});
      const location=response.headers.get('location');
      await response.body?.cancel();
      const expectedRoute=new URL('/route-search/',base);
      expectedRoute.search=new URLSearchParams({from:origin,to:destination,service});
      if(response.status!==302||!location||new URL(location,entry).href!==expectedRoute.href){
       throw Error('Unexpected route for '+entry.searchParams.get('q')+': '+response.status+' '+(location||'without Location'));
      }
     }
    }
   }
   const root=await read('/sitemap-all.xml');
   if(!/<sitemapindex\b/i.test(root))throw Error('Invalid sitemap index');
   // A verified publication is only complete if its real canonical page is
   // discoverable through the published-case sitemap and newest RSS feed.
   const publishedCases=require('../lib/published-case-feed').loadPublishedCases(require('node:path').resolve(__dirname,'..'));
   if(publishedCases.length){
    const latest=publishedCases.slice(0,20);
    const publishedXml=await read('/sitemap-published.xml'),feedXml=await read('/rss.xml');
    if(!root.includes(new URL('/sitemap-published.xml',base).href))
     throw Error('Root sitemap index omits published verified cases');
    if(!/<urlset\b/i.test(publishedXml)||!/<rss\b/i.test(feedXml))
     throw Error('Published-case sitemap or RSS feed is invalid');
    for(const x of publishedCases){
     const canonical=new URL(x.path,base).href;
     if(!publishedXml.includes('<loc>'+canonical+'</loc>'))
      throw Error('Published case not in live sitemap: '+x.path);
    }
    for(const x of latest){
     const canonical=new URL(x.path,base).href;
     if(!feedXml.includes('<link>'+canonical+'</link>')||
        !feedXml.includes('<pubDate>'+new Date(x.publishedAt).toUTCString()+'</pubDate>'))
      throw Error('New saved case missing publication timestamp or RSS link: '+x.path);
    }
   }
   // Production release must not re-submit low-distinctiveness locality/topic
   // permutations through the priority sitemap after pruning the guide sitemap.
   const priorityXml=await read('/sitemap-priority.xml');
   const reviewedXml=await read('/sitemap-regional-guides.xml');
   const reviewedSample='/taksong/busan/gijang-gun/fare/';
   const unreviewedSample='/taksong/gangwon/taebaek-si/fare/';
   if(!priorityXml.includes(reviewedSample)||!reviewedXml.includes(reviewedSample)||
      priorityXml.includes(unreviewedSample)||reviewedXml.includes(unreviewedSample)){
    throw Error('Priority and regional guide sitemap quality gates differ on LIVE Cloudtype');
   }
   const localityLevels=['province','city','county','district','eup','myeon','dong'];
   const villageMap='/sitemap-localities-ri.xml';
   const hasVillageMap=root.includes(new URL(villageMap,base).href);
   const expectedCounts=JSON.parse(await read('/health/locality-sitemaps.json'));
   if(!Number.isInteger(expectedCounts.ri)||expectedCounts.ri<0||hasVillageMap!==(expectedCounts.ri>0)){
    throw Error('Village sitemap presence does not match expected coverage');
   }
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
    const uniqueCount=new Set(urls.map(url=>url.href)).size;
    if(uniqueCount!==urls.length||uniqueCount!==expectedCounts[level]){
     throw Error('Locality sitemap count mismatch: '+level+' expected '+expectedCounts[level]+' received '+uniqueCount);
    }
    for(const kind of ['daeri','taksong']){
     const sample=urls.find(url=>url.pathname.startsWith('/'+kind+'/'));
     if(!sample)continue;
     const page=await fetch(sample,{redirect:'manual',signal:AbortSignal.timeout(10000),cache:'no-store'});
     const html=await page.text();
     const head=html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1]||'';
     const links=[...head.matchAll(/<link\b[^>]*>/gi)].map(match=>match[0]);
     const canonical=links.filter(tag=>/\brel=["']canonical["']/i.test(tag));
     const href=canonical[0]?.match(/\bhref=["']([^"']+)["']/i)?.[1];
     const robots=[...head.matchAll(/<meta\b[^>]*>/gi)].map(match=>match[0])
      .filter(tag=>/\bname=["'](?:robots|yeti)["']/i.test(tag))
      .map(tag=>tag.match(/\bcontent=["']([^"']+)["']/i)?.[1]||'');
     if(page.status!==200||canonical.length!==1||!href||new URL(href,sample).href!==sample.href||
      /\b(?:noindex|none)\b/i.test([...robots,page.headers.get('x-robots-tag')].join(' '))){
      throw Error('Sample page is not indexable: '+level+' '+kind+' '+sample.href+' HTTP '+page.status);
     }
    }
    localityCounts[level]=uniqueCount;
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
