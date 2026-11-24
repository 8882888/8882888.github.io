'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const sitemapOwners=require('../data/sitemap-url-owners.json');
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
  for(const route of ['/business/',...slugs.map(slug=>'/business/'+slug+'/')]){
   const owner=sitemapOwners[route];
   assert.ok(owner,'business route has one registered sitemap owner '+route);
   const r=await fetch(base+owner,{signal:AbortSignal.timeout(20000)});
   assert.equal(r.status,200,owner+' HTTP');
   const xml=await r.text();
   assert.ok(xml.includes('<loc>'+origin+route+'</loc>'),route+' is listed in its assigned sitemap '+owner);
  }
  const jegi=origin+'/taksong/seoul/dongdaemun-gu/jegi-dong/';
  const jegiOwner=sitemapOwners['/taksong/seoul/dongdaemun-gu/jegi-dong/'];
  assert.ok(jegiOwner,'Jegi-dong has one registered sitemap owner');
  const jegiSitemap=await fetch(base+jegiOwner,{signal:AbortSignal.timeout(20000)});
  assert.equal(jegiSitemap.status,200,jegiOwner+' HTTP');
  assert.ok((await jegiSitemap.text()).includes('<loc>'+jegi+'</loc>'),jegiOwner+' contains Jegi-dong');
  const detail=await fetch(base+'/taksong/seoul/dongdaemun-gu/jegi-dong/',{signal:AbortSignal.timeout(15000)});
  assert.equal(detail.status,200,'Jegi-dong detail HTTP');
  const html=await detail.text();
  assert.ok(html.includes('href="'+jegi+'"'),'Jegi-dong self-canonical');
  assert.doesNotMatch(html,/<meta[^>]+content=["']noindex/i,'Jegi-dong meta indexability');
 }finally{child.kill('SIGTERM')}
});
