'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');

const root=path.resolve(__dirname,'..'),port=39374,base='http://127.0.0.1:'+port;
const modulePath=path.join(root,'lib/southeast-five-locality-seo.cjs');
const {approvedDescription}=require(modulePath);
const targets=[
 {name:'해운대구',full:'부산광역시 해운대구',suffix:'busan/haeundae-gu/',parent:'busan/',terms:['센텀시티','우동']},
 {name:'울산남구',full:'울산광역시 남구',suffix:'ulsan/nam-gu/',parent:'ulsan/',terms:['삼산동','무거동']},
 {name:'창원성산구',full:'경상남도 창원시 성산구',suffix:'gyeongnam/changwon-si/seongsan-gu/',parent:'gyeongnam/changwon-si/',terms:['상남동','성주동']},
 {name:'양산물금',full:'경상남도 양산시 물금읍',suffix:'gyeongnam/yangsan-si/mulgeum-eup/',parent:'gyeongnam/yangsan-si/',terms:['범어리','가촌리']},
 {name:'정관읍',full:'부산광역시 기장군 정관읍',suffix:'busan/gijang-gun/jeonggwan-eup/',parent:'busan/gijang-gun/',terms:['정관신도시','모전리']}
];
const attr=(html,re)=>html.match(re)?.[1]||'';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test('Five original southeast localities retain ten separate service-intent SEO pages and exact canonical URLs',{timeout:170000},async()=>{
 const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<115;i++){
   if(child.exitCode!==null)throw Error('Server exited during locality SEO test');
   try{const r=await fetch(base+'/health',{signal:AbortSignal.timeout(1200)});if(r.ok){ready=true;break;}}catch{}
   await wait(250);
  }
  assert(ready,'local server started');
  const allTitles=new Set(),allDescriptions=new Set();
  for(const item of targets){
   for(const kind of ['daeri','taksong']){
    const route='/'+kind+'/'+item.suffix,resp=await fetch(base+route,{headers:{'user-agent':'Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)'},redirect:'manual',signal:AbortSignal.timeout(23000)});
    assert.equal(resp.status,200,route+' HTTP 200');
    assert(!/noindex/i.test(resp.headers.get('x-robots-tag')||''),route+' header indexability unchanged');
    const html=await resp.text(),head=html.split('</head>')[0];
    const title=attr(head,/<title>([^<]*)<\/title>/);
    const desc=attr(head,/<meta\s+name="description"\s+content="([^"]*)"/);
    const og=attr(head,/<meta\s+property="og:description"\s+content="([^"]*)"/);
    assert(title.startsWith(item.name+(kind==='daeri'?'대리운전':'탁송')),route+' exact city/service title');
    assert.equal(desc,approvedDescription(item.full,kind),route+' approved localized description');
    assert.equal(desc,og,route+' meta and OG parity');
    assert([...desc].length<=80,route+' Naver description bound');
    assert(!allTitles.has(title)&&!allDescriptions.has(desc),route+' title/description must be unique to region/service');
    allTitles.add(title);allDescriptions.add(desc);
    assert(head.includes('<link rel="canonical" href="https://jeongukdaeri.kr'+route+'">'),route+' own canonical');
    assert(!/<meta\s+name="robots"\s+content="noindex/i.test(head),route+' no accidentally introduced noindex');
    assert.equal((html.match(/<h1\b/g)||[]).length,1,route+' one H1');
    assert.equal((html.match(/id="southeast-five-locality-seo-20261123"/g)||[]).length,1,route+' focused editorial exactly once');
    assert(html.includes('id="regional-direct-answer"'),route+' existing region answer retained');
    assert(html.includes('href="/'+kind+'/'+item.parent+'"'),route+' parent canonical linked');
    assert(html.includes('href="/fare/?service='+kind+'&amp;from='),route+' correct fare action');
    assert(html.includes('href="tel:18114294"'),route+' click to national consulting');
    assert(html.includes('href="/reviews/history/?kind='+kind),route+' evidence review link');
    assert(html.includes('southeast-five-locality-seo-20261123')&&html.indexOf('id="regional-direct-answer"')<html.indexOf('id="southeast-five-locality-seo-20261123"'),route+' reader gets direct answer first');
    for(const phrase of item.terms)assert(html.includes(phrase),route+' relevant actual local landmark '+phrase);
    if(kind==='taksong'){
     assert(!/실시간 배차현황|빠른배차/.test(title),route+' no fake live dispatch title');
     assert(html.includes('차량 인수')&&html.includes('주행 가능'),route+' real handover explanation');
    }else{
     assert(title.includes('예약'),route+' driver booking intent');
     assert(!title.includes('후기'),route+' driver not forced review-first');
     assert(html.includes('희망 시각')||html.includes('희망 시간'),route+' driver pickup preference');
    }
    console.log('PASS southeast locality service',route,title,[...desc].length);
   }
  }
  assert.equal(allTitles.size,10);
  assert.equal(allDescriptions.size,10);
 }finally{child.kill('SIGTERM');}
});

test('New editorial contains no invented completed trips, quoted historical fares or separate contact phones',()=>{
 const source=fs.readFileSync(modulePath,'utf8');
 assert(!/제주탁송 전용|1877-5245|100% 배차|기사 상주 보장/.test(source));
 assert(!/\d+[,.]?\d*\s*만원/.test(source),'Never invent or transplant old fare examples');
 assert.equal(targets.length,5);
});
