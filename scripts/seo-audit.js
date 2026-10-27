#!/usr/bin/env node
'use strict';
// Smart24 SEO audit: read-only checks. Usage: node scripts/seo-audit.js [base URL]
// Defaults to localhost to avoid accidentally crawling production.
const base = new URL(process.argv[2] || 'http://localhost:3000/');
const routes = ['/', '/daeri/', '/taksong/', '/reviews/', '/sitemap.xml', '/robots.txt'];
const timeout = 12000;
const config = require('../data/seo-pages.json');
const expectations = new Map(config.pages.map(p=>[p.path,p]));
function textContent(html, tag) {
  const m = html.match(new RegExp('<'+tag+'\\b[^>]*>([\\s\\S]*?)<\\/'+tag+'>', 'gi')) || [];
  return m.map(x=>x.replace(/<[^>]*>/g,' ').replace(/\\s+/g,' ').trim());
}
function meta(html, name) {
  const tags = html.match(/<meta\\b[^>]*>/gi) || [];
  return tags.filter(t=>new RegExp('\\b(?:name|property)\\s*=\\s*["\\\']'+name+'["\\\']','i').test(t))
    .map(t=>(t.match(/\\bcontent\\s*=\\s*(["\\\'])(.*?)\\1/i)||[])[2]||'');
}
function canonical(html) {
  const links=html.match(/<link\\b[^>]*>/gi)||[];
  return links.filter(t=>/\\brel\\s*=\\s*["\\\']canonical["\\\']/i.test(t))
    .map(t=>(t.match(/\\bhref\\s*=\\s*(["\\\'])(.*?)\\1/i)||[])[2]||'');
}
function jsonLd(html) {
  return [...html.matchAll(/<script\\b[^>]*type=["\\\']application\\/ld\\+json["\\\'][^>]*>([\\s\\S]*?)<\\/script>/gi)].map(m=>m[1]);
}
async function inspect(route) {
  const url = new URL(route, base), issues=[], info={route,url:url.href};
  try {
    const response=await fetch(url,{signal:AbortSignal.timeout(timeout),redirect:'follow',headers:{'user-agent':'Smart24-SEO-Audit/1.0'}});
    info.status=response.status;info.finalUrl=response.url;info.contentType=response.headers.get('content-type')||'';
    if(!response.ok)issues.push('HTTP '+response.status);
    const body=await response.text();
    if(route==='/robots.txt'){if(!/User-agent:/i.test(body))issues.push('robots.txt missing User-agent');if(/Disallow:\s*\//i.test(body))issues.push('Check robots.txt disallow rules');}
    else if(route==='/sitemap.xml'){if(!/<(?:urlset|sitemapindex)\b/i.test(body))issues.push('Invalid sitemap root');}
    else {
      const titles=textContent(body,'title'),h1=textContent(body,'h1'),descs=meta(body,'description'),canon=canonical(body),robots=meta(body,'robots'),schema=jsonLd(body);
      Object.assign(info,{title:titles[0]||'',description:descs[0]||'',h1:h1[0]||'',canonical:canon[0]||'',robots:robots[0]||'',jsonLdCount:schema.length});
      if(titles.length!==1||!titles[0])issues.push('Expected exactly one nonempty title; found '+titles.length);
      if(descs.length!==1||!descs[0])issues.push('Expected exactly one nonempty meta description; found '+descs.length);
      if(h1.length!==1||!h1[0])issues.push('Expected exactly one nonempty H1; found '+h1.length);
      if(canon.length!==1)issues.push('Expected exactly one canonical; found '+canon.length);
      else {try{const c=new URL(canon[0]);if(c.origin!==url.origin)issues.push('Canonical origin differs from audited host');if(c.pathname!==url.pathname)issues.push('Canonical path differs from page path');}catch{issues.push('Invalid canonical URL')}}
      if(robots.some(v=>/noindex/i.test(v)))issues.push('Page has noindex');
      const expected=expectations.get(route);
      if(expected){
        if(expected.title && titles[0]!==expected.title)issues.push('Title differs from configured value');
        if(expected.description && descs[0]!==expected.description)issues.push('Description differs from configured value');
        if(expected.titleContains && !String(titles[0]||'').includes(expected.titleContains))issues.push('Title missing required keyword: '+expected.titleContains);
        if(expected.descriptionContains && !String(descs[0]||'').includes(expected.descriptionContains))issues.push('Description missing required keyword: '+expected.descriptionContains);
      }
      if(!schema.length)issues.push('No JSON-LD structured data');
      for(let i=0;i<schema.length;i++)try{JSON.parse(schema[i])}catch{issues.push('Invalid JSON-LD block '+(i+1))}
    }
  }catch(e){issues.push('Request failed: '+e.message)}
  info.issues=issues;info.passed=issues.length===0;return info;
}
(async()=>{
  const pages=[];
  for(const route of routes)pages.push(await inspect(route));
  const result={site:base.href,checkedAt:new Date().toISOString(),passed:pages.every(p=>p.passed),pages};
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  process.exitCode=result.passed?0:1;
})().catch(e=>{console.error(e);process.exitCode=1});
