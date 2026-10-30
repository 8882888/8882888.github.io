/* Smart24 shared traffic statistics. Runs on all HTML pages served by Cloudtype.
 * Calls are counted when a tel:18114294 link is clicked, not when a call connects.
 * Raw referrers, IPs, user IDs, query strings, and telephone numbers are not sent.
 */
(function(){
  'use strict';
  const root='https://xgdijyiotsemfnsuwwoi.supabase.co/rest/v1/rpc/';
  const key='sb_publishable_QjNQmNLe9NWRQtBjTu1QqQ_w-cmKGui';
  const headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'};
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
  const isExcluded=()=>readLocal(exclusionKey)==='1';
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
    if(cached)return cached;
    const url=new URL(location.href);
    const utm=(url.searchParams.get('utm_source')||'').toLowerCase();
    let source='직접 방문';
    if(/naver|네이버/.test(utm))source='네이버 검색';
    else if(/google|구글/.test(utm))source='구글 검색';
    else if(/daum|kakao-search|다음/.test(utm))source='다음 검색';
    else if(/kakao|카카오/.test(utm))source='카카오톡';
    else if(/instagram|facebook|twitter|threads|youtube|tiktok|social/.test(utm))source='SNS';
    else if(utm)source='외부사이트';
    else if(document.referrer){
      try{
        const h=new URL(document.referrer).hostname.toLowerCase();
        if(h===location.hostname)source='사이트 내부 이동';
        else if(h==='naver.com'||h.endsWith('.naver.com'))source='네이버 검색';
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
  function drawSources(rows){
    if(!channelList)return;
    channelList.replaceChildren();
    if(!Array.isArray(rows)||!rows.length){
      const item=document.createElement('li');
      item.textContent='전화클릭 전환 경로가 아직 기록되지 않았습니다. 전화 버튼을 누른 시점부터 수집됩니다.';
      channelList.appendChild(item);
      return;
    }
    for(const row of rows.slice(0,12)){
      const item=document.createElement('li');
      const source=String(row.source||'유입 경로 미확인');
      const page=String(row.page||'');
      const day=String(row.day||'');
      // Old click totals predate source tracking. Do not mislabel them as direct traffic.
      item.textContent=[day,source,page].filter(Boolean).join(' · ')+' · '+format(row.clicks);
      channelList.appendChild(item);
    }
  }
  async function refresh(){
    // The phone count beside the top-right number is lifetime clicks.
    // The two small counters below it are KST today and lifetime visits.
    const [visits,phone]=await Promise.allSettled([
      rpc('site_visit_stats',{p_record:false}),
      rpc('site_traffic_dashboard')
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
    if(panel)panel.title='접속 기록에는 작업·점검 방문이 포함될 수 있습니다. 네이버 검색 노출이나 실제 통화 연결 수가 아닙니다.';
  }
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
    // Do not cancel tel: navigation; analytics must never block calling.
    const payload={p_page:location.pathname.slice(0,160),p_source:acquisition()};
    rpc('site_phone_event',payload,{keepalive:true})
      .catch(()=>rpc('site_click_stats',{p_phone:true},{keepalive:true}))
      .then(refresh).catch(()=>{});
  },true);
  window.addEventListener('focus',refresh);
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible')refresh();
  });
})();
