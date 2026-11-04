#!/usr/bin/env node
'use strict';
// Production mobile audit: first screen must not render thousands of historical rows.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const BASE=(process.env.SMART24_AUDIT_BASE||'https://jeongukdaeri.kr').replace(/\/$/,'');
const ROOT=path.resolve(__dirname,'..');
const fingerprint=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,file))).digest('hex');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function verifyRelease(){
 const home=fingerprint('index.html'),server=fingerprint('server.js');
 for(let i=0;i<18;i++){
  try{
   const r=await fetch(BASE+'/health/seo.json?mobile_audit='+home.slice(0,12),{signal:AbortSignal.timeout(13000),headers:{'cache-control':'no-cache'}});
   if(r.ok){
    const d=await r.json();
    if(d.deployment_hashes?.['index.html']===home && d.deployment_hashes?.['server.js']===server)return;
   }
  }catch(e){console.log('Mobile release probe:',String(e.message||e));}
  if(i<17)await sleep(7000);
 }
 throw Error('Mobile audit blocked: verified homepage revision has not reached the Cloudtype production server');
}
async function main(){
 await verifyRelease();
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const page=await context.newPage();
  await page.addInitScript(()=>{
   window.smart24ObservedLcpMs=0;
   try{new PerformanceObserver(list=>{for(const e of list.getEntries())window.smart24ObservedLcpMs=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});}catch(_){}
  });
  let externalHistoryCalls=0;
  page.on('request',r=>{if(r.url().includes('/rest/v1/ride_history?'))externalHistoryCalls++});
  const resp=await page.goto(BASE+'/?internal=1',{waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(resp.status(),200,'mobile homepage status');
  await page.waitForLoadState('load',{timeout:30000});
  await page.waitForTimeout(700);
  assert.equal(externalHistoryCalls,0,'Offscreen Supabase ride-history request must not block initial mobile load');
  assert.equal(await page.locator('#ride-history-rows tr').count(),1,'History table should remain a single lightweight placeholder at first paint');
  assert.equal(await page.locator('form[action="/fare/"]').count(),1,'Do not duplicate departure/destination fare form');
  assert.equal(await page.locator('#homepage-fare-top input[name="from"]').count(),1,'Upfront fare estimate form missing');
  assert(await page.locator('.mobile-consult-actions a[href="tel:18114294"]').isVisible(),'Mobile call button is missing');
  const initial=await page.evaluate(()=>({
   navigation:Math.round(performance.getEntriesByType('navigation')[0]?.duration||0),
   lcp:Math.round(window.smart24ObservedLcpMs||0),
   width:document.documentElement.scrollWidth,
   viewport:window.innerWidth,
   source:'Chromium mobile 390x844; individual synthetic run, not CrUX field data'
  }));
  assert(initial.width<=initial.viewport+8,'Mobile viewport is horizontally overflowing');
  const historyRequest=page.waitForRequest(r=>r.url().includes('/api/public-rides')&&r.method()==='GET',{timeout:22000});
  await page.locator('#ride-history').scrollIntoViewIfNeeded();
  await historyRequest;
  await page.waitForFunction(()=>{
   const status=document.getElementById('ride-search-status')?.textContent||'';
   return status.includes('검색 결과')||status.includes('불러오지 못했습니다');
  },{timeout:25000});
  const count=await page.locator('#ride-history-rows tr').count();
  assert(count<=80,'Homepage must not create more than 80 history table rows: '+count);
  const status=await page.locator('#ride-search-status').textContent();
  assert(status.includes('검색 결과'),'History failed to load after scrolling: '+status);
  console.log('SMART24_HOME_MOBILE PASS',JSON.stringify({...initial,renderedRideRows:count,historyRequestsAfterScroll:externalHistoryCalls}));
  await context.close();
 }finally{await browser.close()}
}
main().catch(e=>{console.error('SMART24_HOME_MOBILE FAIL:',e.stack||e);process.exitCode=1});
