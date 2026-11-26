#!/usr/bin/env node
'use strict';
// Targeted read-only SEO audit from the perspective of Naver's documented Yeti UA.
// This reports technical eligibility, NOT the actual index status in Search Advisor.
// To protect a small Cloudtype container, fetch a bounded sample with low concurrency.
const base='https://jeongukdaeri.kr';
const UA='Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)';
const sitemaps=[
 '/sitemap-priority.xml','/sitemap.xml','/sitemap-daeri.xml',
 '/sitemap-taksong.xml','/sitemap-focused-regions.xml',
 '/sitemap-regional-guides.xml','/sitemap-reviewed-routes.xml',
 '/sitemap-published.xml'
];
const explicit=[
 '/','/daeri/sejong/','/taksong/sejong/',
 '/taksong/busan/gijang-gun/','/coverage/','/region/innovation-cities/',
 '/설악산탁송/','/지리산탁송/'
];
const maxPerMap=Math.min(20,Math.max(1,Number(process.env.NAVER_YETI_SAMPLE_PER_MAP||12)));
const concurrency=4;
const xmlLocs=xml=>[...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map(m=>m[1].replace(/&amp;/g,'&').trim());
const text=s=>s.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const attr=(tag,k)=>tag.match(new RegExp('\\b'+k+'\\s*=\\s*["\\x27]([^"\\x27]*)["\\x27]','i'))?.[1]||'';
const tagList=(html,kind)=>[...html.matchAll(new RegExp('<'+kind+'\\b[^>]*>','gi'))].map(x=>x[0]);
const one=(html,kind)=>html.match(new RegExp('<'+kind+'\\b[^>]*>([\\s\\S]*?)<\\/'+kind+'>','i'))?.[1]||'';
const canonical=html=>tagList(html,'link').filter(x=>attr(x,'rel').toLowerCase().split(/\s+/).includes('canonical')).map(x=>attr(x,'href'));
const robots=html=>tagList(html,'meta').filter(x=>attr(x,'name').toLowerCase()==='robots').map(x=>attr(x,'content'));
const normalize=url=>{try{return new URL(url,base).href}catch{return ''}};
const sampled=(list,n)=>{
 if(list.length<=n)return list;
 const indexes=new Set([0,1,2,list.length-1]);
 for(let i=0;i<n;i++)indexes.add(Math.floor(i*(list.length-1)/(n-1||1)));
 return [...indexes].sort((a,b)=>a-b).map(i=>list[i]);
};
async function request(route){
 const r=await fetch(normalize(route),{signal:AbortSignal.timeout(17000),redirect:'manual',headers:{'User-Agent':UA,'X-Smart24-Monitor':'github-health-probe','Cache-Control':'no-cache','Accept':'text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.8'}});
 return {status:r.status,headers:r.headers,body:await r.text()};
}
const issues=[];
const add=(url,type,detail)=>issues.push({url,type,detail});
async function checkOne(path){
 try{
  const page=await request(path), result={path,status:page.status,bytes:Buffer.byteLength(page.body),issues:[],title:'',h1:'',description:''};
  const fail=(type,detail)=>{result.issues.push({type,detail});add(path,type,detail)};
  if(page.status!==200){fail('HTTP','Yeti GET returned '+page.status+'; location='+page.headers.get('location'));return result}
  if(!/text\/html/i.test(page.headers.get('content-type')||''))fail('content-type','expected HTML, got '+page.headers.get('content-type'));
  if(/\bnoindex\b/i.test(page.headers.get('x-robots-tag')||''))fail('noindex-header',page.headers.get('x-robots-tag'));
  if(robots(page.body).some(x=>/\bnoindex\b/i.test(x)))fail('noindex-meta',robots(page.body).join('|'));
  const declared=canonical(page.body),expected=normalize(path);
  if(declared.length!==1||normalize(declared[0])!==expected)fail('canonical','expected '+expected+'; actual '+declared.join('|'));
  result.title=text(one(page.body,'title')).slice(0,160);
  result.h1=text(one(page.body,'h1')).slice(0,160);
  result.description=tagList(page.body,'meta').filter(x=>attr(x,'name').toLowerCase()==='description').map(x=>attr(x,'content')).join(' ').slice(0,250);
  if(!result.title)fail('title','missing');
  if(!result.h1)fail('h1','missing');
  const main=page.body.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||page.body;
  result.visibleChars=text(main).length;
  if(result.visibleChars<140)fail('thin-or-soft404','visible main text below 140 characters');
  if(/페이지를 찾을 수 없|존재하지 않는 페이지|해당 정보를 찾을 수 없/i.test(result.h1))fail('soft404-heading',result.h1);
  return result;
 }catch(e){add(path,'network',e.message);return {path,status:0,issues:[{type:'network',detail:e.message}]}}
}
(async()=>{
 const mapSummary=[];
 const candidates=new Set(explicit);
 for(const route of sitemaps){
  try{
   const r=await request(route);
   const locs=xmlLocs(r.body);
   const unique=[...new Set(locs)];
   if(r.status!==200||!/<urlset\b/i.test(r.body))add(route,'sitemap','not a valid URL-set HTTP response '+r.status);
   if(unique.length!==locs.length)add(route,'sitemap','duplicate <loc> URL');
   const local=unique.filter(u=>{try{return new URL(u).origin===base}catch{return false}});
   if(local.length!==unique.length)add(route,'sitemap','foreign or malformed <loc>');
   for(const u of sampled(local,maxPerMap))candidates.add(new URL(u).pathname);
   mapSummary.push({route,status:r.status,urlCount:locs.length,sampled:Math.min(local.length,maxPerMap+4)});
  }catch(e){add(route,'sitemap-network',e.message);mapSummary.push({route,error:e.message})}
 }
 // Confirm robots rules via Yeti user agent; do not suppress normal Google bots.
 try{
  const r=await request('/robots.txt');
  if(r.status!==200)add('/robots.txt','robots','HTTP '+r.status);
  if(!/User-agent:\s*\*/i.test(r.body))add('/robots.txt','robots','missing global crawler group');
  if(/Disallow:\s*\/\s*(?:\r?\n|$)/i.test(r.body))add('/robots.txt','robots','root disallow');
 }catch(e){add('/robots.txt','robots',e.message)}
 const queue=[...candidates],results=new Array(queue.length);
 let next=0;
 async function worker(){
  while(next<queue.length){const i=next++;results[i]=await checkOne(queue[i]);}
 }
 await Promise.all(Array.from({length:concurrency},worker));
 const duplicated=new Map();
 for(const r of results){
  if(!r.title)continue;
  const a=duplicated.get(r.title)||[];a.push(r.path);duplicated.set(r.title,a);
 }
 const titleDuplicates=[...duplicated].filter(([,v])=>v.length>1).map(([title,paths])=>({title,paths}));
 // Duplicate titles are a quality signal, not automatically a crawler blocking error.
 const outcome={checkedAt:new Date().toISOString(),agent:'Naver Yeti/1.1',
  scope:'bounded publicly advertised sitemap URLs; technical eligibility only, not Naver index counts',
  sitemaps:mapSummary,summary:{pages:queue.length,technicalIssues:issues.length,duplicateTitleGroups:titleDuplicates.length},
  errors:issues,duplicateTitles:titleDuplicates,results};
 process.stdout.write(JSON.stringify(outcome,null,2)+'\n');
 if(issues.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
