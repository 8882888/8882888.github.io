#!/usr/bin/env node
'use strict';
// Audit 2,591 immutable, completed ride URLs plus 109 existing sitemap URLs.
// This is HTTP/crawlability auditing, NOT proof of Naver/Google indexing or ranking.
const fs=require('node:fs');
const {URL}=require('node:url');
const base=(process.env.SMART24_AUDIT_BASE||'https://jeongukdaeri.kr').replace(/\/$/,'');
const output=process.env.SMART24_AUDIT_OUTPUT||'/tmp/smart24-2700-public-pages.json';
const CONCURRENCY=10;
const rideCount=2591, targetCount=2700;
const doc=JSON.parse(fs.readFileSync('data/ride-history.json','utf8'));
if(!Array.isArray(doc)||doc.length!==rideCount)throw Error('Immutable ride count unexpectedly changed');
const ridePaths=Array.from({length:rideCount},(_,i)=>'/reviews/history/excel-'+String(i+1).padStart(4,'0')+'/');
async function request(url,timeout=18000){
 const res=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(timeout),headers:{'user-agent':'Smart24-2700-Crawlability-Audit/1.0','accept':'text/html,application/xml;q=0.9,*/*;q=0.8'}});
 return res;
}
function decodeXml(s){return s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>')}
async function candidatePaths(){
 const res=await request(base+'/sitemap.xml');
 if(!res.ok)throw Error('Primary sitemap HTTP '+res.status);
 const xml=await res.text();
 const urls=[...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(m=>decodeXml(m[1].trim()));
 const ret=[],seen=new Set(ridePaths);
 for(const item of urls){
  let u;try{u=new URL(item)}catch{continue}
  if(u.origin!==new URL(base).origin||u.search||u.hash)continue;
  const p=u.pathname;
  if(seen.has(p)||/^\/reviews\/history\/excel-\d{4}\/$/.test(p))continue;
  seen.add(p);ret.push(p);
  if(ret.length===109)break;
 }
 if(ret.length!==109)throw Error('Sitemap has only '+ret.length+' distinct canonical routes; need 109');
 return ret;
}
function parseHtml(s){
 const title=/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i.exec(s)?.[1]?.replace(/<[^>]+>/g,'').trim()||'';
 const canonical=/<link\b[^>]*rel=["']canonical["'][^>]*>/i.exec(s)?.[0]||'';
 const robots=/<meta\b[^>]*name=["']robots["'][^>]*>/i.exec(s)?.[0]||'';
 return {title:!!title,canonical:!!canonical,noindex:/noindex/i.test(robots)};
}
async function checkPage(p){
 for(let attempt=0;attempt<2;attempt++){
  try{
   const response=await request(base+p);
   const status=response.status,final=new URL(response.url).pathname;
   if(status!==200)return {path:p,status,final,issue:'HTTP '+status};
   const html=await response.text();
   const x=parseHtml(html);
   const issue=!x.title?'missing title':x.noindex?'robots noindex':'';
   const warnings=[!x.canonical?'missing canonical':'',final!==p?'redirect '+final:''].filter(Boolean);
   return {path:p,status,final,issue,warnings};
  }catch(error){
   if(attempt===1)return {path:p,status:0,issue:String(error?.message||error).slice(0,140)};
   await new Promise(resolve=>setTimeout(resolve,400));
  }
 }
}
async function main(){
 const next=await candidatePaths(),paths=[...ridePaths,...next];
 if(paths.length!==targetCount||new Set(paths).size!==targetCount)throw Error('2700 URL inventory must be unique');
 const result=new Array(targetCount);
 let cursor=0;
 async function worker(){
  while(cursor<paths.length){
   const i=cursor++;
   result[i]=await checkPage(paths[i]);
   if((i+1)%350===0)console.log('Crawlability audit completed through assigned index '+(i+1));
  }
 }
 await Promise.all(Array.from({length:CONCURRENCY},worker));
 const failures=result.filter(x=>x.issue);
 const warnings=result.filter(x=>x.warnings?.length);
 const summary={checked:result.length,rides:rideCount,existingSitemapRoutes:next.length,successCount:result.length-failures.length,failureCount:failures.length,warningCount:warnings.length,publicSearchRankMeasured:false,naverIndexingConfirmed:false,sourceSitemap:base+'/sitemap.xml',failures:failures.slice(0,200),warnings:warnings.slice(0,100),allResults:result};
 fs.writeFileSync(output,JSON.stringify(summary,null,2));
 console.log('BATCH_2700_RESULT '+JSON.stringify({checked:summary.checked,rides:summary.rides,sitemap:summary.existingSitemapRoutes,success:summary.successCount,failures:summary.failureCount,warnings:summary.warningCount,output}));
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'\n## Nationwide 2,700 public URL crawlability audit\n\n- Checked: '+summary.checked+'\n- HTTP/title/indexability issues: '+failures.length+'\n- Warnings: '+warnings.length+'\n- Google/Naver actual indexing or ranking: **not measured**\n- Full per-URL report: workflow artifact\n');
 if(failures.length)process.exitCode=1;
}
main().catch(err=>{console.error('BATCH_2700_ERROR '+(err.stack||err));process.exitCode=1});
