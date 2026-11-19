'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const port=39876;
const base='http://127.0.0.1:'+port;
const origin='https://jeongukdaeri.kr';
const slugs=['used-car','rental-car','export-port','scrapyard','auction'];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const attr=(tag,key)=>tag.match(new RegExp('\\b'+key+'="([^"]*)"','i'))?.[1]||'';
const meta=(html,key,value)=>(html.match(/<meta\b[^>]*>/gi)||[]).find(tag=>attr(tag,key)===value)||'';
test('local server verifies six business meta, schema and Jegi-dong discovery',async()=>{
 const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<80;i++){
   if(child.exitCode!==null)throw Error('server exited before health ready');
   try{const r=await fetch(base+'/health',{signal:AbortSignal.timeout(900)});if(r.ok){ready=true;break}}catch{}
   await pause(350);
  }
  assert.ok(ready,'server starts');
  for(const slug of ['business',...slugs]){
   const route=slug==='business'?'/business/':'/business/'+slug+'/';
   const r=await fetch(base+route,{signal:AbortSignal.timeout(15000)});
   assert.equal(r.status,200,route+' HTTP');
   assert.doesNotMatch(r.headers.get('x-robots-tag')||'',/\bnoindex\b/i);
   const html=await r.text();
   const desc=attr(meta(html,'name','description'),'content');
   assert.equal(desc,attr(meta(html,'property','og:description'),'content'),route+' OG');
   assert.ok([...desc].length<=80,route+' concise description');
   assert.ok(html.includes('href="'+origin+route+'"'),route+' canonical');
   assert.doesNotMatch(html,/<meta[^>]+content=["']noindex/i);
   if(slug==='business')continue;
   const blocks=[...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
   const nodes=blocks.flatMap(x=>{const data=JSON.parse(x[1]);return Array.isArray(data['@graph'])?data['@graph']:Array.isArray(data)?data:[data]});
   assert.ok(nodes.some(x=>x['@type']==='WebPage'&&x.url===origin+route),route+' WebPage');
   assert.ok(nodes.some(x=>x['@type']==='BreadcrumbList'),route+' BreadcrumbList');
  }
  const taksongSitemap=await fetch(base+'/sitemap-taksong.xml',{signal:AbortSignal.timeout(20000)});
  assert.equal(taksongSitemap.status,200);
  const taksongXml=await taksongSitemap.text();
  for(const route of ['/business/',...slugs.map(slug=>'/business/'+slug+'/')]){
   assert.ok(taksongXml.includes('<loc>'+origin+route+'</loc>'),route+' is listed in the transport sitemap');
  }
  const jegi=origin+'/taksong/seoul/dongdaemun-gu/jegi-dong/';
  for(const route of ['/sitemap.xml','/sitemap-priority.xml']){
   const r=await fetch(base+route,{signal:AbortSignal.timeout(20000)});
   assert.equal(r.status,200,route+' HTTP');
   const xml=await r.text();
   assert.ok(xml.includes('<loc>'+jegi+'</loc>'),route+' contains Jegi-dong');
  }
  const detail=await fetch(base+'/taksong/seoul/dongdaemun-gu/jegi-dong/',{signal:AbortSignal.timeout(15000)});
  assert.equal(detail.status,200,'Jegi-dong detail HTTP');
  const html=await detail.text();
  assert.ok(html.includes('href="'+jegi+'"'),'Jegi-dong self-canonical');
  assert.doesNotMatch(html,/<meta[^>]+content=["']noindex/i,'Jegi-dong meta indexability');
 }finally{child.kill('SIGTERM')}
});
