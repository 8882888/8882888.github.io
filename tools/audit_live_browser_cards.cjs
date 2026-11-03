#!/usr/bin/env node
'use strict';
// Live Chrome interaction, not just API JSON or generated source inspection.
// The report deliberately distinguishes a correct regional card from an exact
// keyword-painted card and does not make any SEO ranking claim.
const { chromium }=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict');
const BASE=(process.env.SMART24_AUDIT_BASE||'https://jeongukdaeri.kr').replace(/\/$/,'');
const OUT=path.join(process.cwd(),'artifacts','live-browser-cards');
fs.mkdirSync(OUT,{recursive:true});
const cases=[
 {q:'부산탁송회사',region:'부산광역시',kind:'taksong',image:'svg',screen:'desktop'},
 {q:'부산렌트카탁송',region:'부산광역시',kind:'taksong',image:'svg',screen:'desktop'},
 {q:'서울법인카드대리운전',region:'서울특별시',kind:'daeri',image:'svg',screen:'desktop'},
 {q:'부산기장군탁송업체',region:'부산광역시 기장군',kind:'taksong',image:'svg',screen:'mobile'},
 {q:'평택5톤탁송',region:'경기도 평택시',kind:'taksong',image:'svg',screen:'mobile'},
 {q:'설악산탁송',region:'설악산탁송',kind:'taksong',image:'svg',screen:'mobile'},
 {q:'영산강길종주탁송',region:'영산강길종주탁송',kind:'taksong',image:'svg',screen:'mobile'},
 {q:'제주도대리운전',region:'제주특별자치도',kind:'daeri',image:'svg',screen:'mobile'}
];
const results=[];
(async()=>{
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const [index,caseData] of cases.entries()){
  const isMobile=caseData.screen==='mobile';
  const context=await browser.newContext({viewport:isMobile?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:1,isMobile,hasTouch:isMobile});
  const page=await context.newPage();
  const entry={number:index+1,...caseData,passed:false};
  try{
   const response=await page.goto(BASE+'/',{waitUntil:'domcontentloaded',timeout:40000});
   assert.equal(response.status(),200,'home HTTP');
   const form=page.locator('form[data-card-preview-form]').first();
   await form.locator('input[name="q"]').fill(caseData.q);
   await form.locator('button[type="submit"]').click();
   await page.waitForFunction(expected=>{
    const status=document.querySelector('[data-card-preview-output] .smart24-card-status');
    return status&&status.textContent.includes(expected);
   },caseData.region,{timeout:30000});
   const panel=page.locator('[data-card-preview-output] .smart24-card-panel').first();
   await panel.waitFor({state:'visible',timeout:12000});
   const label=(await panel.locator('h3').textContent()||'').trim();
   const image=panel.locator('img.smart24-card-preview-image');
   const imageStatus=await image.evaluate(async el=>{
     if(!el.complete)await new Promise((resolve,reject)=>{
      el.addEventListener('load',resolve,{once:true});
      el.addEventListener('error',()=>reject(Error('Image failed')),{once:true});
      setTimeout(()=>reject(Error('Image timeout')),20000);
     });
     return {width:el.naturalWidth,height:el.naturalHeight,src:el.currentSrc};
   });
   assert.ok(imageStatus.width>=500&&imageStatus.height>=300,'rendered card image dimensions');
   assert.ok(imageStatus.src.includes('/card/')||imageStatus.src.includes('/assets/')||imageStatus.src.includes('/keyword-card/'),'card image from expected source');
   if(caseData.image==='svg')assert.ok(imageStatus.src.includes('.svg'),'keyword/mountain card expected SVG');
   if(caseData.image==='png')assert.ok(imageStatus.src.includes('.webp')||imageStatus.src.includes('.png'),'region card expected WebP or PNG');
   const panelRight=await panel.evaluate(el=>el.getBoundingClientRect().right);
   assert.ok(panelRight<= (isMobile?390:1280)+3,'card fits the viewport');
   const link=panel.locator('a.smart24-card-picture-link');
   assert.equal(await link.count(),1);
   await link.click();
   await page.locator('dialog.smart24-card-dialog[open]').waitFor({timeout:8000});
   const zoomed=page.locator('dialog.smart24-card-dialog img');
   await zoomed.evaluate(async el=>{
    if(el.complete&&el.naturalWidth>0)return;
    await new Promise((resolve,reject)=>{
      el.addEventListener('load',resolve,{once:true});
      el.addEventListener('error',()=>reject(Error('Zoom image failed')),{once:true});
      setTimeout(()=>reject(Error('Zoom image timeout')),20000);
    });
   });
   assert.ok(await zoomed.evaluate(el=>el.naturalWidth>0),'zoomed image displays');
   await page.locator('dialog.smart24-card-dialog .smart24-card-dialog-close').click();
   assert.equal(await page.locator('dialog.smart24-card-dialog[open]').count(),0);
   const original=await panel.locator('a.smart24-card-picture-link').getAttribute('href');
   entry.image=imageStatus.src.replace(BASE,'');
   entry.original=original;
   entry.visible_label=label;
   entry.exact_keyword_painted=label.includes(caseData.q);
   if(caseData.q!=='설악산탁송'&&caseData.q!=='영산강길종주탁송'){
     assert.equal(label,caseData.q,'visible card title matches entered phrase exactly');
     const art=await page.evaluate(async source=>(await fetch(source,{cache:'no-store'})).text(),imageStatus.src);
     assert.ok(art.includes('>'+caseData.q+'</text>'),'SVG itself contains exact painted keyword');
   }
   entry.passed=true;
   await page.locator('#dynamic-service-card-search-20261103').screenshot({path:path.join(OUT,String(index+1).padStart(2,'0')+'-'+caseData.screen+'.png')});
   console.log('PASS '+(index+1)+'/'+cases.length+' '+caseData.q+' | '+label+' | image '+imageStatus.width+'x'+imageStatus.height+' | zoom verified');
  }catch(error){entry.error=String(error.stack||error);console.error('FAIL '+caseData.q+': '+String(error.message||error));}
  results.push(entry);await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const p=await context.newPage();await p.goto(BASE+'/',{waitUntil:'domcontentloaded',timeout:40000});
 await p.locator('form[data-card-preview-form] input[name="q"]').fill('광주탁송회사');
 await p.locator('form[data-card-preview-form] button[type="submit"]').click();
 await p.locator('.smart24-card-choices .smart24-card-choice').first().waitFor({timeout:30000});
 const ambiguous=await p.locator('.smart24-card-choices .smart24-card-choice').count();
 const ambiguousPass=ambiguous>=2;
 results.push({query:'광주탁송회사',kind:'ambiguous',choices:ambiguous,passed:ambiguousPass});
 console.log((ambiguousPass?'PASS':'FAIL')+' ambiguous 광주탁송회사 -> '+ambiguous+' choices');
 await context.close();
}finally{await browser.close();}
const passed=results.filter(r=>r.passed).length,failed=results.length-passed;
const report={base:BASE,checked:results.length,passed,failed,keyword_painted_exactly:results.filter(x=>x.exact_keyword_painted).length,notes:'Real Chromium interaction and screenshot. Query labels and images may use a generic regional brand rather than literal keyword text. No Naver ranking or permanent uptime proof.',results};
fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));
console.log('SMART24_LIVE_BROWSER_DYNAMIC '+passed+'/'+results.length+' passed; '+failed+' failed; keyword-literal titles '+report.keyword_painted_exactly+'/'+cases.length);
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'\n## Live interactive keyword cards\n\n**'+passed+'/'+results.length+' passed**. '+report.keyword_painted_exactly+'/'+cases.length+' image-card headings show the exact search term. Full-resolution image zoom tested in real Chromium on mobile and desktop. **Not** a Naver ranking measurement.\n');
if(failed)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1});
