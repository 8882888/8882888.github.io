#!/usr/bin/env node
'use strict';
// Submit only genuinely changed, canonical priority URLs. Naver accepts
// IndexNow notifications but a 200/202 is not evidence of indexing or rank.
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const key='770f921af32e749f64c1d447c607ea42';
const root=path.resolve(__dirname,'..');
const priorityPaths=Object.freeze(require('../data/region-journey-links.json').pages.map(p=>p.path));
const blogHashtagPaths=Object.freeze(require('../data/blog-hashtags-priority.json').articles.map(p=>'/blog/daeri-regions/'+p.slug+'/'));
if(blogHashtagPaths.length!==30||new Set(blogHashtagPaths).size!==30)throw Error('Expected thirty blog canonical URLs');
if(priorityPaths.length!==10||new Set(priorityPaths).size!==10)throw Error('Expected ten unique regional source URLs');
const dryRun=process.argv.includes('--dry-run');
const base=new URL(dryRun?(process.argv[process.argv.indexOf('--dry-run')+1]||'http://localhost:3000/'):'https://jeongukdaeri.kr/');
if(fs.readFileSync(path.join(root,key+'.txt'),'utf8').trim()!==key)throw Error('Invalid local IndexNow key file');
const fixedPriorityPaths=[
 '/', '/daeri/', '/taksong/', '/route-taksong/', '/설악산탁송/', '/지리산탁송/',
 '/special/cycling-trail-transport/', '/service/long-distance-taksong/', '/fare/',
 '/reviews/history/', '/reviews/taksong/', '/reviews/ride-record-stories/',
 '/reviews/verified/', '/routes/reviewed/', '/region/daegu-daeri-taksong/',
 '/blog/', '/route-taksong/centers/', '/travel/food-map/', '/taksong/jeju/',
 '/recruit/daeri/', '/recruit/taksong/'
];
// The priority sitemap is intentionally a *curated discovery list*, NOT a
// dump of every 2,900 focus target. Deeper service URLs have separate sitemaps.
// Require the complete core set of editorial/booking entry URLs, rather than
// pretending that every keyword or locality must be indexed separately.
const focusFiles=fs.readdirSync(path.join(root,'data')).filter(name=>
 /^naver-regional-focus.*\.json$/.test(name)&&!name.includes('candidates'));
