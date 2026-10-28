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
    yesterday:el('yesterday-visit-number'),
    todayCall:el('phone-click-number'),
    allCall:el('total-phone-click-number')
  };
  const todayTrigger=el('traffic-today-trigger');
  const sourceDetails=el('traffic-sources-detail');
  if(todayTrigger&&sourceDetails){
    todayTrigger.addEventListener('click',function(){
      const show=sourceDetails.hidden;
      sourceDetails.hidden=!show;
      todayTrigger.setAttribute('aria-expanded',String(show));
    });
  }
  const channelList=el('phone-source-list');
  const panel=el('traffic-stats-panel');
  const kstDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const readSession=(key)=>{try{return sessionStorage.getItem(key)}catch(_){return null}};
  const writeSession=(key,value)=>{try{sessionStorage.setItem(key,value)}catch(_){}};
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
      item.textContent='오늘 기록된 전화 클릭 경로가 없습니다.';
      channelList.appendChild(item);
      return;
    }
    for(const row of rows.slice(0,12)){
      const item=document.createElement('li');
      const source=String(row.source||'직접 방문');
      const page=String(row.page||'/');
      item.textContent=source+' · '+page+' · '+format(row.clicks);
      channelList.appendChild(item);
    }
  }
  async function refresh(){
    if(!panel)return;
    try{
      const result=await rpc('site_traffic_dashboard');
      if(result&&result.today_visits!=null&&result.yesterday_visits!=null&&
          result.today_phone_clicks!=null&&result.total_phone_clicks!=null){
        put('today',result.today_visits);
        put('yesterday',result.yesterday_visits);
        put('todayCall',result.today_phone_clicks);
        put('allCall',result.total_phone_clicks);
        drawSources(result.phone_sources);
        panel.title='한국시간 기준 집계 · 전화 연결 여부가 아닌 클릭 수';
        return;
      }
      throw Error('incomplete dashboard');
    }catch(_){
      // Existing counters are still useful until the new SQL migration is run.
      try{
        const [visits,calls]=await Promise.all([
          rpc('site_visit_stats',{p_record:false}),
          rpc('site_click_stats',{p_phone:null})
        ]);
        put('today',visits.today_visits);
        put('todayCall',calls.today_phone_clicks);
      }catch(_){
        put('today',null);
        put('todayCall',null);
      }
      put('yesterday',null);
      put('allCall',null);
      if(channelList){
        channelList.replaceChildren();
        const item=document.createElement('li');
        item.textContent='전일·누적·유입 경로 집계는 데이터베이스 설정 확인이 필요합니다.';
        channelList.appendChild(item);
      }
      panel.title='일부 통계 서버 설정이 확인되지 않았습니다.';
    }
  }
  // At most once per tab/session and KST calendar day, not once per page view.
  // Client-side analytics cannot precisely measure unique individuals or bots.
  const visitKey='smart24_visit_'+kstDay();
  if(!readSession(visitKey)){
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
