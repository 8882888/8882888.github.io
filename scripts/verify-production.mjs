// Production smoke test for human-reviewed deploy verification.
// Usage: node scripts/verify-production.mjs [https://jeongukdaeri.kr]
// Read-only requests only. These results do not replace Naver Search Advisor data.
const origin=(process.argv[2]||'https://jeongukdaeri.kr').replace(/\/$/,'');
const checks=[
 ['Homepage','/', 'html'],
 ['Region search','/region/?q='+encodeURIComponent('부산탁송'),'html'],
 ['Dynamic card API','/api/region-card-preview?q='+encodeURIComponent('부산탁송'),'json'],
 ['Dynamic preview JS','/assets/region-card-preview.js','script'],
 ['Seoraksan SVG','/assets/seoraksan-taksong-fares.svg','svg'],
 ['Jirisan SVG','/assets/jirisan-taksong-fares.svg','svg'],
 ['Cycling SVG','/assets/cycling-routes/nationwide-taksong.svg','svg'],
 ['Robots','/robots.txt','robots'],
 ['Priority sitemap','/sitemap-priority.xml','xml']
];
let failed=0;
for(const [name,path,kind] of checks){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(origin+path,{signal:controller.signal,redirect:'follow',headers:{'user-agent':'Smart24-ReadOnly-DeployCheck/1.0'}});
  const content=await response.text();
  let ok=response.ok && content.length>0;
  if(kind==='html')ok &&= /<html|<!doctype html/i.test(content);
  if(kind==='script')ok &&= content.includes('data-card-preview-form');
  if(kind==='svg')ok &&= /<svg\b/.test(content);
  if(kind==='robots')ok &&= /User-agent:/i.test(content);
  if(kind==='xml')ok &&= /<urlset\b/.test(content);
  if(kind==='json'){
   try{
    const data=JSON.parse(content);
    ok &&= Boolean(data&&typeof data.status==='string'&&Array.isArray(data.cards));
    // Matched cards must have valid shape. Browser loading is tested separately.
    if(data.status==='matched'&&data.cards.length)ok &&= data.cards.every(c=>typeof c.image==='string'||typeof c.keywordImage==='string');
   }catch{ok=false}
  }
  console.log((ok?'PASS':'FAIL')+' '+name+' HTTP '+response.status+' '+response.url);
  if(!ok)failed++;
 }catch(err){
  console.log('FAIL '+name+' '+(err&&err.name==='AbortError'?'timeout':String(err)));
  failed++;
 }finally{clearTimeout(timeout)}
}
console.log('Result: '+(checks.length-failed)+'/'+checks.length+' checks passed. No changes were made to the site.');
if(failed)process.exitCode=1;
