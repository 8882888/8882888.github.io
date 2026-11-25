'use strict';
// Reuse the existing seventeen legal-region source files loaded by server.js.
// This is a regional navigation and estimate intent resolver, not a price,
// dispatch, branch-location or ride-completion database.
const compact=value=>String(value||'').normalize('NFKC').replace(/[\s·_.,()\-/]+/g,'').trim();
const provinceNames={
 '서울특별시':['서울','서울시'],'부산광역시':['부산','부산시'],
 '대구광역시':['대구','대구시'],'인천광역시':['인천','인천시'],
 '광주광역시':['광주','광주시'],'대전광역시':['대전','대전시'],
 '울산광역시':['울산','울산시'],'세종특별자치시':['세종','세종시'],
 '경기도':['경기'],'강원특별자치도':['강원','강원도'],
 '충청북도':['충북'],'충청남도':['충남'],
 '전북특별자치도':['전북','전라북도'],'전라남도':['전남'],
 '경상북도':['경북'],'경상남도':['경남'],
 '제주특별자치도':['제주','제주도']
};
const localityLevels=new Set(['시도','시','군','구','읍','면','동','리']);
const longDistanceTerms=[
 ['장거리대리운전','daeri'],['시외대리운전','daeri'],
 ['장거리자동차탁송','taksong'],['장거리차량탁송','taksong'],['장거리탁송','taksong']
];
const longDistanceSuffixes=longDistanceTerms.flatMap(([term,kind])=>[
 ...['요금견적','비용견적','요금','비용','견적'].map(tail=>[term+tail,kind,true]),
 [term+'예약',kind,false],[term,kind,false]
]);
const regionalTerms=[['지역대리운전','daeri'],['지역자동차탁송','taksong'],['지역차량탁송','taksong'],['지역탁송','taksong']];
const regionalSuffixes=regionalTerms.flatMap(([term,kind])=>[
 ...['요금견적','비용견적','요금','비용','견적'].map(tail=>[term+tail,kind,true]),
 [term+'예약',kind,false],[term,kind,false]
]);
const suffixes=[
 ...regionalSuffixes,
 ...[['대리운전','daeri'],['자동차탁송','taksong'],['차량탁송','taksong'],['탁송','taksong']].flatMap(([term,kind])=>[
  ...['요금견적','비용견적','요금','비용','견적'].map(tail=>[term+tail,kind,true]),
  [term+'예약',kind,false]
 ]),
 ['대리비견적','daeri',true],['탁송비견적','taksong',true],
 ['대리운전견적','daeri',true],['탁송견적','taksong',true],
 ['대리비','daeri',true],['탁송비','taksong',true],
 ['자동차탁송','taksong',false],['차량탁송','taksong',false],
 ['대리운전','daeri',false],['탁송','taksong',false],['대리','daeri',false]
];
const isPlaceholder=r=>!r||/^\(직할\)$/.test(r.name||'');
function createNationwideLocalityExplorer({regions,childrenByParent,bySlug,servicePath,escapeHtml}){
 if(!Array.isArray(regions)||!regions.length)throw Error('Nationwide legal regions are unavailable');
 const escaped=escapeHtml||((x)=>String(x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])));
 const aliases=new Map(),ambiguous=new Set();
 function register(value,region){
  const key=compact(value);
  if(key.length<2||isPlaceholder(region)||ambiguous.has(key))return;
  const existing=aliases.get(key);
  if(existing&&existing.full_name!==region.full_name){aliases.delete(key);ambiguous.add(key)}
  else if(!existing)aliases.set(key,region);
 }
 const allByFull=new Map(regions.map(x=>[x.full_name,x]));
 for(const r of regions){
  if(isPlaceholder(r))continue;
  const full=String(r.full_name||r.name),parts=full.split(' ');
  const province=parts[0],names=provinceNames[province]||[];
  // Full address always wins; abbreviated names can only win if globally unique.
  register(full,r);
  register(full.replace(/\s*\(직할\)\s*/g,' '),r);
  register(r.name,r);
  if(parts.length>1){
   const tail=parts.slice(1).join(' ');
   register(tail,r);
   register(tail.replace(/\s*\(직할\)\s*/g,' '),r);
   register(parts.slice(-2).join(' '),r);
   for(const short of names){
    register(short+' '+tail,r);
    register(short+' '+tail.replace(/\s*\(직할\)\s*/g,' '),r);
   }
  } else {
   for(const short of names)register(short,r);
  }
 }
 const childMap=childrenByParent||new Map();
 const slugMap=bySlug||new Map(regions.map(r=>[r.slug,r]));
 function childrenFor(r){
  const kids=childMap.get(r.slug)||[];
  const expanded=kids.flatMap(child=>isPlaceholder(child)?(childMap.get(child.slug)||[]):[child]);
  return [...new Map(expanded.filter(x=>x&&x.full_name&&!isPlaceholder(x)).map(x=>[x.full_name,x])).values()];
 }
 function forDisplay(r){
  const children=childrenFor(r);
  if(children.length)return {items:children,relationship:'하위'};
  if(!r.parent_slug)return {items:[],relationship:'하위'};
  const parent=slugMap.get(r.parent_slug);
  if(!parent)return {items:[],relationship:'인근'};
  const siblings=childrenFor(parent).filter(x=>x.slug!==r.slug);
  return {items:siblings,relationship:'같은 상위 지역의 다른'};
 }
 function estimateUrl(r,kind){
  return '/fare/?service='+kind+'&from='+encodeURIComponent(r.full_name);
 }
 function resolve(query){
  const key=compact(query);
  if(!key||key.length>100)return null;
  const longDistance=longDistanceSuffixes.find(([term])=>key.endsWith(term));
  if(longDistance){
   const [term,kind,quote]=longDistance;
   const region=aliases.get(key.slice(0,-term.length));
   if(region&&localityLevels.has(region.level)){
    const canonical=servicePath(region,kind);
    return {region,kind,term,quote,canonical,url:quote?estimateUrl(region,kind):canonical+'#local-long-distance'};
   }
   return null;
  }
  const matched=suffixes.find(([term])=>key.endsWith(term));
  if(!matched)return null;
  const [term,kind,quote]=matched,place=key.slice(0,-compact(term).length);
  if(!place||ambiguous.has(place))return null;
  const region=aliases.get(place);
  if(!region)return null;
  const canonical=servicePath(region,kind);
  return {region,kind,term,quote,canonical,url:quote?estimateUrl(region,kind):regionalSuffixes.some(([suffix])=>suffix===term)?canonical+'#local-service-booking':canonical};
 }
 function resolvePlaceCategory(query){
  const key=compact(query);
  if(!key||key.length>100)return null;
  const service=['장거리대리운전','장거리탁송','대리운전','탁송'].find(term=>key.endsWith(term));
  if(!service)return null;
  const place=key.slice(0,-service.length);
  const category=['음식점','계곡','펜션','관광지','항구','골프장','카페','캠핑장','해수욕장','축제'].find(term=>place.endsWith(term));
  if(!category)return null;
  const locality=place.slice(0,-category.length);
  if(!locality||locality==='광주'||ambiguous.has(locality))return null;
  const region=aliases.get(locality);
  if(!region)return null;
  const kind=service.endsWith('대리운전')?'daeri':'taksong';
  return {region,kind,category,url:servicePath(region,kind)};
 }
 function localServiceMenu(r,kind){
  if(isPlaceholder(r))return '';
  const place=escaped(r.full_name.replace(/\s*\(직할\)/g,''));
  const driver=kind==='daeri';
  const links=driver?[
   ['/service/corporate/','법인대리운전 결제·정산'],
   ['/service/golf/','골프대리운전 편도·왕복'],
   ['/service/long-distance-daeri/','장거리대리운전 예약'],
   ['/service/corporate/#nationwide-ceo-daeri-booking-20261124','CEO·임원 고급대리운전'],
   ['/service/daily-driver/#nationwide-executive-driver-booking-20261124','여러 일정에 동행하는 CEO 수행기사'],
   [servicePath(r,'taksong'),'이 지역 차량탁송']
  ]:[
   ['/service/heavy-truck-taksong/','화물차탁송 톤수·차종별 운행 조건'],
   ['/service/long-distance-taksong/','장거리 차량탁송 인수·인계'],
   [servicePath(r,'daeri'),'이 지역 대리운전']
  ];
  const note=driver?'법인 행사나 골프장 귀가는 차량별 출발 시각과 목적지를, 임원 수행 일정은 방문 순서와 대기시간을 함께 알려주세요.':'화물차 자체를 이동할 때는 차량 톤수·차체 종류와 주행 가능 여부, 출발지와 도착지의 진입 조건을 알려주세요.';
  const localLongDistance=localityLevels.has(r.level)
   ?'<section id="local-long-distance"><h2>'+place+(driver?' 장거리대리운전':' 장거리탁송')+'</h2>'+
    '<p>'+(driver
     ?'시외 이동은 탑승 인원, 도착지, 경유·대기 여부와 출발 희망 시각을 함께 알려주세요. 심야에는 출발지까지 기사 접근과 운행 후 복귀 교통편에 따라 예약 가능 시간이 달라집니다.'
     :'다른 시·군·도까지 차량만 보낼 때는 차종과 주행 가능 여부, 열쇠 전달 방법, 도착지 수령자와 인계 가능 시간을 함께 알려주세요.')+'</p>'+
    '<p>'+((r.level==='시도')?'도·광역시 안에서도 시·군·구별 기사 접근 조건이 다르므로 실제 출발 도시와 목적지를 알려주세요.':(['시','군','구'].includes(r.level))?'시내와 외곽의 이동 조건이 다르므로 실제 읍·면·동과 차량 위치를 먼저 확인하세요.':(['면','리'].includes(r.level)
     ?'마을 안쪽에서 출발한다면 기사와 만날 도로명주소나 공용 주차장 위치, 차량이 드나들 수 있는 길을 알려주세요.'
     :'건물 지하주차장이나 상가에서 출발한다면 출입구, 주차 층과 차량 위치를 알려주세요.')+'</p>'+
    '<p><a href="'+escaped(estimateUrl(r,kind))+'">이 지역 출발 예상요금 조회</a> · <a href="/service/long-distance-'+kind+'/">장거리 '+(driver?'대리운전 예약':'탁송 인수·인계')+' 안내</a></p></section>'
   :'';
  return localLongDistance+'<nav id="local-service-booking" aria-label="'+place+' 이용 목적별 안내"><h3>'+place+' 출발 '+(driver?'대리운전':'차량탁송')+' 선택</h3><p>'+note+'</p><ul>'+
   links.map(([url,label])=>'<li><a href="'+escaped(url)+'">'+label+'</a></li>').join('')+'</ul></nav>';
 }
 function resolveServiceBooking(query){
  const key=compact(query).toUpperCase();
  if(key.length>100)return null;
  const match=key.match(/^(.+?)(고급CEO대리운전|CEO대리운전|CEO수행기사|CEO일일기사|대표이사대리운전|임원대리운전|고급대리운전|프리미엄대리운전|VIP대리운전|기업대리운전|법인카드대리운전|단체대리운전|골프장대리운전|골프대리운전|골프일일기사|법인일일기사|일일기사|법인대리운전|장거리대리운전|지역대리운전|화물자동차탁송|화물차탁송|특장차탁송|지역탁송|장거리탁송)$/);
  if(!match)return null;
  const region=aliases.get(match[1]);
  if(!region)return null;
  const kind=match[2].endsWith('탁송')?'taksong':'daeri';
  return servicePath(region,kind)+'#local-service-booking';
 }
 function chooser(r,kind,{owners}={}){
  if(!r||!['daeri','taksong'].includes(kind))return '';
  const {items:original,relationship}=forDisplay(r);
  const isOwned=child=>Boolean(owners&&Object.prototype.hasOwnProperty.call(owners,servicePath(child,kind)));
  // Preserve every legal locality link for customers, but place registered
  // search-discovery candidates before unregistered quote-only destinations.
  const items=owners?[...original.filter(isOwned),...original.filter(child=>!isOwned(child))]:original;
  const registered=owners?original.filter(isOwned).length:0;
  if(!items.length)return '';
  const label=kind==='daeri'?'대리운전':'탁송';
  const rows=items.map(child=>{
   const detail=servicePath(child,kind),estimate=estimateUrl(child,kind);
   return '<div class="nationwide-child-region" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;min-height:48px;padding:6px 0;border-bottom:1px solid #e0eaf5">'+
    '<a href="'+escaped(detail)+'" style="display:inline-flex;align-items:center;min-height:44px;flex:1 1 120px;color:#114677;font-weight:800;text-decoration:underline">'+escaped(child.name+label)+'</a>'+
    '<a href="'+escaped(estimate)+'" style="display:inline-flex;align-items:center;justify-content:center;min-height:44px;border-radius:8px;border:1px solid #bad1e8;background:#fff;padding:8px 12px;color:#104a80;font-weight:800;text-decoration:none">'+(kind==='daeri'?'대리비견적':'탁송비견적')+'</a></div>';
  }).join('');
  // A collapsed native details control prevents long lists from covering the
  // first mobile viewport; each region still has a direct quote action.
  return '<details id="nationwide-subareas-20261107" class="nationwide-subareas-20261107" style="margin:12px 0;border:1px solid #bbd2e8;border-radius:11px;background:#f8fbff;padding:10px">'+
   '<summary style="font-weight:900;cursor:pointer;min-height:48px;display:list-item;padding:10px 4px;line-height:1.45">'+
   escaped(r.name+' '+relationship+' 지역 '+items.length+'곳 · '+label+' 선택')+'</summary>'+
   '<p style="font-size:14px;line-height:1.6;margin:6px 0 10px">기존 전국 행정구역 데이터에 등록된 서로 다른 지역을 표시합니다. 지역명을 누르면 상세 안내, 견적을 누르면 해당 출발지가 입력됩니다. 실제 기사 상주·배차·요금 확정은 의미하지 않습니다.</p>'+
   (owners&&registered?'<p class="regional-sitemap-discovery-note" style="font-size:14px">기존 사이트맵 등록 지역 '+registered+'곳을 먼저 표시합니다. 이는 네이버 색인 완료 수가 아닙니다.</p>':'')+
   '<nav aria-label="'+escaped(r.full_name+' '+label+' 세부 지역')+'">'+rows+'</nav>'+
   '<p style="font-size:13px;margin:9px 0 0">행정구역 데이터는 시·도별 수록 기준일이 다를 수 있습니다. 현재 요금과 배차 가능 여부는 1811-4294로 확인합니다.</p></details>';
 }
 // Search existing administrative geography only, never speculative service branches.
 // Keep homonymous places separate by returning their fully qualified names.
 const searchRows=regions.filter(r=>!isPlaceholder(r)).map(r=>({
  region:r,full:compact(r.full_name),name:compact(r.name),
  short:compact(r.full_name.replace(/^(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원특별자치도|충청북도|충청남도|전북특별자치도|전라남도|경상북도|경상남도|제주특별자치도)\s*/,''))
 }));
 function suggestions(value,{kind='taksong',limit=8}={}){
  const normalized=compact(value);
  const max=Math.max(1,Math.min(12,Number(limit)||8));
  if(normalized.length<2||normalized.length>75)return [];
  const term=[...longDistanceSuffixes,...suffixes].find(([suffix])=>normalized.endsWith(suffix)&&normalized.length>suffix.length);
  const service=term?.[1]||(kind==='daeri'?'daeri':'taksong');
  const needle=term?normalized.slice(0,-term[0].length):normalized;
  if(needle.length<2)return [];
  const found=[],exactAlias=aliases.get(needle);
  for(const row of searchRows){
   const {region,full,name,short}=row;
   let rank=Number.POSITIVE_INFINITY;
   if(exactAlias&&exactAlias.full_name===region.full_name)rank=0;
   else if(full===needle)rank=0;
   else if(name===needle)rank=1;
   else if(short===needle)rank=2;
   else if(full.startsWith(needle)||short.startsWith(needle))rank=3;
   else if(name.startsWith(needle))rank=4;
   else if(full.includes(needle)||short.includes(needle))rank=5;
   if(!Number.isFinite(rank))continue;
   found.push({region,rank});
  }
  found.sort((a,b)=>a.rank-b.rank||
   a.region.full_name.split(' ').length-b.region.full_name.split(' ').length||
   a.region.full_name.localeCompare(b.region.full_name,'ko'));
  return found.slice(0,max).map(({region})=>({
   name:region.name,full_name:region.full_name,
   service_url:servicePath(region,service),
   quote_url:estimateUrl(region,service)
  }));
 }
 function imageUrl(query,kind){return '/api/nationwide-locality-card.svg?service='+kind+'&q='+encodeURIComponent(query)}
 return {resolve,resolveServiceBooking,localServiceMenu,resolvePlaceCategory,suggestions,chooser,childrenFor,forDisplay,estimateUrl,imageUrl,ambiguousCount:ambiguous.size,indexedAliases:aliases.size,regionCount:regions.length};
}
module.exports={compact,createNationwideLocalityExplorer};
