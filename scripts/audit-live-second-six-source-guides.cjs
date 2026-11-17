'use strict';
// Compare newly curated, dated second-batch archival notes with the LIVE Cloudtype SSR.
// This does NOT measure Naver indexing, ranking, impressions, clicks, or dispatch success.
const fs=require('node:fs');
const {items}=require('../data/verified-archive-local-context-second-six-20261117.json');
const base=new URL(process.env.LIVE_SITE_URL||'https://jeongukdaeri.kr');
const targetKeywords={
 '인천광역시 강화군':'강화대리운전','경기도 화성시':'화성탁송',
 '충청북도 음성군':'음성탁송','대구광역시 달서구':'대구달서구탁송',
 '전라남도 광양시':'광양탁송','강원특별자치도 양양군':'양양탁송'
};
const assert=(ok,message)=>{if(!ok)throw Error(message)};
async function get(url){
 let err;
 for(let attempt=1;attempt<=2;attempt++){
  try{
   const response=await fetch(url,{redirect:'manual',
    headers:{'Cache-Control':'no-cache','User-Agent':'Smart24-six-originals-second-batch/1.0'},
    signal:AbortSignal.timeout(25000)});
   return {response,body:await response.text(),attempt};
  }catch(e){err=e;console.error('LIVE_HTTP_RETRY '+url.pathname+' '+attempt+' '+e.message)}
 }
 throw Error('HTTP failed twice '+(err?.message||'unknown'));
}
async function verify(item){
 const keyword=targetKeywords[item.region];
 assert(keyword,'unlisted locality '+item.region);
 const query=new URL('/?q='+encodeURIComponent(keyword),base);
 const lookup=await get(query);
 assert(lookup.response.status===302,'keyword redirect HTTP '+lookup.response.status);
 const location=lookup.response.headers.get('location')||'';
 const destination=new URL(location,base);
 assert(destination.origin===base.origin&&destination.pathname.startsWith('/'+item.kind+'/')&&
  destination.search===''&&destination.hash===''&&location.startsWith('/'),
  'keyword target is not a clean existing canonical route '+location);
 const pageUrl=new URL(destination);
 pageUrl.searchParams.set('original-archive-audit','2');
 const {response,body,attempt}=await get(pageUrl);
 assert(response.status===200,'page HTTP '+response.status);
 assert((response.headers.get('content-type')||'').includes('text/html'),'not HTML');
 assert(body.includes('<link rel="canonical" href="'+base.origin+destination.pathname+'">'),'self canonical missing');
 assert((body.match(/<link rel="canonical"/g)||[]).length===1,'duplicate canonical');
 assert(!/noindex/i.test(response.headers.get('x-robots-tag')||''),'noindex in response header');
 assert(!/<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(body),'noindex in page');
 assert(/<title>[^<]+<\/title>/i.test(body),'missing title');
 assert(/<meta[^>]*name=["']description["']/i.test(body),'missing description');
 assert(/<h1\b[^>]*>/.test(body),'missing SSR h1');
 assert(body.split('id="source-backed-local-journey-20261117"').length===2,'not exactly one archive note');
 assert(body.includes(item.heading)&&body.includes(item.context)&&body.includes(item.preparation),
  'source-backed unique paragraphs not deployed');
 for(const id of item.evidenceIds)assert(body.includes('href="/reviews/history/'+id+'/"'),'archive link missing '+id);
 assert(body.includes('href="/fare/?service='+item.kind+'&amp;from='),'quote CTA missing');
 assert(body.includes('href="tel:18114294"'),'1811-4294 CTA missing');
 return {region:item.region,path:destination.pathname,http:200,originalLinks:item.evidenceIds.length,attempts:attempt};
}
async function main(){
 assert(items.length===6&&new Set(items.map(x=>x.kind+'|'+x.region)).size===6,'unexpected batch size');
 const report={checkedAt:new Date().toISOString(),source:'live HTTP (NOT Naver Search Advisor)',passed:[],failed:[]};
 for(let i=0;i<items.length;i+=3){
  const results=await Promise.all(items.slice(i,i+3).map(async x=>{
   try{return {ok:true,data:await verify(x)}}
   catch(e){return {ok:false,region:x.region,error:e.message}}
  }));
  for(const r of results)r.ok?report.passed.push(r.data):report.failed.push({region:r.region,error:r.error});
 }
 console.log(JSON.stringify(report,null,2));
 if(process.env.GITHUB_STEP_SUMMARY){
  const lines=['### Source-backed second six: current Cloudtype HTTP','Technical verification only; NOT official Naver indexing or CTR.',
   '| Region | HTTP | Original links |','|---|---|---:|'];
  for(const row of report.passed)lines.push('| '+row.region+' | 200 + unique content + self canonical | '+row.originalLinks+' |');
  for(const row of report.failed)lines.push('| '+row.region+' | FAILED: '+row.error.replace(/\|/g,'/').slice(0,160)+' | - |');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
 }
 if(report.failed.length){
  console.error('FAIL live second-six audit: '+report.failed.map(x=>x.region+': '+x.error).join('; '));
  process.exitCode=1;
 }else console.log('PASS second six live original guides, 17 archival links, no search metric inference');
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
module.exports={verify,main};
