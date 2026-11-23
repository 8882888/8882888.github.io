// Read-only LIVE JSON-LD verification for source HTML; this is not Naver's
// authenticated structured-data report or evidence of rich-result eligibility.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {fetchWithRetry} from './indexability-retry.mjs';
const origin=(process.env.LIVE_SITE_URL||'https://jeongukdaeri.kr').replace(/\/$/,'');
// All 17 province hubs are public canonical landing pages, not a sample of
// generated 읍/면/동/리 candidates. Audit both services per province.
const provinceSlugs=[
 'seoul','busan','daegu','incheon','gwangju','daejeon','ulsan','sejong',
 'gyeonggi','gangwon','chungbuk','chungnam','jeonbuk','jeonnam',
 'gyeongbuk','gyeongnam','jeju'
];
const routes=[
 {path:'/',must:['WebSite','Organization','Service']},
 {path:'/taksong/',must:['WebPage']},
 {path:'/daeri/',must:['WebPage']},
 {path:'/coverage/',must:['WebPage']},
 {path:'/taksong/busan/gijang-gun/',must:['WebPage','BreadcrumbList']},
 ...['used-car','rental-car','export-port','scrapyard','auction'].map(slug=>({path:'/business/'+slug+'/',must:['WebPage','BreadcrumbList']})),
 ...provinceSlugs.flatMap(slug=>['taksong','daeri'].map(kind=>({
  path:'/'+kind+'/'+slug+'/',must:['WebPage','BreadcrumbList']
 })))
];
function extractJsonLd(html){
 const errors=[],nodes=[];
 for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  try{
   const v=JSON.parse(m[1]);
   nodes.push(...(Array.isArray(v['@graph'])?v['@graph']:[v]));
  }catch(e){errors.push('invalid_jsonld: '+e.message);}
 }
 return {nodes,errors};
}
async function fetchSafe(route){
 // Retry only transient network errors/429/5xx; a persistent 404, invalid
 // schema, wrong canonical or empty response must still fail this audit.
 return fetchWithRetry(route,resource=>fetch(origin+resource,{
  headers:{'user-agent':'Smart24-StructuredData-Live-Audit/1.0','cache-control':'no-cache'},
  signal:AbortSignal.timeout(25000),redirect:'manual'
 }),{attempts:3,delays:[500,1300]});
}
const out={generatedAt:new Date().toISOString(),origin,scope:'actual public HTML JSON-LD, not official Naver report',routes:[],errors:[],warnings:[]};
for(const route of routes){
 const x={route:route.path,status:0,types:[],errors:[]};
 try{
  const {response,attempts}=await fetchSafe(route.path);x.status=response.status;x.fetchAttempts=attempts;
  if(response.status!==200)x.errors.push('http_'+response.status);
  const html=await response.text();
  const parsed=extractJsonLd(html);x.errors.push(...parsed.errors);
  x.types=parsed.nodes.map(v=>v['@type']).flat().filter(Boolean);
  for(const expected of route.must)if(!x.types.includes(expected))x.errors.push('missing_jsonld_type_'+expected);
  const canonical=html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1]||'';
  x.canonical=canonical;
  if(canonical!==origin+route.path)x.errors.push('canonical_mismatch');
  for(const doc of parsed.nodes.filter(v=>['WebSite','WebPage','CollectionPage'].includes(v['@type']))){
   if(doc.url&&new URL(doc.url,origin).href!==origin+route.path)x.errors.push('schema_url_mismatch_'+doc['@type']);
  }
  if(route.path==='/'){
   const image=parsed.nodes.find(v=>v['@type']==='ImageObject')?.contentUrl;
   if(image){
    const u=new URL(image);
    if(u.origin!==origin)x.errors.push('schema_image_other_origin');
    else {
     const {response:head,attempts:imageAttempts}=await fetchSafe(u.pathname);
     x.imageFetchAttempts=imageAttempts;
     x.imageStatus=head.status;
     x.imageContentType=head.headers.get('content-type')||'';
     if(head.status!==200||!/^image\//.test(x.imageContentType))x.errors.push('schema_image_invalid_http_or_mime');
     await head.arrayBuffer();
    }
   }
   const web=parsed.nodes.filter(v=>v['@type']==='WebSite');
   if(web.length!==1)x.errors.push('site_name_schema_duplicate_or_missing');
   else if(web[0].name!=='전국대리운전')x.errors.push('site_name_mismatch');
  }
 }catch(error){x.fetchAttempts=error?.retryAttempts||x.fetchAttempts||1;x.errors.push('fetch_or_parse_'+String(error).slice(0,180));}
 out.routes.push(x);out.errors.push(...x.errors.map(e=>route.path+': '+e));
}
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
fs.writeFileSync(path.join(root,'structured-data-live-report.json'),JSON.stringify(out,null,2)+'\n');
fs.writeFileSync(path.join(root,'structured-data-live-report.md'),[
 '# 구조화 데이터 원본 HTML 점검', '', '점검 날짜: '+out.generatedAt,
 '이 결과는 실제 운영 HTML 점검이며 네이버 서치어드바이저 내부 노출이나 공식 색인 수가 아닙니다.','',
 '| URL | HTTP | JSON-LD 유형 | 결과 |','|---|---|---|---|',
 ...out.routes.map(x=>'| '+x.route+' | '+x.status+' | '+x.types.join(', ')+' | '+(x.errors.join('; ')||'정상')+' |'),
 '',...(out.errors.length?out.errors:['수집된 표본에서 JSON-LD 오류 없음']),''
].join('\n'));
console.log(JSON.stringify({checked:out.routes.length,recoveredTransient:out.routes.filter(x=>x.status===200&&(x.fetchAttempts>1||x.imageFetchAttempts>1)).length,errors:out.errors,rows:out.routes.map(x=>({route:x.route,status:x.status,types:x.types,fetchAttempts:x.fetchAttempts,imageStatus:x.imageStatus}))}));
if(out.errors.length)process.exitCode=1;
