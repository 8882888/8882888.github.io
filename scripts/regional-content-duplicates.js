#!/usr/bin/env node
'use strict';
// Diagnostic only: compare representative region/service pages for repeated SEO metadata and body.
// Report clusters as review candidates, not proof of search-engine penalties.
const fs=require('node:fs'),crypto=require('node:crypto');
const base=new URL(process.argv[2]||'http://localhost:3000/');
const site='https://jeongukdaeri.kr';
const maps=['/sitemap.xml','/sitemap-daeri.xml','/sitemap-taksong.xml'];
const limit=Number(process.env.SEO_DUP_SAMPLE_PER_GROUP||12),parallel=8,timeout=12000;
const normalize=s=>String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&(?:nbsp|amp|quot|lt|gt);/gi,' ').replace(/[\s\u00a0]+/g,' ').trim();
const clean=s=>normalize(s).replace(/[0-9]+/g,'#').replace(/(?:서울|경기|인천|부산|대구|강원|경북|경남|충북|충남|전북|전남|광주|대전|울산|세종|제주)[가-힣]{0,8}(?:시|군|구|동|읍|면|리)?/g,'지역');
const extract=(html,tag)=>normalize((html.match(new RegExp('<'+tag+'\\b[^>]*>([\\s\\S]*?)<\\/'+tag+'>','i'))||[])[1]||'');
const meta=html=>{for(const m of html.matchAll(/<meta\b[^>]*>/gi)){const tag=m[0],name=(tag.match(/\bname=["']([^"']+)["']/i)||[])[1];if(name?.toLowerCase()==='description')return (tag.match(/\bcontent=["']([^"']+)["']/i)||[])[1]||''}return ''};
const digest=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,16);
const group=p=>{let m=p.match(/^\/(daeri|taksong)\/(seoul|gyeonggi|incheon|busan|daegu|gyeongbuk|gangwon|chungbuk|chungnam|jeonbuk|jeonnam|gyeongnam)\//);if(m)return m[1]+'-'+m[2];if(/^\/(daeri|taksong)\//.test(p))return p.split('/')[1]+'-other';if(p.startsWith('/region/'))return 'region';if(p.startsWith('/fare/route/'))return 'fare-route';return null};
async function fetchText(p){let r=await fetch(new URL(p,base),{signal:AbortSignal.timeout(timeout)});return {status:r.status,html:await r.text()}}
(async()=>{
 const grouped=new Map(),errors=[];
 for(const map of maps){const r=await fetchText(map);if(r.status!==200)throw Error(map+' HTTP '+r.status);
  for(const m of r.html.matchAll(/<loc>([^<]+)<\/loc>/g)){let p;try{const u=new URL(m[1].replace(/&amp;/g,'&'));if(u.origin!==site)continue;p=u.pathname}catch{continue}const k=group(p);if(!k)continue;const a=grouped.get(k)||[];if(!a.includes(p))a.push(p);grouped.set(k,a)}
 }
 const paths=[...new Set([...grouped].flatMap(([k,a])=>{if(a.length<=limit)return a;return [...a.slice(0,Math.ceil(limit/2)),...a.slice(-Math.floor(limit/2))]}))];
 const pages=[];
 for(let i=0;i<paths.length;i+=parallel){const batch=await Promise.all(paths.slice(i,i+parallel).map(async p=>{try{const r=await fetchText(p);if(r.status!==200){errors.push({path:p,status:r.status});return null}const body=(r.html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)||[])[1]||r.html;return {path:p,group:group(p),title:extract(r.html,'title'),description:normalize(meta(r.html)),bodyLength:normalize(body).length,bodyHash:digest(clean(body)),titlePattern:digest(clean(extract(r.html,'title'))),descriptionPattern:digest(clean(meta(r.html)))}}catch(e){errors.push({path:p,error:e.message});return null}}));pages.push(...batch.filter(Boolean))}
 const clusters=(field)=>{const map=new Map();for(const p of pages){const key=p[field];if(!key)continue;const a=map.get(key)||[];a.push(p.path);map.set(key,a)}return [...map].filter(([,a])=>a.length>1).map(([signature,paths])=>({signature,count:paths.length,examples:paths.slice(0,8)})).sort((a,b)=>b.count-a.count).slice(0,30)};
 const report={checkedAt:new Date().toISOString(),mode:'representative content similarity (not full census)',uniqueUrlsInGroups:[...grouped.values()].reduce((n,a)=>n+a.length,0),groups:Object.fromEntries([...grouped].map(([k,a])=>[k,a.length])),pagesChecked:pages.length,errors,identicalBodyClusters:clusters('bodyHash'),similarTitlePatternClusters:clusters('titlePattern'),similarDescriptionPatternClusters:clusters('descriptionPattern'),shortBodies:pages.filter(p=>p.bodyLength<450).map(p=>({path:p.path,length:p.bodyLength})).slice(0,40),samplePages:pages.slice(0,20).map(({path,title,description,bodyLength})=>({path,title,description,bodyLength}))};
 const output=JSON.stringify(report,null,2);console.log(output);if(process.env.SEO_DUP_REPORT_PATH)fs.writeFileSync(process.env.SEO_DUP_REPORT_PATH,output);if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
