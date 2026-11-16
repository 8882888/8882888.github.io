#!/usr/bin/env node
'use strict';
// Read-only diagnosis of intermittent Search Advisor URL inspection failures.
// Synthetic User-Agent checks NEVER prove the genuine Naver crawler IP can access the site.
const fs=require('node:fs'),path=require('node:path');
const base='https://jeongukdaeri.kr';
const yeti='Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)';
const fullYeti='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko; compatible; Yeti/1.1; +https://naver.me/spd) Chrome/140.0.0.0 Safari/537.36';
const browser='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const routes=[
 '/', '/robots.txt','/sitemap.xml','/daeri/','/taksong/',
 '/daeri/sejong/','/taksong/sejong/','/taksong/busan/gijang-gun/',
 '/taksong/gangwon/wonju-si/','/taksong/gyeongnam/jinju-si/',
 '/taksong/jeonnam/naju-si/','/taksong/gyeongbuk/gimcheon-si/',
 '/설악산탁송/','/지리산탁송/','/special/cycling-trail-transport/'
];
const checks=[
 ...[1,2].flatMap(round=>routes.map(route=>({round,route,agent:'compactYeti'}))),
 ...['/','/robots.txt','/taksong/busan/gijang-gun/'].flatMap(route=>[
  {round:1,route,agent:'fullYeti'},{round:1,route,agent:'browser'}])
];
const agentValue={compactYeti:yeti,fullYeti,browser};
const timeoutMs=10000;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function attribute(tag,key){return tag.match(new RegExp('(?:\\s|<)'+key+'\\s*=\\s*["\\x27]([^"\\x27]*)["\\x27]','i'))?.[1]||''}
function meta(html,key,value){
 return (html.match(/<meta\b[^>]*>/gi)||[])
  .filter(x=>attribute(x,key).toLowerCase()===value.toLowerCase())
  .map(x=>attribute(x,'content'));
}
function canonical(html){return (html.match(/<link\b[^>]*>/gi)||[])
  .filter(x=>attribute(x,'rel').toLowerCase()==='canonical').map(x=>attribute(x,'href'))}
function assess(data){
 const issues=[];
 if(data.error)issues.push('connection_or_timeout');
 else{
  if(data.status!==200)issues.push(data.status>=300&&data.status<400?'redirect':'http_'+data.status);
  if(data.elapsedMs>=10000)issues.push('slow_over_10_seconds');
  if(data.status===200&&data.route.endsWith('.xml')&&!/xml/i.test(data.contentType))issues.push('wrong_sitemap_type');
  if(data.status===200&&data.route==='/robots.txt'&&!/User-agent:\s*\*/i.test(data.body))issues.push('missing_robot_group');
  if(data.status===200&&data.route==='/robots.txt'&&/^\s*Disallow:\s*\/\s*$/m.test(data.body))issues.push('robots_disallow_root');
  if(data.status===200&&data.route!=='/robots.txt'&&!data.route.endsWith('.xml')){
   if(!/text\/html/i.test(data.contentType))issues.push('wrong_html_type');
   if(/\bnoindex\b/i.test(data.xRobotsTag))issues.push('http_noindex');
   const noindex=meta(data.body,'name','robots').concat(meta(data.body,'name','yeti'))
    .some(x=>/\bnoindex\b/i.test(x));
   if(noindex)issues.push('html_noindex');
   const can=canonical(data.body),expected=new URL(data.route,base).href;
   if(can.length!==1||can[0]!==expected)issues.push('canonical_mismatch_or_duplicate');
  }
 }
 return issues;
}
async function one({round,route,agent},fetcher=fetch){
 const url=new URL(route,base).href,started=Date.now();
 const data={round,route,url,agent,status:0,elapsedMs:null,contentType:'',xRobotsTag:'',redirect:'',cacheControl:'',sizeBytes:0,issues:[]};
 try{
  const response=await fetcher(url,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(timeoutMs),
   headers:{'User-Agent':agentValue[agent],'Accept':'text/html,application/xhtml+xml,application/xml,text/plain;q=0.8,*/*;q=0.5','Cache-Control':'no-cache'}});
  data.status=response.status;
  data.contentType=response.headers.get('content-type')||'';
  data.xRobotsTag=response.headers.get('x-robots-tag')||'';
  data.redirect=response.headers.get('location')||'';
  data.cacheControl=response.headers.get('cache-control')||'';
  data.body=await response.text();
  data.sizeBytes=Buffer.byteLength(data.body);
 }catch(e){data.error=(e?.name||'Error')+': '+String(e?.message||e).slice(0,180)}
 data.elapsedMs=Date.now()-started;
 data.issues=assess(data);
 delete data.body; // Never persist fetched customer information or HTML.
 return data;
}
async function run(fetcher=fetch,queue=checks){
 const results=new Array(queue.length);let next=0;
 const worker=async()=>{
  while(next<queue.length){
   const index=next++;results[index]=await one(queue[index],fetcher);
   await wait(125); // Limit load on the small Cloudtype instance.
  }
 };
 await Promise.all([worker(),worker()]);
 const failures=results.filter(x=>x.issues.length);
 const byRoute=routes.map(route=>{
  const rows=results.filter(x=>x.route===route&&x.agent==='compactYeti');
  return {route,checks:rows.length,failed:rows.filter(x=>x.issues.length).length,
   slowestMs:Math.max(0,...rows.map(x=>x.elapsedMs||0)),
   statuses:[...new Set(rows.map(x=>x.status))],
   issues:[...new Set(rows.flatMap(x=>x.issues))]};
 });
 return {generatedAt:new Date().toISOString(),origin:base,
  note:'Synthetic User-Agent + external GitHub runner IP. Does not prove access from real Naver Yeti IP or official indexing.',
  timeoutMs,checked:results.length,failed:failures.length,
  maxElapsedMs:Math.max(...results.map(x=>x.elapsedMs||0)),
  incidentRoutes:byRoute.filter(x=>x.failed>0),
  byRoute,results};
}
if(require.main===module){
 run().then(report=>{
  fs.mkdirSync('audit',{recursive:true});
  fs.writeFileSync('audit/naver-url-access-intermittency.json',JSON.stringify(report,null,2)+'\n');
  console.log('Naver URL inspection access probe:',report.checked,'checks;',report.failed,'failures; max',report.maxElapsedMs,'ms');
  for(const x of report.byRoute)console.log((x.failed?'FAIL':'PASS'),x.route,x.statuses.join('/'),'slowest',x.slowestMs+'ms',x.issues.join(','));
  console.log('Synthetic Yeti requests cannot prove real Naver crawler-IP access.');
  if(report.failed)process.exitCode=1;
 }).catch(e=>{console.error(e);process.exitCode=1});
}
module.exports={routes,checks,assess,run,one,meta,canonical};
