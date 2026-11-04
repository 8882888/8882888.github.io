#!/usr/bin/env node
'use strict';
// 100 real Chromium mobile acceptance checks: 20 independent assertions at five widths.
// This script audits the current Cloudtype release and NEVER changes public booking state.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const BASE=(process.env.SMART24_AUDIT_BASE||'https://jeongukdaeri.kr').replace(/\/$/,'');
const ROOT=path.resolve(__dirname,'..');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,file))).digest('hex');
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
const DEVICES=[{width:320,height:700},{width:360,height:740},{width:390,height:844},{width:430,height:900},{width:600,height:920}];
async function verifyProduction(){
 const home=sha('index.html'),server=sha('server.js');
 for(let i=0;i<28;i++){
  try{
   const res=await fetch(BASE+'/health/seo.json?mobile100='+home.slice(0,12),{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(15000)});
   if(res.ok){
    const d=await res.json();
    if(d.deployment_hashes?.['index.html']===home&&d.deployment_hashes?.['server.js']===server){
     console.log('SMART24_MOBILE100 verified production content SHA',home.slice(0,12));
     return;
    }
   }
  }catch(e){console.log('Production hash probe: '+String(e.message||e));}
  if(i<27)await sleep(7000);
 }
 throw Error('Production HTML and server code did not match HEAD before audit.');
}
async function run(){
 await verifyProduction();
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const results=[],summary=[];
 try{
  for(const device of DEVICES){
   const context=await browser.newContext({viewport:device,deviceScaleFactor:1,isMobile:true,hasTouch:true});
   const page=await context.newPage();
   const requested=[];
   page.on('request',r=>{if(/\/api\/public-rides|\/rest\/v1\/ride_history\?|\/data\/ride-history\.json/.test(r.url()))requested.push(r.url())});
   let response=null,navigationError='';
   try{
    response=await page.goto(BASE+'/?internal=1&mobile100='+device.width,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForLoadState('load',{timeout:35000});
    await page.waitForTimeout(500);
   }catch(e){navigationError=String(e.message||e)}
   const group=[],check=async(name,fn)=>{
    try{await fn();results.push({width:device.width,name,pass:true});group.push(true)}
    catch(e){results.push({width:device.width,name,pass:false,error:String(e.message||e)});group.push(false)}
   };
   const sticky='.mobile-consult-actions';
   await check('01 homepage responds 200',()=>assert.equal(response?.status(),200,navigationError));
   await check('02 Korean document language',async()=>assert.equal(await page.locator('html').getAttribute('lang'),'ko'));
   await check('03 responsive viewport meta',async()=>assert.match(await page.locator('meta[name="viewport"]').getAttribute('content'),/width=device-width/));
   await check('04 exactly one H1',async()=>assert.equal(await page.locator('h1').count(),1));
   await check('05 hero phone needs one tap',async()=>assert.equal(await page.locator('.hero-actions a[href^="tel:"]').first().getAttribute('href'),'tel:18114294'));
   await check('06 fixed mobile phone CTA visible',async()=>assert(await page.locator(sticky+' a[href^="tel:"]').isVisible()));
   await check('07 fixed phone is dialable',async()=>assert.equal(await page.locator(sticky+' a[href^="tel:"]').getAttribute('href'),'tel:18114294'));
   await check('08 fixed estimate CTA visible',async()=>assert(await page.locator(sticky+' a[href^="#"]').isVisible()));
   await check('09 estimate CTA stays on the homepage',async()=>assert.equal(await page.locator(sticky+' a[href^="#"]').getAttribute('href'),'#homepage-fare-top'));
   await check('10 two touch targets >=44px',async()=>{
    const links=page.locator(sticky+' a');
    assert.equal(await links.count(),2);
    for(let i=0;i<2;i++){const b=await links.nth(i).boundingBox();assert(b&&b.height>=44&&b.width>=110,JSON.stringify(b))}
   });
   await check('11 estimate form ahead of mountain fare',async()=>{
    const p=await page.evaluate(()=>({a:document.getElementById('homepage-fare-top')?.compareDocumentPosition(document.getElementById('mountain-cycling-fare-first-20261103'))}));
    assert(p.a&Node.DOCUMENT_POSITION_FOLLOWING,'fare form must precede posters');
   });
   await check('12 only one complete fare form',async()=>assert.equal(await page.locator('form[action="/fare/"]').count(),1));
   await check('13 departure address required',async()=>{
    const x=page.locator('#homepage-fare-top input[name="from"]');assert(await x.isVisible());assert.equal(await x.getAttribute('required'),'');
   });
   await check('14 arrival address required',async()=>{
    const x=page.locator('#homepage-fare-top input[name="to"]');assert(await x.isVisible());assert.equal(await x.getAttribute('required'),'');
   });
   await check('15 taksong and driver selectable',async()=>{
    const opts=await page.locator('#homepage-fare-top select[name="service"] option').evaluateAll(nodes=>nodes.map(x=>x.value));
    assert(opts.includes('taksong')&&opts.includes('daeri'));
   });
   await check('16 quote action remains GET /fare/',async()=>{
    const form=page.locator('#homepage-fare-top form');assert.equal(await form.getAttribute('method'),'get');assert.equal(await form.getAttribute('action'),'/fare/');
    assert(await page.locator('#homepage-fare-top button[type="submit"]').isVisible());
   });
   await check('17 no below-fold trip-data requests at load',()=>assert.equal(requested.length,0,requested.join('; ')));
   await check('18 one history placeholder, ticker deferred',async()=>{
    assert.equal(await page.locator('#ride-history-rows tr').count(),1);
    assert.equal(await page.locator('#trip-flow-track a').count(),0);
   });
   await check('19 no horizontal mobile overflow',async()=>{
    const r=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,window:window.innerWidth}));
    assert(r.scroll<=r.window+8,JSON.stringify(r));
   });
   await check('20 one-tap CTA moves to visible estimate form',async()=>{
    await page.locator(sticky+' a[href="#homepage-fare-top"]').click();
    await page.waitForFunction(()=>location.hash==='#homepage-fare-top',{timeout:10000});
    const r=await page.locator('#homepage-fare-top input[name="from"]').boundingBox();
    assert(r&&r.y<device.height&&r.y+r.height>=0,JSON.stringify(r));
   });
   summary.push({width:device.width,checks:group.length,passed:group.filter(Boolean).length,failed:group.filter(v=>!v).length});
   console.log('SMART24_MOBILE100 width='+device.width+' PASS '+group.filter(Boolean).length+'/'+group.length);
   await context.close();
  }
 }finally{await browser.close()}
 const dir=path.join(ROOT,'artifacts','live-browser-cards');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'mobile-100-checks.json'),JSON.stringify({url:BASE,devices:DEVICES,summary,results},null,2));
 const fails=results.filter(r=>!r.pass);
 console.log('SMART24_MOBILE100 TOTAL '+(results.length-fails.length)+'/'+results.length+'; failures='+fails.length);
 for(const f of fails)console.error('SMART24_MOBILE100_FAIL',JSON.stringify(f));
 assert.equal(results.length,100,'Exactly 5 widths times 20 real mobile checks');
 assert.equal(fails.length,0,'Mobile acceptance failures; inspect uploaded JSON artifact');
}
run().catch(e=>{console.error('SMART24_MOBILE100 ERROR',e.stack||e);process.exitCode=1});
