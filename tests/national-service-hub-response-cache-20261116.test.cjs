'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:39870';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('two stable national hubs are rendered once per Node boot, not per request',()=>{
 const s=fs.readFileSync(path.join(root,'server.js'),'utf8');
 assert(s.includes("const cachedNationalServiceHubHtml=new Map(["));
 for(const kind of ['daeri','taksong']){
  assert(s.includes("['"+kind+"',applySeo(serviceHub('"+kind+"'),'/" +kind+"/')]"));
  assert(s.includes("if(pathname==='/" +kind+"/')return respond(res,200,cachedNationalServiceHubHtml.get('"+kind+"'));"));
 }
});
test('local pre-rendered national service pages retain distinct title, canonical, SEO and quote links',async()=>{
 const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'39870',PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ok=false;
  for(let i=0;i<100;i++){
   if(child.exitCode!==null)throw Error('server failed to start');
   try{if((await fetch(base+'/health',{signal:AbortSignal.timeout(900)})).ok){ok=true;break}}catch{}
   await delay(200);
  }
  assert(ok,'Node service pre-render boot');
  const homeResponse=await fetch(base+'/',{headers:{'user-agent':'Yeti/1.1','x-smart24-monitor':'github-health-probe'},signal:AbortSignal.timeout(15000)});
  assert.equal(homeResponse.status,200);
  const home=await homeResponse.text();
  assert(home.includes('<h1>전국대리운전 · 전국자동차탁송 '));
  const first=home.indexOf('id="national-daeri-completed-cases"'),second=home.indexOf('id="national-taksong-completed-cases"');
  assert(first>=0&&second>first,'Server-rendered completed designated-driver records precede transport records');
  const firstSection=home.slice(first,home.indexOf('</section>',first));
  assert(firstSection.includes('<time datetime=')&&firstSection.includes('당시 요금'),'Source-derived ride facts and prior fares are visible');
  assert(home.includes('href="/daeri/">전국대리운전 지역별 예약·요금 안내</a>'));
  assert(home.includes('href="https://jeongukdaeri.kr/"'),'Homepage canonical preserved');

  for(const kind of ['taksong','daeri']){
   for(let repeat=0;repeat<2;repeat++){
    const response=await fetch(base+'/'+kind+'/',{headers:{'user-agent':'Yeti/1.1'},signal:AbortSignal.timeout(5000)});
    assert.equal(response.status,200);
    const html=await response.text();
    assert(html.includes('rel="canonical" href="https://jeongukdaeri.kr/'+kind+'/"'));
    assert(html.includes('<meta property="og:site_name" content="전국대리운전">'));
    assert(html.includes('tel:18114294'));
    assert(html.includes('href="/region/')||html.includes('href="/fare/'));
    assert(!/<meta[^>]*name="robots"[^>]*noindex/i.test(html));
   }
  }
 }finally{child.kill()}
});
