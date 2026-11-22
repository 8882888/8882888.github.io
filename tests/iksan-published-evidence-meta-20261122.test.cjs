'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),server=fs.readFileSync(path.join(root,'server.js'),'utf8'),port=39953,base='http://127.0.0.1:'+port;
test('Iksan city primary SEO title/synopsis overrides generic fast-dispatch templates, without changing real ride proof',()=>{
 assert.ok(server.includes("const iksanCitySearchMeta=r.full_name==='전북특별자치도 익산시'?iksanBusongSeo.searchMeta(r,kind):null;"));
 assert.ok(server.includes('iksanCitySearchMeta?.title||'),'Iksan city title remains part of the canonical prioritized SEO chain despite other city-specific titles');
 assert.ok(server.includes('iksanCitySearchMeta?.description||'),'Iksan city description remains part of the canonical prioritized SEO chain');
 assert.ok(server.includes("(!priorityMeta&&!focus50Info&&!historicalTitleTrip&&!verifiedTitleTrip&&!verifiedDaeriTitleTrip)?iksanBusongSeo.searchMeta(r,kind):null"),'Other city and dong metadata never overwritten');
});
test('Actual Iksan/Busong published completed trip wins over outdated generic no-evidence fallback',async()=>{
 const cp=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<100;i++){
   if(cp.exitCode!==null)throw Error('Smart24 regional server exited '+cp.exitCode);
   try{if((await fetch(base+'/health',{signal:AbortSignal.timeout(900)})).ok){ready=true;break}}catch{}
   await new Promise(r=>setTimeout(r,250));
  }
  assert.ok(ready,'Source-backed regional SSR must start');
  for(const [url,title] of [
   ['/taksong/jeonbuk/iksan-si/','익산탁송 | 부송동'],
   ['/daeri/jeonbuk/iksan-si/','익산대리운전 | 부송동'],
   ['/taksong/jeonbuk/iksan-si/busong-dong/','익산부송동탁송'],
   ['/daeri/jeonbuk/iksan-si/busong-dong/','익산부송동대리운전']
  ]){
   const res=await fetch(base+url,{signal:AbortSignal.timeout(30000)}),html=await res.text();
   assert.equal(res.status,200,url);
   assert.ok(html.includes('<title>'+title),url+' targeted title');
   assert.ok(html.includes('https://jeongukdaeri.kr'+url),url+' exact canonical');
   assert.ok(html.includes('부송동'));
   if(url.startsWith('/taksong/')){
    assert.ok(html.includes('2026-11-18')&&html.includes('광주광역시 광산구 송정동'),'Iksan and Busong taksong actual published source must remain');
    assert.ok(html.includes('공개 완료 운행기록 안내'),'Show actual verified ride context in place of contradictory old message');
    assert.ok(!html.includes('현재 공개 가능한 기록에서 이 행정구역의 출발 또는 도착이 확인된 운행은 없습니다.'),'Do not contradict the published completed arrival');
    assert.ok(html.includes('당시 요금'),'Historic source price is not a live quote');
   }
  }
 }finally{cp.kill('SIGTERM')}
});
test('Keep existing national and Iksan sitemap boundaries untouched; no synthetic new local URL',()=>{
 assert.equal((fs.readFileSync(path.join(root,'robots.txt'),'utf8').match(/^Sitemap:/gm)||[]).length,8);
 assert.ok(!server.includes('/sitemap-iksan-seo.xml'));
 assert.ok(server.includes('익산시 부송동')||server.includes('iksanBusongSeo.regionSection'));
 assert.ok(server.includes('regionAncestors(r).map'));
});
