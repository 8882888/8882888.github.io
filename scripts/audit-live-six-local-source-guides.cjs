'use strict';
// Read-only HTTP audit of the SIX already-reviewed, archive-backed regional pages.
// This is NOT a Naver indexing, ranking, impression or click report.
const fs=require('node:fs');
const {items}=require('../data/verified-archive-local-context-20261117.json');
const base=new URL(process.env.LIVE_SITE_URL||'https://jeongukdaeri.kr');
const targets={
 '인천광역시 연수구':['인천연수구탁송','/taksong/incheon/yeonsu-gu/'],
 '경기도 오산시':['오산탁송','/taksong/gyeonggi/osan-si/'],
 '경기도 양주시':['양주탁송','/taksong/gyeonggi/yangju-si/'],
 '경상남도 밀양시':['밀양탁송','/taksong/gyeongnam/miryang-si/'],
 '경기도 시흥시':['시흥탁송','/taksong/gyeonggi/siheung-si/'],
 '충청북도 충주시':['충주탁송','/taksong/chungbuk/chungju-si/']
};
const assert=(condition,message)=>{if(!condition)throw Error(message)};
async function fetchText(url){
 let failure;
 for(let attempt=1;attempt<=2;attempt++){
  try{
   const response=await fetch(url,{
    redirect:'manual',
    headers:{'User-Agent':'Smart24-source-backed-6-live-audit/1.0','Cache-Control':'no-cache'},
    signal:AbortSignal.timeout(25000)
   });
   return {response,body:await response.text(),attempt};
  }catch(error){
   failure=error;
   console.error('Transient HTTP request error attempt '+attempt+' '+url.pathname+': '+error.message);
  }
 }
 throw Error('HTTP request failed twice: '+(failure?.message||'unknown'));
}
async function check(item){
 const pair=targets[item.region];
 assert(pair&&item.kind==='taksong','Unexpected locality/service '+item.region);
 const [keyword,path]=pair;
 const query=new URL('/?q='+encodeURIComponent(keyword),base);
 const lookup=await fetchText(query);
 assert(lookup.response.status===302,'Keyword redirect HTTP '+lookup.response.status);
 const destination=new URL(lookup.response.headers.get('location')||'/',base);
 assert(destination.origin===base.origin&&destination.pathname===path,'Wrong canonical redirect '+destination.pathname+' expected '+path);
 const pageUrl=new URL(path,base);
 pageUrl.searchParams.set('source-audit','six-originals-20261117');
 const {response,body,attempt}=await fetchText(pageUrl);
 assert(response.status===200,'HTTP '+response.status);
 assert((response.headers.get('content-type')||'').includes('text/html'),'Not HTML');
 assert(body.includes('<link rel="canonical" href="'+base.origin+path+'">'),'Self canonical not in server HTML');
 assert((body.match(/<link rel="canonical"/g)||[]).length===1,'Duplicate canonicals');
 assert(!/noindex/i.test(response.headers.get('x-robots-tag')||''),'noindex HTTP header');
 assert(!/<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(body),'noindex robots meta');
 assert(/<title>[^<]+<\/title>/i.test(body),'Missing title');
 assert(/<h1\b[^>]*>[^<]+/i.test(body),'Missing SSR H1');
 assert(/<meta[^>]*name=["']description["']/i.test(body),'Missing description');
 assert(body.split('id="source-backed-local-journey-20261117"').length===2,'Expected exactly one dated source section');
 assert(body.includes(item.heading)&&body.includes(item.context)&&body.includes(item.preparation),'Original region-specific passages missing');
 for(const id of item.evidenceIds){
  assert(body.includes('href="/reviews/history/'+id+'/"'),'Original archive link missing '+id);
 }
 assert(body.includes('href="tel:18114294"'),'Original consultation telephone missing');
 assert(body.includes('href="/fare/?service=taksong&amp;from='),'Evidence-section quote entrypoint missing');
 return {region:item.region,path,archiveLinks:item.evidenceIds.length,status:200,attempt};
}
async function main(){
 assert(items.length===6&&Object.keys(targets).length===6,'Audit target count mismatch');
 assert(new Set(items.map(x=>x.region)).size===6,'Duplicate region');
 const report={checkedAt:new Date().toISOString(),base:base.origin,
  source:'Live server HTTP; NOT Naver official metrics or confirmed indexing',
  successes:[],failures:[]};
 for(let i=0;i<items.length;i+=3){
  const rows=await Promise.all(items.slice(i,i+3).map(async item=>{
   try{return {ok:true,value:await check(item)}}
   catch(error){return {ok:false,region:item.region,error:error.message}}
  }));
  for(const row of rows){
   if(row.ok)report.successes.push(row.value);
   else report.failures.push({region:row.region,error:row.error});
  }
 }
 console.log(JSON.stringify(report,null,2));
 if(process.env.GITHUB_STEP_SUMMARY){
  const lines=['### Six real Cloudtype locality guides — independent HTTP audit',
   'Only public HTML/HTTP validation; no Naver indexing, rankings or CTR inferred.',
   '| Locality | Status | Archived sources |','|---|---|---:|'];
  for(const row of report.successes)lines.push('| '+row.region+' | PASS HTTP 200 / original source content | '+row.archiveLinks+' |');
  for(const row of report.failures)lines.push('| '+row.region+' | FAIL: '+row.error.replace(/\|/g,'/').slice(0,180)+' | — |');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
 }
 if(report.failures.length){
  console.error('FAIL: '+report.failures.length+' of six live source-backed pages did not match their original records.');
  process.exitCode=1;
 }else console.log('PASS: six LIVE source-backed canonical pages and thirteen original links (not a search indexing claim)');
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
module.exports={check,main};
