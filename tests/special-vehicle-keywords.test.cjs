'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {resolve,AERIAL,LADDER,HEAVY}=require('../lib/special-vehicle-keywords.cjs');
const sitemapOwners=require('../data/sitemap-url-owners.json');
const root=path.resolve(__dirname,'..'),PORT=39862,base='http://127.0.0.1:'+PORT;
const keywords=[
 ['고소차탁송',AERIAL],['고소차량탁송',AERIAL],['고소작업차탁송',AERIAL],['고소작업차량탁송',AERIAL],
 ['1톤고소차탁송',AERIAL],['3.5톤고소차탁송',AERIAL],['3.5톤고소차량탁송',AERIAL],
 ['1톤고소작업차탁송',AERIAL],['2.5톤스카이차탁송',AERIAL],['5톤고소차탁송',AERIAL],
 ['스카이차탁송',AERIAL],['바가지차탁송',AERIAL],['버킷차탁송',AERIAL],
 ['사다리차탁송',LADDER],['사다리차량탁송',LADDER],['사다리작업차탁송',LADDER],['사다리작업차량탁송',LADDER],
 ['1톤사다리차탁송',LADDER],['1.2톤사다리차탁송',LADDER],['2.5톤사다리차탁송',LADDER],['3.5톤사다리차탁송',LADDER],['5톤사다리차탁송',LADDER],
 ['1톤사다리차량탁송',LADDER],['2.5톤사다리차량탁송',LADDER],['3.5톤사다리차량탁송',LADDER],['5톤사다리차량탁송',LADDER],
 ['이삿짐사다리차탁송',LADDER],['이사사다리차탁송',LADDER],['이사용사다리차탁송',LADDER],['화물용사다리차탁송',LADDER],
 ['건설용사다리차탁송',LADDER],['차량탑재형사다리차탁송',LADDER],['사다리트럭탁송',LADDER],['3.5톤이삿짐사다리차탁송',LADDER],
 ['3.5톤카고크레인탁송',HEAVY],['5톤집게차탁송',HEAVY],
 ['활선차탁송',HEAVY],['청소차탁송',HEAVY],['노면청소차탁송',HEAVY],
 ['살수차탁송',HEAVY],['콘크리트펌프카탁송',HEAVY],['작업차량탁송',HEAVY]
];
test('all key aerial work truck and other special vehicle phrases resolve to three distinct service guides',()=>{
 for(const [keyword,target] of keywords){
  assert.equal(resolve(keyword),target,keyword);
  assert.equal(resolve('전국 '+keyword),target,'nationwide '+keyword);
 }
 assert.equal(resolve('차량대여'),null);
 assert.equal(resolve('3.5톤고소차임대'),null,'do not advertise equipment rental as vehicle transport');
 assert.equal(resolve('1톤 스카이차 탁송'),AERIAL);
 assert.equal(resolve('3.5톤 사다리차 탁송'),LADDER);
 assert.equal(resolve('이삿짐 사다리차 작업'),null,'do not claim ladder work or rental is a taksong intent');
 assert.equal(resolve('이삿짐사다리차대여'),null);
 assert.equal(resolve('1톤사다리차임대'),null);
});
test('aerial lift is one indexable, grounded canonical page; aliases never spawn separate SEO documents',async()=>{
 const cp=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(PORT),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:['ignore','pipe','pipe']});
 let diagnostics='';
 for(const stream of [cp.stdout,cp.stderr])stream.on('data',chunk=>{diagnostics=(diagnostics+String(chunk)).slice(-12000)});
 try{
  let live=false;
  for(let i=0;i<100;i++){
   if(cp.exitCode!==null)throw Error('server exited '+cp.exitCode+'\n'+diagnostics);
   try{if((await fetch(base+'/health',{signal:AbortSignal.timeout(1200)})).ok){live=true;break}}catch{}
   await new Promise(r=>setTimeout(r,300));
  }
  assert.ok(live,'local Smart24 test server starts\n'+diagnostics);
  const res=await fetch(base+AERIAL),html=await res.text();
  assert.equal(res.status,200);
  assert.match(html,/<h1>고소차탁송/);
  assert.ok(html.includes('rel="canonical" href="https://jeongukdaeri.kr'+AERIAL+'"'));
  assert.ok(!/<meta[^>]+name="robots"[^>]+content="noindex/i.test(html));
  assert.ok(html.includes('"@type":"WebPage"'));
  const desc=html.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
  assert.ok(desc&&[...desc].length<=80,'meta description in 80-char editorial constraint');
  assert.ok(html.includes('1톤고소차탁송'));
  assert.ok(html.includes('3.5톤고소차탁송'));
  assert.ok(html.includes('작업대')&&html.includes('아웃트리거'));
  assert.ok(html.includes('1811-4294'));
  assert.ok(html.includes('실제 기사 배정'));
  for(const [keyword,target] of keywords.slice(0,9).concat(keywords.slice(13,22)).concat(keywords.slice(29,33))){
   const q=await fetch(base+'/keyword-search/?q='+encodeURIComponent(keyword),{redirect:'manual'});
   assert.equal(q.status,302,'keyword alias redirect '+keyword);
   assert.equal(q.headers.get('location'),target,'one canonical destination for '+keyword);
  }
  const t=await (await fetch(base+'/taksong/types/')).text();
  assert.ok(t.includes('href="'+AERIAL+'"'));
  assert.ok(t.includes('href="'+LADDER+'"'),'vehicle type hub links to dedicated ladder guide');
  const h=await (await fetch(base+HEAVY)).text();
  assert.ok(h.includes('href="'+AERIAL+'"'));
  assert.ok(h.includes('href="'+LADDER+'"'),'heavy guide links to dedicated ladder guide');
  assert.ok(h.includes('카고크레인탁송')&&h.includes('집게차탁송'));
  for(const map of ['/sitemap-priority.xml','/sitemap.xml','/sitemap-taksong.xml']){
   const response=await fetch(base+map,{signal:AbortSignal.timeout(16000)});
   assert.equal(response.status,200,map);
   const xml=await response.text();
   assert.equal(xml.includes('https://jeongukdaeri.kr'+AERIAL),sitemapOwners[AERIAL]===map,'aerial hub appears only in its assigned sitemap '+map);
   assert.equal(xml.includes('https://jeongukdaeri.kr'+LADDER),sitemapOwners[LADDER]===map,'ladder hub appears only in its assigned sitemap '+map);
   assert.equal(xml.split('https://jeongukdaeri.kr'+LADDER).length-1,sitemapOwners[LADDER]===map?1:0,'ladder URL appears once only in its assigned sitemap '+map);
   assert.ok(!xml.includes('/taksong/type/'+Buffer.from('1톤고소차탁송').toString('hex')+'/'),'avoid duplicate alias URL in '+map);
  }
  const ladderResp=await fetch(base+LADDER),ladderHtml=await ladderResp.text();
  assert.equal(ladderResp.status,200);
  assert.ok(ladderHtml.includes('<h1>사다리차탁송'));
  assert.ok(ladderHtml.includes('rel="canonical" href="https://jeongukdaeri.kr'+LADDER+'"'));
  assert.ok(ladderHtml.includes('"@type":"WebPage"'));
  assert.ok(!/<meta[^>]+name="robots"[^>]+content="noindex/i.test(ladderHtml));
  const ladderDesc=ladderHtml.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
  assert.ok(ladderDesc&&[...ladderDesc].length<=80);
  assert.ok(ladderHtml.includes('1톤사다리차탁송')&&ladderHtml.includes('3.5톤사다리차탁송'));
  assert.ok(ladderHtml.includes('이삿짐 사다리차 작업·임대'),'differentiate truck transfer from ladder rental/work');
  assert.ok(ladderHtml.includes('아웃트리거')&&ladderHtml.includes('면허'));
  assert.ok(ladderHtml.includes('1811-4294'));
  const aerialHtml=await (await fetch(base+AERIAL)).text();
  assert.ok(aerialHtml.includes('href="'+LADDER+'"'),'aerial work truck links to distinct ladder truck guide');
 }finally{cp.kill()}
});
