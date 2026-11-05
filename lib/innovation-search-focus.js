'use strict';
// These existing legal-region pages share a directory; no duplicate service URLs.
const areas=[
 {region:'세종특별자치시',name:'세종',pickup:'세종 정부청사·나성동·어진동·조치원'},
 {region:'강원특별자치도 원주시',name:'원주혁신도시',pickup:'원주 반곡동·반곡관설동 혁신도시',city:'원주',local:/혁신도시|반곡동|반곡관설동/},
 {region:'경상남도 진주시',name:'진주혁신도시',pickup:'진주 충무공동 혁신도시',city:'진주',local:/혁신도시|충무공동/},
 {region:'전라남도 나주시',name:'나주혁신도시',pickup:'나주 빛가람동 혁신도시',city:'나주',local:/혁신도시|빛가람동/},
 {region:'경상북도 김천시',name:'김천혁신도시',pickup:'김천 율곡동 혁신도시·김천구미역',city:'김천',local:/혁신도시|율곡동/},
 {region:'전북특별자치도 전주시',name:'전주혁신도시',pickup:'전북혁신도시 전주시 구역',city:'전주',local:/혁신도시/},
 {region:'전북특별자치도 완주군',name:'완주혁신도시',pickup:'완주 이서면 전북혁신도시',city:'완주',local:/혁신도시/},
 {region:'충청북도 진천군',name:'진천혁신도시',pickup:'진천 덕산읍 충북혁신도시',city:'진천',local:/혁신도시/},
 {region:'충청북도 음성군',name:'음성혁신도시',pickup:'음성 맹동면 충북혁신도시',city:'음성',local:/혁신도시/},
 {region:'대구광역시 동구',name:'대구신서혁신도시',pickup:'대구 동구 신서혁신도시',city:'대구',local:/혁신도시/},
 {region:'울산광역시 중구',name:'울산우정혁신도시',pickup:'울산 중구 우정혁신도시',city:'울산',local:/혁신도시/},
 {region:'부산광역시 영도구',name:'부산동삼혁신지구',pickup:'부산 영도구 동삼혁신지구',city:'부산',local:/혁신지구/}
];
const entries=areas.flatMap(area=>['daeri','taksong'].map(kind=>({...area,kind,keyword:area.name+(kind==='daeri'?'대리운전':'탁송')})));
const byRegion=new Map(entries.map(x=>[x.region+'|'+x.kind,x]));
const normalize=value=>String(value||'').replace(/\s+/g,'');
const byKeyword=new Map(entries.map(x=>[normalize(x.keyword),x]));
function getFocus(region,kind){return byRegion.get(region+'|'+kind)||null}
function findFocus(keyword){return byKeyword.get(normalize(keyword))||null}
// Rows must already pass city/service matching. Do not join two endpoint locations.
// County-wide and city-wide trips are not automatically innovation-area evidence.
function matchesFocus(row,entry){
 if(!entry.local)return true;
 return [row.rawDeparture||row.departure,row.rawDestination||row.destination].some(value=>{
  const text=String(value||'');
  return new RegExp('(?:^|[^가-힣])'+entry.city).test(text)&&entry.local.test(text);
 });
}
module.exports={areas,entries,getFocus,findFocus,matchesFocus};
