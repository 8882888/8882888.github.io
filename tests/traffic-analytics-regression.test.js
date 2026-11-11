'use strict';
// Read-only regression checks. Run: node --test tests/traffic-analytics-regression.test.js
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const analytics=fs.readFileSync(path.join(root,'assets/traffic-analytics.js'),'utf8');
const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
const region=fs.readFileSync(path.join(root,'region/index.html'),'utf8');
const fare=fs.readFileSync(path.join(root,'fare/index.html'),'utf8');

test('analytics is present on region and fare pages',()=>{
  assert.match(region,/assets\/traffic-analytics\.js/);
  assert.match(fare,/assets\/traffic-analytics\.js/);
});
test('both canonical and index.html pages use the same funnel route',()=>{
  assert.ok(analytics.includes("location.pathname.replace(/\\/index\\.html$/,'/')"));
  assert.match(analytics,/if\(normalizedPage==='\/region\/'\)/);
  assert.match(analytics,/if\(normalizedPage==='\/fare\/'\)/);
  assert.doesNotMatch(analytics,/if\(location\.pathname==='\/fare\/'\)/);
});
test('fare submit only counts the real form with distinct populated endpoints',()=>{
  assert.match(fare,/<form id="quote-form">/);
  assert.match(analytics,/form\.id!=='quote-form'/);
  assert.match(analytics,/start\.length>=2&&end\.length>=2&&start!==end/);
  assert.ok(analytics.includes("replace(/\\s/g,'')"));
});
test('call metrics count button taps, not connected calls',()=>{
  assert.match(analytics,/a\[href\^="tel:"\]/);
  assert.match(analytics,/18114294/);
  assert.match(analytics,/site_phone_event/);
});
test('health diagnostics are resilient to an absent optional analytics file',()=>{
  assert.match(server,/trafficAnalytics:TRAFFIC_ANALYTICS_SHA256/);
  assert.match(server,/catch\(_\)\{return 'unavailable'\}/);
});

const dynamicRegion=fs.readFileSync(path.join(root,'go/region-service/index.html'),'utf8');
test('dynamic region landing requires a unique matching region and service',()=>{
  assert.ok(dynamicRegion.includes('matches.length!==1'));
  assert.ok(dynamicRegion.includes('p.services.includes(kind)'), 'region landing must verify the requested service in the public legal-region catalogue');
  assert.ok(dynamicRegion.includes('exactCards.length===1'));
});
test('dynamic region images have a fallback and cannot be mislabeled as real trips',()=>{
  assert.ok(dynamicRegion.includes("image.addEventListener('error'"));
  assert.ok(dynamicRegion.includes('실제 운행 사진이 아닙니다'));
  assert.ok(dynamicRegion.includes("image.alt=full+' '+service"));
});
test('dynamic region landing preserves fare and consultation paths',()=>{
  assert.ok(dynamicRegion.includes("fare.href='/fare/?service='"));
  assert.ok(dynamicRegion.includes('tel:18114294'));
  assert.ok(dynamicRegion.includes('noindex,follow'));
});

test('funnel deduplication resets on each Korean calendar day',()=>{
  assert.ok(analytics.includes("const sentKey='smart24_funnel_sent_'+kstDay()+'_'+stage;"));
  assert.ok(analytics.includes("'Asia/Seoul'"));
});

test('dashboard polling is skipped when no counters are displayed',()=>{
  assert.ok(analytics.includes("if(!figures.today&&!figures.total&&!figures.phoneClicks&&!channelList&&!el('quote-success-summary-20261107'))return;"));
  assert.ok(analytics.includes("rpc('site_funnel_event'"));
  assert.ok(analytics.includes("rpc('site_phone_event'"));
});

test('mobile focus and visibility dashboard reads are throttled without delaying phone tracking',()=>{
  assert.ok(analytics.includes('if(now-lastPassiveRefresh<60000)return;'));
  assert.ok(analytics.includes("window.addEventListener('focus',passiveRefresh)"));
  assert.ok(analytics.includes("document.addEventListener('visibilitychange',passiveRefresh)"));
  assert.ok(analytics.includes("rpc('site_phone_event',payload,{keepalive:true})"));
});

test('all primary customer entry pages load the current funnel script version',()=>{
  const pages=['index.html','region/index.html','fare/index.html','go/region-service/index.html'];
  for(const page of pages){
    const html=fs.readFileSync(path.join(root,page),'utf8');
    assert.match(html,/\/assets\/traffic-analytics\.js\?v=20261109-overnight-visit/,'stale analytics asset: '+page);
  }
  assert.ok(server.includes('/assets/traffic-analytics.js?v=20261109-overnight-visit'));
});

test('overnight open tabs can record a new Korean calendar day visit',()=>{
  assert.ok(analytics.includes('function recordDailyVisit(){'));
  assert.ok(analytics.includes("const today=kstDay(),visitKey='smart24_visit_'+today;"));
  assert.ok(analytics.includes('if(!recordDailyVisit())refresh();'));
  assert.ok(analytics.includes('if(now-lastPassiveRefresh<60000)return;'));
});

test('Cloudtype serves analytics with cache revalidation and ETag',()=>{
  assert.ok(server.includes("pathname==='/assets/traffic-analytics.js'"));
  assert.ok(server.includes("'no-cache, max-age=0, must-revalidate'"));
  assert.ok(server.includes("'if-none-match'"));
});

test('browser initialization sends funnel landing and visit RPCs without real network',async()=>{
  const vm=require('node:vm');
  const calls=[];
  const session=new Map(),local=new Map();
  const storage=map=>({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v))});
  const document={
    referrer:'',visibilityState:'visible',
    getElementById:()=>null,
    addEventListener:()=>{}
  };
  const window={addEventListener:()=>{}};
  const context={
    window,document,navigator:{userAgent:'Mozilla/5.0',webdriver:false},
    location:{href:'https://jeongukdaeri.kr/',hostname:'jeongukdaeri.kr',pathname:'/'},
    sessionStorage:storage(session),localStorage:storage(local),
    URL,Intl,Date,JSON,Number,String,Array,Promise,console,
    fetch:async(url,opts)=>{
      calls.push({url,body:JSON.parse(opts.body)});
      return {ok:true,status:204,text:async()=>''};
    }
  };
  vm.runInNewContext(analytics,context,{timeout:1500});
  await new Promise(resolve=>setImmediate(resolve));
  assert(calls.some(c=>c.url.endsWith('/site_funnel_event')&&c.body.p_stage==='landing'),'landing RPC missing');
  assert(calls.some(c=>c.url.endsWith('/site_visit_stats')&&c.body.p_record===true),'visit RPC missing');
  assert.equal(calls.filter(c=>c.url.endsWith('/site_traffic_dashboard')).length,0,'non-dashboard pages must not poll');
  assert.equal(local.get('smart24_last_recorded_visit_day'),new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
});
