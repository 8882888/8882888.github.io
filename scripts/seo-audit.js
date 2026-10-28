#!/usr/bin/env node
'use strict';
const config=require('../data/seo-pages.json');
const priority=require('../data/priority-regions.json').pages;
const base=new URL(process.argv[2]||'http://localhost:3000/');
const routes=[...new Set([...config.pages.map(p=>p.path),'/sitemap.xml','/robots.txt'])];
const rules=new Map(config.pages.map(p=>[p.path,p]));
const priorityByPath=new Map();
function content(html,tag){return [...html.matchAll(new RegExp('<'+tag+'\\b[^>]*>([\\s\\S]*?)<\\/'+tag+'>','gi'))].map(m=>m[1].replace(/<[^>]*>/g,' ').trim())}
function attrs(s){return Object.fromEntries([...s.matchAll(/([a-z][a-z0-9-]*)\s*=\s*(["'])(.*?)\2/gi)].map(m=>[m[1].toLowerCase(),m[3]]))}
function elements(html,tag){return [...html.matchAll(new RegExp('<'+tag+'\\b[^>]*>','gi'))].map(m=>attrs(m[0]))}
async function inspect(route){
 const url=new URL(route,base),issues=[],out={route,url:url.href};
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{'user-agent':'Smart24-SEO-Audit/1.1'}});
  out.status=response.status;out.finalUrl=response.url;
  out.xRobotsTag=response.headers.get('x-robots-tag')||'';
  if(/\bnoindex\b/i.test(out.xRobotsTag))issues.push('X-Robots-Tag noindex');
  if(new URL(response.url).pathname!==url.pathname)issues.push('Unexpected redirect');

  if(!response.ok)issues.push('HTTP '+response.status);
  const html=await response.text();
  if(route==='/robots.txt'){if(!/User-agent:/i.test(html))issues.push('Missing User-agent');if(/Disallow:\s*\/\s*(?:\r?\n|$)/i.test(html))issues.push('Root blocked')}
  else if(route==='/sitemap.xml'){if(!/<(?:urlset|sitemapindex)\b/i.test(html))issues.push('Invalid sitemap')}
  else {
   const titles=content(html,'title'),h1=content(html,'h1'),metas=elements(html,'meta'),links=elements(html,'link');
   const desc=metas.filter(m=>m.name==='description').map(m=>m.content||'');
   const robots=metas.filter(m=>m.name==='robots').map(m=>m.content||'');
   const canon=links.filter(m=>m.rel==='canonical').map(m=>m.href||'');
   const ld=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
   Object.assign(out,{title:titles[0]||'',description:desc[0]||'',h1:h1[0]||'',canonical:canon[0]||'',jsonLdCount:ld.length});
   if(titles.length!==1||!titles[0])issues.push('Expected one title');
   if(desc.length!==1||!desc[0])issues.push('Expected one description');
   if(h1.length!==1||!h1[0])issues.push('Expected one H1');
   if(canon.length!==1)issues.push('Expected one canonical');
   else try{const c=new URL(canon[0]);if(c.origin!==new URL(config.site).origin||c.pathname!==url.pathname)issues.push('Canonical mismatch')}catch{issues.push('Invalid canonical')}
   if(robots.some(x=>/\bnoindex\b/i.test(x)))issues.push('noindex');
   if(!ld.length)issues.push('Missing JSON-LD');
   ld.forEach((x,i)=>{try{JSON.parse(x)}catch{issues.push('Invalid JSON-LD '+i)}});
   const rule=rules.get(route)||{};
   if(rule.title&&titles[0]!==rule.title)issues.push('Title config mismatch');
   if(rule.description&&desc[0]!==rule.description)issues.push('Description config mismatch');
   if(rule.titleContains&&!String(titles[0]||'').includes(rule.titleContains))issues.push('Title keyword missing');
   if(rule.descriptionContains&&!String(desc[0]||'').includes(rule.descriptionContains))issues.push('Description keyword missing');
   const focus=priorityByPath.get(route);
   if(focus){
    if(!html.includes('id="priority-region-guide"'))issues.push('Missing priority region guide');
    if(!html.includes(focus.topic))issues.push('Missing distinct priority topic');
    if(!html.includes(focus.detail))issues.push('Missing distinct priority details');
    if(!html.includes('href="tel:18114294"'))issues.push('Missing consultation phone link');
   }

  }
 }catch(e){issues.push('Request failed: '+e.message)}
 out.issues=issues;out.passed=!issues.length;return out;
}

(async()=>{
 const pages=[];
 for(const route of routes)pages.push(await inspect(route));
 const found=new Set();
 for(const kind of ['daeri','taksong']){
  const expected=priority.filter(x=>x.kind===kind);
  const hubRoute='/'+kind+'/';
  const hub=await fetch(new URL(hubRoute,base),{signal:AbortSignal.timeout(15000)});
  const html=await hub.text();
  const match=html.match(/<section id="priority-regions">([\s\S]*?)<\/section>/);
  const links=match?[...match[1].matchAll(/<a href="([^"]+)" data-region="([^"]+)"/g)].map(m=>({href:m[1],region:m[2]})):[];
  const hubIssues=[];
  if(links.length!==expected.length)hubIssues.push('Priority hub links '+links.length+'/'+expected.length);
  const map= new Map(links.map(x=>[x.region,x.href]));
  if(map.size!==links.length)hubIssues.push('Duplicate priority region links');
  for(const info of expected){
   const href=map.get(info.region);
   if(!href||!href.startsWith('/'+kind+'/')){hubIssues.push('Missing priority '+info.region);continue}
   if(found.has(href))hubIssues.push('Duplicate priority URL '+href);
   found.add(href);
   priorityByPath.set(href,info);
  }
  if(hubIssues.length)pages.push({route:hubRoute+'#priority-regions',passed:false,issues:hubIssues});
 }
 if(found.size!==priority.length)pages.push({route:'priority-regions',passed:false,issues:['Expected '+priority.length+' unique URLs, got '+found.size]});
 const sitemapCache=new Map();
 for(const kind of ['daeri','taksong']){
  const route='/sitemap-'+kind+'.xml';
  const response=await fetch(new URL(route,base),{signal:AbortSignal.timeout(30000)});
  const xml=await response.text();
  sitemapCache.set(kind,xml);
  if(!response.ok)pages.push({route,passed:false,issues:['HTTP '+response.status]});
 }
 for(const [route,info] of priorityByPath){
  const checked=await inspect(route);
  const expectedUrl=new URL(route,new URL(config.site));
  if(!sitemapCache.get(info.kind)?.includes('<loc>'+expectedUrl.href+'</loc>'))checked.issues.push('Missing regional service sitemap entry');
  checked.passed=checked.issues.length===0;
  pages.push(checked);
 }
 const report={site:base.href,checkedAt:new Date().toISOString(),priorityCount:priorityByPath.size,passed:pages.every(p=>p.passed),pages};
 console.log(JSON.stringify(report,null,2));
 process.exitCode=report.passed?0:1;
})().catch(e=>{console.error(e);process.exitCode=1});

