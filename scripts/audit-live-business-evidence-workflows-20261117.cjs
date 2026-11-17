'use strict';
// Read-only Cloudtype public HTML check for five PREEXISTING B2B service paths.
// HTTP 200 and indexable markup do not imply Naver index selection.
const fs=require('node:fs');
const base=new URL(process.env.PRODUCTION_URL||'https://jeongukdaeri.kr');
const paths=[
 {slug:'used-car',id:'used-car-step-by-step-20261117',source:'224451107355',marker:'매입차·상품화 차량·구매고객 인도'},
 {slug:'rental-car',id:'rental-car-step-by-step-20261117',source:'224430950314',marker:'렌터카 고객 인도·사고대차 회수'},
 {slug:'export-port',id:'export-port-step-by-step-20261117',source:'224363608182',marker:'수출차량 입고는'},
 {slug:'scrapyard',id:'scrapyard-step-by-step-20261117',source:'224371924577',marker:'폐차장 입고 전 차량 안전'},
 {slug:'auction',id:'auction-step-by-step-20261117',source:'224421653506',marker:'경매 낙찰 확인과 차량 반출 승인'}
];
const ensure=(ok,message)=>{if(!ok)throw Error(message)};
async function get(path){
 let err;
 for(let i=0;i<2;i++)try{
  const r=await fetch(new URL(path,base),{redirect:'manual',
   headers:{'User-Agent':'Smart24-business-evidence-live-audit/1.0','Cache-Control':'no-cache'},
   signal:AbortSignal.timeout(20000)});
  return {status:r.status,headers:r.headers,body:await r.text()};
 }catch(e){err=e}
 throw Error('HTTP unavailable: '+(err?.message||'unknown'));
}
async function check(row){
 const route='/business/'+row.slug+'/';
 const result=await get(route);
 ensure(result.status===200,route+' HTTP '+result.status);
 ensure((result.headers.get('content-type')||'').includes('text/html'),route+' not HTML');
 ensure(!/noindex/i.test(result.headers.get('x-robots-tag')||''),route+' noindex header');
 const html=result.body;
 ensure(!/<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html),route+' noindex meta');
 ensure(html.includes('<link rel="canonical" href="'+base.origin+route+'">'),route+' missing self canonical');
 ensure((html.match(/<link rel="canonical"/g)||[]).length===1,route+' duplicate canonical');
 ensure(/<title>[^<]+<\/title>/i.test(html),route+' missing title');
 ensure(/<h1\b[^>]*>/i.test(html),route+' missing H1');
 ensure(/<meta[^>]*name=["']description["']/i.test(html),route+' missing meta description');
 ensure(html.split('id="'+row.id+'"').length===2,route+' unique source step block absent');
 ensure(html.includes(row.marker),route+' unique work-type body absent');
 ensure(html.includes('href="https://blog.naver.com/wjdtnr4757/'+row.source+'"'),route+' source link absent');
 ensure(html.includes('href="tel:18114294"')&&html.includes('href="/fare/?service=taksong"'),route+' consultation or quote CTA missing');
 return {route,http:200,canonical:'self',visibleWorkflow:true,sourceLinked:true};
}
async function main(){
 const results=await Promise.all(paths.map(async row=>{
  try{return {pass:true,...await check(row)}}
  catch(e){return {pass:false,route:'/business/'+row.slug+'/',error:e.message}}
 }));
 const hub=await get('/business/');
 results.push(hub.status===200&&hub.body.includes('<link rel="canonical" href="'+base.origin+'/business/">')
  ?{pass:true,route:'/business/',http:200,canonical:'self'}
  :{pass:false,route:'/business/',error:'hub HTTP or canonical incorrect'});
 const failed=results.filter(x=>!x.pass);
 console.log(JSON.stringify({at:new Date().toISOString(),source:'LIVE_HTTP_NOT_NAVER_INDEX',results,failed:failed.length},null,2));
 if(process.env.GITHUB_STEP_SUMMARY){
  const lines=['### B2B live evidence workflow audit','Read-only HTTP/HTML; Naver indexed status remains UNVERIFIED.',
   '| Business route | Result |','|---|---|',...results.map(x=>'| '+x.route+' | '+(x.pass?'PASS HTTP 200 + canonical'+(x.visibleWorkflow?' + source-backed workflow':''):'FAIL '+x.error.replace(/\|/g,'/'))+' |')];
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
 }
 if(failed.length)process.exitCode=1;
 else console.log('PASS all five differentiated business guides and original business hub, no index-growth claim');
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
module.exports={check,main};
