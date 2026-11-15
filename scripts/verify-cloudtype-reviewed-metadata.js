#!/usr/bin/env node
'use strict';
// Compare reviewed GitHub source to actual public Cloudtype HTML. Read-only.
// Do not infer Naver indexing or URL-submission success from this deploy check.
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const base='https://jeongukdaeri.kr';
const cases=[
 ['/reviews/ride-record-stories/','reviews/ride-record-stories/index.html'],
 ['/reviews/taksong/','reviews/taksong/index.html'],
 ['/reviews/verified/','reviews/verified/index.html']
];
function meta(html){
 const match=html.match(/<meta\b[^>]*\bname=["']description["'][^>]*\bcontent=["']([^"']+)["']/i);
 return match?.[1]||'';
}
async function remote(route){
 const url=base+route+(route.includes('?')?'&':'?')+'release-verify='+Date.now();
 const response=await fetch(url,{redirect:'follow',headers:{'Cache-Control':'no-cache','User-Agent':'Smart24-Cloudtype-Review-Release-Check/1.0'},signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error(route+': HTTP '+response.status);
 if(new URL(response.url).pathname!==route)throw Error(route+': unexpected redirect');
 return response.text();
}
(async()=>{
 const problems=[];
 for(const [route,file] of cases){
  const expected=meta(fs.readFileSync(path.join(root,file),'utf8'));
  try{
   const actual=meta(await remote(route));
   if(!expected||actual!==expected)problems.push(route+': deployed meta description differs from reviewed source');
   else console.log('PASS '+route+' deployed metadata matches source ('+expected.length+' characters)');
  }catch(e){problems.push(route+': '+e.message)}
 }
 const code=fs.readFileSync(path.join(root,'lib/route-keyword-pages.js'),'utf8');
 const description=code.match(/return layout\('전국 실제 운행완료 출발지·도착지 탁송·대리운전 후기','([^']+)'/)?.[1]||'';
 try{
  const actual=meta(await remote('/routes/reviewed/'));
  if(!description||actual!==description)problems.push('/routes/reviewed/: deployed meta description differs');
  else console.log('PASS /routes/reviewed/ meta matches source');
 }catch(e){problems.push('/routes/reviewed/: '+e.message)}
 try{
  const page=await remote('/routes/taksong/area-765/area-15183/');
  const title=page.match(/<title\b[^>]*>([^<]*)<\/title>/i)?.[1]||'';
  if(!title||/\|\s*스마트24\s*\|\s*스마트24/.test(title))problems.push('verified route: double Smart24 brand or missing title');
  else console.log('PASS verified route has one Smart24 suffix');
 }catch(e){problems.push('verified route title: '+e.message)}
 if(problems.length){
  problems.forEach(x=>console.error('FAIL '+x));
  process.exitCode=1;
 }else console.log('PASS five public HTML pages match current reviewed SEO source; this does NOT prove Naver indexing.');
})().catch(e=>{console.error(e);process.exitCode=1});
