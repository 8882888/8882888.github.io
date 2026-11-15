#!/usr/bin/env node
'use strict';
// Read-only verification of IndexNow ownership keys and core sitemap discovery.
// This test NEVER submits URLs, changes SEO metadata, or claims Naver index success.
const fs=require('node:fs');
const path=require('node:path');
const BASE=process.env.PUBLIC_BASE||'https://jeongukdaeri.kr';
const ROOT=path.join(__dirname,'..');
const KEYS=[
 '770f921af32e749f64c1d447c607ea42',
 'eb61a299742f4ae6a53efc03717a702a'
];
const corePaths=[
 '/coverage/',
 '/region/innovation-cities/',
 '/daeri/sejong/',
 '/taksong/sejong/',
 '/taksong/busan/gijang-gun/'
];
async function read(uri){
 const u=new URL(uri,BASE);
 const response=await fetch(u,{
  redirect:'manual',
  signal:AbortSignal.timeout(20000),
  headers:{'User-Agent':'Smart24-IndexNow-Sitemap-QA/1.0','Cache-Control':'no-cache'}
 });
 return {response,body:await response.text()};
}
const assert=(okay,why,errors)=>{if(!okay)errors.push(why)};
(async()=>{
 const errors=[];
 for(const key of KEYS){
  const source=fs.readFileSync(path.join(ROOT,key+'.txt'),'utf8').trim();
  assert(source===key,'source ownership key mismatch '+key,errors);
  try{
   const {response,body}=await read('/'+key+'.txt');
   assert(response.status===200,'public IndexNow key HTTP '+response.status+' '+key,errors);
   assert(body.trim()===key,'public IndexNow key response mismatch '+key,errors);
   assert(/text\/plain/i.test(response.headers.get('content-type')||''),'IndexNow key wrong content type '+key,errors);
   console.log('KEY',key.slice(0,8),'HTTP',response.status,'bytes',body.trim().length);
  }catch(e){errors.push('IndexNow key fetch failed '+key+': '+e.message)}
 }
 let xml='';
 for(const name of ['/sitemap-priority.xml','/sitemap.xml']){
  try{
   const {response,body}=await read(name);
   assert(response.status===200,name+' HTTP '+response.status,errors);
   assert(/<urlset\b/i.test(body),name+' missing XML urlset',errors);
   assert(/application\/xml|text\/xml/i.test(response.headers.get('content-type')||''),name+' wrong content type',errors);
   xml+=body+'\n';
   console.log('SITEMAP',name,'HTTP',response.status,'locations',(body.match(/<loc>/g)||[]).length);
  }catch(e){errors.push(name+' fetch failed: '+e.message)}
 }
 for(const route of corePaths){
  const target=new URL(route,BASE).href;
  assert(xml.includes('<loc>'+target+'</loc>'),'priority XML has no '+route,errors);
 }
 try{
  const {response,body}=await read('/robots.txt');
  assert(response.status===200,'robots HTTP '+response.status,errors);
  assert(body.includes('Sitemap: '+new URL('/sitemap-priority.xml',BASE).href),'robots lacks priority sitemap',errors);
 }catch(e){errors.push('robots.txt failed '+e.message)}
 if(errors.length){
  errors.forEach(e=>console.error('ERROR:',e));
  console.error(JSON.stringify({status:'FAIL',errors},null,2));
  process.exitCode=1;
 }else console.log('PASS: both IndexNow keys and all 5 core discovery paths are live (this does not establish indexing).');
})().catch(e=>{console.error('FAIL',e);process.exitCode=1});
