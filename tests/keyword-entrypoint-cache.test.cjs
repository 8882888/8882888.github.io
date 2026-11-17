'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createRegionalHtmlCache}=require('../lib/regional-html-cache.cjs');
const {spawn}=require('node:child_process');
const path=require('node:path');
test('bounded SEO HTML cache coalesces concurrent requests without leaking rejected renders',async()=>{
 let now=1000,calls=0;
 const cache=createRegionalHtmlCache({maxEntries:2,ttlMs:1000,clock:()=>now});
 const render=async()=>{calls++;return '<html>fixed</html>'};
 const [a,b]=await Promise.all([cache.get('sejong|taksong',render),cache.get('sejong|taksong',render)]);
 assert.equal(a,b);assert.equal(calls,1,'concurrent requests render once');
 assert.equal(await cache.get('sejong|taksong',render),a);assert.equal(calls,1);
 await cache.get('gijang|taksong',render);
 await cache.get('jinju|taksong',render);
 assert.equal(cache.stats().entries,2);
 await cache.get('sejong|taksong',render);
 assert.equal(calls,4,'evicted route rerenders');
 now+=1001;
 await cache.get('sejong|taksong',render);
 assert.equal(calls,5,'TTL invalidates old content');
 let attempts=0;
 await assert.rejects(cache.get('fail',async()=>{attempts++;throw Error('transient')}));
 assert.equal(await cache.get('fail',async()=>{attempts++;return 'ok'}),'ok');
 assert.equal(attempts,2,'failed render is not cached');
});
test('regional search, homepage search and keyword-search map equivalent vehicle terms to one canonical page',async()=>{
 const root=path.resolve(__dirname,'..'),port=39863,origin='http://127.0.0.1:'+port;
 const cp=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ready=false;
  for(let n=0;n<100;n++){
   if(cp.exitCode!==null)throw Error('server exited '+cp.exitCode);
   try{if((await fetch(origin+'/health',{signal:AbortSignal.timeout(1200)})).ok){ready=true;break}}catch{}
   await new Promise(r=>setTimeout(r,250));
  }
  assert.ok(ready);
  for(const [q,canonical] of [
   ['3.5톤사다리차탁송','/service/ladder-truck-taksong/'],
   ['1톤고소차탁송','/service/aerial-work-truck-taksong/'],
   ['집게차탁송','/service/heavy-truck-taksong/'],
   ['설악산탁송','/설악산탁송/'],
   ['섬진강자전거길종주탁송','/route-taksong/courses/seomjin/'],
   ['장거리대리운전','/service/long-distance-daeri/']
  ]){
   for(const start of ['/','/keyword-search/','/region/']){
    const req=await fetch(origin+start+'?q='+encodeURIComponent(q),{redirect:'manual'});
    assert.equal(req.status,302,start+' '+q+' should canonicalize without query landing');
    assert.equal(decodeURI(req.headers.get('location')),canonical,'canonical path allows percent-encoded Korean');
    assert.match(req.headers.get('cache-control')||'',/no-store/);
   }
  }
  const region=await fetch(origin+'/region/?q='+encodeURIComponent('세종대리운전'),{redirect:'manual'});
  assert.ok([200,302].includes(region.status),'unrelated geographic queries unaffected');
  const prior=await fetch(origin+'/taksong/sejong/');
  assert.equal(prior.status,200);
  const a=await prior.text();
  const b=await (await fetch(origin+'/taksong/sejong/')).text();
  assert.equal(a,b,'SEO HTML response is stable across cached requests');
  assert.ok(a.includes('rel="canonical" href="https://jeongukdaeri.kr/taksong/sejong/"'));
  assert.ok(!/name="robots" content="noindex/.test(a));
  const village=await fetch(origin+'/taksong/sejong/yeongi-myeon/'); // May not exist depending on administrative hierarchy.
  assert.ok([200,404].includes(village.status));
 }finally{cp.kill();}
});
