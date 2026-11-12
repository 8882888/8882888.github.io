// Read-only SEO indexability audit. This is not proof of Naver indexing.
// Run: node scripts/audit-indexability.mjs [https://jeongukdaeri.kr]
// All sitemap URLs are checked, including recursively linked sitemap indexes.
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {reviewLinkCoverage} from './indexability-scope.mjs';
const origin=(process.argv[2]||'https://jeongukdaeri.kr').replace(/\/$/,'');
const transportOrigin=process.env.AUDIT_TRANSPORT_ORIGIN||origin;
const sitemapPaths=['/sitemap-all.xml','/sitemap-history.xml','/sitemap.xml','/sitemap-priority.xml','/sitemap-reviewed-routes.xml','/sitemap-taksong.xml','/sitemap-daeri.xml'];
const unescapeXml=s=>s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const all=new Map(),sitemapErrors=[],processed=new Set(),advertisedSitemaps=new Set(sitemapPaths.map(p=>origin+p));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url){
 const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),15000);
 try{return await fetch(transportOrigin===origin?url:transportOrigin+new URL(url).pathname+new URL(url).search,{redirect:'follow',signal:ctrl.signal,headers:{'User-Agent':'Smart24-ReadOnlyIndexabilityAudit/1.0'}})}
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
// A disallow rule or unavailable robots.txt can suppress crawl even when pages return 200.
const crawlerDiagnostics=[];
try{
 const robotsResponse=await get(origin+'/robots.txt');
 const robotsBody=await robotsResponse.text();
 if(!robotsResponse.ok) crawlerDiagnostics.push('robots_http_'+robotsResponse.status);
 for(const match of robotsBody.matchAll(/^sitemap\s*:\s*(https?:\/\/\S+)/gim))advertisedSitemaps.add(match[1]);
 const lines=robotsBody.split(/\r?\n/).map(x=>x.trim());
 let group='';let relevant=false;
 for(const line of lines){
  if(/^user-agent\s*:/i.test(line)){group=line.split(':').slice(1).join(':').trim().toLowerCase();relevant=group==='*'||group==='yeti';}
  if(relevant&&/^disallow\s*:\s*\/\s*(?:#.*)?$/i.test(line))crawlerDiagnostics.push('robots_disallow_all_for_'+group);
 }
 if(!/sitemap\s*:/i.test(robotsBody))crawlerDiagnostics.push('robots_missing_sitemap_declaration');
}catch(error){crawlerDiagnostics.push('robots_fetch_error:'+String(error).slice(0,120))}
for(const url of advertisedSitemaps)await scanSitemap(url);
const list=[...all.values()];
console.log('Sitemap URLs discovered:',list.length,'Sitemap errors:',sitemapErrors.length);
let current=0,done=0;const results=Array(list.length);
async function worker(){
 while(true){
  const i=current++;if(i>=list.length)return;
  const item=list[i];let status=0,finalUrl='',canonical='',robots='',title='',bodyHash='',hasRideLink=false,problem=[];
  try{
   const r=await get(item.url);status=r.status;finalUrl=transportOrigin===origin?r.url:origin+new URL(r.url).pathname+new URL(r.url).search;
   const type=r.headers.get('content-type')||'';
   robots=r.headers.get('x-robots-tag')||'';
   if(!r.ok)problem.push('http_error');
   if(r.redirected)problem.push('redirect');
   if(!/text\/html/i.test(type))problem.push('not_html');
   if(/noindex/i.test(robots))problem.push('x_robots_noindex');
   if(/text\/html/i.test(type)){
    const html=await r.text();
    hasRideLink=/href=["'][^"']*\/reviews\/(?:history|local|ride-record-stories|verified)/i.test(html);
    const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    if(visible.length>150)bodyHash=createHash('sha256').update(visible).digest('hex').slice(0,20);
    const cm=html.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\bhref=["']([^"']+)["']/i)
      ||html.match(/<link\b(?=[^>]*\bhref=["']([^"']+)["'])[^>]*\brel=["']canonical["']/i);
    canonical=cm?new URL(cm[1],finalUrl).href:'';
    const meta=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]);
    if(meta.some(tag=>/\bname=["']robots["']/i.test(tag)&&/noindex/i.test(tag)))problem.push('meta_noindex');
    const t=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);title=t?t[1].replace(/\s+/g,' ').trim():'';
    if(!canonical)problem.push('missing_canonical');
    else if(canonical!==item.url)problem.push('canonical_mismatch');
    if(!title)problem.push('missing_title');
    if(/<meta\b[^>]*http-equiv=["']refresh["']/i.test(html))problem.push('meta_refresh');
   }
  }catch(e){problem.push(e?.name==='AbortError'?'timeout':'fetch_error:'+String(e).slice(0,100))}
  results[i]={...item,status,finalUrl,canonical,robots,title,bodyHash,hasRideLink,problems:problem};
  done++;
  if(done%500===0)console.log('Checked',done,'/',list.length);
  await delay(transportOrigin===origin?100:0);
 }
}
await Promise.all(Array.from({length:4},worker));
const titles=new Map();
for(const r of results){if(!r?.title)continue;let a=titles.get(r.title)||[];a.push(r.url);titles.set(r.title,a)}
for(const r of results){if(r.title&&titles.get(r.title).length>1)r.problems.push('duplicate_title')}
const bodies=new Map();
for(const r of results){if(!r.bodyHash)continue;const group=bodies.get(r.bodyHash)||[];group.push(r.url);bodies.set(r.bodyHash,group)}
for(const r of results){if(r.bodyHash&&bodies.get(r.bodyHash).length>1)r.problems.push('duplicate_exact_body')}
const regionalCoverage=reviewLinkCoverage(results);
const counts={discovered:list.length,checked:results.length,listedMultipleTimes:list.filter(r=>r.listedIn.length>1).length,...regionalCoverage,passed:results.filter(r=>r.problems.length===0).length,
 issues:results.filter(r=>r.problems.length>0).length,sitemapErrors,crawlerDiagnostics,
 byType:Object.fromEntries([...new Set(results.flatMap(r=>r.problems))].sort().map(k=>[k,results.filter(r=>r.problems.includes(k)).length]))};
const csv=s=>'"'+String(s??'').replace(/"/g,'""')+'"';
writeFileSync('indexability-audit.json',JSON.stringify({generatedAt:new Date().toISOString(),origin,transportOrigin,scope:transportOrigin===origin?'production HTTP':'local source responses; not production verification',counts,results},null,2));
writeFileSync('indexability-audit.csv',['url,status,final_url,canonical,title,body_hash,has_ride_link,problems,listed_in',
 ...results.map(r=>[r.url,r.status,r.finalUrl,r.canonical,r.title,r.bodyHash,r.hasRideLink,r.problems.join(';'),r.listedIn.join(';')].map(csv).join(','))].join('\n'));
const criticalTypes=new Set(['http_error','x_robots_noindex','meta_noindex','missing_canonical','canonical_mismatch','timeout','not_html']);
const critical=results.filter(r=>r.problems.some(p=>criticalTypes.has(p)||p.startsWith('fetch_error')));
const review=results.filter(r=>r.problems.length&&!critical.includes(r));
const lines=[
 '# Smart24 URL technical indexability audit',
 '',
 'Generated: '+new Date().toISOString(),
 'Scope: '+(transportOrigin===origin?'production HTTP':'local source responses; not production verification'),
 'Discovered: '+counts.discovered+' | Checked: '+counts.checked+' | Critical: '+critical.length+' | Review: '+review.length,
 'Canonical region-service landings: '+counts.regionalServicePages+' | Missing a link to the ride record archive: '+counts.regionalPagesWithoutReviewLink,
 'Recruitment, vehicle-type, travel and activity guides are excluded from locality evidence-link counts.',
 '',
 '> This audit measures technical indexability, not Naver confirmed index inclusion.',
 '',
 '## Critical URLs (first 100)',
 ...critical.slice(0,100).map(r=>'- '+r.url+' — '+r.problems.join(', ')),
 '',
 '## Review candidates (first 100)',
 ...review.slice(0,100).map(r=>'- '+r.url+' — '+r.problems.join(', ')),
 '',
 '## Sitemap and robots findings',
 ...[...sitemapErrors,...crawlerDiagnostics].map(x=>'- '+x),
 ''
];
writeFileSync('indexability-summary.md',lines.join('\n'));
console.log('Critical:',critical.length,'Review:',review.length);
console.log(JSON.stringify(counts,null,2));
console.log('NOTE: 100% technical URL checks cannot establish Naver indexing. Check Naver Search Advisor URL inspection and site diagnosis separately.');
if(counts.issues||counts.sitemapErrors.length||counts.crawlerDiagnostics.length||counts.discovered===0)process.exitCode=1;
