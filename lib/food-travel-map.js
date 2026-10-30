'use strict';
// Tourist discovery only. The dots are approximate regional reference locations,
// not precise restaurant addresses or customer dispatch locations.
const editorial=require('./daeri-blog-editorial');
const travel=require('./daeri-travel-guides');
const PATH='/travel/food-map/';
const leafletCSS='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const centres={
 '서울특별시':[37.5665,126.9780,'city'],'부산광역시':[35.1796,129.0756,'coast'],
 '대구광역시':[35.8714,128.6014,'city'],'인천광역시':[37.4563,126.7052,'coast'],
 '광주광역시':[35.1595,126.8526,'city'],'대전광역시':[36.3504,127.3845,'city'],
 '울산광역시':[35.5384,129.3114,'coast'],'세종특별자치시':[36.4800,127.2890,'city'],
 '경기도':[37.2636,127.0286,'nature'],'강원특별자치도':[37.8813,127.7298,'nature'],
 '충청북도':[36.6424,127.4890,'nature'],'충청남도':[36.6588,126.6728,'coast'],
 '전북특별자치도':[35.8242,127.1479,'nature'],'전라남도':[34.8118,126.3922,'coast'],
 '경상북도':[36.5684,128.7294,'nature'],'경상남도':[35.2273,128.6811,'coast'],
 '제주특별자치도':[33.4996,126.5312,'island']
};
const highlights={
 samgilpo:[37.006,126.451,'coast','삼길포항 · 선상어시장·우럭회'],
 gungpyeong:[37.113,126.674,'coast','궁평항 · 수산물직판장·낙조'],
 'busan-dongnae':[35.205,129.085,'city','부산 동래 · 동래파전·시장'],
 'sokcho-ports':[38.190,128.602,'coast','속초 항구 · 해산물·바다']
};
const mapSearch=query=>'https://map.naver.com/p/search/'+encodeURIComponent(query);
function page({layout,esc,host,regions,servicePath}){
 const base='https://'+host,byFull=new Map(regions.filter(x=>x.level==='시도').map(x=>[x.full_name,x]));
 const regional=editorial.provinces.map(x=>{
  const [lat,lng,category]=centres[x.region]||[],r=byFull.get(x.region),culture=editorial.localCulture[x.region];
  if(!r||!Number.isFinite(lat)||!culture)throw Error('Missing food map province: '+x.region);
  return {id:'r-'+r.slug,name:x.region,lat,lng,category,food:culture.food,places:culture.places,
   href:servicePath(r,'daeri'),taksong:servicePath(r,'taksong'),mapHref:mapSearch(x.region+' 맛집'),kind:'region'};
 });
 if(regional.length!==17)throw Error('Expected 17 regions');
 const featured=travel.destinations.map(x=>{
  const [lat,lng,category,name]=highlights[x.slug]||[],post=travel.original(x);
  if(!Number.isFinite(lat))throw Error('Missing guide location: '+x.slug);
  return {id:'g-'+x.slug,name,lat,lng,category,food:x.sections[0].heading,places:x.locality,
   href:travel.pathFor(x),original:post.url,mapHref:mapSearch(x.locality),kind:'guide'};
 });
 const guides=featured.map(x=>'<article class="ft-card" id="'+esc(x.id)+'" data-category="'+esc(x.category)+'" data-id="'+esc(x.id)+'">'+
  '<strong class="ft-label">여행지 상세 안내 · 대리운전·탁송 정보</strong><h3>'+esc(x.name)+'</h3><p>'+esc(x.food)+' · '+esc(x.places)+'</p>'+
  '<div class="ft-links"><a href="'+esc(x.href)+'">지역 여행 후 대리운전 안내</a><a href="'+esc(x.original)+'" target="_blank" rel="noopener noreferrer">관련 네이버 원문</a>'+
  '<a href="'+esc(x.mapHref)+'" target="_blank" rel="noopener noreferrer">네이버 지도 검색</a></div></article>').join('');
 const regionsHtml=regional.map(x=>'<article class="ft-card" id="'+esc(x.id)+'" data-category="'+esc(x.category)+'" data-id="'+esc(x.id)+'">'+
  '<strong class="ft-label">시·도별 여행 · 대리운전·탁송</strong><h3>'+esc(x.name)+'</h3><p><b>먹거리</b> '+esc(x.food)+'</p><p><b>관광지</b> '+esc(x.places)+'</p>'+
  '<div class="ft-links"><a href="'+esc(x.href)+'">'+esc(x.name)+' 대리운전</a><a href="'+esc(x.taksong)+'">'+esc(x.name)+' 탁송</a>'+
  '<a href="'+esc(x.mapHref)+'" target="_blank" rel="noopener noreferrer">지도에서 맛집 찾기</a></div></article>').join('');
 const schema={'@context':'https://schema.org','@type':'WebPage',
   name:'전국 맛집·여행지도 | 지역 먹거리·관광지 대리운전 안내',url:base+PATH,
   description:'전국 17개 시도 먹거리·관광지 지도와 실제 네이버 원문을 연결한 여행·대리운전 안내',
   mainEntity:{'@type':'ItemList',itemListElement:featured.map((x,i)=>({'@type':'ListItem',position:i+1,name:x.name,url:base+x.href}))}};
 const css='<style>.ft-lead{font-size:18px}.ft-nav,.ft-chips,.ft-links{display:flex;flex-wrap:wrap;gap:9px}.ft-nav a,.ft-chips button{border:1px solid #bfd4e5;background:#eef5fb;padding:8px 12px;border-radius:9px;font-weight:700;text-decoration:none}.ft-chips{margin:12px 0}.ft-chips button{cursor:pointer;font:inherit}.ft-chips button[aria-pressed="true"]{background:#144777;color:white}.ft-search{display:block;width:100%;padding:13px;font:inherit;border:2px solid #8ba6bf;border-radius:10px}.ft-map{height:450px;min-height:320px;border:1px solid #b6c9d9;border-radius:12px;background:#dce7ef}.ft-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}.ft-card{background:white;border:1px solid #d4e0e9;padding:14px;border-radius:12px;scroll-margin-top:20px}.ft-card[hidden]{display:none}.ft-card h3{margin:5px 0}.ft-card p{margin:7px 0}.ft-label{font-size:13px;color:#245e81}.ft-links a{font-size:14px;border:1px solid #bcd3e2;border-radius:7px;padding:7px 9px;text-decoration:none}.ft-links a:first-child{background:#135487;color:white}.ft-map-note{font-size:14px;color:#476176}.ft-warning{padding:12px 14px;background:#eff6fb;border-left:4px solid #1d5c8b}.ft-focus{background:#fff5d7!important;border-color:#dca739!important}.leaflet-popup-content a{display:block;margin-top:7px}@media(max-width:600px){.ft-map{height:360px}.ft-list{grid-template-columns:1fr}}</style>';
 const dataJSON=JSON.stringify([...featured,...regional]).replace(/</g,'\\u003c');
 const js='<script defer src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>'+
 '<script>(function(){const points='+dataJSON+';let map=null;const layers=[];'+
 'window.addEventListener("load",function(){const cards=[...document.querySelectorAll(".ft-card")],chips=[...document.querySelectorAll(".ft-chips button")],search=document.getElementById("ft-search"),count=document.getElementById("ft-count");let active="all";'+
 'function filter(){const word=search.value.trim().toLocaleLowerCase("ko-KR"),show=new Set();for(const card of cards){const ok=(active==="all"||card.dataset.category===active)&&(!word||card.textContent.toLocaleLowerCase("ko-KR").includes(word));card.hidden=!ok;if(ok)show.add(card.dataset.id)}count.textContent=show.size+"곳 보기";if(map)for(const entry of layers){if(show.has(entry.id))entry.pin.addTo(map);else map.removeLayer(entry.pin)}}'+
 'for(const b of chips)b.addEventListener("click",function(){active=b.dataset.category;for(const c of chips)c.setAttribute("aria-pressed",String(c===b));filter()});search.addEventListener("input",filter);filter();'+
 'if(!window.L){document.getElementById("ft-map-hint").textContent="지도 연결이 안 되더라도 아래 지역별 여행 정보와 대리운전 링크를 이용할 수 있습니다.";return}'+
 'map=L.map("ft-map",{scrollWheelZoom:false}).setView([36.3,127.9],7);L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"&copy; OpenStreetMap contributors",maxZoom:18}).addTo(map);'+
 'for(const p of points){const pin=L.circleMarker([p.lat,p.lng],{radius:p.kind==="guide"?11:7,weight:2,color:p.kind==="guide"?"#8b5209":"#15446b",fillColor:p.kind==="guide"?"#f9d26c":"#8bc7e4",fillOpacity:.95});const popup=document.createElement("div"),name=document.createElement("strong");name.textContent=p.name;popup.appendChild(name);for(const x of [[p.href,"지역·여행 안내 보기"],[p.mapHref,"네이버 지도에서 찾기"]]){const a=document.createElement("a");a.href=x[0];a.textContent=x[1];if(x[0].startsWith("https://")){a.target="_blank";a.rel="noopener noreferrer"}popup.appendChild(a)}pin.bindPopup(popup);pin.on("click",function(){const card=document.getElementById(p.id);if(card){card.classList.add("ft-focus");card.scrollIntoView({behavior:"smooth",block:"nearest"});window.setTimeout(()=>card.classList.remove("ft-focus"),1400)}});layers.push({id:p.id,pin});pin.addTo(map)}filter()});})();</script>';
 const chips=[['all','전체'],['coast','항구·바다'],['city','시장·도심'],['nature','산행·내륙'],['island','제주']];
 const body='<link rel="stylesheet" href="'+leafletCSS+'">'+css+'<script type="application/ld+json">'+JSON.stringify(schema).replace(/</g,'\\u003c')+'</script>'+
  '<article><nav class="ft-nav" aria-label="여행 안내 이동"><a href="/">홈</a><a href="/daeri/">전국대리운전</a><a href="/blog/archive/">네이버 글 모음</a><a href="/recruit/daeri/">대리기사 모집</a></nav>'+
  '<h1>전국 맛집·여행지도｜17개 시·도 대리운전·자동차탁송</h1><p class="ft-lead">서울·부산·강원·제주 등 여행지 먹거리와 관광지를 살펴보고, 여행 뒤 귀가를 위한 지역별 대리운전과 차량 인수·인계가 필요한 자동차탁송 안내까지 확인하세요. 17개 시·도와 상세 여행지 4곳을 연결합니다.</p>'+
  '<p class="ft-warning"><strong>안내:</strong> 지도 핀은 시·도 대표 위치와 여행지의 개략적인 위치입니다. 특정 식당의 주소·평점이나 직접 방문한 음식점 후기가 아닙니다. 실제 메뉴·영업시간·주차는 방문 전 확인하세요.</p>'+
  '<section><h2>전국 여행지도에서 지역 찾기</h2><label for="ft-search">지역·먹거리·관광지 검색</label><input id="ft-search" class="ft-search" type="search" placeholder="속초·동래파전·삼길포항·전주·제주" autocomplete="off">'+
  '<div class="ft-chips" role="group" aria-label="여행 테마">'+chips.map(x=>'<button type="button" data-category="'+x[0]+'" aria-pressed="'+(x[0]==='all'?'true':'false')+'">'+x[1]+'</button>').join('')+'</div>'+
  '<div id="ft-map" class="ft-map" aria-label="전국 여행지역 지도"></div><p id="ft-map-hint" class="ft-map-note">지도 점을 클릭하면 여행 정보와 네이버 지도 검색을 확인할 수 있습니다. 지도를 못 불러와도 아래 목록 링크는 이용할 수 있습니다.</p><p id="ft-count"><strong>21곳 보기</strong></p></section>'+
  '<section><h2>항구·전통시장·향토 음식 여행지 4곳</h2><p>공개된 기존 네이버 글과 연관된 여행 안내입니다. 모든 음식점에 직접 방문했다는 뜻은 아닙니다.</p><div class="ft-list" id="ft-guides">'+guides+'</div></section>'+
  '<section><h2>17개 시·도 맛집·관광·이동 안내</h2><p>지역별 대표 음식과 관광 테마를 살펴본 뒤 대리운전 또는 차량탁송 정보를 확인하세요.</p><div class="ft-list" id="ft-regions">'+regionsHtml+'</div></section>'+
  '<section><h2>맛집·관광지 여행 후 전국대리운전·장거리 자동차탁송</h2><p>식사 후 음주한 경우에는 직접 운전하지 말고 대리운전으로 귀가하세요. 차량을 다른 목적지에 별도로 옮겨야 한다면 탁송 상담이 필요합니다. 정확한 주차장·출입구, 출발지와 도착지, 희망시간, 차종을 알려주시면 운행 조건을 확인합니다. 지방 관광지·항구·산간 지역의 대리운전·탁송 배차 가능 여부와 요금은 기사 접근·복귀 상황에 따라 달라집니다.</p>'+
  '<p><a class="cta" href="tel:18114294">대리운전·탁송 전화상담 1811-4294</a> · <a href="/fare/?service=daeri">대리운전 예상요금</a> · <a href="/taksong/">전국자동차탁송</a> · <a href="/service/golf/">골프장 대리운전</a> · <a href="/service/daily-driver/">일일기사</a></p></section></article>'+js;
 return layout('전국 맛집·여행지도 | 지역별 대리운전·자동차탁송','전국 17개 시·도 맛집 여행지도, 삼길포항·궁평항·부산 동래·속초 관광정보와 지역별 대리운전·전국 자동차탁송 안내. 상담 1811-4294.',body,base+PATH);
}
module.exports={PATH,centres,highlights,page};
