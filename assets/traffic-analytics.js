/* Smart24 shared traffic statistics. Runs on all HTML pages served by Cloudtype.
 * Calls are counted when a tel:18114294 link is clicked, not when a call connects.
 * Raw referrers, IPs, user IDs, query strings, and telephone numbers are not sent.
 */
(function(){
  'use strict';
  const root='https://xgdijyiotsemfnsuwwoi.supabase.co/rest/v1/rpc/';
  const key='sb_publishable_QjNQmNLe9NWRQtBjTu1QqQ_w-cmKGui';
  // Publishable keys identify the project; they are not JWT bearer tokens.
  const headers={'apikey':key,'Content-Type':'application/json'};
  const el=id=>document.getElementById(id);
  const figures={
    today:el('today-visit-number'),
    total:el('total-visit-number'),
    phoneClicks:el('phone-click-number')
  };
  const phoneClickTrigger=el('traffic-call-trigger');
  const sourceDetails=el('traffic-sources-detail');
  if(phoneClickTrigger&&sourceDetails){
    phoneClickTrigger.addEventListener('click',function(){
      const show=sourceDetails.hidden;
      sourceDetails.hidden=!show;
      phoneClickTrigger.setAttribute('aria-expanded',String(show));
    });
  }
  const channelList=el('phone-source-list');
  const panel=el('traffic-stats-panel');
  const kstDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const readSession=(key)=>{try{return sessionStorage.getItem(key)}catch(_){return null}};
  const writeSession=(key,value)=>{try{sessionStorage.setItem(key,value)}catch(_){}};
  const readLocal=(key)=>{try{return localStorage.getItem(key)}catch(_){return null}};
  const writeLocal=(key,value)=>{try{localStorage.setItem(key,value)}catch(_){}};
  const exclusionKey='smart24_exclude_own_visits_v1';
  const checkExclusion=el('exclude-my-visits');
  const modeNote=el('traffic-mode-note');
  // Explicit ?internal=1 is useful when opening a preview link from a new device:
  // it excludes the very first access from statistics before any network requests.
  try{if(new URL(location.href).searchParams.get('internal')==='1')writeLocal(exclusionKey,'1')}catch(_){}
  // Search crawlers and automated browsers may execute JS; they are not customer visits.
  // Keep read-only dashboard requests available, but never count bot funnel or call events.
  const isAutomated=()=>/bot|crawler|spider|headless|yeti|google-inspectiontool|lighthouse|pagespeed/i.test(navigator.userAgent||'')||navigator.webdriver===true;
  const isExcluded=()=>readLocal(exclusionKey)==='1'||isAutomated();
  function reflectExclusion(){
    if(checkExclusion)checkExclusion.checked=isExcluded();
    if(modeNote)modeNote.textContent=isExcluded()?
      '점검 접속 제외 중: 이 브라우저의 이후 방문 및 전화 테스트는 기록하지 않습니다. 과거 기록은 그대로 남습니다.':
      '점검 접속 포함: 본인 방문도 기록될 수 있습니다. 제외를 켜면 이후 접속부터 적용되며 과거 기록은 차감하지 않습니다.';
  }
  if(checkExclusion)checkExclusion.addEventListener('change',function(){
    writeLocal(exclusionKey,checkExclusion.checked?'1':'0');reflectExclusion();
  });
  reflectExclusion();
  const format=n=>(n===null||n===undefined||n===''||!Number.isFinite(Number(n)))?'—':Number(n).toLocaleString('ko-KR')+'회';
  const put=(field,value)=>{if(figures[field])figures[field].textContent=format(value)};
  async function rpc(name,data,options){
    const response=await fetch(root+name,{
      method:'POST',headers,body:JSON.stringify(data||{}),cache:'no-store',
      keepalive:!!(options&&options.keepalive)
    });
    if(!response.ok)throw Error('RPC '+name+' HTTP '+response.status);
    // PostgreSQL functions returning VOID respond with 204 No Content.
    // A JSON parse error here must NOT trigger the legacy fallback and double-count the click.
    if(response.status===204)return null;
    const raw=await response.text();
    if(!raw.trim())return null;
    const result=JSON.parse(raw);
    return Array.isArray(result)?result[0]:result;
  }
  function acquisition(){
    const cached=readSession('smart24_traffic_source');
    if(cached)return cached==='네이버 검색'?'네이버 경유(검색 여부 미확인)':cached;
    const url=new URL(location.href);
    const utm=(url.searchParams.get('utm_source')||'').toLowerCase();
    let source='직접 방문';
    if(/naver|네이버/.test(utm))source='네이버 경유(검색 여부 미확인)';
    else if(/google|구글/.test(utm))source='구글 검색';
    else if(/daum|kakao-search|다음/.test(utm))source='다음 검색';
    else if(/kakao|카카오/.test(utm))source='카카오톡';
    else if(/instagram|facebook|twitter|threads|youtube|tiktok|social/.test(utm))source='SNS';
    else if(utm)source='외부사이트';
    else if(document.referrer){
      try{
        const h=new URL(document.referrer).hostname.toLowerCase();
        if(h===location.hostname)source='사이트 내부 이동';
        else if(h==='naver.com'||h.endsWith('.naver.com'))source='네이버 경유(검색 여부 미확인)';
        else if(h==='google.com'||h.startsWith('google.')||h.includes('.google.'))source='구글 검색';
        else if(h==='daum.net'||h.endsWith('.daum.net'))source='다음 검색';
        else if(h==='kakao.com'||h.endsWith('.kakao.com'))source='카카오톡';
        else if(/instagram|facebook|youtube|tiktok|twitter|threads/.test(h))source='SNS';
        else source='외부사이트';
      }catch(_){source='직접 방문'}
    }
    writeSession('smart24_traffic_source',source);
    return source;
  }
  // Only explicit campaign-tagged keywords can be attributed to an individual tap.
  // Organic search engines generally do not reveal the visitor's search query.
  // Keep a coarse, validated keyword label in this tab; never store raw URLs or search inputs.
  function campaignKeyword(){
    const key='smart24_campaign_keyword_v1';
    const cached=readSession(key);
    if(cached)return cached;
    try{
      const params=new URL(location.href).searchParams;
      const raw=(params.get('utm_term')||'').trim();
      if(!raw||raw.length>50||!/^[가-힣a-zA-Z0-9 _-]+$/.test(raw))return '';
      const normalized=raw.replace(/\s+/g,'-').slice(0,50);
      writeSession(key,normalized);
      return normalized;
    }catch(_){return ''}
  }
  // Capture the landing-page campaign term before the user moves to /fare/.
  campaignKeyword();
  function drawSources(rows){
    if(!channelList)return;
    channelList.replaceChildren();
    if(!Array.isArray(rows)||!rows.length){
      const item=document.createElement('li');
      item.textContent='전화클릭 전환 경로가 아직 기록되지 않았습니다.';
      channelList.appendChild(item);
      return;
    }
    // Explicit utm_term attribution is embedded in the recorded page label.
    // This is not a verified organic search keyword. Group only these tagged taps.
    const keywords=new Map();
    for(const row of rows){
      const page=String(row.page||'');
      const match=page.match(new RegExp('/kw/([가-힣a-zA-Z0-9_-]{1,50})'+'$'));
      if(!match)continue;
      const label=match[1];
      keywords.set(label,(keywords.get(label)||0)+Math.max(0,Number(row.clicks)||0));
    }
    if(keywords.size){
      const heading=document.createElement('li');
      heading.textContent='캠페인 키워드별 전화 버튼 클릭 (자연검색어 아님)';
      heading.style.fontWeight='700';
      channelList.appendChild(heading);
      for(const [word,count] of [...keywords].sort((a,b)=>b[1]-a[1]).slice(0,15)){
        const item=document.createElement('li');
        item.textContent=word+' · '+format(count);
        channelList.appendChild(item);
      }
    }
    for(const row of rows.slice(0,12)){
      const item=document.createElement('li');
      const source=String(row.source||'유입 경로 미확인').replace(/^네이버 검색$/,'네이버 경유(검색 여부 미확인)');
      const page=String(row.page||'');
      const day=String(row.day||'');
      item.textContent=[day,source,page].filter(Boolean).join(' · ')+' · '+format(row.clicks);
      channelList.appendChild(item);
    }
  }
  async function refresh(){
    // The phone count beside the top-right number is lifetime clicks.
    // The two small counters below it are KST today and lifetime visits.
    // Only the homepage displays quote success statistics. Do not create a
    // third network request on thousands of regional pages or on the fare form.
    const quoteLine=el('quote-success-summary-20261107');
    const [visits,phone,quoteSummary]=await Promise.allSettled([
      rpc('site_visit_stats',{p_record:false}),
      rpc('site_traffic_dashboard'),
      quoteLine?rpc('site_quote_summary'):Promise.resolve(null)
    ]);
    if(visits.status==='fulfilled'&&visits.value){
      put('today',visits.value.today_visits);
      put('total',visits.value.total_visits);
    }else{put('today',null);put('total',null);}
    if(phone.status==='fulfilled'&&phone.value&&phone.value.total_phone_clicks!=null){
      put('phoneClicks',phone.value.total_phone_clicks);
      drawSources(phone.value.phone_sources);
    }else{
      try {
        const legacy=await rpc('site_click_stats',{p_phone:null});
        put('phoneClicks',legacy?.total_clicks);
      }catch(_){put('phoneClicks',null);}
      drawSources(null);
    }
    if(quoteLine){
      const q=quoteSummary.status==='fulfilled'?quoteSummary.value:null;
      const attempts=Number(q&&q.total_attempts),success=Number(q&&q.success_attempts),failed=Number(q&&q.failed_attempts);
      quoteLine.textContent=q&&Number.isFinite(attempts)&&attempts>0&&Number.isFinite(success)&&Number.isFinite(failed)
        ?'자동 도로거리 조회 '+attempts.toLocaleString('ko-KR')+'회 중 성공 '+success.toLocaleString('ko-KR')+'회 · 실패/시간초과 '+failed.toLocaleString('ko-KR')+'회 · 성공률 '+(100*success/attempts).toFixed(1)+'%'
        :'아직 집계된 자동 도로거리 조회가 없습니다. 실서비스 계산 결과가 생기면 표시합니다.';
    }
    if(panel)panel.title='접속 기록에는 작업·점검 방문이 포함될 수 있습니다. 네이버 검색 노출이나 실제 통화 연결 수가 아닙니다.';
  }
  // Privacy-preserving, same-tab funnel stages. No search terms, addresses or IDs sent.
  // Events are submitted to the aggregate-only RPC; production delivery must be verified separately.
  const funnelKey='smart24_funnel_v1';
  function funnelStage(stage){
    if(isExcluded())return;
    try{
      const allowed=['landing','region_search','fare_view','fare_submit','phone_tap'];
      if(!allowed.includes(stage))return;
      const old=JSON.parse(sessionStorage.getItem(funnelKey)||'{}');
      const next={...old,[stage]:true,source:acquisition(),updated:Date.now()};
      sessionStorage.setItem(funnelKey,JSON.stringify(next));
      const sentKey='smart24_funnel_sent_'+stage;
      // An explicitly failed request can retry on a later interaction in this tab.
      // Pending requests are not retried because a lost response may have been counted.
      const delivery=sessionStorage.getItem(sentKey);
      if(!delivery||delivery==='failed'){
        sessionStorage.setItem(sentKey,'pending');
        rpc('site_funnel_event',{p_source:next.source,p_stage:stage},{keepalive:true})
          .then(()=>sessionStorage.setItem(sentKey,'sent'))
          .catch(()=>sessionStorage.setItem(sentKey,'failed'));
      }
    }catch(_){}
  }
  window.smart24FunnelStage=funnelStage;
  // Both directory URLs and their explicit index.html forms serve the same page.
  // Use the same funnel stages for either URL without creating a new SEO landing page.
  const normalizedPage=location.pathname.replace(/\/index\.html$/,'/');
  funnelStage('landing');
  if(normalizedPage==='/fare/')funnelStage('fare_view');
  if(normalizedPage==='/region/'){
    const regionInput=document.getElementById('q');
    const serviceInput=document.getElementById('region-card-kind')||document.getElementById('type');
    const trackRegionIntent=()=>{
      if((regionInput&&regionInput.value.trim())||(serviceInput&&serviceInput.value))funnelStage('region_search');
    };
    const regionForm=regionInput&&regionInput.closest('form');
    if(regionForm)regionForm.addEventListener('submit',()=>funnelStage('region_search'),true);
    if(regionInput)regionInput.addEventListener('change',trackRegionIntent);
    // Region results update on input, not only on blur/change; count explicit typing once per tab.
    if(regionInput)regionInput.addEventListener('input',trackRegionIntent);
    if(serviceInput)serviceInput.addEventListener('change',trackRegionIntent);
    // Do not treat a preselected service or an auto-filled search box as a user search.
    // Only explicit change/submit interactions represent region-search intent.
  }
  document.addEventListener('submit',function(event){
    if(normalizedPage!=='/fare/'||!event.target||!event.target.matches||!event.target.matches('form'))return;
    // A fare submission needs both endpoints; unrelated forms are not conversions.
    const form=event.target;
    const from=form.querySelector('#from,[name="from"],[name="start"],[name="origin"]');
    const to=form.querySelector('#to,[name="to"],[name="end"],[name="destination"]');
    if(from&&to&&String(from.value||'').trim()&&String(to.value||'').trim())funnelStage('fare_submit');
  },true);
  // Remember the *landing-page* referrer before later internal navigations
  // replace it with the site's own URL. Only a coarse category is retained.
  acquisition();
  // New records are at most once per browser and KST day, not once per tab/page.
  // Older records used per-tab counts, so historical totals cannot be fixed automatically.
  // Browser clearing, devices and automated traffic mean these are NOT unique customers.
  const today=kstDay(),visitKey='smart24_visit_'+today,browserDayKey='smart24_last_recorded_visit_day';
  const alreadyCounted=readLocal(browserDayKey)===today||!!readSession(visitKey);
  if(alreadyCounted)writeLocal(browserDayKey,today);
  if(!isExcluded()&&!alreadyCounted){
    // Mark before sending to avoid double-counts during concurrent tabs/refreshes.
    writeLocal(browserDayKey,today);
    writeSession(visitKey,'pending');
    rpc('site_visit_stats',{p_record:true})
      .then(()=>writeSession(visitKey,'sent'))
      .catch(()=>writeSession(visitKey,'failed'))
      .finally(refresh);
  }else{
    refresh();
  }
  document.addEventListener('click',function(event){
    const link=event.target.closest&&event.target.closest('a[href^="tel:"]');
    if(!link||link.getAttribute('href').replace(/\D/g,'')!=='18114294')return;
    // Exclude owner/test calls on this browser without interrupting tel: navigation.
    if(isExcluded())return;
    funnelStage('phone_tap');
    // Do not cancel tel: navigation; analytics must never block calling.
    // The source page is a categorical page label, not a route/address or a
    // phone-call completion record. Distinguish calculator result buttons
    // without collecting user-entered pickup/destination or query strings.
    let metricPage=location.pathname.slice(0,160);
    if(location.pathname==='/fare/'){
      const el=document.getElementById('result');
      const state=el&&el.dataset&&el.dataset.quoteState;
      if(['success','error','timeout','invalid'].includes(state))metricPage='/fare/quote-'+state;
    }
    // Explicit utm_term is campaign attribution, not a verified organic search query.
    const taggedKeyword=campaignKeyword();
    if(taggedKeyword)metricPage=(metricPage+'/kw/'+taggedKeyword).slice(0,160);
    const payload={p_page:metricPage,p_source:acquisition()};
    // Never retry a failed/uncertain write against a different counter.
    // A lost response can occur after the server has already recorded the event;
    // legacy fallback would count one tap twice and inflate conversion figures.
    rpc('site_phone_event',payload,{keepalive:true})
      .then(refresh).catch(()=>{});
  },true);
  window.addEventListener('focus',refresh);
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible')refresh();
  });
})();
