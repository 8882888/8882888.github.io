#!/usr/bin/env node
'use strict';
// Live Chromium mobile verification: search filters, fare contacts, purpose hub and measured navigation.
// No simulated tap is represented as an actual telephone call.
const assert=require('node:assert/strict');
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),base=(process.env.SMART24_AUDIT_BASE||'https://jeongukdaeri.kr').replace(/\/$/,'');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
async function verifyRelease(){
 const d=await (await fetch(base+'/health/seo.json?five_journeys='+Date.now(),{signal:AbortSignal.timeout(20000),headers:{'cache-control':'no-cache'}})).json();
 for(const p of ['server.js','index.html'])assert.equal(d.deployment_hashes?.[p],hash(p),'Production not latest '+p);
}
async function main(){
 await verifyRelease();
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [360,390,430]){
   const ctx=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
   const page=await ctx.newPage();
   const results=[];
   for(const [route,selector] of [
    ['/reviews/history/?kind=taksong&from=%EB%B6%80%EC%82%B0&minFare=10000','#history-advanced-filters-20261105'],
    ['/fare/?service=taksong&from=%EB%B6%80%EC%82%B0&to=%EB%8C%80%EA%B5%AC','#fare-consult-after-result-20261105'],
    ['/service/corporate/','#corporate-monthly-statements-20261105'],
    ['/service/taksong-purpose/','#rental']
   ]){
    const t=Date.now(),r=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:45000});
    assert.equal(r?.status(),200,route);
    const ms=Date.now()-t;
    assert(await page.locator(selector).count(),route+' missing '+selector);
    const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    assert(horizontal<=10,route+' horizontal overflow at '+width+': '+horizontal);
    if(route.startsWith('/reviews/history')){
     const form=page.locator('#history-advanced-search');
     assert.equal(await form.count(),1);
     assert.equal(await page.locator('[name="from"][form="history-advanced-search"]').inputValue(),'부산');
     assert.equal(await page.locator('[name="minFare"][form="history-advanced-search"]').inputValue(),'10000');
    }
    if(route.startsWith('/fare/')){
     assert.equal(await page.locator('#service').inputValue(),'taksong');
     assert.equal(await page.locator('#from').inputValue(),'부산');
     assert.equal(await page.locator('#to').inputValue(),'대구');
     assert.equal(await page.locator('#fare-consult-after-result-20261105 a[href="tel:18114294"]').count(),1);
     assert.equal(await page.locator('#fare-consult-after-result-20261105 a[href^="https://open.kakao.com/"]').count(),1);
    }
    if(route.includes('taksong-purpose')){
     for(const id of ['rental','service-center','used-car','auction'])assert.equal(await page.locator('#'+id).count(),1);
    }
    results.push({route,domContentLoadedNavigationMs:ms,overflowPx:horizontal});
   }
   console.log('FIVE_JOURNEYS_MOBILE',width,JSON.stringify(results));
   await ctx.close();
  }
 }finally{await browser.close()}
 console.log('PASS live mobile customer-journey integration. Navigation durations are synthetic, not field user speed.');
}
main().catch(e=>{console.error('FIVE_JOURNEYS_MOBILE_FAIL',e.stack||e);process.exitCode=1});
