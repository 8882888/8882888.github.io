#!/usr/bin/env node
// Read-only audit of source-enumerable dynamic URLs missing from the sitemaps.
// Caveat: free-text queries and combinatorial origin/destination routes are
// unbounded/huge; route-pair samples are not an exhaustive check of that family.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildInventory,regionsFromLegal} from './dynamic-url-inventory.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const BASE='https://jeongukdaeri.kr', ORIGIN=(process.env.AUDIT_TRANSPORT_ORIGIN||BASE).replace(/\/$/,'');
const SHARDS=Number(process.env.DYNAMIC_SHARDS||1),SHARD=Number(process.env.DYNAMIC_SHARD||0);
const LIMIT=Number(process.env.DYNAMIC_LIMIT||0);
const SAMPLE_MODE=process.env.DYNAMIC_SAMPLE_MODE||'';
if(!Number.isSafeInteger(LIMIT)||LIMIT<0)throw Error('DYNAMIC_LIMIT must be a nonnegative integer');
if(!['','balanced'].includes(SAMPLE_MODE))throw Error('DYNAMIC_SAMPLE_MODE must be empty or balanced');
const LIVE_DELAY_MS=Number(process.env.DYNAMIC_LIVE_DELAY_MS||900);
if(!Number.isSafeInteger(LIVE_DELAY_MS)||LIVE_DELAY_MS<650||LIVE_DELAY_MS>30000)throw Error('DYNAMIC_LIVE_DELAY_MS must be 650..30000 ms for production safety');
const REQUIRE_JSONLD=process.env.DYNAMIC_REQUIRE_JSONLD==='1';
const MODE=process.env.DYNAMIC_MODE||'audit';
if(!Number.isInteger(SHARDS)||SHARDS<1||SHARDS>24||!Number.isInteger(SHARD)||SHARD<0||SHARD>=SHARDS)throw Error('Invalid shard count/index');
const outDir=process.env.DYNAMIC_OUTPUT_DIR||process.cwd();
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const maps=['/sitemap-all.xml','/sitemap-history.xml','/sitemap.xml','/sitemap-priority.xml','/sitemap-reviewed-routes.xml','/sitemap-published.xml','/sitemap-taksong.xml','/sitemap-daeri.xml'];
const decode=s=>String(s||'').replace(/&(#(?:x[0-9a-f]+|\d+)|amp|lt|gt|quot|apos|nbsp);/gi,(full,key)=>{if(key[0]==='#'){const n=/^#x/i.test(key)?parseInt(key.slice(2),16):parseInt(key.slice(1),10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):full;}return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[key.toLowerCase()]||full;});
const attr=(tag,key)=>decode(tag.match(new RegExp('(?:\\s|<)'+key+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>]+))','i'))?.slice(1).find(x=>x!==undefined)||'');
const tags=(head,kind)=>[...head.matchAll(new RegExp('<'+kind+'\\b[^>]*>','gi'))].map(x=>x[0]);
const getValues=(head,attribute,value)=>tags(head,'meta').filter(tag=>attr(tag,attribute).toLowerCase()===value).map(tag=>attr(tag,'content'));
async function get(resource,timeout=22000){
 const url=new URL(resource,BASE);
 const res=await fetch(ORIGIN+url.pathname+url.search,{signal:AbortSignal.timeout(timeout),redirect:'manual',headers:{'User-Agent':'Smart24-Dynamic-Source-Census/1.0','Accept':'text/html,application/xml,text/xml;q=0.9,*/*;q=0.5'}});
 const body=await res.text();
 return {status:res.status,body,headers:res.headers};
}
const locs=x=>[...x.matchAll(/<loc\b[^>]*>([^<]+)<\/loc>/gi)].map(m=>decode(m[1].trim()));
async function sitemapUrls(){
 const seen=new Set(),urls=new Set(),errors=[];
 async function walk(route,depth=0){
  if(depth>7||seen.has(route))return;seen.add(route);
  try{
   const res=await get(route,45000);
   if(res.status!==200)throw Error('HTTP '+res.status);
   if(!/<(?:urlset|sitemapindex)\b/i.test(res.body))throw Error('non-XML sitemap');
   if(/<sitemapindex\b/i.test(res.body)){
    for(const href of locs(res.body)){
     const parsed=new URL(href,BASE);
     if(parsed.origin!==BASE){errors.push('external sitemap '+href);continue;}
     await walk(parsed.pathname,depth+1);
    }
   }else for(const href of locs(res.body)){
    try{
     const u=new URL(href,BASE);
     if(u.origin===BASE&&!u.search&&!u.hash)urls.add(u.pathname);
    }catch{errors.push('invalid '+href)}
   }
  }catch(e){errors.push(route+' '+String(e).slice(0,130))}
 }
 for(const root of maps)await walk(root);
 return {urls,errors,files:seen.size};
}
function classify(item,response){
 const {status,body,headers}=response, problems=[],warnings=[];
 const head=(body.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)||[])[1]||'';
 const desc=getValues(head,'name','description'),og=getValues(head,'property','og:description');
 const description=decode(desc[0]||''),length=[...description].length;
 if(status!==200)problems.push('http_'+status);
 else if(!/text\/html/i.test(headers.get('content-type')||''))problems.push('non_html');
 if(!desc.length)problems.push('missing_description');
 if(desc.length>1)problems.push('duplicate_description');
 if(length>80)problems.push('description_over_80');
 if(og.length&&[...decode(og[0])].length>80)warnings.push('og_description_over_80');
 if(og.length&&og[0]!==description)warnings.push('og_description_differs');
 if(og.length>1)warnings.push('duplicate_og');
 const canonicals=tags(head,'link').filter(t=>attr(t,'rel').toLowerCase().split(/\s+/).includes('canonical'));
 const canonical=canonicals.length===1?attr(canonicals[0],'href'):'';
 if(canonicals.length!==1)problems.push('canonical_count_'+canonicals.length);
 else {try{if(new URL(decode(canonical),BASE).href!==new URL(item.url,BASE).href)problems.push('canonical_mismatch')}
 catch{problems.push('invalid_canonical')}}
 const robots=getValues(head,'name','robots').concat(getValues(head,'name','yeti'),[headers.get('x-robots-tag')||'']);
 const noindex=robots.some(x=>/\bnoindex\b/i.test(x));
 if(item.policy==='intentional-noindex'){
  if(!noindex)problems.push('route_directory_expected_noindex');
 }else if(noindex){
  if(item.policy==='possibly-intentional-noindex')warnings.push('noindex_on_sparse_locality_check_intent');
  else warnings.push('noindex_outside_sitemap_check_intent');
 }
 const jsonld=[...body.matchAll(/<script\b(?=[^>]*\btype\s*=\s*["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi)];
 const types=new Set();let malformed=0;
 const visit=node=>{
  if(Array.isArray(node)){node.forEach(visit);return}
  if(!node||typeof node!=='object')return;
  [node['@type']].flat().filter(Boolean).forEach(t=>types.add(t));
  if(Array.isArray(node['@graph']))visit(node['@graph']);
 };
 for(const ld of jsonld){try{visit(JSON.parse(ld[1]))}catch{malformed++}}
 if(!jsonld.length)(REQUIRE_JSONLD?problems:warnings).push('missing_jsonld');
 if(malformed)problems.push('invalid_jsonld');
 if(jsonld.length&&!['WebPage','CollectionPage','Article','BlogPosting','FAQPage','ItemPage','ProfilePage'].some(x=>types.has(x)))(REQUIRE_JSONLD?problems:warnings).push('jsonld_no_page_type');
 if(item.family==='route-pair-representative')warnings.push('representative_only_not_exhaustive_route_family');
 return {...item,status,descriptionLength:length,description,descriptionTagCount:desc.length,
  jsonldBlocks:jsonld.length,jsonldTypes:[...types],noindex,canonical,problems:[...new Set(problems)],warnings:[...new Set(warnings)]};
}
// Stable, reproducible family+index-policy stratification; every shard draws
// from its full assigned inventory, not the first few thousand region paths.
function balancedSample(items,limit){
 const hash=value=>{let x=2166136261;for(const ch of String(value)){x^=ch.codePointAt(0);x=Math.imul(x,16777619)}return x>>>0};
 const groups=new Map();
 for(const item of items){const key=item.family+'|'+item.policy;
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);
 }
 const keys=[...groups.keys()].sort();
 for(const key of keys)groups.get(key).sort((a,b)=>hash(a.url)-hash(b.url)||a.url.localeCompare(b.url));
 const sampled=[];
 for(let slot=0;sampled.length<Math.min(limit,items.length);slot++){
  let added=false;for(const key of keys){const candidate=groups.get(key)[slot];
   if(candidate){sampled.push(candidate);added=true;if(sampled.length>=limit)break}
  }
  if(!added)break;
 }
 return sampled;
}
const csv=s=>'"'+String(s??'').replace(/"/g,'""').replace(/\r?\n/g,' ')+'"';
async function main(){
 const registry=buildInventory(regionsFromLegal());
 const site=await sitemapUrls();
 if(site.errors.length){console.error(site.errors.slice(0,20));process.exitCode=1;}
 const missing=registry.items.filter(x=>!site.urls.has(x.url));
 const familyCounts=Object.fromEntries([...new Set(missing.map(x=>x.family))].map(f=>[f,missing.filter(x=>x.family===f).length]));
 const summary={at:new Date().toISOString(),source:'local dynamic route data + code route templates',
  siteMapUrls:site.urls.size, sitemapFiles:site.files,sitemapErrors:site.errors,
  regions:registry.stats.regionCount,registryCount:registry.items.length,
  outsideSitemap:missing.length,outsideFamilies:familyCounts,
  potentialRoutePairURLs:registry.stats.potentialRoutePairURLs,
  excludedFromCompleteEnumeration:registry.stats.omittedFromExhaustiveHTTP,
  scope:ORIGIN===BASE?'production HTTP HTML; not official Naver indexing':'local source HTML; not deployed website or Naver index',
  sampleMode:SAMPLE_MODE||'none',requireJsonLd:REQUIRE_JSONLD,
  shard:SHARD,shards:SHARDS,complete:false,checked:0,issueCounts:{},uninspected:0};
 fs.mkdirSync(outDir,{recursive:true});
 const name='dynamic-off-sitemap-'+String(SHARD).padStart(2,'0');
 const report=(rows)=>{
  summary.checked=rows.length;
  const counts={};
  for(const row of rows)for(const issue of [...row.problems,...row.warnings])counts[issue]=(counts[issue]||0)+1;
  summary.issueCounts=counts;
  summary.explicitAudit={
   descriptionOver80:rows.filter(x=>x.problems.includes('description_over_80')).length,
   ogDescriptionOver80:rows.filter(x=>x.warnings.includes('og_description_over_80')).length,
   canonicalMismatch:rows.filter(x=>x.problems.includes('canonical_mismatch')).length,
   canonicalCountOrInvalid:rows.filter(x=>x.problems.some(p=>p.startsWith('canonical_count_')||p==='invalid_canonical')).length,
   jsonLdMissing:rows.filter(x=>[...x.problems,...x.warnings].includes('missing_jsonld')).length,
   jsonLdInvalid:rows.filter(x=>x.problems.includes('invalid_jsonld')).length,
   jsonLdPageTypeMissing:rows.filter(x=>[...x.problems,...x.warnings].includes('jsonld_no_page_type')).length,
   noindexWithIntentionalPolicy:rows.filter(x=>x.policy==='intentional-noindex'&&x.noindex).length,
   noindexOnSparseLocality:rows.filter(x=>x.policy==='possibly-intentional-noindex'&&x.noindex).length,
   noindexOther:rows.filter(x=>x.policy!=='intentional-noindex'&&x.policy!=='possibly-intentional-noindex'&&x.noindex).length,
   errors:rows.filter(x=>x.problems.length>0).length
  };
  fs.writeFileSync(path.join(outDir,name+'.json'),JSON.stringify({summary,results:rows},null,2)+'\n');
  const columns=['url','family','policy','status','descriptionLength','description','jsonldBlocks','jsonldTypes','noindex','canonical','problems','warnings'];
  const records=[columns.join(','),...rows.map(row=>[row.url,row.family,row.policy,row.status,row.descriptionLength,row.description,row.jsonldBlocks,(row.jsonldTypes||[]).join(';'),row.noindex,row.canonical,(row.problems||[]).join(';'),(row.warnings||[]).join(';')].map(csv).join(','))];
  fs.writeFileSync(path.join(outDir,name+'.csv'),records.join('\n')+'\n');
  fs.writeFileSync(path.join(outDir,name+'-summary.md'),[
   '# 사이트맵 밖 동적 URL 점검 ('+SHARD+'/'+SHARDS+')','',
   '- 전체 지역 원본 수: '+summary.regions,
   '- 사이트맵 발견 URL: '+summary.siteMapUrls,
   '- 동적 후보 URL: '+summary.registryCount,
   '- 사이트맵 밖: '+summary.outsideSitemap,
   '- 본 샤드 점검: '+summary.checked+' / '+summary.assigned,
   '- JSON-LD 필수 검사: '+(REQUIRE_JSONLD?'적용':'권고')+', description 80자 초과: '+summary.explicitAudit.descriptionOver80+', canonical 전체 URL 불일치: '+summary.explicitAudit.canonicalMismatch+', JSON-LD 없음: '+summary.explicitAudit.jsonLdMissing+', JSON-LD 구문 오류: '+summary.explicitAudit.jsonLdInvalid,
   '- 완료 여부(전체 모집단 대상): '+summary.complete,
   '- 추출 방식: '+(summary.sampleMode==='balanced'?'유형·비색인 정책별 분산 표본(운영 서버 일부만 검사)':'원본 전수/앞부분 제한')+', 표본 수: '+summary.toCheck,
   '- **출발지×도착지 전체 조합 '+summary.potentialRoutePairURLs+'개는 HTTP 전수 검사 아님.** 대표 경로만 확인.',
   '- 무료 검색어·페이지번호·실시간 API 조합은 무한/가변이며 전수 목록 불가능.','',
   '| 유형 | 사이트맵 밖 URL 수 |','|---|---:|',
   ...Object.entries(summary.outsideFamilies).map(([k,v])=>'| '+k+' | '+v+' |'),
   '','| 발견 | URL 수 |','|---|---:|',...Object.entries(counts).map(([k,v])=>'| '+k+' | '+v+' |'),
   '','JSON-LD가 없다는 사실만으로 네이버 색인 차단으로 판정하지 않습니다.',
   '의도적 noindex와 색인 대상 URL을 구분해야 하며, 공식 색인 수치는 네이버 서치어드바이저에서만 검증됩니다.'
  ].join('\n')+'\n');
 };
 // Also preserve the entire inventory so an absent result is never reported as clean.
 const inventoryPath=path.join(outDir,'dynamic-outside-inventory-'+SHARD+'.csv');
 const allRows=['url,family,policy,in_sitemap',...registry.items.filter((x,i)=>i%SHARDS===SHARD).map(x=>[x.url,x.family,x.policy,site.urls.has(x.url)].map(csv).join(','))];
 fs.writeFileSync(inventoryPath,allRows.join('\n')+'\n');
 const assigned=missing.filter((x,i)=>i%SHARDS===SHARD),queue=LIMIT?(SAMPLE_MODE==='balanced'?balancedSample(assigned,LIMIT):assigned.slice(0,LIMIT)):assigned;
 summary.assigned=assigned.length;summary.toCheck=queue.length;summary.uninspected=assigned.length-queue.length;
 if(MODE==='inventory'){
  summary.complete=false;report([]);console.log(JSON.stringify(summary));return;
 }
 const rows=[];let next=0;const workers=Number(process.env.DYNAMIC_CONCURRENCY||2);
 async function worker(){
  while(next<queue.length){
   const i=next++,item=queue[i];
   let row;try{row=classify(item,await get(item.url,20000))}
   catch(e){row={...item,status:0,descriptionLength:0,description:'',jsonldBlocks:0,jsonldTypes:[],noindex:false,canonical:'',problems:['request_failure'],warnings:[],error:String(e).slice(0,130)}}
   rows.push(row);
   if(rows.length%500===0){report(rows);console.log('CHECKED '+rows.length+'/'+queue.length+' shard '+SHARD)}
   if(ORIGIN===BASE)await delay(LIVE_DELAY_MS);
  }
 }
 await Promise.all(Array.from({length:Math.max(1,Math.min(workers,4))},worker));
 summary.complete=queue.length===assigned.length&&rows.length===assigned.length&&site.errors.length===0;
 report(rows);
 console.log(JSON.stringify({complete:summary.complete,checked:summary.checked,assigned:summary.assigned,outsideSitemap:summary.outsideSitemap,issueCounts:summary.issueCounts},null,2));
 if((!summary.complete&&SAMPLE_MODE!=='balanced')||rows.some(r=>r.problems.length)||site.errors.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1});
