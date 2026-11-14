'use strict';
// Production Yeti User-Agent compatibility smoke test for real search landing pages.
// This does not simulate Naver's IP, indexing decision, or ranking.
const fs=require('node:fs');
const path=require('node:path');
const BASE='https://jeongukdaeri.kr';
const YETI='Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)';
const PROVINCE_DAERI_TARGETS=Object.freeze([
 '/daeri/seoul/','/daeri/busan/','/daeri/daegu/','/daeri/incheon/',
 '/daeri/gwangju/','/daeri/daejeon/','/daeri/ulsan/','/daeri/sejong/',
 '/daeri/gyeonggi/','/daeri/gangwon/','/daeri/chungbuk/','/daeri/chungnam/',
 '/daeri/jeonbuk/','/daeri/jeonnam/','/daeri/gyeongbuk/','/daeri/gyeongnam/',
 '/daeri/jeju/'
]);
const TARGETS=[
 '/',
 '/daeri/','/taksong/',
 ...PROVINCE_DAERI_TARGETS,
 '/taksong/busan/gijang-gun/',
 '/taksong/gangwon/wonju-si/',
 '/taksong/gyeongnam/jinju-si/',
 '/taksong/gyeongbuk/gimcheon-si/',
 '/taksong/jeonnam/naju-si/',
 '/taksong/busan/fare/',
 '/설악산탁송/'
];
function attribute(tag,name){
 const m=tag.match(new RegExp('(?:\\s|<)'+name+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>]+))','i'));
 return m?(m[1]??m[2]??m[3]??''):'';
}
function noindex(value){
 return /(?:^|[\s,;])(?:noindex|none)(?:$|[\s,;])/i.test(String(value||''));
}
function inspectHtml(html,expectedUrl,headers){
 const issues=[];
 const title=(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').replace(/<[^>]+>/g,'').trim();
 if(!title)issues.push('missing_title');
 if(!/<h1\b[^>]*>/i.test(html))issues.push('missing_server_rendered_h1');
 const tags=html.match(/<link\b[^>]*>/gi)||[];
 const canonicals=tags.filter(tag=>attribute(tag,'rel').toLowerCase().split(/\s+/).includes('canonical'));
 const target=canonicals.length===1?attribute(canonicals[0],'href'):'';
 if(canonicals.length!==1)issues.push('missing_or_multiple_canonical');
 else {
  try{if(new URL(target,expectedUrl).href!==expectedUrl)issues.push('canonical_mismatch');}
  catch{issues.push('invalid_canonical')}
 }
 const robots=(html.match(/<meta\b[^>]*>/gi)||[]).filter(tag=>/^(robots|yeti)$/i.test(attribute(tag,'name')))
  .map(tag=>attribute(tag,'content'));
 if(robots.some(noindex))issues.push('html_noindex');
 if(noindex(headers.get('x-robots-tag')))issues.push('header_noindex');
 const descriptionTags=(html.match(/<meta\b[^>]*>/gi)||[]).filter(tag=>attribute(tag,'name').toLowerCase()==='description');
 const description=descriptionTags.length===1?attribute(descriptionTags[0],'content').trim():'';
 if(!description)issues.push('missing_description');
 return {title,description,canonical:target,issues};
}
async function checkOne(route,fetchImpl=fetch,base=BASE){
 const url=new URL(route,base).href;
 let response;
 try{
  response=await fetchImpl(url,{redirect:'manual',signal:AbortSignal.timeout(20000),
   headers:{'user-agent':YETI,'accept':'text/html,application/xhtml+xml'}});
 }catch(error){return {route,url,status:0,issues:['fetch_failure'],detail:String(error).slice(0,220)};}
 const issues=[],status=response.status,contentType=response.headers.get('content-type')||'';
 if(status!==200)issues.push('http_'+status);
 if(!/text\/html/i.test(contentType))issues.push('unexpected_content_type');
 let html='';
 try{html=await response.text()}catch(e){issues.push('response_body_failure')}
 let title='',description='',canonical='';
 if(html&&/text\/html/i.test(contentType)){
  const parsed=inspectHtml(html,url,response.headers);
  title=parsed.title;description=parsed.description;canonical=parsed.canonical;issues.push(...parsed.issues);
 }
 return {route,url,status,contentType,title,description,canonical,issues:[...new Set(issues)]};
}
async function run(fetchImpl=fetch,base=BASE){
 const results=[];
 for(const route of TARGETS)results.push(await checkOne(route,fetchImpl,base));
 // Each provincial designated-driver landing should carry its own title.
 // Identical titles signal a major Naver deduplication risk despite HTTP 200.
 const provincial=results.filter(x=>PROVINCE_DAERI_TARGETS.includes(x.route));
 const titleCounts=new Map();
 for(const item of provincial)if(item.status===200&&item.title)
  titleCounts.set(item.title,(titleCounts.get(item.title)||0)+1);
 for(const item of provincial)if(item.title&&titleCounts.get(item.title)>1)
  item.issues.push('duplicate_provincial_title');
 const failures=results.filter(item=>item.issues.length);
 return {generatedAt:new Date().toISOString(),base,checked:results.length,passed:results.length-failures.length,
  failed:failures.length,provincialDaeriCount:provincial.length,
  provincialDaeriFailed:provincial.filter(item=>item.issues.length).length,
  userAgent:YETI,scope:'User-Agent compatibility; not verified Yeti IP or Naver indexing',
  results};
}
if(require.main===module){
 run().then(report=>{
  fs.mkdirSync(path.join(process.cwd(),'audit'),{recursive:true});
  fs.writeFileSync(path.join(process.cwd(),'audit','yeti-priority-indexability.json'),
   JSON.stringify(report,null,2)+'\n');
  for(const row of report.results)console.log((row.issues.length?'FAIL':'PASS')+' '+row.status+' '+row.route+' '+row.issues.join(','));
  console.log('Yeti User-Agent check:',report.passed,'/',report.checked,'passed. This is not a Naver indexing count.');
  if(report.failed)process.exitCode=1;
 }).catch(e=>{console.error(e);process.exitCode=1});
}
module.exports={TARGETS,PROVINCE_DAERI_TARGETS,YETI,attribute,noindex,inspectHtml,checkOne,run};
