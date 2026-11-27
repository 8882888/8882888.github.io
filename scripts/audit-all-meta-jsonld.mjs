// Read-only FULL-SITEMAP metadata + JSON-LD audit. Diagnostics are not proof of Naver indexing.
// Run: node scripts/audit-indexability.mjs [https://jeongukdaeri.kr]
// All sitemap URLs are checked, including recursively linked sitemap indexes.
import {writeFileSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {focusLinkObservation,focusLinkCoverage,reviewLinkCoverage,regionalGuideCoverage,hasDirectRideRecordLink,blockedMetaIndexAgents,blockedXRobotsIndexAgents} from './indexability-scope.mjs';
import {fetchWithRetry} from './indexability-retry.mjs';
const origin=(process.argv[2]||'https://jeongukdaeri.kr').replace(/\/$/,'');
const transportOrigin=process.env.AUDIT_TRANSPORT_ORIGIN||origin;
const sitemapPaths=['/sitemap-all.xml','/sitemap-history.xml','/sitemap.xml','/sitemap-priority.xml','/sitemap-reviewed-routes.xml','/sitemap-published.xml','/sitemap-taksong.xml','/sitemap-daeri.xml'];
const unescapeXml=s=>s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const all=new Map(),sitemapErrors=[],processed=new Set(),advertisedSitemaps=new Set(sitemapPaths.map(p=>origin+p));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url){
 // Keep the deadline active while callers consume the response body, not only its headers.
 return fetch(transportOrigin===origin?url:transportOrigin+new URL(url).pathname+new URL(url).search,{redirect:'follow',signal:AbortSignal.timeout(15000),headers:{'User-Agent':'Smart24-ReadOnlyIndexabilityAudit/1.0'}});
}
function urls(xml){return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(m=>unescapeXml(m[1].trim()))}
async function scanSitemap(url,depth=0){
 if(processed.has(url)||depth>4)return;
 processed.add(url);
 try{
  const {response}=await fetchWithRetry(url,get),body=await response.text();
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
 const {response:robotsResponse}=await fetchWithRetry(origin+'/robots.txt',get);
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
const inventory=[...all.values()];
const maxSample=Number(process.env.AUDIT_MAX_URLS||0);
const auditWorkers=Number(process.env.AUDIT_WORKERS||4);
const auditLiveDelayMs=Number(process.env.AUDIT_LIVE_DELAY_MS||100);
if(!Number.isInteger(auditWorkers)||auditWorkers<1||auditWorkers>8)throw Error('AUDIT_WORKERS must be 1..8');
if(!Number.isInteger(auditLiveDelayMs)||auditLiveDelayMs<0||auditLiveDelayMs>10000)throw Error('AUDIT_LIVE_DELAY_MS must be 0..10000');
if(transportOrigin===origin)console.log('Production pacing: workers='+auditWorkers+', pause per completed URL='+auditLiveDelayMs+'ms');
const list=maxSample>0?inventory.filter((_,i)=>i%Math.max(1,Math.floor(inventory.length/maxSample))===0).slice(0,maxSample):inventory;
console.log('Sitemap URLs discovered:',list.length,'Sitemap errors:',sitemapErrors.length);
let current=0,done=0;const results=Array(list.length);
function saveCheckpoint(){
 const checked=results.filter(Boolean);
 const snapshot={generatedAt:new Date().toISOString(),origin,transportOrigin,
  scope:transportOrigin===origin?'production HTTP':'local source responses; not production verification',
  complete:false,duplicateAnalysisComplete:false,
  counts:{discovered:list.length,checked:checked.length,remaining:list.length-checked.length,sitemapErrors,crawlerDiagnostics},
  results:checked};
 writeFileSync('full-meta-jsonld-audit.json.tmp',JSON.stringify(snapshot));
 renameSync('full-meta-jsonld-audit.json.tmp','full-meta-jsonld-audit.json');
}
saveCheckpoint();
async function worker(){
 while(true){
  const i=current++;if(i>=list.length)return;
  const item=list[i];let status=0,finalUrl='',canonical='',robots='',title='',bodyHash='',hasRideLink=false,fetchAttempts=0,problem=[],otherBotNoindex=[];
  let focusObservation={};
  let metaDescription='',metaLength=0,metaCount=0,ogDescriptionLength=0,jsonldBlocks=0,jsonldTypes=[],metadataWarnings=[];
  try{
   const fetched=await fetchWithRetry(item.url,get);fetchAttempts=fetched.attempts;
   const r=fetched.response;status=r.status;finalUrl=transportOrigin===origin?r.url:origin+new URL(r.url).pathname+new URL(r.url).search;
   const type=r.headers.get('content-type')||'';
   robots=r.headers.get('x-robots-tag')||'';
   if(!r.ok)problem.push('http_error');
   if(r.redirected)problem.push('redirect');
   if(!/text\/html/i.test(type))problem.push('not_html');
   for(const agent of blockedXRobotsIndexAgents(robots)){
    if(agent==='robots')problem.push('x_robots_noindex');
    else if(agent==='yeti')problem.push('x_robots_yeti_noindex');
    else otherBotNoindex.push('header_'+agent);
   }
   if(/text\/html/i.test(type)){
    const html=await r.text();
    // Inspect the FINAL HTML, including JSON-LD embedded in body as well as head.
    // Count Unicode code points after decoding HTML entities, not HTML source bytes.
    const head=html.split(/<\/head>/i)[0];
    const attr=(tag,key)=>(tag.match(new RegExp('(?:\\s|<)'+key+'\\s*=\\s*(?:"([^\"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>]+))','i'))?.slice(1).find(x=>x!==undefined)||'');
    const entity=value=>String(value||'').replace(/&(#(?:x[\da-f]+|\d+)|amp|lt|gt|quot|apos|nbsp);/gi,(whole,k)=>{
      if(k[0]==='#'){const n=/^#x/i.test(k)?parseInt(k.slice(2),16):parseInt(k.slice(1),10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):whole}
      return ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[k.toLowerCase()]||whole;
    });
    const metaTags=[...head.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]);
    const metaValues=(key,value)=>metaTags.filter(t=>attr(t,key).toLowerCase()===value).map(t=>entity(attr(t,'content')).trim());
    const descriptions=metaValues('name','description'),ogDescriptions=metaValues('property','og:description');
    metaDescription=descriptions[0]||'';metaCount=descriptions.length;metaLength=Array.from(metaDescription).length;
    ogDescriptionLength=Array.from(ogDescriptions[0]||'').length;
    if(!metaDescription)problem.push('seo_missing_meta_description');
    if(metaCount>1)problem.push('seo_multiple_meta_description');
    if(metaLength>80)problem.push('seo_description_over_80');
    if(ogDescriptions.length>1)metadataWarnings.push('og_multiple_description');
    if(ogDescriptionLength>80)metadataWarnings.push('og_description_over_80');
    if(ogDescriptions.length&&metaDescription&&ogDescriptions[0]!==metaDescription)metadataWarnings.push('og_meta_description_different');
    const ld=[...html.matchAll(/<script\b(?=[^>]*\btype\s*=\s*["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi)];
    jsonldBlocks=ld.length;
    if(!jsonldBlocks)metadataWarnings.push('jsonld_missing');
    const schemas=[];
    for(const m of ld){try{
       const parsed=JSON.parse(m[1]);const add=node=>{
         if(Array.isArray(node))return node.forEach(add);
         if(!node||typeof node!=='object')return;
         schemas.push(node);
         if(Array.isArray(node['@graph']))add(node['@graph']);
       };add(parsed);
     }catch(e){problem.push('jsonld_invalid_json')}}
    jsonldTypes=[...new Set(schemas.flatMap(x=>[x['@type']].flat().filter(Boolean)))];
    if(jsonldBlocks&&(!jsonldTypes.length))metadataWarnings.push('jsonld_type_missing');
    if(jsonldBlocks&&!jsonldTypes.some(t=>['WebPage','CollectionPage','Article','BlogPosting','ItemPage','ProfilePage','FAQPage'].includes(t))
       &&item.url!==origin+'/')metadataWarnings.push('jsonld_page_type_missing');
    for(const schema of schemas.filter(x=>['WebPage','CollectionPage','Article','BlogPosting','ItemPage'].some(t=>[x['@type']].flat().includes(t)))){
      const declared=schema.url||(typeof schema['@id']==='string'?schema['@id'].split('#')[0]:'');
      if(declared){try{if(new URL(declared,origin).href!==item.url)metadataWarnings.push('jsonld_page_url_canonical_mismatch')}
      catch(e){metadataWarnings.push('jsonld_page_url_invalid')}}
    }
    hasRideLink=hasDirectRideRecordLink(html);
    focusObservation=focusLinkObservation(item.url,html);
    const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    if(visible.length>150)bodyHash=createHash('sha256').update(visible).digest('hex').slice(0,20);
    const cm=html.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\bhref=["']([^"']+)["']/i)
      ||html.match(/<link\b(?=[^>]*\bhref=["']([^"']+)["'])[^>]*\brel=["']canonical["']/i);
    canonical=cm?new URL(cm[1],finalUrl).href:'';
    // Generic/Yeti exclusions block Naver. Other engine-specific directives
    // are recorded for cross-engine SEO without inflating Naver blockers.
    for(const agent of blockedMetaIndexAgents(html)){
     if(agent==='robots')problem.push('meta_noindex');
     else if(agent==='yeti')problem.push('meta_yeti_noindex');
     else otherBotNoindex.push('meta_'+agent);
    }
    const t=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);title=t?t[1].replace(/\s+/g,' ').trim():'';
    if(!canonical)problem.push('missing_canonical');
    else if(canonical!==item.url)problem.push('canonical_mismatch');
    if(!title)problem.push('missing_title');
    if(/<meta\b[^>]*http-equiv=["']refresh["']/i.test(html))problem.push('meta_refresh');
   }
  }catch(e){fetchAttempts=e?.retryAttempts||fetchAttempts||1;
   problem.push((e?.name==='AbortError'||e?.name==='TimeoutError')?'timeout':'fetch_error:'+String(e).slice(0,100))}
  results[i]={...item,status,finalUrl,canonical,robots,title,bodyHash,hasRideLink,fetchAttempts,...focusObservation,
   description:metaDescription,descriptionLength:metaLength,descriptionTags:metaCount,ogDescriptionLength,
   jsonldBlocks,jsonldTypes,metadataWarnings:[...new Set(metadataWarnings)],
   otherBotNoindex:[...new Set(otherBotNoindex)],problems:problem};
  done++;
  if(done%500===0){saveCheckpoint();console.log('Checked',done,'/',list.length);}
  await delay(transportOrigin===origin?auditLiveDelayMs:0);
 }
}
await Promise.all(Array.from({length:auditWorkers},worker));
const titles=new Map();
for(const r of results){if(!r?.title)continue;let a=titles.get(r.title)||[];a.push(r.url);titles.set(r.title,a)}
for(const r of results){if(r.title&&titles.get(r.title).length>1)r.problems.push('duplicate_title')}
const bodies=new Map();
for(const r of results){if(!r.bodyHash)continue;const group=bodies.get(r.bodyHash)||[];group.push(r.url);bodies.set(r.bodyHash,group)}
for(const r of results){if(r.bodyHash&&bodies.get(r.bodyHash).length>1)r.problems.push('duplicate_exact_body')}
const descriptions=new Map();
for(const r of results){const value=String(r.description||'').replace(/\s+/g,' ').trim();if(!value)continue;const group=descriptions.get(value)||[];group.push(r);descriptions.set(value,group)}
const duplicateDescriptionGroups=[...descriptions.entries()].filter(([,group])=>group.length>1);
for(const [,group] of duplicateDescriptionGroups)for(const r of group)if(!r.metadataWarnings.includes('duplicate_meta_description_across_urls'))r.metadataWarnings.push('duplicate_meta_description_across_urls');
const duplicateDescriptionUrls=duplicateDescriptionGroups.reduce((sum,[,group])=>sum+group.length,0);
const duplicateDescriptionExtraUrls=duplicateDescriptionGroups.reduce((sum,[,group])=>sum+group.length-1,0);
const regionalCoverage=reviewLinkCoverage(results);
const guideCoverage=regionalGuideCoverage(results);
const technicallyClean=results.filter(r=>r.status===200&&r.problems.length===0).length;
const counts={discovered:inventory.length,checked:results.length,scope:transportOrigin===origin?'production-live':'local-source-not-deployed',
 sitemapOnly: true,
 descriptionOver80:results.filter(r=>r.descriptionLength>80).length,
 descriptionMissing:results.filter(r=>r.problems.includes('seo_missing_meta_description')).length,
 descriptionDuplicates:duplicateDescriptionUrls,
  descriptionDuplicateGroups:duplicateDescriptionGroups.length,
  descriptionDuplicateExtraUrls:duplicateDescriptionExtraUrls,
  descriptionMultipleTags:results.filter(r=>r.descriptionTags>1).length,
 jsonldMissing:results.filter(r=>r.metadataWarnings.includes('jsonld_missing')).length,
 jsonldPageTypeMissing:results.filter(r=>r.metadataWarnings.includes('jsonld_page_type_missing')).length,
 jsonldInvalid:results.filter(r=>r.problems.includes('jsonld_invalid_json')).length,
 ogDescriptionOver80:results.filter(r=>r.ogDescriptionLength>80).length,
 metaIssueUrls:results.filter(r=>r.problems.some(p=>p.startsWith('seo_')||p.startsWith('jsonld_'))||r.metadataWarnings.length).length,
 metadataClean:results.filter(r=>!r.problems.some(p=>p.startsWith('seo_')||p.startsWith('jsonld_'))&&!r.metadataWarnings.length).length,
 firstNaverIndexMilestoneTarget:10000,
 longTermNaverIndexTargetRange:[50000,100000],
 naverIndexed:null,technicallyClean,
 listedMultipleTimes:list.filter(r=>r.listedIn.length>1).length,
 transientRecoveredAfterRetry:results.filter(r=>r.fetchAttempts>1&&r.status===200).length,
 otherSearchBotsExcluded:results.filter(r=>r.otherBotNoindex.length).length,
 persistentRequestErrors:results.filter(r=>r.problems.some(p=>p==='timeout'||p.startsWith('fetch_error'))).length,
 ...regionalCoverage,...guideCoverage,...focusLinkCoverage(results),passed:results.filter(r=>r.problems.length===0).length,
 issues:results.filter(r=>r.problems.length>0).length,sitemapErrors,crawlerDiagnostics,
 byType:Object.fromEntries([...new Set(results.flatMap(r=>r.problems))].sort().map(k=>[k,results.filter(r=>r.problems.includes(k)).length]))};
const csv=s=>'"'+String(s??'').replace(/"/g,'""')+'"';
writeFileSync('full-meta-jsonld-audit.json',JSON.stringify({generatedAt:new Date().toISOString(),origin,transportOrigin,complete:true,duplicateAnalysisComplete:true,scope:transportOrigin===origin?'production HTTP':'local source responses; not production verification',counts,duplicateDescriptions:duplicateDescriptionGroups.map(([description,group])=>({description,count:group.length,urls:group.map(r=>r.url)})),results},null,2));
writeFileSync('full-meta-jsonld-audit.csv',['url,status,final_url,canonical,title,description,description_length,og_description_length,description_tag_count,jsonld_blocks,jsonld_types,metadata_warnings,body_hash,has_ride_link,other_bot_noindex,problems,listed_in',
 ...results.map(r=>[r.url,r.status,r.finalUrl,r.canonical,r.title,r.description,r.descriptionLength,r.ogDescriptionLength,r.descriptionTags,r.jsonldBlocks,r.jsonldTypes.join(';'),r.metadataWarnings.join(';'),r.bodyHash,r.hasRideLink,r.otherBotNoindex.join(';'),r.problems.join(';'),r.listedIn.join(';')].map(csv).join(','))].join('\n'));
const criticalTypes=new Set(['http_error','x_robots_noindex','meta_noindex','meta_yeti_noindex','x_robots_yeti_noindex','missing_canonical','canonical_mismatch','timeout','not_html']);
const critical=results.filter(r=>r.problems.some(p=>criticalTypes.has(p)||p.startsWith('fetch_error')));
const review=results.filter(r=>(r.problems.length&&!critical.includes(r))||r.metadataWarnings.includes('duplicate_meta_description_across_urls'));
const lines=[
 '# 스마트24 전체 사이트맵 URL: 메타 설명 80자 + JSON-LD 점검',
 '',
 '**주의:** JSON-LD 누락 자체는 네이버 색인 차단이 아닙니다. 로컬 검사 결과는 운영 배포/실제 색인을 증명하지 않습니다.',
 '',
 '| 항목 | 발견된 URL |',
 '|---|---:|',
 '| 실제 점검 URL | '+counts.checked+' |',
 '| 전체 발견 URL | '+counts.discovered+' |',
 '| description 80자 초과 | '+counts.descriptionOver80+' |',
 '| description 누락 | '+counts.descriptionMissing+' |',
 '| 페이지 간 description 중복 그룹 | '+counts.descriptionDuplicateGroups+' |',
  '| 페이지 간 description 중복 URL | '+counts.descriptionDuplicates+' |',
  '| 한 페이지 내 description 태그 다중 등록 | '+counts.descriptionMultipleTags+' |',
 '| JSON-LD 없음 | '+counts.jsonldMissing+' |',
 '| JSON-LD 문법 오류 | '+counts.jsonldInvalid+' |',
 '| JSON-LD 페이지 유형 없음(검토) | '+counts.jsonldPageTypeMissing+' |',
 '| OG 설명문 80자 초과 | '+counts.ogDescriptionOver80+' |',
 '',
 '**전 URL의 정확한 검사 결과는 full-meta-jsonld-audit.csv, 상세 JSON은 full-meta-jsonld-audit.json에 저장됩니다.**',
 '',
 '# Smart24 URL technical indexability audit',
 '',
 'Generated: '+new Date().toISOString(),
 'Scope: '+(transportOrigin===origin?'production HTTP':'local source responses; not production verification'),
 'Discovered: '+counts.discovered+' | Checked: '+counts.checked+' | Critical: '+critical.length+' | Review: '+review.length,
 'Pages with other search bot-specific exclusions (not Yeti blockers): '+counts.otherSearchBotsExcluded,
 'Recovered transient HTTP failures after bounded retries: '+counts.transientRecoveredAfterRetry+
 ' | Still failing after retry: '+counts.persistentRequestErrors,
 'Canonical region-service landings: '+counts.regionalServicePages+' | Without a DIRECT ride-history document link: '+counts.regionalPagesWithoutReviewLink,
 'Regional intent guides: '+counts.regionalIntentGuidePages+' | Without a direct ride-history document link: '+counts.regionalGuidesWithoutDirectRideLink,
 'First Naver confirmed-index milestone target: 10,000; actual index count is not accessible from this HTTP audit.',
 'Long-term Naver index target: 50,000–100,000; never infer it from technical URL counts.',
 'Technically clean URLs: '+counts.technicallyClean+' (HTTP/indexability checks only; not an index count).',
 'Focus panels observed: '+counts.focusServicePagesObserved+' | With direct ride link: '+counts.focusPagesWithPanelRideLink+' | Without: '+counts.focusPagesWithoutPanelRideLink,
 'Focus quote link count: '+counts.focusQuoteLinksObserved+' (links only, never requested).',
 'Focus ride link pairs: '+counts.focusRideLinkPairs+' | Target audited: '+counts.focusRidePairsWithAuditedTarget+' | Reciprocal: '+counts.focusRidePairsWithReciprocalLink+' | Target not audited: '+counts.focusRidePairsTargetNotAudited,
 'Missing reciprocal links and unaudited targets are editorial observations, not proven broken links or missing Naver indexing.',
 'Recruitment, vehicle-type, travel and activity guides are excluded from locality evidence-link counts.',
 'No ride-record link does not establish a broken page. Do not invent rides, prices, or reviews.',
 'Sitemap discovery and technical HTTP validity do not prove Naver indexing.',
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
writeFileSync('full-meta-jsonld-summary.md',lines.join('\n'));
console.log('Critical:',critical.length,'Review:',review.length);
console.log(JSON.stringify(counts,null,2));
console.log('NOTE: 100% technical URL checks cannot establish Naver indexing. Check Naver Search Advisor URL inspection and site diagnosis separately.');
// An Actions green check must never be interpreted as SEO compliance if
// the 80-character house rule is still violated. JSON-LD presence remains an advisory.
if(counts.descriptionOver80||counts.descriptionMissing||counts.descriptionDuplicates||counts.descriptionMultipleTags||counts.jsonldInvalid){
 console.error('::error::META/JSON-LD REVIEW REQUIRED — descriptions >80='+counts.descriptionOver80+
  ', missing description='+counts.descriptionMissing+', duplicate-description URLs='+counts.descriptionDuplicates+
  ', duplicate-description groups='+counts.descriptionDuplicateGroups+', multiple description tags='+counts.descriptionMultipleTags+
  ', invalid JSON-LD='+counts.jsonldInvalid+'. JSON-LD absent='+counts.jsonldMissing+' (advisory).');
 process.exitCode=1;
}
if(counts.sitemapErrors.length||counts.crawlerDiagnostics.length||counts.discovered===0||counts.checked!==list.length)process.exitCode=1;
