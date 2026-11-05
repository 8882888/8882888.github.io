'use strict';
// One canonical city page per search intent; no duplicate doorway URLs.
const focus={
 '세종특별자치시|daeri':{keyword:'세종대리운전',pickup:'세종 정부청사·나성동·어진동·조치원'},
 '세종특별자치시|taksong':{keyword:'세종탁송',pickup:'세종 정부청사·나성동·어진동·조치원'},
 '강원특별자치도 원주시|daeri':{keyword:'원주혁신도시대리운전',pickup:'원주 반곡동·반곡관설동 혁신도시',city:'원주',local:/혁신도시|반곡동|반곡관설동/},
 '경상남도 진주시|taksong':{keyword:'진주혁신도시탁송',pickup:'진주 충무공동 혁신도시',city:'진주',local:/혁신도시|충무공동/},
 '전라남도 나주시|daeri':{keyword:'나주혁신도시대리운전',pickup:'나주 빛가람동 혁신도시',city:'나주',local:/혁신도시|빛가람동/},
 '경상북도 김천시|taksong':{keyword:'김천혁신도시탁송',pickup:'김천 율곡동 혁신도시·김천구미역',city:'김천',local:/혁신도시|율곡동/}
};
function getFocus(region,kind){return focus[region+'|'+kind]||null}
// Input rows must already pass the shared city/service evidence matcher.
// A city-wide trip is not an innovation-city trip. Never combine two endpoints.
function matchesFocus(row,entry){
 if(!entry.local)return true;
 return [row.rawDeparture||row.departure,row.rawDestination||row.destination].some(value=>{
  const text=String(value||'');
  return new RegExp('(?:^|[^가-힣])'+entry.city).test(text)&&entry.local.test(text);
 });
}
module.exports={getFocus,matchesFocus};
