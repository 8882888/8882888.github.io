'use strict';
// Read-only validation of the two existing generic-transport landing pages
// after the exact Cloudtype release is confirmed. This is NOT Naver CTR, indexing,
// average rank or URL-keyword attribution.
const fs=require('node:fs');
const origin=new URL(process.env.PRODUCTION_URL||'https://jeongukdaeri.kr');
const rules=require('../data/seo-pages.json').pages;
const routes=[
 {path:'/taksong/',marker:'national-taksong-intent-choice-20261117',kind:'national',expectedDescription:rules.find(x=>x.path==='/taksong/')?.description},
 {path:'/service/taksong/',marker:'service-taksong-handover-intent-20261117',kind:'service'}
];
const ensure=(condition,reason)=>{if(!condition)throw Error(reason)};
const getMeta=(head,tag)=>head.match(tag)?.[1]||'';
async function check({path,marker,kind,expectedDescription}){
 const url=new URL(path,origin);
 const response=await fetch(url,{redirect:'manual',headers:{'Cache-Control':'no-cache','User-Agent':'Smart24-CTR-intent-live-audit/1.0'},signal:AbortSignal.timeout(25000)});
 ensure(response.status===200, path+' HTTP '+response.status);
 ensure((response.headers.get('content-type')||'').includes('text/html'),path+' not HTML');
 ensure(!/noindex/i.test(response.headers.get('x-robots-tag')||''),path+' X-Robots-Tag noindex');
 const html=await response.text(),head=html.split('</head>')[0],title=getMeta(head,/<title>([^<]+)<\/title>/),description=getMeta(head,/<meta name="description" content="([^"]+)"/);
 ensure(title.includes('자동차탁송')&&title.includes('요금'),path+' search title not relevant');
 ensure(description.length>30&&[...description].length<=80,path+' description missing or too long');
 ensure((head.match(/<link rel="canonical"/g)||[]).length===1,path+' repeated canonical');
 ensure(head.includes('<link rel="canonical" href="'+origin.origin+path+'">'),path+' wrong canonical');
 ensure(!/name="robots" content="noindex/.test(head),path+' meta noindex');
 ensure((html.match(/<h1\b/g)||[]).length===1,path+' H1 count');
 ensure(html.includes('id="'+marker+'"'),path+' new intent content not visible');
 ensure(html.includes('href="/fare/?service=taksong"')&&html.includes('href="tel:18114294"'),path+' fare/phone unavailable');
 for(const route of ['/설악산탁송/','/지리산탁송/','/route-taksong/','/route-taksong/centers/'])ensure(html.includes('href="'+route+'"'),path+' mountain/cycle link missing: '+route);
 if(expectedDescription)ensure(description===expectedDescription,path+' production text disagrees with reviewed canonical description');
 if(kind==='service')ensure(html.indexOf('id="'+marker+'"')<html.indexOf('service-center-brand-routes-20261102'),path+' customer need below huge brand directory');
 return {path,http:200,title,description,marker,handOver:true,canonical:true,links:true};
}
async function main(){
 const passed=[],failed=[];
 const result=await Promise.all(routes.map(async item=>{try{return {ok:true,data:await check(item)}}catch(err){return {ok:false,path:item.path,error:err.message}}}));
 for(const v of result)v.ok?passed.push(v.data):failed.push({path:v.path,error:v.error});
 ensure(new Set(passed.map(x=>x.title)).size===passed.length,'different service entry points need distinct titles');
 ensure(new Set(passed.map(x=>x.description)).size===passed.length,'different service entry points need distinct descriptions');
 const report={at:new Date().toISOString(),type:'LIVE_HTTP_TECHNICAL_NOT_NAVER_METRICS',passed,failed};
 console.log(JSON.stringify(report,null,2));
 if(process.env.GITHUB_STEP_SUMMARY){
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,[
   '### Nationwide transport intent release audit (not Naver search performance)',
   '| Canonical URL | Result |','|---|---|',
   ...passed.map(x=>'| '+x.path+' | PASS HTTP 200; unique title and description; true handover/fare/route links |'),
   ...failed.map(x=>'| '+x.path+' | FAILED: '+x.error.replace(/\|/g,'/')+' |'),''].join('\n'));
 }
 if(failed.length)process.exitCode=1;
 else console.log('PASS two existing national transport pages, no Naver CTR claim');
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
module.exports={check,main};
