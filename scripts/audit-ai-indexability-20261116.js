#!/usr/bin/env node
'use strict';
// Read-only AI-search / indexability audit. It does not submit URLs or alter content.
const ROOT=process.argv[2]||'http://localhost:3000';
const ORIGIN=new URL(ROOT).origin;
const routes=[
  '/',
  '/daeri/sejong/',
  '/taksong/sejong/',
  '/taksong/busan/gijang-gun/',
  '/daeri/busan/',
  '/taksong/busan/',
  '/special/seoraksan-transport/',
  '/special/cycling-trail-transport/'
];
const timeout=Number(process.env.SEO_AUDIT_TIMEOUT_MS||15000);
// This valuable secondary guide deliberately consolidates to the Korean primary page.
const intendedAliases=new Map([['/special/seoraksan-transport/','/설악산탁송/']]);
const matchAll=(s,re)=>[...s.matchAll(re)].map(x=>x[1]);
const htmlText=s=>s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const normalizedUrl=v=>{try{return new URL(v,'https://jeongukdaeri.kr').href}catch{return ''}};
const attr=(tag,key)=>{const m=tag.match(new RegExp('\\b'+key+'\\s*=\\s*(["\\x27])([^"\\x27]*?)\\1','i'));return m?m[2]:''};
function nodes(json){
 const out=[];
 function visit(x){
  if(!x||typeof x!=='object')return;
  if(Array.isArray(x)){x.forEach(visit);return}
  if(x['@type'])out.push(x);
  if(x['@graph'])visit(x['@graph']);
 }
 visit(json);return out;
}
function types(node){return [node['@type']].flat().filter(Boolean).map(String)}
async function read(route){
 const url=new URL(route,ORIGIN);
 const abort=new AbortController();
 const timer=setTimeout(()=>abort.abort(),timeout);
 try{
  const res=await fetch(url,{redirect:'follow',headers:{'User-Agent':'Smart24-AI-Indexability-Audit/1.0','Cache-Control':'no-cache'},signal:abort.signal});
  return {res,body:await res.text(),requested:url};
 }finally{clearTimeout(timer)}
}
(async()=>{
 const results=[];
 const sitemapSources=['/sitemap-priority.xml','/sitemap-daeri.xml','/sitemap-taksong.xml'];
 const mapped=new Set();
 const sitemapProblems=[];
 for(const route of sitemapSources){
  try{
   const {res,body}=await read(route);
   if(!res.ok||!/<urlset\b/i.test(body))sitemapProblems.push(route+': invalid sitemap HTTP/XML');
   for(const raw of matchAll(body,/<loc>([^<]+)<\/loc>/g)){
    try{const u=new URL(raw.replace(/&amp;/g,'&'));if(u.origin==='https://jeongukdaeri.kr')mapped.add(u.pathname)}catch{sitemapProblems.push(route+': malformed <loc>')}
   }
  }catch(e){sitemapProblems.push(route+': '+e.message)}
 }
 for(const route of routes){
  const entry={route,errors:[],warnings:[],schemaTypes:[]};
  try{
   const {res,body,requested}=await read(route);
   entry.status=res.status;
   entry.finalUrl=res.url;
   if(!res.ok)entry.errors.push('HTTP '+res.status);
   if(new URL(res.url).pathname!==requested.pathname)entry.errors.push('unexpected redirect');
   if(/\bnoindex\b/i.test(res.headers.get('x-robots-tag')||''))entry.errors.push('X-Robots-Tag noindex');
   const title=matchAll(body,/<title\b[^>]*>([\s\S]*?)<\/title>/gi).map(htmlText);
   const h1=matchAll(body,/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi).map(htmlText);
   const meta=matchAll(body,/(<meta\b[^>]*>)/gi);
   const links=matchAll(body,/(<link\b[^>]*>)/gi);
   const robots=meta.filter(x=>attr(x,'name').toLowerCase()==='robots').map(x=>attr(x,'content'));
   const canonical=links.filter(x=>attr(x,'rel').toLowerCase()==='canonical').map(x=>attr(x,'href'));
   if(title.length!==1||!title[0])entry.errors.push('missing or multiple title');
   if(h1.length!==1||!h1[0])entry.errors.push('missing or multiple H1');
   if(robots.some(x=>/\bnoindex\b/i.test(x)))entry.errors.push('robots meta noindex');
   const expectedCanonical=new URL(intendedAliases.get(requested.pathname)||requested.pathname,'https://jeongukdaeri.kr').href;
   if(canonical.length!==1||normalizedUrl(canonical[0])!==expectedCanonical)entry.errors.push('canonical mismatch');
   if(intendedAliases.has(requested.pathname)){
    entry.canonicalAlias=expectedCanonical;
    try{
     const primary=await read(intendedAliases.get(requested.pathname));
     if(!primary.res.ok)entry.errors.push('canonical primary HTTP '+primary.res.status);
     const primaryCanonical=matchAll(primary.body,/(<link\b[^>]*>)/gi).filter(x=>attr(x,'rel').toLowerCase()==='canonical').map(x=>attr(x,'href'));
     if(primaryCanonical.length!==1||normalizedUrl(primaryCanonical[0])!==expectedCanonical)
      entry.errors.push('canonical primary is not self-canonical');
     if(/\bnoindex\b/i.test(primary.res.headers.get('x-robots-tag')||''))entry.errors.push('canonical primary header noindex');
    }catch(e){entry.errors.push('canonical primary fetch failed: '+e.message)}
   }
   const scripts=matchAll(body,/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
   const graph=[];
   for(const s of scripts){try{graph.push(...nodes(JSON.parse(s)))}catch{entry.errors.push('invalid JSON-LD')}}
   entry.schemaTypes=[...new Set(graph.flatMap(types))];
   if(!scripts.length)entry.warnings.push('No structured JSON-LD');
   const webPages=graph.filter(x=>types(x).includes('WebPage'));
   if(!webPages.length&&!(route==='/'&&entry.schemaTypes.includes('WebSite')))entry.warnings.push('No WebPage JSON-LD');
   for(const node of webPages){
    const declared=node.url||(typeof node['@id']==='string'?node['@id'].replace(/#.*$/,''):'');
    if(declared&&new URL(declared,ORIGIN).href!==expectedCanonical)
      entry.warnings.push('WebPage schema URL differs from canonical path');
   }
   if(!intendedAliases.has(requested.pathname)&&!mapped.has(requested.pathname))entry.warnings.push('Not in sampled priority/service sitemaps (may be in other published sitemap)');
   if(/후기|실제 운행/.test(body)&&!(/운행기록|완료/.test(body)))entry.warnings.push('Review claim requires evidence verification');
   entry.title=title[0]||'';
  }catch(e){entry.errors.push('request failed: '+e.message)}
  results.push(entry);
 }
 const report={checkedAt:new Date().toISOString(),base:ORIGIN,scope:'read-only; not a Naver index count',sitemapProblems,results,
  summary:{pages:results.length,failed:results.filter(x=>x.errors.length).length,warnings:results.reduce((n,x)=>n+x.warnings.length,0)}};
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
 if(report.summary.failed||sitemapProblems.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
