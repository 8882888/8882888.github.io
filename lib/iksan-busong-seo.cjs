'use strict';
// Iksan source-backed administrative geography and user-provided Busong centrality.
// Existing /daeri/ and /taksong/ canonical URLs remain authoritative.
// Guidance about a pickup is NOT evidence of completed work, fixed fares, or staff presence.
const raw=require('../data/iksan-busong-seo-20261122.json');
const CITY=raw.city,FOCUS=raw.focus,PROVINCE='전북특별자치도';
const tokens=['장거리','골프장','골프','맛집','식당','회식','술자리','상가','호텔','펜션','팬션','숙박시설','야간','심야','정비소','서비스센터','중고차','렌터카','렌트카','입고','출고','차량인수','차량회수','예약','요금','거리'];
const serviceNames=[['자동차탁송','taksong'],['차량탁송','taksong'],['로드탁송','taksong'],['대리운전','daeri'],['탁송','taksong']];
const norm=x=>String(x||'').normalize('NFKC').replace(/[\s·_,.()\/\-]+/g,'').toLowerCase();
function create({regionByFullName,servicePath,esc}){
 if(!(regionByFullName instanceof Map)||typeof servicePath!=='function'||typeof esc!=='function')throw Error('Iksan guide requires official regional database and canonical service links');
 const city=regionByFullName.get(CITY),focus=regionByFullName.get(FOCUS),province=regionByFullName.get(PROVINCE);
 if(!city||city.level!=='시'||!focus||focus.level!=='동'||!province||province.level!=='시도')throw Error('Required official Iksan and Busong region missing');
 const regionLinks=raw.regionLinks.map(name=>{
  const region=regionByFullName.get(CITY+' '+name);
  if(!region)throw Error('Nonexistent Iksan neighborhood '+name);
  return region;
 });
 if(new Set(regionLinks.map(r=>r.full_name)).size!==regionLinks.length||regionLinks[0].full_name!==FOCUS||regionLinks.length!==14)throw Error('Iksan locality coverage registry invalid');
 const adjacent=new Map();
 for(const [name,content] of Object.entries(raw.adjacentGuides)){
  const region=regionByFullName.get(CITY+' '+name);
  if(!region||!content.daeri||!content.taksong)throw Error('Invalid related Iksan neighborhood '+name);
  adjacent.set(region.full_name,{region,...content});
 }
 if(adjacent.size!==4)throw Error('Four adjacent Iksan neighborhood guides required');
 const aliases=new Map(),blocked=new Set();
 const record=(text,r)=>{
  const key=norm(text);if(key.length<2||blocked.has(key))return;
  const found=aliases.get(key);
  if(found&&found.full_name!==r.full_name){aliases.delete(key);blocked.add(key)}
  else if(!found)aliases.set(key,r);
 };
 for(const prefix of ['익산','익산시','전북익산','전북익산시','전북특별자치도익산시'])record(prefix,city);
 for(const r of [focus,...adjacent.values()].map(x=>x.region||x)){
  for(const prefix of ['익산','익산시','전북익산','전북익산시','전북특별자치도익산시'])record(prefix+r.name,r);
 }
 const toLinks=(kind)=>'<ul>'+regionLinks.map(r=>'<li><a href="'+esc(servicePath(r,kind))+'">'+esc('익산'+r.name+(kind==='daeri'?'대리운전':'탁송'))+'</a> · '+esc(r.full_name)+'</li>').join('')+'</ul>';
 const areaIntro=(kind)=>kind==='daeri'?
  '대리운전은 고객이 본인 차량을 타고 이동할 때 기사가 대신 운전하는 서비스로, 음식점·회식장소와 실제 주차장, 희망 출발시각·최종 목적지 및 기사 복귀조건을 확인해야 합니다.':
  '자동차탁송은 차량만 인수해 정상 운행 가능한 상태에서 목적지로 이동·인계하는 서비스로, 주차장 출입·키 전달자·차량 상태와 도착지 인수인·보험 적용 여부를 확인해야 합니다.';
 const commonLinks=(r,kind)=>'<p><a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(r.full_name)+'">익산 '+r.name+' 출발 예상요금·거리조회</a> · '+
  '<a href="'+(kind==='daeri'?'/service/long-distance-daeri/':'/service/long-distance-taksong/')+'">장거리 '+(kind==='daeri'?'대리운전':'자동차탁송')+'</a> · '+
  '<a href="/reviews/history/?kind='+kind+'&amp;q='+encodeURIComponent('익산')+'">공개 원본 운행기록 확인</a> · '+
  '<a href="tel:18114294">1811-4294 상담</a></p>';
 const focusedNavigation=(kind)=>'<p><strong>익산 동부 생활권 주요 출발지:</strong> <a href="'+esc(servicePath(focus,kind))+'">부송동'+(kind==='daeri'?'대리운전':'탁송')+'</a> · '+
  ['영등동','어양동','팔봉동','신동'].map(x=>{
    const row=regionByFullName.get(CITY+' '+x);return '<a href="'+esc(servicePath(row,kind))+'">'+esc(x+(kind==='daeri'?'대리운전':'탁송'))+'</a>';
  }).join(' · ')+'</p>';
 function citySection(kind){
  const k=kind==='daeri'?'대리운전':'탁송',d=raw.cityGuide[kind];
  return '<section id="iksan-busong-central-20261122"><h2>익산'+k+' | 부송동 생활상권 중심·영등동·어양동·모현동 연결</h2>'+
   '<p><strong>익산시는 부송동을 핵심 출발 생활권으로 강조합니다.</strong> 영등동·어양동·모현동·팔봉동 등은 별도 주소인 만큼 기사 만남과 차량 인수 위치를 서로 구분합니다. 공식 시청 소재지나 익산의 유일한 도심이라고 주장하는 표현이 아닙니다.</p>'+
   d.map(x=>'<p>'+esc(x)+'</p>').join('')+
   '<h3>익산 시내와 읍·면별 '+k+' 출발지 찾기</h3>'+
   '<p>부송동·영등동·어양동·신동·동산동·마동·모현동1가·모현동2가·송학동과 함열읍·금마면·왕궁면 등에서 실제 차량 위치를 법정 주소로 선택하세요. 같은 익산시라도 주차 위치·기사 접근·복귀가 서로 다릅니다.</p>'+
   toLinks(kind)+focusedNavigation(kind)+
   commonLinks(city,kind)+
   '<p>지역 안내는 상담 조건 설명입니다. 부송동 또는 익산시 전체의 완료 배차·정액요금·제휴업체·상주 기사 수를 새로 주장하지 않습니다.</p></section>';
 }
 function focusSection(kind){
  const k=kind==='daeri'?'대리운전':'탁송',d=raw.focusGuide[kind];
  return '<section id="iksan-busong-focus-20261122">'+
   '<h2>부송동'+k+' · 익산부송동'+k+' | 생활상권 주차장 출발·장거리</h2>'+
   '<p>행정구역: '+esc(FOCUS)+'. 영등동과 어양동이 가까운 익산 동부 생활권이지만, 실제 차량 위치가 부송동인지 먼저 확인해야 합니다.</p>'+
   d.map(x=>'<p>'+esc(x)+'</p>').join('')+
   '<h3>부송동 출발에서 익산시 전체로 연결</h3>'+
   '<p><a href="'+esc(servicePath(city,kind))+'">익산'+k+' 대표 안내</a>에서 다른 읍·면·동을 찾거나 아래 인접 지역으로 이동하세요.</p>'+
   focusedNavigation(kind)+commonLinks(focus,kind)+
   '<p>문의 시 출발 위치·도착지·시간대·차종 또는 동승 정보를 알려주세요. 요금과 실제 기사 배정은 상담 후 확인됩니다.</p></section>';
 }
 function adjacentSection(row,kind){
  const k=kind==='daeri'?'대리운전':'탁송';
  return '<section id="iksan-busong-neighbor-20261122"><h2>'+esc('익산'+row.region.name+k)+' | 부송동과 구분한 출발지 안내</h2>'+
   '<p>'+esc(row[kind])+'</p>'+
   '<p>같은 익산 동부권이라도 부송동과 '+esc(row.region.name)+'은 법정 주소가 다릅니다. <a href="'+esc(servicePath(focus,kind))+'">부송동'+k+'</a> · <a href="'+esc(servicePath(city,kind))+'">익산'+k+' 전체</a> · <a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(row.region.full_name)+'">현재 예상요금</a>으로 이동할 수 있습니다.</p></section>';
 }
 function provinceSection(kind){
  const k=kind==='daeri'?'대리운전':'탁송';
  return '<section id="jeonbuk-iksan-busong-discovery-20261122"><h2>전북 익산'+k+' | 부송동·영등동·어양동 출발 안내</h2>'+
   '<p>전북특별자치도 익산시는 부송동의 생활상권과 영등동·어양동 상권, 모현동 주거지 및 읍면 외곽 출발지가 다릅니다. <a href="'+esc(servicePath(city,kind))+'">익산'+k+' 대표 안내</a>와 <a href="'+esc(servicePath(focus,kind))+'">부송동'+k+' 상세</a>에서 출발지·목적지·요금 조건을 구분합니다. 실제 기사 상주나 특정 운행완료를 주장하지 않습니다.</p></section>';
 }
 function regionSection(r,kind){
  if(!r||!['daeri','taksong'].includes(kind))return '';
  if(r.full_name===CITY)return citySection(kind);
  if(r.full_name===FOCUS)return focusSection(kind);
  if(r.full_name===PROVINCE)return provinceSection(kind);
  const adj=adjacent.get(r.full_name);
  return adj?adjacentSection(adj,kind):'';
 }
 function searchMeta(r,kind){
  if(!r||!['daeri','taksong'].includes(kind)||![CITY,FOCUS].includes(r.full_name))return null;
  const k=kind==='daeri'?'대리운전':'탁송';
  if(r.full_name===CITY)return {
   title:'익산'+k+' | 부송동 중심·영등동·어양동·모현동 '+(kind==='daeri'?'예약':'차량인수')+' 안내',
   description:kind==='daeri'?'익산대리운전 부송동·영등동·어양동·모현동 식사·회식 후 귀가, 장거리 예약·요금 상담 1811-4294.':'익산탁송 부송동·영등동·어양동 차량 인수, 중고차·정비소·장거리 로드탁송 예상요금 상담 1811-4294.'
  };
  return {
   title:'익산부송동'+k+' | '+(kind==='daeri'?'상권·회식·장거리 예약':'차량인수·서비스센터·장거리 탁송'),
   description:kind==='daeri'?'익산부송동대리운전 부송동 상권·식당 주차장 출발과 영등동·어양동 귀가, 장거리 대리운전 요금 상담 1811-4294.':'익산부송동탁송 상가·아파트 차량 인수, 영등동·어양동 연결 및 전주·군산·수도권 장거리 이동 상담 1811-4294.'
  };
 }
 function resolve(rawQuery){
  const q=norm(rawQuery);
  if(!q||q.length>110)return null;
  const service=serviceNames.find(([s])=>q.endsWith(s));
  if(!service)return null;
  const [suffix,kind]=service;
  let rest=q.slice(0,-suffix.length);
  if(!rest)return null;
  let special='';
  for(const token of [...tokens].sort((a,b)=>b.length-a.length)){
   if(rest.endsWith(token)){special=token;rest=rest.slice(0,-token.length);break;}
  }
  if(!special)return null; // leave plain legal locality + service to established resolver
  const region=aliases.get(rest);
  if(!region)return null;
  return servicePath(region,kind);
 }
 return Object.freeze({regionSection,searchMeta,resolve,city,focus,regions:regionLinks,adjacentCount:adjacent.size,CITY,FOCUS});
}
module.exports={create,norm,CITY,FOCUS};
