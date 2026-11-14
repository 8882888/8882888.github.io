// Read-only synthetic Yeti user-agent check of live crawlability.
// This is NOT evidence that Naver indexed a URL, or that the real Yeti crawler's IP was allowed.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {blockedXRobotsIndexAgents,blockedMetaIndexAgents,naverRobotsDisallowAll} from './indexability-scope.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const origin=(process.env.LIVE_SITE_URL||'https://jeongukdaeri.kr').replace(/\/$/,'');
const userAgent='Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)';
const provinces=['seoul','busan','daegu','incheon','gwangju','daejeon','ulsan','sejong',
 'gyeonggi','gangwon','chungbuk','chungnam','jeonbuk','jeonnam','gyeongbuk','gyeongnam','jeju'];
const provincePages=provinces.flatMap(province=>['/daeri/'+province+'/','/taksong/'+province+'/']);
const paths=[...new Set([
 '/','/taksong/','/daeri/','/service/taksong/','/service/long-distance-taksong/',
 '/service/long-distance-daeri/','/service/corporate/','/service/golf/','/fare/',
 '/coverage/','/region/','/recruit/daeri/','/recruit/taksong/','/reviews/history/',
 '/reviews/taksong/','/reviews/ride-record-stories/','/daeri/tourist-spots/',
 '/business/','/business/used-car/','/business/rental-car/','/business/export-port/',
 '/business/scrapyard/','/business/auction/','/taksong/busan/','/daeri/busan/',
 '/taksong/daegu/','/daeri/daegu/','/taksong/busan/gijang-gun/',
 '/taksong/jeju/','/region/innovation-cities/','/special/cycling-trail-transport/',
 '/route-taksong/centers/',
 // Explicitly protect the province hubs and four innovation-city search targets.
 ...provincePages,
 '/daeri/gangwon/wonju-si/','/taksong/gangwon/wonju-si/',
 '/daeri/gyeongnam/jinju-si/','/taksong/gyeongnam/jinju-si/',
 '/daeri/jeonnam/naju-si/','/taksong/jeonnam/naju-si/',
 '/daeri/gyeongbuk/gimcheon-si/','/taksong/gyeongbuk/gimcheon-si/'
])];
const sourceRobots=fs.readFileSync(path.join(root,'robots.txt'),'utf8');
const srcSitemaps=[...sourceRobots.matchAll(/^Sitemap:\s*(\S+)/gim)].map(m=>m[1]);
const result={generatedAt:new Date().toISOString(),origin,scope:'live public HTTP checks using a synthetic Yeti user agent; not Naver account data',naverIndexed:null,reportedNaverIndexed:null,sourceSitemaps:srcSitemaps,liveSitemaps:[],siteMapChecks:[],pageChecks:[],crawlerFindings:[],warnings:[]};
const xmlUnescape=s=>String(s||'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const locs=xml=>[...xml.matchAll(/<loc\b[^>]*>([^<]+)<\/loc>/gi)].map(m=>xmlUnescape(m[1].trim()));
const extract=(s,pattern)=>s.match(pattern)?.[1]?.replace(/\s+/g,' ').trim()||'';
const content=(s,needle)=>new RegExp('<meta\\s+[^>]*name=["\\x27]'+needle+'["\\x27][^>]*>','i').exec(s)?.[0]||'';
const htmlAttr=(tag,name)=>{
 const match=String(tag||'').match(new RegExp('\\s'+name+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>]+))','i'));
 return match?(match[1]??match[2]??match[3]??''):'';
};
const metaValue=(tag)=>htmlAttr(tag,'content');
const namedMeta=(html,name)=>[...html.matchAll(/<meta\b[^>]*>/gi)]
 .map(m=>m[0]).find(tag=>htmlAttr(tag,'name').toLowerCase()===name)||'';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function read(route){
 const url=new URL(route,origin);
 const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{'User-Agent':userAgent,'Accept':'text/html,application/xml,text/plain,*/*','Cache-Control':'no-cache'}});
 const body=await response.text();
 return {status:response.status,contentType:response.headers.get('content-type')||'',location:response.headers.get('location')||'',xRobots:response.headers.get('x-robots-tag')||'',body};
}
function safeUrl(value){
 try{const u=new URL(value,origin);return u.origin===origin && !u.search && !u.hash && u.pathname.endsWith('/');}
 catch{return false}
}
async function checkRobots(){
 try{
  const r=await read('/robots.txt');
  result.robotsStatus=r.status;
  result.liveSitemaps=[...r.body.matchAll(/^Sitemap:\s*(\S+)/gim)].map(m=>m[1]);
  if(r.status!==200)result.crawlerFindings.push('robots_http_'+r.status);
  if(naverRobotsDisallowAll(r.body))result.crawlerFindings.push('robots_yeti_disallow_all_manual_review');
  if(result.liveSitemaps.length!==8)result.crawlerFindings.push('live_sitemaps_'+result.liveSitemaps.length+'_expected_8');
  for(const source of srcSitemaps)if(!result.liveSitemaps.includes(source))result.crawlerFindings.push('missing_live_sitemap_declaration_'+source);
 }catch(e){result.crawlerFindings.push('robots_fetch_error_'+String(e).slice(0,130));}
}
async function checkSitemap(src){
 const p=new URL(src).pathname;
 const item={url:src,status:0,kind:'',entries:0,invalidUrls:0,duplicates:0,problems:[]};
 try{
  const r=await read(p);
  item.status=r.status;
  if(r.status!==200)item.problems.push('http_'+r.status);
  if(r.location)item.problems.push('redirect');
  const index=/<sitemapindex\b/i.test(r.body),urlset=/<urlset\b/i.test(r.body);
  item.kind=index?'sitemapindex':urlset?'urlset':'invalid';
  if(!index&&!urlset)item.problems.push('invalid_xml_root');
  const entries=locs(r.body);item.entries=entries.length;
  const seen=new Set();
  for(const loc of entries){
   try{
    const u=new URL(loc);
    if(u.origin!==origin||u.search||u.hash)item.invalidUrls++;
    else if(!index&&!safeUrl(loc))item.invalidUrls++;
   }catch{item.invalidUrls++;}
   if(seen.has(loc))item.duplicates++;seen.add(loc);
  }
  if(item.invalidUrls)item.problems.push('off_host_query_or_noncanonical_path');
  if(item.duplicates)item.problems.push('duplicate_urls');
  if(Buffer.byteLength(r.body)>10_000_000)item.problems.push('over_10mb');
  if(entries.length>50000)item.problems.push('over_50000_entries');
  if(blockedXRobotsIndexAgents(r.xRobots).some(agent=>agent==='robots'||agent==='yeti'))item.problems.push('x_robots_noindex');
 }catch(e){item.problems.push('fetch_error_'+String(e).slice(0,110));}
 result.siteMapChecks.push(item);
}
async function checkPage(p){
 const item={url:new URL(p,origin).href,status:0,title:'',h1:'',canonical:'',visibleChars:0,problems:[]};
 try{
  const r=await read(p);item.status=r.status;
  if(r.status!==200){item.problems.push(r.status>=300&&r.status<400?'collection_limited_redirect':'collection_limited_http_'+r.status);item.location=r.location;}
  if(!/text\/html/i.test(r.contentType))item.problems.push('not_html');
  if(blockedXRobotsIndexAgents(r.xRobots).some(agent=>agent==='robots'||agent==='yeti'))item.problems.push('index_excluded_x_robots');
  const html=r.body;
  item.title=extract(html,/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const descriptionTag=namedMeta(html,'description');
  item.description=metaValue(descriptionTag);
  const blocked=blockedMetaIndexAgents(html);
  if(blocked.some(agent=>agent==='robots'||agent==='yeti'))item.problems.push('index_excluded_meta_noindex');
  const metaRobots=metaValue(namedMeta(html,'robots'))+' '+metaValue(namedMeta(html,'yeti'));
  if(/\bnofollow\b/i.test(metaRobots))item.problems.push('crawl_links_blocked_nofollow');
  const canonicals=[...html.matchAll(/<link\b[^>]*>/gi)]
   .map(m=>m[0]).filter(tag=>htmlAttr(tag,'rel').toLowerCase().split(/\s+/).includes('canonical'));
  const href=canonicals.length===1?htmlAttr(canonicals[0],'href'):'';
  if(canonicals.length!==1)item.problems.push('index_excluded_canonical_count_'+canonicals.length);
  else {
   try{item.canonical=new URL(href,origin).href;}
   catch{item.problems.push('index_excluded_invalid_canonical');}
   if(item.canonical!==item.url)item.problems.push('index_excluded_canonical_mismatch');
  }
  if(!item.title)item.problems.push('seo_missing_title');
  if(!item.description)item.problems.push('seo_missing_description');
  const heads=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  item.h1=heads.length?heads[0][1].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim():'';
  if(heads.length!==1)item.problems.push('seo_h1_count_'+heads.length);
  const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  item.visibleChars=visible.length;
  if(visible.length<250)item.problems.push('quality_thin_content_review');
  if(/<meta\b[^>]*http-equiv=["']refresh["']/i.test(html))item.problems.push('index_excluded_meta_refresh');
 }catch(e){item.problems.push('collection_limited_fetch_error_'+String(e).slice(0,120));}
 result.pageChecks.push(item);
}
await checkRobots();
if(srcSitemaps.length!==8)result.crawlerFindings.push('source_sitemaps_'+srcSitemaps.length+'_expected_8');
for(const sitemap of srcSitemaps){await checkSitemap(sitemap);await sleep(90);}
for(let i=0;i<paths.length;i+=4){
 await Promise.all(paths.slice(i,i+4).map(checkPage));
 await sleep(170);
}
const titles=new Map();
for(const p of result.pageChecks){if(!p.title)continue;const a=titles.get(p.title)||[];a.push(p);titles.set(p.title,a);}
for(const p of result.pageChecks)if(p.title&&titles.get(p.title).length>1)p.problems.push('quality_duplicate_title_in_sample');
result.summary={
 expectedSitemaps:8,sourceSitemaps:srcSitemaps.length,liveSitemaps:result.liveSitemaps.length,
 checkedPages:result.pageChecks.length,provinceHubPages:provincePages.length,cleanPages:result.pageChecks.filter(p=>p.problems.length===0).length,
 collectionLimitations:result.pageChecks.filter(p=>p.problems.some(x=>x.startsWith('collection_limited'))).length,
 excludedOrCanonical:result.pageChecks.filter(p=>p.problems.some(x=>x.startsWith('index_excluded'))).length,
 siteMapProblems:result.siteMapChecks.filter(p=>p.problems.length).length,
 sourceOrCrawlerProblems:result.crawlerFindings.length,
 naverRealIndexed:null
};
const csv=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
fs.writeFileSync('seo-priority-live-report.json',JSON.stringify(result,null,2));
fs.writeFileSync('seo-priority-live-report.csv',[
 'url,status,title,h1,canonical,visible_chars,problems',
 ...result.pageChecks.map(p=>[p.url,p.status,p.title,p.h1,p.canonical,p.visibleChars,p.problems.join(';')].map(csv).join(','))
].join('\n'));
const problems=[
 ...result.crawlerFindings.map(v=>'- robots / sitemap declaration: '+v),
 ...result.siteMapChecks.filter(x=>x.problems.length).map(x=>'- '+x.url+': '+x.problems.join(', ')),
 ...result.pageChecks.filter(x=>x.problems.length).map(x=>'- '+x.url+': '+x.problems.join(', '))
];
fs.writeFileSync('seo-priority-live-report.md',[
 '# Smart24 public crawlability: priority check','',
 'Generated: '+result.generatedAt,'',
 'This is **not Naver Search Advisor index data**. Real indexed count must be read from the authenticated dashboard.',
 'Synthetic Yeti user-agent requests do not prove that genuine Naver crawler IPs can access the site.','',
 '## Counts','',
 ...Object.entries(result.summary).map(([k,v])=>'- '+k+': '+String(v)),'',
 '## Findings','',...(problems.length?problems:['- No technical problems detected in this limited sample.']),'',
 'Distinct buckets: collection-limited HTTP/redirect/fetch; index-excluded meta/canonical; SEO/quality review.',
 'A 200 response or successful sitemap submission does not prove Naver indexing.'
].join('\n'));
console.log(JSON.stringify(result.summary,null,2));
if(problems.length){console.log('Findings:',problems.slice(0,30).join('\n'));}
if(result.crawlerFindings.length||result.siteMapChecks.some(x=>x.problems.length)||result.pageChecks.some(x=>x.problems.some(y=>/^(collection_limited|index_excluded)/.test(y))))process.exitCode=1;
