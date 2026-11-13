'use strict';
const {createHash}=require('node:crypto');
const start=new URL(process.argv[2]||'https://jeongukdaeri.kr/sitemap-all.xml');
const decode=value=>value.replace(/&(amp|quot|apos|lt|gt|#39);/g,(_,key)=>({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>','#39':"'"})[key]);
const attr=(tag,name)=>decode(tag.match(new RegExp('(?:^|\\s)'+name+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>]+))','i'))?.slice(1).find(Boolean)||'');
const locations=xml=>[...xml.matchAll(/<loc\b[^>]*>([^<]+)<\/loc>/gi)].map(x=>decode(x[1].trim()));
const urls=new Set(),maps=new Set(),issues=[],fingerprints=new Map();
const localityLevels={province:'시·도',city:'시',county:'군',district:'구',eup:'읍',myeon:'면',dong:'동',ri:'리'};
const localityCoverage=Object.fromEntries(Object.entries(localityLevels).map(([key,level])=>
 [key,{level,sitemapSeen:false,urls:new Set()}]));
const titles=new Map();
const fetchUrl=url=>fetch(url,{redirect:'manual',signal:AbortSignal.timeout(15000)});
async function sitemap(url){
 if(maps.has(url))return;
 maps.add(url);
 const match=new URL(url).pathname.match(/^\/sitemap-localities-([a-z]+)\.xml$/);
 const coverage=match&&Object.hasOwn(localityCoverage,match[1])?localityCoverage[match[1]]:null;
 if(coverage)coverage.sitemapSeen=true;
 try{
  const response=await fetchUrl(url);
  if(!response.ok)throw Error('HTTP '+response.status);
  const xml=await response.text(),entries=locations(xml);
  if(!/<(?:sitemapindex|urlset)\b/i.test(xml)||!entries.length)throw Error('Invalid or empty sitemap');
  for(const entry of entries){
   const target=new URL(entry,url);
   if(target.origin!==start.origin){issues.push({url:entry,reason:'external-sitemap-entry'});continue;}
   if(/<sitemapindex\b/i.test(xml))await sitemap(target.href);
   else {
    urls.add(target.href);
    coverage?.urls.add(target.href);
   }
  }
 }catch(error){issues.push({url,reason:'sitemap-fetch',detail:error.message});}
}
async function inspect(url){
 try{
  const response=await fetchUrl(url);
  if(response.status!==200){
   await response.body?.cancel();
   issues.push({url,reason:'http-status',status:response.status,location:response.headers.get('location')});
   return;
  }
  const html=await response.text();
  const title=decode(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').replace(/\s+/g,' ').trim();
  if(!title)issues.push({url,reason:'missing-title'});
  else{
   if(!titles.has(title))titles.set(title,[]);
   titles.get(title).push(url);
  }
  const canonicals=(html.match(/<link\b[^>]*>/gi)||[]).filter(tag=>attr(tag,'rel').toLowerCase().split(/\s+/).includes('canonical'));
  const canonical=canonicals.length===1&&attr(canonicals[0],'href');
  if(!canonical||new URL(canonical,url).href!==url)issues.push({url,reason:'canonical',canonical:canonical||null,count:canonicals.length});
  const robots=(html.match(/<meta\b[^>]*>/gi)||[]).filter(tag=>/^(robots|yeti)$/i.test(attr(tag,'name'))).map(tag=>attr(tag,'content'));
  if(/\b(?:noindex|none)\b/i.test([...robots,response.headers.get('x-robots-tag')].join(' ')))issues.push({url,reason:'noindex'});
  if(/\/(?:fare|long-distance|handover)\/$/.test(new URL(url).pathname)){
   const body=(html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||html)
    .replace(/<(script|style|nav|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
   const missing=Object.entries({fare:/요금|견적|비용/,reservation:/예약|출발 시각/,handover:/인수|인계|차키|키 전달/}).filter(([,pattern])=>!pattern.test(body)).map(([name])=>name);
   if(missing.length)issues.push({url,reason:'guide-topics-missing',missing});
   const hash=createHash('sha256').update(body).digest('hex');
   const group=fingerprints.get(hash)||[];
   group.push(url);
   fingerprints.set(hash,group);
  }
 }catch(error){issues.push({url,reason:'page-fetch',detail:error.message});}
}
async function main(){
 await sitemap(start.href);
 const pending=urls.values();
 await Promise.all(Array.from({length:4},async()=>{
  for(const url of pending)await inspect(url);
 }));
 const failedUrls=new Set(issues.map(issue=>issue.url));
 const localitySummary=Object.fromEntries(Object.entries(localityCoverage).map(([key,entry])=>
  [key,{level:entry.level,sitemapSeen:entry.sitemapSeen,urls:entry.urls.size,
   urlsWithFindings:[...entry.urls].filter(url=>failedUrls.has(url)).length}]));
 const identicalGuideGroups=[...fingerprints.values()].filter(group=>group.length>1);
 const blockers=new Set(['sitemap-fetch','external-sitemap-entry','http-status','canonical','noindex','page-fetch']);
 const priorityFindings=issues.filter(issue=>blockers.has(issue.reason));
 const duplicateTitles=[...titles].filter(([,pages])=>pages.length>1).map(([title,pages])=>({title,pages:pages.sort()}));
 process.stdout.write(JSON.stringify({checkedAt:new Date().toISOString(),sitemaps:maps.size,urls:urls.size,localitySummary,priorityFindings,duplicateTitles,issues,identicalGuideGroups},null,2)+'\n');
 if(issues.length||identicalGuideGroups.length||!urls.size)process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
