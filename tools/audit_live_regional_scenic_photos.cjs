'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const rows=require('../data/regional-scenic-photos-20261128.json');
const BASE='https://jeongukdaeri.kr';
const OUT=path.join(process.cwd(),'artifacts','regional-scenic-live');
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const results=[];
 try{
  for(const row of rows){
   const entry={province:row.province,place:row.place,passed:false};
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
   try{
    const lookup=await context.request.get(BASE+'/api/locality-suggest?'+new URLSearchParams({q:row.province+'탁송',service:'taksong'}),{timeout:20000});
    assert.ok(lookup.ok(),'locality lookup HTTP');
    const data=await lookup.json();
    const item=data.items.find(x=>x.full_name===row.province);
    assert.ok(item,'exact province match');
    const target=new URL(item.service_url,BASE);
    assert.equal(target.origin,BASE);
    entry.page=target.href;
    const page=await context.newPage();
    const response=await page.goto(target.href,{waitUntil:'domcontentloaded',timeout:40000});
    assert.equal(response.status(),200);
    const panel=page.locator('#regional-scenic-photo-20261128');
    assert.equal(await panel.count(),1,'exactly one scenic panel');
    const img=panel.locator('img');
    assert.equal(await img.count(),1);
    const text=await panel.textContent();
    for(const expected of [row.province,row.place,row.author,row.license])assert.ok(text.includes(expected),'missing attribution '+expected);
    assert.ok(await panel.locator('a').evaluateAll((els,source)=>els.some(x=>x.href===source),row.source),'original source link');
    await img.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>{const i=document.querySelector('#regional-scenic-photo-20261128 img');return i&&i.complete&&i.naturalWidth>0},null,{timeout:20000});
    const dims=await img.evaluate(i=>({width:i.naturalWidth,height:i.naturalHeight,displayWidth:i.getBoundingClientRect().width,left:i.getBoundingClientRect().left,right:i.getBoundingClientRect().right,src:i.currentSrc}));
    entry.dimensions=dims;
    // Two reviewed panoramic originals are intentionally very wide. Confirm the
    // actual decoded thumbnail preserves their documented source proportions.
    // Do not relax normal-photo thresholds or the zero-size/broken-image checks.
    const panoramic={'Countryandcitydaegu.jpg':[960,122],'Hahoe Folk Village Panorama.jpg':[960,134]}[row.file];
    if(panoramic){
     assert.ok(dims.width>=panoramic[0]&&dims.height>=panoramic[1],'panorama decoded thumbnail minimum dimensions '+JSON.stringify(dims));
     assert.ok(Math.abs(dims.height/dims.width-panoramic[1]/panoramic[0])<0.003,'panorama original aspect ratio '+JSON.stringify(dims));
    }else assert.ok(dims.width>=320&&dims.height>=180,'actual decoded photograph dimensions '+JSON.stringify(dims));
    assert.ok(dims.left>=-2&&dims.right<=392&&dims.displayWidth>0,'mobile image within viewport');
    entry.passed=true;
    console.log('PASS '+row.province+' '+dims.width+'x'+dims.height+' '+target.pathname);
   }catch(error){entry.error=String(error.message||error);console.error('FAIL '+row.province+' '+entry.error);}
   finally{results.push(entry);await context.close();}
  }
 }finally{await browser.close();}
 const passed=results.filter(x=>x.passed).length;
 fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({checked:results.length,passed,failed:results.length-passed,results},null,2));
 console.log('SCENIC LIVE '+passed+'/'+results.length);
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## Actual mobile scenic image decoding\n\n'+passed+'/'+results.length+' representative province photographs passed.\n');
 if(passed!==rows.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
