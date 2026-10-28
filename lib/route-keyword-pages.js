'use strict';
module.exports=({regions,esc,layout,servicePath,label,host})=>{
 const byId=new Map(regions.map(r=>[r.slug,r]));
 const daegu=regions.find(r=>r.full_name==='대구광역시');
 const provinces=regions.filter(r=>r.level==='시도');
 const sitemapCache=new Map();
 const path=(a,b,k)=>'/routes/'+k+'/'+a.slug+'/'+b.slug+'/';
 const title=(a,b,k)=>(a.level==='군'?a.name:label(a))+'에서 '+(b.level==='군'?b.name:label(b))+' '+(k==='daeri'?'대리운전':'탁송');
 const eligible=(a,b)=>a&&b&&a.slug!==b.slug;
 const links=(a,k)=>'<section><h2>'+esc(label(a))+' 출발 구간</h2><ul>'+provinces.filter(b=>eligible(a,b)).map(b=>'<li><a href="'+path(a,b,k)+'">'+esc(title(a,b,k))+'</a></li>').join('')+'</ul><p><a href="/routes/'+k+'/'+a.slug+'/">전국 시·군·구·읍·면·동·리 도착지 보기</a></p></section>';
 function directory(a,k,page){
  const targets=regions.filter(b=>eligible(a,b)),total=Math.ceil(targets.length/100);
  if(!Number.isInteger(page)||page<1||page>total)return null;
  const base='/routes/'+k+'/'+a.slug+'/',url=base+(page===1?'':'?page='+page);
  const nav='<p>'+page+' / '+total+' 페이지 '+(page>1?'<a href="'+base+(page===2?'':'?page='+(page-1))+'">이전</a> ':'')+(page<total?'<a href="'+base+'?page='+(page+1)+'">다음</a>':'')+'</p>';
  return layout(label(a)+'에서 전국 '+(k==='daeri'?'대리운전':'탁송')+' 구간 '+page+'페이지',a.full_name+' 출발 전국 도착지별 요금조회와 예약 안내.',nav+'<ul>'+targets.slice((page-1)*100,page*100).map(b=>'<li><a href="'+path(a,b,k)+'">'+esc(title(a,b,k))+'</a> · '+esc(b.full_name)+'</li>').join('')+'</ul>'+nav,'https://'+host+url);
 }
 function page(a,b,k){
  const service=k==='daeri'?'대리운전':'자동차탁송',t=title(a,b,k);
  const compactTerm=(label(a)+label(b)+(k==='daeri'?'대리운전':'탁송')).replace(/\s+/g,'');
  const fare='/fare/?'+new URLSearchParams({from:a.full_name,to:b.full_name,service:k,auto:'1'});
  const detail=r=>['읍','면','리'].includes(r.level)?'상세 주소와 차량 위치, 기사 접근·복귀 교통편을 확인합니다.':'건물명과 주차장 층·구역, 출차 방법을 확인합니다.';
  const desc=a.full_name+'에서 '+b.full_name+' '+service+' 예상요금 조회·예약 안내. 출발·도착 주소, 차종, 이용 시각과 경유·대기 조건을 확인하세요. 1811-4294.';
  const body='<section><h2>'+esc(t)+' 요금·예약</h2><p>'+esc(desc)+'</p><p>이 구간은 <strong>'+esc(compactTerm)+'</strong> 또는 <strong>'+esc(t)+'</strong>으로도 찾을 수 있습니다. 실제 주소에 맞춘 요금 계산과 예약 상담을 제공합니다.</p><p><a href="'+esc(fare)+'">이 구간 도로거리·예상요금 계산</a> · <a href="tel:18114294">1811-4294 상담</a></p><p>구간별 이용 안내이며 실제 운행 완료 기록은 아닙니다. 정확한 주소와 이용 시각에 따라 요금과 배차 가능 여부가 달라집니다.</p></section><section><h2>출발·도착 장소 확인</h2><dl><dt>출발: '+esc(a.full_name)+'</dt><dd>'+detail(a)+' <a href="'+servicePath(a,k)+'">출발 지역 안내</a></dd><dt>도착: '+esc(b.full_name)+'</dt><dd>'+detail(b)+' <a href="'+servicePath(b,k)+'">도착 지역 안내</a></dd></dl></section><section><h2>'+esc(service)+' 예약 준비</h2><p>'+(k==='daeri'?'고객 동승 인원, 차종, 경유지와 대기 시간을 알려주세요. 목적지 도착 후 기사 복귀 여건을 함께 확인합니다.':'차량 운행 가능 상태, 차종, 키 전달 방법과 양쪽 인수·인계 담당자를 확인합니다. 차량 외관·주행거리·연료 상태와 추가 비용 부담을 출발 전에 협의하세요.')+'</p><p>통행료·주차비·경유·대기 비용의 포함 여부와 최종 금액은 상담으로 확인합니다.</p></section><section><h2>반대 방향·다른 서비스</h2><p><a href="'+path(b,a,k)+'">'+esc(title(b,a,k))+'</a> · <a href="'+path(a,b,k==='daeri'?'taksong':'daeri')+'">'+esc(title(a,b,k==='daeri'?'taksong':'daeri'))+'</a></p></section>'+links(a,k);
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
 return {path,links,handle(p,u){
  const sm=p.match(/^\/sitemap-route-(daeri|taksong)\.xml$/);if(sm)return {status:200,body:sitemap(sm[1]),type:'application/xml; charset=utf-8'};
  const m=p.match(/^\/routes\/(daeri|taksong)\/(area-\d+)\/(?:(area-\d+)\/?)?$/);if(!m)return null;
  const [,k,x,y]=m,a=byId.get(x),b=byId.get(y);if(!a||(y&&!eligible(a,b)))return {status:404,body:'구간을 찾을 수 없습니다.'};
  const canonical=y?path(a,b,k):'/routes/'+k+'/'+a.slug+'/';
  if(p!==canonical)return {status:301,location:canonical+u.search};
  const body=y?page(a,b,k):directory(a,k,Number(u.searchParams.get('page')||1));
  return {status:body?200:404,body:body||'페이지를 찾을 수 없습니다.'};
 }};
};
