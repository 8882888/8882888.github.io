#!/usr/bin/env node
'use strict';
// Full sitemap inventory validation + deterministic regional HTTP samples.
// Set SEO_CHECK_ALL=1 to request every sitemap URL (can take considerable time).
const fs=require('node:fs');
const base=new URL(process.argv[2]||'http://localhost:3000/');
const site=new URL(require('../data/seo-pages.json').site);
const maps=['/sitemap.xml','/sitemap-daeri.xml','/sitemap-taksong.xml'];
const concurrency=Number(process.env.SEO_CONCURRENCY||8);
const timeout=Number(process.env.SEO_TIMEOUT_MS||12000);
const all=process.env.SEO_CHECK_ALL==='1';
const maxSample=Number(process.env.SEO_SAMPLE_PER_GROUP||3);
const issues=[],entries=new Map(),duplicates=[],samples=[],results=[];
const decode=s=>s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
async function get(url){const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(timeout),headers:{'user-agent':'Smart24-SEO-Audit/2.0'}});return {status:r.status,url:r.url,text:await r.text()}}
function tags(html,tag){return [...html.matchAll(new RegExp('<'+tag+'\\b[^>]*>([\\s\\S]*?)<\\/'+tag+'>','gi'))].map(m=>m[1].replace(/<[^>]+>/g,'').trim())}
function attribute(html,tag,key,value,target){for(const m of html.matchAll(new RegExp('<'+tag+'\\b[^>]*>','gi'))){const attrs=Object.fromEntries([...m[0].matchAll(/([a-z][a-z0-9:-]*)\s*=\s*(["'])(.*?)\2/gi)].map(x=>[x[1].toLowerCase(),decode(x[3])]));if(attrs[key]===value)return attrs[target]||''}return ''}
function group(p){if(p==='/')return 'home';if(/^\/(?:daeri|taksong)\/(?:seoul|gyeonggi|incheon|busan|daegu|gyeongbuk|gangwon|chung|jeon|gyeongnam)/.test(p))return p.split('/')[1]+'-'+p.split('/')[2];if(/^\/(?:daeri|taksong)\//.test(p))return p.split('/')[1]+'-other';if(p.startsWith('/region/'))return 'region';if(p.startsWith('/fare/route/'))return 'fare-route';if(p.startsWith('/reviews/'))return 'reviews';if(p.startsWith('/visit/')||p.includes('/visit/'))return 'visit';return p.split('/')[1]||'other'}
(async()=>{
 for(const map of maps){
  const r=await get(new URL(map,base));
  if(r.status!==200){issues.push(map+' HTTP '+r.status);continue}
  const xml=r.text;
  if(!/<urlset\b/.test(xml))issues.push(map+' invalid urlset');
  const locs=[...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/g)].map(m=>decode(m[1]));
  if(!locs.length)issues.push(map+' empty');
  for(const loc of locs){
   let u;try{u=new URL(loc)}catch{issues.push('invalid sitemap URL '+loc);continue}
   if(u.origin!==site.origin){issues.push('foreign sitemap URL '+loc);continue}
   if(u.search||u.hash)issues.push('noncanonical query/fragment '+loc);
   if(!u.pathname.endsWith('/'))issues.push('non-trailing-slash URL '+loc);
   if(entries.has(loc)){duplicates.push({url:loc,first:entries.get(loc),again:map});continue}
   entries.set(loc,map);
  }
 }
 // Repeated URLs across separate sitemaps are not automatically errors, but report them.
 const groups=new Map();
 for(const url of entries.keys()){const u=new URL(url),key=group(u.pathname);const arr=groups.get(key)||[];arr.push(u.pathname);groups.set(key,arr)}
 const must=['/','/daeri/','/taksong/','/reviews/'];
 for(const p of must)if(!entries.has(new URL(p,site).href))issues.push('core page missing from sitemaps: '+p);
 const paths=all?[...entries.keys()].map(x=>new URL(x).pathname):[...new Set([...must,...[...groups.entries()].flatMap(([k,a])=>a.slice(0,maxSample))])];
 for(let i=0;i<paths.length;i+=concurrency){
  const batch=paths.slice(i,i+concurrency);
  const checked=await Promise.all(batch.map(async p=>{
   const out={path:p,group:group(p),issues:[]};
   try{
    const r=await get(new URL(p,base));out.status=r.status;
    if(r.status!==200)out.issues.push('HTTP '+r.status);
    if(new URL(r.url).pathname!==p)out.issues.push('redirect to '+r.url);
    if(r.status===200){
     const h=r.text;const title=tags(h,'title'),h1=tags(h,'h1');
     const desc=attribute(h,'meta','name','description','content');
     const canonical=attribute(h,'link','rel','canonical','href');
     out.title=title[0]||'';out.h1Count=h1.length;out.descriptionLength=desc.length;
     if(title.length!==1||!title[0])out.issues.push('title count '+title.length);
     if(h1.length!==1)out.issues.push('H1 count '+h1.length);
     if(!desc)out.issues.push('missing description');
     if(!canonical)out.issues.push('missing canonical');
     else {try{const c=new URL(canonical);if(c.origin!==site.origin||c.pathname!==p)out.issues.push('canonical mismatch '+canonical)}catch{out.issues.push('invalid canonical')}}
     const robots=attribute(h,'meta','name','robots','content');
     if(/noindex/i.test(robots))out.issues.push('noindex');
    }
   }catch(e){out.issues.push('request: '+e.message)}
   return out;
  }));
  results.push(...checked);
 }
 const failed=results.filter(x=>x.issues.length);
 const report={checkedAt:new Date().toISOString(),site:site.origin,preview:base.origin,mode:all?'full HTTP':'regional samples + full XML inventory',sitemaps:maps,uniqueSitemapUrls:entries.size,duplicateSitemapEntries:duplicates.slice(0,30),duplicateEntryCount:duplicates.length,groupCounts:Object.fromEntries([...groups].map(([k,a])=>[k,a.length])),httpChecked:results.length,httpFailed:failed.length,issues:[...issues,...failed.flatMap(x=>x.issues.map(y=>x.path+': '+y))],failedSamples:failed.slice(0,100),passed:issues.length===0&&failed.length===0};
 console.log(JSON.stringify(report,null,2));
 if(process.env.SEO_REPORT_PATH)fs.writeFileSync(process.env.SEO_REPORT_PATH,JSON.stringify(report,null,2));
 process.exitCode=report.passed?0:1;
})().catch(e=>{console.error(e);process.exitCode=1});