const focusCount=focusFiles.reduce((total,name)=>{
 const doc=JSON.parse(fs.readFileSync(path.join(root,'data',name),'utf8'));
 if(!Array.isArray(doc.priority))throw Error('Missing live priority list in '+name);
 return total+doc.priority.length;
},0);
// Village guides without confirmed local trips intentionally remain noindex.
// They must not be required for sitemap coverage or IndexNow notification.
const sparseVillageAllowance=focusFiles.reduce((total,name)=>total+JSON.parse(fs.readFileSync(path.join(root,'data',name),'utf8')).priority.filter(entry=>entry.region.endsWith('리')).length,0);
const requiredPaths=[...new Set([...fixedPriorityPaths,...priorityPaths,...blogHashtagPaths])];
const minimumCount=requiredPaths.length;
const maximumCount=focusCount+500;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function batchUrls(urls,size=10){
 if(!Array.isArray(urls))throw Error('URL batches require an array');
 if(!Number.isInteger(size)||size<1||size>10)throw Error('IndexNow batch size must be between one and ten');
 const batches=[];
 for(let i=0;i<urls.length;i+=size)batches.push(urls.slice(i,i+size));
 return batches;
}
// Naver documents GET for one URL and JSON POST for multiple URLs.
function notificationRequest(batch){
 if(!Array.isArray(batch)||batch.length<1||batch.length>10)throw Error('Invalid IndexNow batch');
 for(const value of batch){
  const u=new URL(value);
  if(u.origin!=='https://jeongukdaeri.kr'||u.username||u.password||u.search||u.hash||u.href!==value)
   throw Error('Invalid official canonical URL: '+value);
 }
 const endpoint=new URL('https://searchadvisor.naver.com/indexnow');
 const headers={'user-agent':'Smart24-IndexNow-Notifier/2.0'};
 const options={headers,signal:AbortSignal.timeout(20000),redirect:'manual'};
 if(batch.length===1){
  endpoint.searchParams.set('url',batch[0]);
  endpoint.searchParams.set('key',key);
  return {url:endpoint.href,options:{...options,method:'GET'}};
 }
 return {url:endpoint.href,options:{...options,method:'POST',headers:{...headers,'content-type':'application/json; charset=utf-8'},body:JSON.stringify({host:'jeongukdaeri.kr',key,keyLocation:'https://jeongukdaeri.kr/'+key+'.txt',urlList:batch})}};
}
async function get(rel){
 return fetch(new URL(rel,base),{
  headers:{'user-agent':'Smart24-IndexNow-Notifier/2.0','cache-control':'no-cache'},
  signal:AbortSignal.timeout(10000),redirect:'manual'
 });
}
function changedPaths(files,manual='',options={}){
 const explicit=String(manual||'').trim().split(/[\s,]+/).filter(Boolean);
 if(explicit.length){
  if(explicit.length>10)throw Error('Only ten intentional IndexNow URLs per request');
  const chosen=[...new Set(explicit.map(x=>{
   const u=new URL(x,base);
   if(u.hostname!=='jeongukdaeri.kr'&&u.origin!==base.origin)throw Error('Foreign host '+x);
   if(u.search||u.hash||!u.pathname.endsWith('/'))throw Error('Noncanonical manual URL '+x);
   return u.pathname;
  }))];
  return chosen;
 }
 const input=new Set(files);
 // Publishing writes a real /reviews/verified/{id}/index.html as well as a
 // state row. Notify only the saved page URL, never the whole archive/region.
 const caseFiles=files.filter(file=>/^reviews\/verified\/[a-f0-9]{16}\/index\.html$/.test(file));
 if(caseFiles.length){
  if(caseFiles.length>30)throw Error('More than thirty saved cases changed; split the publication update rather than truncating');
  return [...new Set(caseFiles.map(file=>'/'+file.slice(0,-'index.html'.length)))];
 }
 // The manifest alone is not evidence that a new canonical page was saved.
 if(input.has('data/published-ride-case-ids.json'))return [];
 // Match exact modified source records to canonical live pages.
 // Never submit a fixed unrelated group merely because any JSON source changed.
 const reviewedSources=['data/priority-regions.json','data/region-journey-links.json',
  'data/priority-blog-links.json','data/blog-hashtags-priority.json'];
 const selected=new Set();
 const include=paths=>paths.forEach(p=>selected.add(p));
 const getSnapshot=(filename,side)=>{
  const provided=side==='before'?options.previousDocuments?.[filename]:options.currentDocuments?.[filename];
  if(provided)return provided;
  const deploySha=process.env.INDEXNOW_DEPLOY_SHA;
  if(deploySha&&!/^[0-9a-f]{40}$/i.test(deploySha))throw Error('Invalid INDEXNOW_DEPLOY_SHA; refusing notification');
  if(side==='after'&&!deploySha)return JSON.parse(fs.readFileSync(path.join(root,filename),'utf8'));
  const ref=deploySha
   ? (side==='before'?deploySha+'^:'+filename:deploySha+':'+filename)
   : 'HEAD^:'+filename;
  try{return JSON.parse(execFileSync('git',['show',ref],
   {cwd:root,encoding:'utf8',timeout:10000}))}
  catch(e){throw Error('Cannot inspect '+side+' deployed source records for '+filename+'; refusing unrelated IndexNow notification')}
 };
 const modifiedRows=(filename,keyFn)=>{
  const old=getSnapshot(filename,'before'),now=getSnapshot(filename,'after');
  if(!Array.isArray(old.pages||old.articles)||!Array.isArray(now.pages||now.articles))
   throw Error('Changed source has no reviewed rows: '+filename);
  const older=new Map((old.pages||old.articles).map(row=>[keyFn(row),row]));
  return (now.pages||now.articles).filter(row=>{
   const key=keyFn(row);
   if(!key||key.includes('undefined'))throw Error('Incomplete reviewed row in '+filename);
   return JSON.stringify(older.get(key))!==JSON.stringify(row);
  });
 };
 for(const filename of reviewedSources){
  if(!input.has(filename))continue;
  if(filename==='data/region-journey-links.json'){
   include(modifiedRows(filename,row=>row.path).map(row=>row.path));
  }else if(filename==='data/blog-hashtags-priority.json'){
   include(modifiedRows(filename,row=>row.slug).map(row=>'/blog/daeri-regions/'+row.slug+'/'));
  }else{
   const hrefMap=options.priorityHrefMap;
   if(!(hrefMap instanceof Map))throw Error('Live published priority URL lookup is required for '+filename);
   include(modifiedRows(filename,row=>row.kind+'|'+row.region).map(row=>{
    const route=row.path||hrefMap.get(row.kind+'|'+row.region);
    if(!route||!route.startsWith('/'+row.kind+'/')||!route.endsWith('/'))
     throw Error('Cannot confirm published canonical for '+row.kind+'|'+row.region);
    return route;
   }));
  }
 }
 // A curated regional JSON edit can change an already reviewed public
 // canonical page even though its published priority-regions.json row did not
 // change. Notify ONLY the changed approved locality/service URLs present in
 // the live 59-page priority hubs; most of the 2,900 editorial rows are NOT
 // proactively indexable and must never be bulk-submitted.
 const changedCuratedFiles=files.filter(file=>
  /^data\/naver-regional-focus-[^/]+\.json$/.test(file)&&!file.includes('candidates'));
 if(changedCuratedFiles.length){
  const hrefMap=options.priorityHrefMap;
  if(!(hrefMap instanceof Map))throw Error('Live published priority URL lookup is required for curated regional source changes');
  const editorial=entry=>JSON.stringify([entry.topic,entry.pickup,entry.handover,entry.related]);
  for(const filename of changedCuratedFiles){
   const before=getSnapshot(filename,'before'),after=getSnapshot(filename,'after');
   if(!Array.isArray(before.priority)||!Array.isArray(after.priority))
    throw Error('Changed curated region source has no priority records: '+filename);
   const oldByKey=new Map(before.priority.map(entry=>[entry.kind+'|'+entry.region,entry]));
   for(const entry of after.priority){
    if(!['daeri','taksong'].includes(entry.kind)||!entry.region)
     throw Error('Invalid curated region/service source row: '+filename);
    const identity=entry.kind+'|'+entry.region;
    const old=oldByKey.get(identity);
    if(old&&editorial(old)===editorial(entry))continue;
    const route=hrefMap.get(identity);
    if(route)include([route]); // Source-only village candidates cannot enter IndexNow.
   }
  }
 }
 const changedBlogs=blogHashtagPaths.filter(url=>input.has(url.slice(1)+'index.html'));
 include(changedBlogs);
 if(input.has('index.html'))include(['/']);
 if(input.has('data/seo-pages.json')){
  const changedSeoPages=modifiedRows('data/seo-pages.json',row=>row.path);
  include(changedSeoPages.map(row=>{
   const route=String(row.path||'');
   if(!route.startsWith('/')||!route.endsWith('/')||route.includes('?')||route.includes('#'))
    throw Error('Changed SEO page is not a canonical path: '+route);
   return route;
  }));
 }
 if(input.has('blog/posts.json'))include(['/blog/','/blog/archive/']);
 if([...input].some(p=>/^(data\/ride-history\.json|data\/public-reviewed-rides-202610\.json)$/.test(p)))include(['/reviews/history/','/reviews/taksong/']);
 if(selected.size>10)throw Error('More than ten genuine changed URLs; batch explicitly after deployment, never truncate');
 return [...selected];
}
function filesInRevision(){
 const override=process.env.INDEXNOW_CHANGED_FILES;
 if(typeof override==='string')return override.split(/[\s,]+/).filter(Boolean);
 const deploySha=process.env.INDEXNOW_DEPLOY_SHA;
 if(deploySha&&!/^[0-9a-f]{40}$/i.test(deploySha))throw Error('Invalid INDEXNOW_DEPLOY_SHA; refusing notification');
 const range=deploySha?[deploySha+'^',deploySha]:['HEAD^','HEAD'];
 try{return execFileSync('git',['diff','--name-only',...range],{cwd:root,encoding:'utf8',timeout:10000}).split(/\r?\n/).filter(Boolean)}
 catch(e){throw Error('Cannot identify changed files in the deployed revision, refusing a blanket URL resubmission: '+e.message)}
}
async function livePriorityHrefMap(){
 const map=new Map();
 for(const kind of ['daeri','taksong']){
  const response=await get('/'+kind+'/');
  if(response.status!==200)throw Error('Cannot inspect published priority hub '+kind+' HTTP '+response.status);
  const html=await response.text();
  const section=html.match(/<section id="priority-regions">([\s\S]*?)<\/section>/)?.[1];
  if(!section)throw Error('Published priority hub source links unavailable: '+kind);
  for(const match of section.matchAll(/<a href="([^"]+)" data-region="([^"]+)"/g)){
   const [_,href,region]=match;
   const key=kind+'|'+region;
   if(map.has(key))throw Error('Duplicate published region/service target: '+key);
   if(!href.startsWith('/'+kind+'/')||!href.endsWith('/')||href.includes('?')||href.includes('#'))
    throw Error('Invalid published region URL '+href);
   map.set(key,href);
  }
 }
 const all=require('../data/priority-regions.json').pages;
 for(const entry of all)if(!map.has(entry.kind+'|'+entry.region))
  throw Error('Missing published priority region URL: '+entry.kind+'|'+entry.region);
 return map;
}
async function verify(){
 const verification=await get('/'+key+'.txt');
 if(verification.status!==200)throw Error('Key HTTP '+verification.status);
 if((await verification.text()).trim()!==key)throw Error('Key content mismatch');
 const xmlResponse=await get('/sitemap-priority.xml');
 if(xmlResponse.status!==200)throw Error('Priority sitemap HTTP '+xmlResponse.status);
 const xml=await xmlResponse.text();
 const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);
 const normalizedUrls=urls.map(value=>new URL(value).href);
 if(urls.length<minimumCount||urls.length>maximumCount||new Set(normalizedUrls).size!==urls.length)
  throw Error('Unexpected priority sitemap coverage or duplicates: '+urls.length);
 for(const url of urls){
  const parsed=new URL(url);
  if(parsed.protocol!=='https:'||parsed.hostname!=='jeongukdaeri.kr'||parsed.search||parsed.hash)
   throw Error('Invalid canonical URL in sitemap: '+url);
 }
 for(const route of [...fixedPriorityPaths,...priorityPaths,...blogHashtagPaths]){
  const canonical=new URL(route,'https://jeongukdaeri.kr').href;
  if(!normalizedUrls.includes(canonical))throw Error('Missing priority route: '+canonical);
 }
 const busan=await get('/taksong/busan/');
 if(busan.status!==200)throw Error('Busan taksong HTTP '+busan.status);
 const body=await busan.text();
 if(!body.includes('id="priority-region-guide"'))throw Error('Busan priority source not deployed');
 const publishedMap=await get('/sitemap-published.xml');
 if(publishedMap.status!==200)throw Error('Published case sitemap HTTP '+publishedMap.status);
 const publishedXml=await publishedMap.text();
 if(!/<urlset\b/i.test(publishedXml))throw Error('Invalid published case sitemap');
 const publishedUrls=[...publishedXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>new URL(m[1]).href);
 if(publishedUrls.some(url=>!/^https:\/\/jeongukdaeri\.kr\/reviews\/verified\/[a-f0-9]{16}\/$/.test(url))||
    new Set(publishedUrls).size!==publishedUrls.length)
  throw Error('Noncanonical or duplicated published case URLs');
 console.log('Verified '+urls.length+' priority URLs, '+publishedUrls.length+' saved case URLs and IndexNow key at '+base.origin);
 return new Set([...normalizedUrls,...publishedUrls]);
}
async function main(){
 // Dry-run is a read-only sitemap/key health test. It must not require HEAD^:
 // scheduled workflow checkouts and pull request merges may be shallow.
 // Real notifications still demand an explicit changed-file list and fail closed.
 const files=dryRun?[]:filesInRevision();
 const manual=process.env.INDEXNOW_URLS||'';
 console.log('Changed repository files: '+(files.join(', ')||'(none)'));
 const needsPublishedMap=!dryRun&&!manual.trim()&&files.some(file=>
  ['data/priority-regions.json','data/priority-blog-links.json'].includes(file)||
  (/^data\/naver-regional-focus-[^/]+\.json$/.test(file)&&!file.includes('candidates')));
 // Derive exact changed region IDs from source and resolve their canonical
 // URLs from the published service hubs. Do not equate data source filenames
 // with one unrelated fixed set of ten links.
 let targets,accepted;
 if(needsPublishedMap){
  for(let attempt=0;attempt<16;attempt++){
   try{accepted=await verify();break}catch(e){
    if(attempt===15)throw e;
    console.log('Cloudtype not yet confirmed ('+(attempt+1)+'/16): '+e.message);
    await pause(10000);
   }
  }
  targets=changedPaths(files,manual,{priorityHrefMap:await livePriorityHrefMap()});
 }else targets=changedPaths(files,manual);
 if(!dryRun&&!targets.length){console.log('No genuinely modified published URLs; skipping repeat IndexNow submission');return}
 if(!accepted){
  for(let attempt=0;attempt<(dryRun?1:16);attempt++){
   try{accepted=await verify();break}catch(e){
    if(dryRun||attempt===15)throw e;
    console.log('Cloudtype not yet confirmed ('+(attempt+1)+'/16): '+e.message);
    await pause(10000);
   }
  }
 }
 if(dryRun){console.log('Dry run: target paths '+targets.join(', ')+'; no IndexNow submission');return}
 const urls=targets.map(route=>new URL(route,'https://jeongukdaeri.kr').href);
 for(const url of urls){
  if(!accepted.has(url))throw Error('Changed URL not in published or priority sitemap: '+url);
  const u=new URL(url);
  const page=await get(u.pathname);
  if(page.status!==200||!/^text\/html/i.test(page.headers.get('content-type')||'')){
   await page.body?.cancel();
   throw Error('Not a published HTTP 200 HTML URL: '+url+' status='+page.status);
  }
  if(/(?:^|[\s,;])noindex(?:$|[\s,;])/i.test(page.headers.get('x-robots-tag')||'')){
   await page.body?.cancel();throw Error('Page is X-Robots-Tag noindex: '+url);
  }
  const html=await page.text();
  const canonicals=[...html.matchAll(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi)].map(x=>x[0]);
  if(canonicals.length!==1||!canonicals[0].includes('href="'+url+'"')||
    /<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["'][^"']*\bnoindex\b/i.test(html))
   throw Error('Published page canonical or robots mismatch: '+url);
 }
 const batches=batchUrls(urls,10);
 for(let i=0;i<batches.length;i++){
  const batch=batches[i];
  const request=notificationRequest(batch);
  const response=await fetch(request.url,request.options);
  const message=(await response.text()).slice(0,300);
  console.log('Naver IndexNow response HTTP '+response.status+'; batch '+(i+1)+'/'+batches.length+' submitted '+batch.length+' changed URLs: '+batch.join(' ')+(message?' ; '+message:''));
  if(![200,202].includes(response.status))throw Error('Naver IndexNow refused batch '+(i+1)+' of '+batches.length);
  if(i+1<batches.length)await pause(1500);
 }
 console.log('Submission acknowledgement only; '+urls.length+' URLs sent in '+batches.length+' batches. Real crawler requests, URL indexing and ranking are unconfirmed.');
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
module.exports={priorityPaths,blogHashtagPaths,changedPaths,filesInRevision,verify,batchUrls,notificationRequest,sitemapWindow:{focusCount,sparseVillageAllowance,minimumCount,maximumCount,requiredPaths}};
