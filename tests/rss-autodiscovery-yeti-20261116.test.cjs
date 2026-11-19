'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const live=process.env.SMART24_AUDIT_LIVE==='1';
const port=39783;
const base=live?'https://jeongukdaeri.kr':'http://127.0.0.1:'+port;
const hostname='https://jeongukdaeri.kr';
const pause=ms=>new Promise(done=>setTimeout(done,ms));
async function get(route){
 const res=await fetch(base+route,{
  signal:AbortSignal.timeout(18000),
  redirect:'manual',
  headers:{'User-Agent':'Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)','Cache-Control':'no-cache'}
 });
 assert.equal(res.status,200,route+' must respond HTTP 200');
 return {body:await res.text(),type:res.headers.get('content-type')};
}
test((live?'production':'local')+' Naver can discover source-backed RSS and crawl its original articles',async()=>{
 const child=live?null:spawn(process.execPath,['server.js'],{
  cwd:path.join(__dirname,'..'),
  env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'},
  stdio:'ignore'
 });
 try{
  if(!live){
   let ready=false;
   for(let i=0;i<100;i++){
    if(child.exitCode!==null)throw Error('server failed to start');
    try{
     const res=await fetch(base+'/health',{signal:AbortSignal.timeout(1000)});
     if(res.ok){ready=true;break}
    }catch{}
    await pause(350);
   }
   assert(ready,'local server ready');
  }
  const [home,gijang,feed]=await Promise.all([get('/'),get('/taksong/busan/gijang-gun/'),get('/rss.xml')]);
  // Static index.html already advertises RSS with a different title from the
  // dynamic layout. Match the real semantic link, not a decorative title.
  for(const [name,html] of [['home',home.body],['gijang',gijang.body]]){
   assert(html.includes('type="application/rss+xml"'),name+' must declare RSS MIME type');
   const matches=html.split('href="'+hostname+'/rss.xml"').length-1;
   assert.equal(matches,1,name+' must provide exactly one public RSS discovery link');
   assert(!/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html),name+' must stay indexable');
  }
  if(!live){
   for(const route of ['/rss.xml','/feed.xml','/sitemap-published.xml','/sitemap-priority.xml','/sitemap-taksong.xml','/sitemap-daeri.xml']){
    const initial=await fetch(base+route,{headers:{'Accept-Encoding':'identity'}});
    assert.equal(initial.status,200);
    const tag=initial.headers.get('etag');
    assert.match(tag||'',/^W\/"[a-f0-9]{64}"$/);
    const body=await initial.text();
    const unchanged=await fetch(base+route,{headers:{'If-None-Match':tag}});
    assert.equal(unchanged.status,304);
    assert.equal(await unchanged.text(),'');
    const changed=await fetch(base+route,{headers:{'If-None-Match':'"stale"','Accept-Encoding':'gzip'}});
    assert.equal(changed.status,200);
    if(Buffer.byteLength(body)>=4096)assert.equal(changed.headers.get('content-encoding'),'gzip');
    assert.equal(await changed.text(),body);
   }
  }
  assert.match(feed.type||'',/application\/rss\+xml/i,'RSS HTTP content-type');
  assert.match(feed.body,/<rss\s+version="2\.0">/,'valid RSS root');
  assert.match(feed.body,/<channel>[\s\S]*<language>ko<\/language>/,'language and channel metadata');
  const items=[...feed.body.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m=>m[1]);
  assert(items.length>=3,'verified feed contains original, source-backed cases');
  assert(items.length<=20,'bounded news feed to 20 source-backed cases');
  let longText=0;
  const check=[];
  for(const item of items){
   const url=item.match(/<link>([^<]+)<\/link>/)?.[1]||'';
   assert(url.startsWith(hostname+'/reviews/'),'no unverified external case source');
   assert(item.includes('<guid isPermaLink="true">'+url+'</guid>'),'item canonical guid');
   const desc=item.match(/<description>([\s\S]*?)<\/description>/)?.[1]||'';
   assert(desc.length>=100,'substantial unique article content in RSS item');
   if(desc.length>=400)longText++;
   check.push(new URL(url).pathname);
  }
  assert(longText>=Math.min(3,items.length),'RSS includes full completed ride article content, not just snippets');
  for(const route of check.slice(0,3)){
   const {body}=await get(route);
   assert(body.includes('<link rel="canonical" href="'+hostname+route+'">'),route+' canonical URL');
   assert(!/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(body),'RSS case must remain indexable');
  }
  console.log('PASS Naver RSS discovery; '+items.length+' actual cases, '+longText+' substantial article descriptions, 3 source HTTP200 canonicals');
 }finally{child?.kill()}
});
