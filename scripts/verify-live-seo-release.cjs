'use strict';
const {createHash}=require('node:crypto');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const {setTimeout:delay}=require('node:timers/promises');

const base=new URL(process.argv[2]||'https://jeongukdaeri.kr');
const expected='sha256-'+createHash('sha256').update(readFileSync(require.resolve('../server.js'))).digest('hex').slice(0,16);
const localPublishedCases=require('../lib/published-case-feed').loadPublishedCases(require('node:path').resolve(__dirname,'..'));


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
   if(health.publishedCases?.count!==localPublishedCases.length||health.publishedCases?.latestId!==(localPublishedCases[0]?.id||null))
    throw Error('Deployed published-case manifest is stale: expected '+localPublishedCases.length+' cases; latest '+(localPublishedCases[0]?.id||'none')+', got '+JSON.stringify(health.publishedCases||null));
   const home=await read('/');
   const schemas=[...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].flatMap(match=>{
    try{return [JSON.parse(match[1])];}catch{return [];}
   });
   const homeUrl=new URL('/',base).href;
   if(!schemas.some(schema=>schema?.['@type']==='WebSite'&&schema.name==='전국대리운전'&&schema.url===homeUrl)){
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
   const publishedCases=localPublishedCases;
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
    // Compare LIVE titles with the exact already-published verified source.
    // Different real rides using the same route must not share an SEO title.
    // Check in small waves to avoid adding an uncontrolled crawl at deployment.
    const liveTitles=new Map();
    for(let i=0;i<publishedCases.length;i+=4){
     const wave=publishedCases.slice(i,i+4);
     const checked=await Promise.all(wave.map(async x=>{
      const source=readFileSync(path.join(__dirname,'..','reviews','verified',x.id,'index.html'),'utf8');
      const live=await read(x.path);
      const part=(html,tag)=>html.match(new RegExp('<'+tag+'\\b[^>]*>([\\s\\S]*?)<\\/'+tag+'>','i'))?.[1]?.trim()||'';
      const sourceTitle=part(source,'title'),liveTitle=part(live,'title');
      const sourceH1=part(source,'h1'),liveH1=part(live,'h1');
      if(!sourceTitle||!sourceH1||sourceTitle!==liveTitle||sourceH1!==liveH1)
       throw Error('Published source title/H1 does not match LIVE HTML: '+x.path);
      if(!live.includes('<link rel="canonical" href="'+new URL(x.path,base).href+'">'))
       throw Error('Published source canonical is missing on LIVE page: '+x.path);
      if(!live.includes('<dd>'+x.rideDate+'</dd>')||
         !live.includes('<dd>'+x.fare+'</dd>'))
       throw Error('Original ride date or fare differs on LIVE page: '+x.path);
      return {title:liveTitle,url:x.path};
     }));
     for(const item of checked){
      if(liveTitles.has(item.title))
       throw Error('Duplicate LIVE published ride title: '+item.title+' at '+liveTitles.get(item.title)+' and '+item.url);
      liveTitles.set(item.title,item.url);
     }
    }
    console.log('PASS LIVE published-case source title/H1/canonical/date/fare parity: '+liveTitles.size+'/'+publishedCases.length+'; duplicate titles 0');
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
   // Only broad administrative hubs are advertised in the public sitemap
   // index. Existing fine-grained 읍/면/동/리 routes still work for users,
   // but should not be promoted as thousands of repetitive index targets.
   const publishedLocalityLevels=['province','city','county','district'];
   const withheldLocalityLevels=['eup','myeon','dong','ri'];
   const expectedCounts=JSON.parse(await read('/health/locality-sitemaps.json'));
   const localityCounts={};
   for(const level of publishedLocalityLevels){
    const path='/sitemap-localities-'+level+'.xml';
    if(!root.includes(new URL(path,base).href))throw Error('Missing promoted locality sitemap: '+level);
    const xml=await read(path);
    const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>new URL(match[1]));
    if(!/<urlset\b/i.test(xml)||!urls.length||
      urls.some(url=>url.origin!==base.origin||!/^\/(daeri|taksong)\//.test(url.pathname))){
     throw Error('Invalid promoted locality URLs: '+level);
    }
    const uniqueCount=new Set(urls.map(url=>url.href)).size;
    if(uniqueCount!==urls.length||uniqueCount!==expectedCounts[level]){
     throw Error('Promoted locality sitemap count mismatch: '+level+' expected '+expectedCounts[level]+' received '+uniqueCount);
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
   for(const level of withheldLocalityLevels){
    const path='/sitemap-localities-'+level+'.xml';
    if(root.includes(new URL(path,base).href))
     throw Error('Thin or overlapping locality sitemap must not be promoted: '+level);
    localityCounts[level]=0;
   }
   // Diagnostic counts describe routes the application can serve, not
   // how many URLs are advertised for indexing in sitemap-all.xml.
   const withheldLocalityCounts=Object.fromEntries(withheldLocalityLevels.map(level=>[level,expectedCounts[level]||0]));
   for(const path of ['/sitemap-regional-guides.xml','/sitemap-history-1.xml']){
    if(!root.includes(new URL(path,base).href))throw Error('Missing sitemap: '+path);
    const xml=await read(path);
    if(!/<urlset\b/i.test(xml)||!/<loc>https?:\/\//i.test(xml))throw Error('Empty or invalid sitemap: '+path);
   }
   console.log(JSON.stringify({origin:base.origin,release:expected,verified:true,localityCounts,withheldLocalityCounts}));
   return;
  }catch(error){
   console.error('Attempt '+attempt+'/12: '+error.message);
   if(attempt===12)throw error;
   await delay(10000);
  }
 }
}
main().catch(()=>{process.exitCode=1;});
