'use strict';
module.exports=({regions,esc,layout,servicePath,label,host,historicalRides=[]})=>{
 const byId=new Map(regions.map(r=>[r.slug,r]));
 const daegu=regions.find(r=>r.full_name==='대구광역시');
 const provinces=regions.filter(r=>r.level==='시도');
 const nationalHubNames=['서울특별시','부산광역시','대구광역시','인천광역시','대전광역시','광주광역시'];
 const nationalHubs=nationalHubNames.map(n=>regions.find(r=>r.full_name===n)).filter(Boolean);
 const airport={name:'김해공항',full_name:'부산광역시 강서구 공항진입로 108 (김해국제공항)',slug:'airport-gimhae',level:'공항',address:'부산광역시 강서구 공항진입로 108',kind:'airport'};
 byId.set(airport.slug,airport);
 const originAliases=new Set(['김해공항','김해국제공항','부산김해공항','부산김해국제공항']);
 const resolveOrigin=name=>originAliases.has(String(name||'').replace(/\s+/g,''))?airport:null;
 const safeLink=(r,k)=>servicePath(r.kind==='airport'?regions.find(x=>x.full_name==='부산광역시 강서구'):r,k);
 const formatPlace=r=>r.kind==='airport'?'김해공항':label(r);
 const sitemapCache=new Map();
 const reviewed=require('./verified-route-index')({regions,historicalRides});
 const path=(a,b,k)=>'/routes/'+k+'/'+a.slug+'/'+b.slug+'/';
 const title=(a,b,k)=>(a.level==='군'?a.name:formatPlace(a))+'에서 '+(b.level==='군'?b.name:formatPlace(b))+' '+(k==='daeri'?'대리운전':'탁송');
 const eligible=(a,b)=>a&&b&&a.slug!==b.slug;
 const links=(a,k)=>'<section><h2>'+esc(formatPlace(a))+' 출발 전국 주요 구간</h2><ul>'+provinces.filter(b=>eligible(a,b)).map(b=>'<li><a href="'+path(a,b,k)+'">'+esc(title(a,b,k))+'</a></li>').join('')+'</ul><p><a href="/routes/'+k+'/'+a.slug+'/">전국 시·군·구·읍·면·동·리 도착지 전체 조회</a> · <a href="/routes/reviewed/">실제 완료 운행구간·요금 후기</a></p>'+(a.full_name==='부산광역시'||a.full_name==='부산광역시 강서구'?'<p><a href="/routes/gimhae-airport/">김해국제공항 출발·도착 대리운전·자동차탁송 구간</a></p>':'')+'</section>';
 function directory(a,k,page){
  const targets=regions.filter(b=>eligible(a,b)),total=Math.ceil(targets.length/100);
  if(!Number.isInteger(page)||page<1||page>total)return null;
  const base='/routes/'+k+'/'+a.slug+'/',url=base+(page===1?'':'?page='+page);
  const nav='<p>'+page+' / '+total+' 페이지 '+(page>1?'<a href="'+base+(page===2?'':'?page='+(page-1))+'">이전</a> ':'')+(page<total?'<a href="'+base+'?page='+(page+1)+'">다음</a>':'')+'</p>';
  const html=layout(label(a)+'에서 전국 '+(k==='daeri'?'대리운전':'탁송')+' 구간 '+page+'페이지',a.full_name+' 출발 전국 도착지별 요금조회와 예약 안내.',nav+'<ul>'+targets.slice((page-1)*100,page*100).map(b=>'<li><a href="'+path(a,b,k)+'">'+esc(title(a,b,k))+'</a> · '+esc(b.full_name)+'</li>').join('')+'</ul>'+nav,'https://'+host+url);
  // A nationwide directory is useful for customers but could expose hundreds of millions of similar URLs to crawlers.
  // Restrict crawling to the selected canonical route URLs advertised through the route sitemaps.
  return html.replace('content="index,follow,max-image-preview:large"','content="noindex,nofollow"');
 }
 // Distinct, factual planning guidance for selected high-intent corridors.
 // These are NOT invented trips, quotes, or promised driver dispatches.
 const priorityAdvice=new Map([
  ['부산광역시|인천광역시|taksong',[
   '부산에서 인천 탁송: 인수 지역에 따라 준비할 내용',
   '부산 내 인수지 주소를 구·동과 건물명까지 확인해야 기사 접근과 실제 이동 거리를 판단할 수 있습니다. 항만·산업단지·상가 주차장은 출입 방식과 인수 담당자가 다를 수 있으므로 출입 가능 시간도 함께 알려주세요.',
   '인천 도착지는 송도·서구·공항 주변 등 실제 주소에 따라 인계 장소와 복귀 교통편을 다시 확인합니다. 출발일, 차량 종류, 연료 상태와 유료도로 비용 부담 주체를 상담 전에 정하는 것이 좋습니다.'
  ]],
  ['서울특별시|부산광역시|taksong',[
   '서울에서 부산 탁송: 장거리 인계 준비',
   '서울 출발 장소가 지하주차장이라면 층·동·출차 방법과 차량 키 수령자를 알려주세요. 장거리 이동이므로 출발 시각보다 먼저 차량 인수 가능 시간대와 도착지 인계 가능 시간대를 정하는 것이 도움이 됩니다.',
   '부산의 최종 도착 주소와 담당자 연락 방식, 주유·통행료·대기 비용 포함 여부를 확정 상담에서 확인하세요. 기사 복귀 여건에 따라 견적과 배차 가능 여부가 달라질 수 있습니다.'
  ]],
  ['부산광역시 기장군|대구광역시|taksong',[
   '기장군에서 대구 탁송: 읍별 인수 위치와 기사 접근',
   '기장읍·정관읍·일광읍처럼 기장군 안에서도 인수 위치가 다릅니다. 주차장 진입로와 담당자, 차량이 운행 가능한 상태인지 확인해 주시면 실제 출발지를 기준으로 상담할 수 있습니다.',
   '대구광역시 도착 구·동 및 주차장 인계 장소를 구체적으로 정해 주세요. 대구 시내 진입 시각과 기사 복귀 이동 조건에 따라 최종 배차 조건이 달라지므로 단순 직선거리만으로 요금을 확정하지 않습니다.'
  ]],
  ['김해공항|인천광역시|taksong',[
   '김해공항에서 인천 탁송: 공항 차량 인수 안내',
   '김해국제공항의 국내선·국제선 구역과 실제 주차장, 주차 위치 및 차량 열쇠 인계 방법을 확인해 주세요. 터미널 명칭만으로는 차량을 인수할 위치가 특정되지 않을 수 있습니다.',
   '인천 도착지의 구체적인 주소와 차량을 받을 담당자를 정하고, 주차비·통행료와 차량 인수 시각을 상담에서 확인하세요. 공항 탁송은 공항 출입 절차와 기사 접근 가능 여부부터 검토해야 합니다.'
  ]]
 ]);
 function page(a,b,k){
  const service=k==='daeri'?'대리운전':'자동차탁송',t=title(a,b,k);
  const compactTerm=(formatPlace(a)+formatPlace(b)+(k==='daeri'?'대리운전':'탁송')).replace(/\s+/g,'');
  const shortRoute=formatPlace(a)+' → '+formatPlace(b);
  const fromLocation=a.address||a.full_name,toLocation=b.address||b.full_name;
  const fare='/fare/?'+new URLSearchParams({from:fromLocation,to:toLocation,service:k,auto:'1'});
  const detail=r=>r.kind==='airport'?'김해국제공항은 부산 강서구에 있습니다. 국내선·국제선 구분, 주차장, 만나는 장소, 공항 차량 동선을 미리 확인합니다.':['읍','면','리'].includes(r.level)?'읍·면·리의 정확한 주소, 주차 위치와 기사 접근·복귀 교통편을 확인합니다.':'건물명과 주차장 층·구역, 출차 방법을 확인합니다.';
  const evidence=reviewed.forRoute(a,b,k);
  const adviceKey=(a.kind==='airport'?'김해공항':a.full_name)+'|'+b.full_name+'|'+k;
  const advice=priorityAdvice.get(adviceKey);
  const adviceSection=advice?'<section><h2>'+esc(advice[0])+'</h2><p>'+esc(advice[1])+'</p><p>'+esc(advice[2])+'</p><p><a href="/routes/reviewed/">실제 완료 운행 자료와 구분해서 확인하기</a> · <a href="'+esc(fare)+'">해당 출발·도착 주소로 예상요금 확인하기</a></p></section>':'';
  const reviewedSection=evidence?'<section><h2>'+esc(shortRoute)+' 실제 운행완료 후기</h2><p>다음은 완료된 운행내역에서 출발 지역과 도착 지역의 방향이 확인된 '+service+' 사례입니다. 당시 기록된 배차요금으로, 현재 요금이나 새 예약 확정금액을 뜻하지 않습니다.</p><ul>'+evidence.rides.slice(0,5).map(x=>'<li><a href="/reviews/history/'+x.id+'/">'+esc(x.date+' '+formatPlace(a)+' → '+formatPlace(b)+' '+service+' 완료')+'</a> · 당시 운행요금 <strong>'+esc(x.fare)+'</strong></li>').join('')+'</ul><p>실제 출발·도착 상세주소와 고객정보는 공개하지 않으며, 예약 여부·기사 이동 수단·할증을 기록 없이 추정하지 않습니다.</p></section>':'';
  const desc=shortRoute+' '+service+' '+(evidence?'실제 운행완료 '+evidence.rides.length+'건 후기·당시 요금 및 ':'')+'예상요금·예약 안내. 출발 '+fromLocation+' / 도착 '+toLocation+'. 차종, 시간대, 경유·대기 조건을 확인하세요. 1811-4294.';
  const body='<section><h2>'+esc(t)+' 요금·예약</h2><p>'+esc(desc)+'</p><p>검색 조합: <strong>'+esc(compactTerm)+'</strong>, <strong>'+esc(t)+'</strong>, '+esc(shortRoute+' '+service+' 요금')+'. 출발지와 도착지를 바꾸면 서로 다른 방향 구간입니다.</p><p><a href="'+esc(fare)+'">이 구간 도로거리·예상요금 계산</a> · <a href="tel:18114294">1811-4294 상담</a></p><p>구간별 이용 안내이며 실제 운행 완료 기록은 아닙니다. 정확한 주소와 이용 시각에 따라 요금과 배차 가능 여부가 달라집니다.</p></section>'+reviewedSection+adviceSection+'<section><h2>출발·도착 장소 확인</h2><dl><dt>출발: '+esc(a.full_name)+'</dt><dd>'+detail(a)+' <a href="'+safeLink(a,k)+'">출발 지역 안내</a></dd><dt>도착: '+esc(b.full_name)+'</dt><dd>'+detail(b)+' <a href="'+safeLink(b,k)+'">도착 지역 안내</a></dd></dl></section><section><h2>'+esc(service)+' 예약 준비</h2><p>'+(k==='daeri'?'고객 동승 인원, 차종, 경유지와 대기 시간을 알려주세요. 목적지 도착 후 기사 복귀 여건을 함께 확인합니다.':'차량 운행 가능 상태, 차종, 키 전달 방법과 양쪽 인수·인계 담당자를 확인합니다. 차량 외관·주행거리·연료 상태와 추가 비용 부담을 출발 전에 협의하세요.')+'</p><p>통행료·주차비·경유·대기 비용의 포함 여부와 최종 금액은 상담으로 확인합니다.</p></section><section><h2>반대 방향·다른 서비스</h2><p><a href="'+path(b,a,k)+'">'+esc(title(b,a,k))+'</a> · <a href="'+path(a,b,k==='daeri'?'taksong':'daeri')+'">'+esc(title(a,b,k==='daeri'?'taksong':'daeri'))+'</a></p></section>'+links(a,k);
  return layout(t+' 요금·예약 | 스마트24',desc,body,'https://'+host+path(a,b,k));
 }
 function sitemap(k){
  if(sitemapCache.has(k))return sitemapCache.get(k);
  const urls=new Set();
  for(const r of regions)if(eligible(daegu,r)){urls.add(path(daegu,r,k));urls.add(path(r,daegu,k));}
  for(const a of provinces)for(const b of provinces)if(eligible(a,b))urls.add(path(a,b,k));
  const xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+[...urls].map(p=>'<url><loc>'+esc('https://'+host+p)+'</loc></url>').join('')+'</urlset>';
  sitemapCache.set(k,xml);
  return xml;
 }
 // Nationwide SEO discovery: every legal district has selected major-city routes in both directions.
 // Additional origin/destination pairs remain available on demand without an unbounded sitemap.
 const homeRegions=provinces.map(home=>[home,regions.filter(r=>r.full_name===home.full_name||r.full_name.startsWith(home.full_name+' '))]);
 function nationwideRoutes(k,number){
  const entry=homeRegions[number-1];if(!entry)return null;
  const [home,locals]=entry,urls=new Set();
  for(const region of locals){
   for(const hub of nationalHubs){
    if(eligible(region,hub))urls.add(path(region,hub,k));
    if(eligible(hub,region))urls.add(path(hub,region,k));
   }
   if(eligible(region,home))urls.add(path(region,home,k));
  }
  if(home.full_name==='부산광역시'){
   for(const dest of provinces){
    urls.add(path(airport,dest,k));
    urls.add(path(dest,airport,k));
   }
   for(const name of ['부산광역시 기장군','부산광역시 강서구','경상남도 김해시']){
    const r=regions.find(x=>x.full_name===name);
    if(r){urls.add(path(airport,r,k));urls.add(path(r,airport,k))}
   }
  }
  const locs=[...urls];
  if(locs.length>=50000)throw Error('Nationwide sitemap exceeds 50,000 URL limit: '+home.full_name+' '+locs.length);
  const xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+locs.map(p=>'<url><loc>'+esc('https://'+host+p)+'</loc></url>').join('')+'</urlset>';
  if(Buffer.byteLength(xml,'utf8')>=10000000)throw Error('Nationwide sitemap exceeds Naver 10 MB limit: '+home.full_name);
  return xml;
 }
 function nationwideSitemap(k,number){
  const key=k+':'+(number||'index');
  if(sitemapCache.has(key))return sitemapCache.get(key);
  const xml=number?nationwideRoutes(k,number):'<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+homeRegions.map((x,i)=>'<sitemap><loc>https://'+host+'/sitemap-nationwide-route-'+k+'-'+String(i+1).padStart(2,'0')+'.xml</loc></sitemap>').join('')+'</sitemapindex>';
  sitemapCache.set(key,xml);
  return xml;
 }
 function reviewedSitemap(){
  const key='reviewed-routes';
  if(sitemapCache.has(key))return sitemapCache.get(key);
  const xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+reviewed.entries.map(e=>'<url><loc>'+esc('https://'+host+reviewed.routePath(e))+'</loc></url>').join('')+'</urlset>';
  sitemapCache.set(key,xml);
  return xml;
 }
 function reviewedHub(){
  const content='<section><h2>실제 운행완료 내역으로 확인된 전국 출발·도착 구간</h2><p>기존 '+reviewed.summary.sourceRecords.toLocaleString('ko-KR')+'건 운행기록을 대조해, 출발지와 도착지의 지역명을 각각 식별할 수 있는 구간만 모았습니다. 단순 지역 키워드 조합이나 요금 추정이 아니라 기록된 운행날짜와 요금을 확인할 수 있는 자료입니다.</p><p>개인정보나 위치 정보가 불완전한 기록은 무리하게 특정 시·군에 배정하지 않았습니다. 같은 지역의 반대 방향은 별도 운행내역이 있을 때에만 실제 완료 사례로 표시합니다.</p><ol>'+reviewed.entries.map(e=>'<li><a href="'+reviewed.routePath(e)+'">'+esc(formatPlace(e.from)+'에서 '+formatPlace(e.to)+' '+(e.k==='taksong'?'자동차탁송':'대리운전'))+'</a> · 확인된 기록 '+e.rides.length+'건 · <a href="/reviews/history/'+e.rides[0].id+'/">실제 후기 보기</a></li>').join('')+'</ol><p><a href="/reviews/history/">전국 전체 운행기록 2,591건</a> · <a href="/route-search/">전국 출발지·도착지 검색</a></p></section>';
  return layout('전국 실제 운행완료 출발지·도착지 탁송·대리운전 후기','실제 완료 운행기록에서 출발·도착 방향이 확인된 구간별 날짜와 요금 후기 모음.',content,'https://'+host+'/routes/reviewed/');
 }
 function airportHub(){
  const paths=provinces.map(r=>'<li><a href="'+path(airport,r,'taksong')+'">김해공항에서 '+esc(formatPlace(r))+' 탁송</a> · <a href="'+path(airport,r,'daeri')+'">김해공항에서 '+esc(formatPlace(r))+' 대리운전</a></li>').join('');
  const text='<section><h2>김해국제공항 차량 이동·대리운전</h2><p>주소: 부산광역시 강서구 공항진입로 108. 김해시가 아닌 부산광역시 강서구에 위치합니다. 국내선·국제선, 주차장 위치, 차량 인수·인계 방법을 예약 전 확인합니다.</p><ul>'+paths+'</ul><p><a href="/routes/taksong/airport-gimhae/">김해공항 출발 전국 20,562개 행정지역 자동차탁송 조회</a> · <a href="/routes/daeri/airport-gimhae/">김해공항 출발 전국 대리운전 조회</a></p></section>';
  return layout('김해공항 전국 대리운전·자동차탁송 출발·도착 안내','부산 강서구 김해국제공항에서 전국 시·군·구·읍·면·동·리로 이동하는 대리운전과 자동차탁송 구간 안내.',text,'https://'+host+'/routes/gimhae-airport/');
 }
 return {path,links,resolveOrigin,reviewed,handle(p,u){
  if(p==='/sitemap-reviewed-routes.xml')return {status:200,body:reviewedSitemap(),type:'application/xml; charset=utf-8'};
  if(p==='/routes/reviewed/')return {status:200,body:reviewedHub()};
  const sm=p.match(/^\/sitemap-route-(daeri|taksong)\.xml$/);if(sm)return {status:200,body:sitemap(sm[1]),type:'application/xml; charset=utf-8'};
  const ns=p.match(/^\/sitemap-nationwide-route-(daeri|taksong)(?:-(0[1-9]|1[0-7]))?\.xml$/);
  if(ns)return {status:200,body:nationwideSitemap(ns[1],ns[2]?Number(ns[2]):null),type:'application/xml; charset=utf-8'};
  if(p==='/routes/gimhae-airport/')return {status:200,body:airportHub()};

  const m=p.match(/^\/routes\/(daeri|taksong)\/(area-\d+|airport-gimhae)\/(?:(area-\d+|airport-gimhae)\/?)?$/);if(!m)return null;
  const [,k,x,y]=m,a=byId.get(x),b=byId.get(y);if(!a||(y&&!eligible(a,b)))return {status:404,body:'구간을 찾을 수 없습니다.'};
  const canonical=y?path(a,b,k):'/routes/'+k+'/'+a.slug+'/';
  if(p!==canonical)return {status:301,location:canonical+u.search};
  const body=y?page(a,b,k):directory(a,k,Number(u.searchParams.get('page')||1));
  return {status:body?200:404,body:body||'페이지를 찾을 수 없습니다.'};
 }};
};
