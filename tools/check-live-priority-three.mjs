#!/usr/bin/env node
// Read-only, production-facing crawlability check for the first 3 SEO priorities.
// It does NOT measure or guarantee Naver index inclusion or search ranking.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const ORIGIN=(process.env.SMART24_ORIGIN||'https://jeongukdaeri.kr').replace(/\/$/,'');
export const TARGETS=Object.freeze([
 {label:'세종대리운전',path:'/daeri/sejong/',sitemap:'/sitemap-daeri.xml'},
 {label:'부산탁송',path:'/taksong/busan/',sitemap:'/sitemap-taksong.xml'},
 {label:'기장군탁송',path:'/taksong/busan/gijang-gun/',sitemap:'/sitemap-taksong.xml'}
]);
export function readPageSignals(html,path,origin=ORIGIN){
 const issues=[],plain=String(html||'');
 const canonical=plain.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\bhref=["']([^"']+)["']/i)
   ||plain.match(/<link\b(?=[^>]*\bhref=["']([^"']+)["'])[^>]*\brel=["']canonical["']/i);
 const meta=plain.match(/<meta\b(?=[^>]*\bname=["']robots["'])[^>]*\bcontent=["']([^"']+)["']/i);
 const href=canonical?.[1]||'';
 if(href!==origin+path)issues.push('canonical mismatch: '+href);
 if(!/<title[^>]*>[^<]+<\/title>/i.test(plain))issues.push('title missing');
 if(!/<h1\b[^>]*>[^<]+<\/h1>/i.test(plain))issues.push('h1 missing');
 if(!/<meta\b(?=[^>]*\bname=["']description["'])[^>]*\bcontent=["'][^"']+["']/i.test(plain))issues.push('description missing');
 if(meta&&/\bnoindex\b/i.test(meta[1]))issues.push('noindex meta');
 if(!/href=["']tel:18114294["']/i.test(plain))issues.push('mobile/direct-call link missing');
 if(!plain.includes('id="priority-region-guide"'))issues.push('priority regional guide missing');
 if(!/<script\b[^>]*type=["']application\/ld\+json["']/i.test(plain))issues.push('structured data missing');
 return {canonical:href,issues};
}
export function sitemapContains(xml,url){
 return [...String(xml||'').matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)]
   .some(m=>m[1].trim().replace(/&amp;/g,'&')===url);
}
async function get(path){
 const res=await fetch(ORIGIN+path,{redirect:'follow',
  headers:{'user-agent':'Smart24-ReadOnly-SEO-Three/1.0','cache-control':'no-cache','accept':'text/html,application/xml,application/json'},
  signal:AbortSignal.timeout(25000)});
 return {status:res.status,url:res.url,robots:res.headers.get('x-robots-tag')||'',body:await res.text()};
}
export async function run(){
 const reports=[],issues=[],sitemapCache=new Map();
 const expectedHash=createHash('sha256').update(readFileSync(new URL('../server.js',import.meta.url))).digest('hex');
 let release='unknown';
 try{
  const health=await get('/health/seo.json');
  if(health.status!==200)issues.push('health HTTP '+health.status);
  else {
   const data=JSON.parse(health.body);
   release=data.deployment_hashes?.['server.js']||'unknown';
   if(release!==expectedHash)issues.push('Cloudtype server.js does not match GitHub main');
  }
 }catch(e){issues.push('health inspection: '+String(e.message||e));}
 for(const target of TARGETS){
  const errors=[];
  let status=0,canonical='';
  try{
   const page=await get(target.path);status=page.status;
   if(status!==200)errors.push('HTTP '+status);
   if(/noindex/i.test(page.robots))errors.push('X-Robots-Tag noindex');
   const result=readPageSignals(page.body,target.path);
   canonical=result.canonical;errors.push(...result.issues);
   if(!sitemapCache.has(target.sitemap))sitemapCache.set(target.sitemap,await get(target.sitemap));
   const sitemap=sitemapCache.get(target.sitemap);
   if(sitemap.status!==200)errors.push('sitemap HTTP '+sitemap.status);
   else if(!sitemapContains(sitemap.body,ORIGIN+target.path))errors.push('URL missing from '+target.sitemap);
  }catch(e){errors.push(String(e.message||e));}
  const report={label:target.label,url:ORIGIN+target.path,status,canonical,issues:errors};
  reports.push(report);
  if(errors.length)issues.push(target.label+': '+errors.join('; '));
 }
 const summary={checkedAt:new Date().toISOString(),origin:ORIGIN,expectedGitHubRelease:expectedHash.slice(0,16),
  liveRelease:String(release).slice(0,16),checks:reports,problems:issues,
  note:'Technical public HTTP checks; Naver indexing, impressions and ranking are not measured.'};
 console.log(JSON.stringify(summary,null,2));
 if(process.env.GITHUB_STEP_SUMMARY){
  const {appendFileSync}=await import('node:fs');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '### 3 priority regional URLs: live SEO verification\n\n'+
    reports.map(r=>'- '+r.label+': HTTP '+r.status+'; '+(r.issues.length?r.issues.join(', '):'pass')).join('\n')+
    '\n\nGitHub/Cloudtype server.js: '+(release===expectedHash?'MATCH':'NOT MATCHED')+
    '\n\n**This is not confirmation of Naver indexing.**\n');
 }
 if(issues.length)process.exitCode=1;
 return summary;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])await run();
