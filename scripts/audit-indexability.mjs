// Read-only SEO indexability audit. This is not proof of Naver indexing.
// Run: node scripts/audit-indexability.mjs [https://jeongukdaeri.kr]
// All sitemap URLs are checked, including recursively linked sitemap indexes.
import {writeFileSync} from 'node:fs';
const origin=(process.argv[2]||'https://jeongukdaeri.kr').replace(/\/$/,'');
const sitemapPaths=['/sitemap-all.xml','/sitemap-history.xml','/sitemap.xml','/sitemap-priority.xml','/sitemap-reviewed-routes.xml','/sitemap-taksong.xml','/sitemap-daeri.xml'];
const unescapeXml=s=>s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const all=new Map(),sitemapErrors=[],processed=new Set();
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url){
 const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),15000);
 try{return await fetch(url,{redirect:'follow',signal:ctrl.signal,headers:{'User-Agent':'Smart24-ReadOnlyIndexabilityAudit/1.0'}})}
 finally{clearTimeout(timer)}
}
function urls(xml){return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(m=>unescapeXml(m[1].trim()))}
async function scanSitemap(url,depth=0){
 if(processed.has(url)||depth>4)return;
 processed.add(url);
 try{
  const response=await get(url),body=await response.text();
  if(!response.ok||!/<(?:urlset|sitemapindex)\b/i.test(body))throw Error('HTTP '+response.status+' or invalid sitemap XML');
  const entries=urls(body);
  if(/<sitemapindex\b/i.test(body)){for(const child of entries)await scanSitemap(child,depth+1);return}
  for(const link of entries){
   let u;try{u=new URL(link)}catch{sitemapErrors.push('Malformed URL '+link);continue}
   if(u.origin!==origin){sitemapErrors.push('Off-domain URL '+link);continue}
   const normalized=u.origin+u.pathname+(u.search||'');
   const row=all.get(normalized)||{url:normalized,listedIn:[]};
   row.listedIn.push(url);all.set(normalized,row);
  }
 }catch(e){sitemapErrors.push(url+': '+String(e))}
}
for(const path of sitemapPaths)await scanSitemap(origin+path);
const list=[...all.values()];
console.log('Sitemap URLs discovered:',list.length,'Sitemap errors:',sitemapErrors.length);
let current=0,done=0;const results=Array(list.length);
async function worker(){
 while(true){
  const i=current++;if(i>=list.length)return;
  const item=list[i];let status=0,finalUrl='',canonical='',robots='',title='',problem=[];
  try{
   const r=await get(item.url);status=r.status;finalUrl=r.url;
   const type=r.headers.get('content-type')||'';
   robots=r.headers.get('x-robots-tag')||'';
   if(!r.ok)problem.push('http_error');
   if(r.redirected)problem.push('redirect');
   if(!/text\/html/i.test(type))problem.push('not_html');
   if(/noindex/i.test(robots))problem.push('x_robots_noindex');
   if(/text\/html/i.test(type)){
    const html=await r.text();
    const cm=html.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\bhref=["']([^"']+)["']/i)
      ||html.match(/<link\b(?=[^>]*\bhref=["']([^"']+)["'])[^>]*\brel=["']canonical["']/i);
    canonical=cm?new URL(cm[1],r.url).href:'';
    const meta=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]);
    if(meta.some(tag=>/\bname=["']robots["']/i.test(tag)&&/noindex/i.test(tag)))problem.push('meta_noindex');
    const t=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);title=t?t[1].replace(/\s+/g,' ').trim():'';
    if(!canonical)problem.push('missing_canonical');
    else if(canonical!==item.url)problem.push('canonical_mismatch');
    if(!title)problem.push('missing_title');
    if(/<meta\b[^>]*http-equiv=["']refresh["']/i.test(html))problem.push('meta_refresh');
   }
  }catch(e){problem.push(e?.name==='AbortError'?'timeout':'fetch_error:'+String(e).slice(0,100))}
  results[i]={...item,status,finalUrl,canonical,robots,title,problems:problem};
  done++;
  if(done%500===0)console.log('Checked',done,'/',list.length);
  await delay(100);
 }
}
await Promise.all(Array.from({length:4},worker));
const titles=new Map();
for(const r of results){if(!r?.title)continue;let a=titles.get(r.title)||[];a.push(r.url);titles.set(r.title,a)}
for(const r of results){if(r.title&&titles.get(r.title).length>1)r.problems.push('duplicate_title')}
const counts={discovered:list.length,checked:results.length,listedMultipleTimes:list.filter(r=>r.listedIn.length>1).length,passed:results.filter(r=>r.problems.length===0).length,
 issues:results.filter(r=>r.problems.length>0).length,sitemapErrors,
 byType:Object.fromEntries([...new Set(results.flatMap(r=>r.problems))].sort().map(k=>[k,results.filter(r=>r.problems.includes(k)).length]))};
const csv=s=>'"'+String(s??'').replace(/"/g,'""')+'"';
writeFileSync('indexability-audit.json',JSON.stringify({generatedAt:new Date().toISOString(),origin,counts,results},null,2));
writeFileSync('indexability-audit.csv',['url,status,final_url,canonical,title,problems,listed_in',
 ...results.map(r=>[r.url,r.status,r.finalUrl,r.canonical,r.title,r.problems.join(';'),r.listedIn.join(';')].map(csv).join(','))].join('\n'));
console.log(JSON.stringify(counts,null,2));
console.log('NOTE: 100% technical URL checks cannot establish Naver indexing. Check Naver Search Advisor URL inspection and site diagnosis separately.');
if(counts.issues||counts.sitemapErrors.length||counts.discovered===0)process.exitCode=1;
