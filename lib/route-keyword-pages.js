'use strict';
module.exports=({regions,esc,layout,servicePath,label,host})=>{
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
 const path=(a,b,k)=>'/routes/'+k+'/'+a.slug+'/'+b.slug+'/';
 const title=(a,b,k)=>(a.level==='군'?a.name:formatPlace(a))+'에서 '+(b.level==='군'?b.name:formatPlace(b))+' '+(k==='daeri'?'대리운전':'탁송');
 const eligible=(a,b)=>a&&b&&a.slug!==b.slug;
 const links=(a,k)=>'<section><h2>'+esc(formatPlace(a))+' 출발 전국 주요 구간</h2><ul>'+provinces.filter(b=>eligible(a,b)).map(b=>'<li><a href="'+path(a,b,k)+'">'+esc(title(a,b,k))+'</a></li>').join('')+'</ul><p><a href="/routes/'+k+'/'+a.slug+'/">전국 시·군·구·읍·면·동·리 도착지 전체 조회</a></p>'+(a.full_name==='부산광역시'||a.full_name==='부산광역시 강서구'?'<p><a href="/routes/gimhae-airport/">김해국제공항 출발·도착 대리운전·자동차탁송 구간</a></p>':'')+'</section>';
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
 function page(a,b,k){
  const service=k==='daeri'?'대리운전':'자동차탁송',t=title(a,b,k);
  const compactTerm=(formatPlace(a)+formatPlace(b)+(k==='daeri'?'대리운전':'탁송')).replace(/\s+/g,'');
  const shortRoute=formatPlace(a)+' → '+formatPlace(b);
  const fromLocation=a.address||a.full_name,toLocation=b.address||b.full_name;
  const fare='/fare/?'+new URLSearchParams({from:fromLocation,to:toLocation,service:k,auto:'1'});
  const detail=r=>r.kind==='airport'?'김해국제공항은 부산 강서구에 있습니다. 국내선·국제선 구분, 주차장, 만나는 장소, 공항 차량 동선을 미리 확인합니다.':['읍','면','리'].includes(r.level)?'읍·면·리의 정확한 주소, 주차 위치와 기사 접근·복귀 교통편을 확인합니다.':'건물명과 주차장 층·구역, 출차 방법을 확인합니다.';
  const desc=shortRoute+' '+service+' 예상요금·예약 안내. 출발 '+fromLocation+' / 도착 '+toLocation+'. 차종, 시간대, 경유·대기 조건을 확인하세요. 1811-4294.';
  const body='<section><h2>'+esc(t)+' 요금·예약</h2><p>'+esc(desc)+'</p><p>검색 조합: <strong>'+esc(compactTerm)+'</strong>, <strong>'+esc(t)+'</strong>, '+esc(shortRoute+' '+service+' 요금')+'. 출발지와 도착지를 바꾸면 서로 다른 방향 구간입니다.</p><p><a href="'+esc(fare)+'">이 구간 도로거리·예상요금 계산</a> · <a href="tel:18114294">1811-4294 상담</a></p><p>구간별 이용 안내이며 실제 운행 완료 기록은 아닙니다. 정확한 주소와 이용 시각에 따라 요금과 배차 가능 여부가 달라집니다.</p></section><section><h2>출발·도착 장소 확인</h2><dl><dt>출발: '+esc(a.full_name)+'</dt><dd>'+detail(a)+' <a href="'+safeLink(a,k)+'">출발 지역 안내</a></dd><dt>도착: '+esc(b.full_name)+'</dt><dd>'+detail(b)+' <a href="'+safeLink(b,k)+'">도착 지역 안내</a></dd></dl></section><section><h2>'+esc(service)+' 예약 준비</h2><p>'+(k==='daeri'?'고객 동승 인원, 차종, 경유지와 대기 시간을 알려주세요. 목적지 도착 후 기사 복귀 여건을 함께 확인합니다.':'차량 운행 가능 상태, 차종, 키 전달 방법과 양쪽 인수·인계 담당자를 확인합니다. 차량 외관·주행거리·연료 상태와 추가 비용 부담을 출발 전에 협의하세요.')+'</p><p>통행료·주차비·경유·대기 비용의 포함 여부와 최종 금액은 상담으로 확인합니다.</p></section><section><h2>반대 방향·다른 서비스</h2><p><a href="'+path(b,a,k)+'">'+esc(title(b,a,k))+'</a> · <a href="'+path(a,b,k==='daeri'?'taksong':'daeri')+'">'+esc(title(a,b,k==='daeri'?'taksong':'daeri'))+'</a></p></section>'+links(a,k);
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
 function airportHub(){
  const paths=provinces.map(r=>'<li><a href="'+path(airport,r,'taksong')+'">김해공항에서 '+esc(formatPlace(r))+' 탁송</a> · <a href="'+path(airport,r,'daeri')+'">김해공항에서 '+esc(formatPlace(r))+' 대리운전</a></li>').join('');
  const text='<section><h2>김해국제공항 차량 이동·대리운전</h2><p>주소: 부산광역시 강서구 공항진입로 108. 김해시가 아닌 부산광역시 강서구에 위치합니다. 국내선·국제선, 주차장 위치, 차량 인수·인계 방법을 예약 전 확인합니다.</p><ul>'+paths+'</ul><p><a href="/routes/taksong/airport-gimhae/">김해공항 출발 전국 20,562개 행정지역 자동차탁송 조회</a> · <a href="/routes/daeri/airport-gimhae/">김해공항 출발 전국 대리운전 조회</a></p></section>';
  return layout('김해공항 전국 대리운전·자동차탁송 출발·도착 안내','부산 강서구 김해국제공항에서 전국 시·군·구·읍·면·동·리로 이동하는 대리운전과 자동차탁송 구간 안내.',text,'https://'+host+'/routes/gimhae-airport/');
 }
 return {path,links,resolveOrigin,handle(p,u){
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
