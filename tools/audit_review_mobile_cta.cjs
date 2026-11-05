#!/usr/bin/env node
'use strict';
// Checks Chromium mobile touch events and phone link wiring, NOT a real carrier phone call.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),base=(process.env.SMART24_AUDIT_BASE||'https://jeongukdaeri.kr').replace(/\/$/,'');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
async function checkRelease(){
 const expected={'server.js':hash('server.js'),'index.html':hash('index.html')};
 const res=await fetch(base+'/health/seo.json?mobile_cta='+Date.now(),{signal:AbortSignal.timeout(15000),headers:{'cache-control':'no-cache'}});
 assert.equal(res.status,200,'Production health must respond');
 const d=await res.json();
 for(const [file,digest] of Object.entries(expected))assert.equal(d.deployment_hashes?.[file],digest,'Stale deployment: '+file);
}
async function run(){
 await checkRelease();
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const cases=[
   {route:'/taksong/busan/',service:'taksong',regional:true},
   {route:'/daeri/daegu/',service:'daeri',regional:true},
   {route:'/reviews/history/?kind=taksong',service:'taksong'},
   {route:'/reviews/history/excel-0011/',detail:true}
  ];
  for(const width of [360,390,430]){
   const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
   const page=await context.newPage();
   for(const item of cases){
    const resp=await page.goto(base+item.route,{waitUntil:'domcontentloaded',timeout:40000});
    assert.equal(resp?.status(),200,item.route+' HTTP');
    const selector='.review-mobile-booking-bar';
    const nav=page.locator(selector);
    assert.equal(await nav.count(),1,item.route+' one mobile action bar');
    assert(await nav.isVisible(),item.route+' mobile bar visible');
    const links=nav.locator('a');
    assert.equal(await links.count(),2);
    const fare=links.nth(0),call=links.nth(1);
    const fareHref=await fare.getAttribute('href');
    const telHref=await call.getAttribute('href');
    assert(fareHref?.startsWith('/fare/?'),'fare path missing');
    if(item.service)assert(fareHref.includes('service='+item.service),'wrong service selection');
    assert.equal(telHref,'tel:18114294','Wrong consultation number');
    for(const link of [fare,call]){
     const rect=await link.boundingBox();
     assert(rect&&rect.width>=110&&rect.height>=44,'touch area too small '+item.route+' '+JSON.stringify(rect));
     assert(rect.y>=0&&rect.y+rect.height<=844,'fixed link not fully in viewport');
    }
    // Prevent telephone OS launch, then verify an actual Chromium touch tap delivered the click.
    await page.evaluate(()=>{
     window.__smart24PhoneTapCount=0;
     document.querySelector('.review-mobile-booking-bar a[href^="tel:"]').addEventListener('click',event=>{
      window.__smart24PhoneTapCount++;
      event.preventDefault();
     },{capture:true});
    });
    await call.tap();
    assert.equal(await page.evaluate(()=>window.__smart24PhoneTapCount),1,'touch tap did not reach phone link');
    // Navigate via the fare button and confirm it enters the real fare page.
    await fare.tap();
    await page.waitForURL(/\/fare\//,{timeout:15000});
    assert(page.url().includes('/fare/'),'fare tap did not navigate');
    console.log('MOBILE_CTA_PASS',width,item.route,telHref,fareHref);
   }
   await context.close();
  }
 }finally{await browser.close()}
 console.log('PASS: 12 viewport-route mobile CTA checks. Native phone dialer/carrier connectivity not tested.');
}
run().catch(e=>{console.error('MOBILE_CTA_FAIL',e.stack||e);process.exitCode=1});
