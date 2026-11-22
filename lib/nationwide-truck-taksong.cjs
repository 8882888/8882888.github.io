'use strict';
// Nationwide truck *vehicle transfer* SEO is a navigational layer, not one
// invented landing page per tonne, vehicle body, or legal dong/village.
const data=require('../data/nationwide-truck-types-20261122.json');
const existingSpecialVehicleKeywords=require('./special-vehicle-keywords.cjs');
const HEAVY='/service/heavy-truck-taksong/';
const AERIAL='/service/aerial-work-truck-taksong/';
const LADDER='/service/ladder-truck-taksong/';
const normalize=x=>String(x||'').normalize('NFKC').replace(/[\s·,_.()\/\-]+/g,'').toLowerCase();
const tonPattern='(?:[1-9]|1[0-9]|2[0-5])(?:\\.[0-9])?톤';
const edgeTon=new RegExp(tonPattern+'$');
const headTon=new RegExp('^'+tonPattern);
const mids=Object.freeze(['화물차','화물자동차','화물차량']);
const shortProvince={
 '서울특별시':'서울','부산광역시':'부산','대구광역시':'대구','인천광역시':'인천',
 '광주광역시':'광주광역시','대전광역시':'대전','울산광역시':'울산','세종특별자치시':'세종',
 '경기도':'경기','강원특별자치도':'강원','충청북도':'충북','충청남도':'충남',
 '전북특별자치도':'전북','전라남도':'전남','경상북도':'경북','경상남도':'경남','제주특별자치도':'제주'
};
function create({regions,servicePath,esc,nationwideExplorer}){
 if(!Array.isArray(regions)||!regions.length||typeof servicePath!=='function'||typeof esc!=='function'||!nationwideExplorer||typeof nationwideExplorer.resolve!=='function')
  throw Error('Nationwide truck SEO requires real legal-region routes and unambiguous locality resolver');
 const provinces=regions.filter(x=>x.level==='시도'),aliases=new Map(),typeByName=new Map(),ids=new Set();
 if(provinces.length!==17||data.types.length!==26)throw Error('Truck registry does not match 17 province and 26 distinct vehicle type contracts');
 for(const t of data.types){
  if(!t.name||!t.slug||ids.has(t.slug)||!Array.isArray(t.aliases)||t.aliases.length<1||t.description.length<35)
   throw Error('Invalid truck type '+JSON.stringify(t.name));
  ids.add(t.slug);typeByName.set(t.name,t);
  for(const a of t.aliases){
   const key=normalize(a);
   if(aliases.has(key))throw Error('Ambiguous truck body alias '+a);
   aliases.set(key,t);
  }
 }
 const matchAliases=[...aliases].sort((a,b)=>b[0].length-a[0].length);
 const typeUrl=t=>t.slug==='aerial'?AERIAL:t.slug==='ladder'?LADDER:HEAVY+'#truck-type-'+t.slug;
 const byRegionName=new Map(regions.map(x=>[x.full_name,x]));
 function locality(text){
  if(!text)return null;
  const exact=nationwideExplorer.resolve(text+'탁송');
  return exact&&exact.kind==='taksong'?exact.region:null;
 }
 function removeTons(text){
  const result=[text],seen=new Set(result);
  let q=[text];
  for(let n=0;n<3;n++){
   const next=[];
   for(const value of q){
    const options=[value.replace(edgeTon,''),value.replace(headTon,'')];
    for(const mid of mids)options.push(value.endsWith(mid)?value.slice(0,-mid.length):value);
    for(const opt of options)if(opt!==value&&opt&&!seen.has(opt)){seen.add(opt);result.push(opt);next.push(opt)}
   }
   q=next;
   if(!q.length)break;
  }
  return result;
 }
 function legalTarget(text){
  for(const name of removeTons(text)){
   const r=locality(name);
   if(r)return servicePath(r,'taksong');
  }
  return null;
 }
 function parse(stem){
  // Place first: 서산대산읍25톤윙바디탁송, 서울5톤화물차윙바디탁송
  // Type first: 25톤윙바디충남당진시탁송, 냉동탑차5톤부산탁송
  for(const [alias] of matchAliases){
   if(stem.endsWith(alias)){
    const prefix=stem.slice(0,-alias.length);
    const resolved=legalTarget(prefix);
    if(resolved)return resolved;
   }
   if(stem.startsWith(alias)){
    const suffix=stem.slice(alias.length);
    const resolved=legalTarget(suffix);
    if(resolved)return resolved;
   }
   const strippedStart=stem.replace(headTon,'');
   if(strippedStart!==stem&&strippedStart.startsWith(alias)){
    const resolved=legalTarget(strippedStart.slice(alias.length));
    if(resolved)return resolved;
   }
   const strippedEnd=stem.replace(edgeTon,'');
   if(strippedEnd!==stem&&strippedEnd.endsWith(alias)){
    const resolved=legalTarget(strippedEnd.slice(0,-alias.length));
    if(resolved)return resolved;
   }
   // Some users put the tonnage after the body type but before the place.
   if(stem.startsWith(alias)){
    const rest=stem.slice(alias.length);
    const v=rest.replace(headTon,'');
    if(v!==rest){const resolved=legalTarget(v);if(resolved)return resolved}
   }
  }
  // No explicit body type but a legal locality with 1-25t (e.g. 부산5톤탁송).
  return legalTarget(stem.replace(edgeTon,'').replace(headTon,''))&&
    (edgeTon.test(stem)||headTon.test(stem))?legalTarget(stem.replace(edgeTon,'').replace(headTon,'')):null;
 }
 function resolve(raw){
  // An exact, established special-vehicle service phrase is not a locality,
  // even if a homonymous village (e.g. 사다리) exists nationwide.
  if(existingSpecialVehicleKeywords.resolve(raw))return null;
  const q=normalize(raw);
  if(q.length<5||q.length>115||!q.endsWith('탁송'))return null;
  const stem=q.slice(0,-2).replace(/^전국/,'');
  if(stem.length<3)return null;
  const candidates=[stem];
  const clean=stem.replace(/(?:자동차|차량|로드)$/,'');
  if(clean!==stem)candidates.push(clean);
  for(const candidate of candidates){
   const result=parse(candidate);
   if(result)return result;
  }
  return null;
 }
 function resolveGeneral(raw){
  const q=normalize(raw);
  if(q.length<3||q.length>90||!q.endsWith('탁송'))return null;
  let stem=q.slice(0,-2).replace(/^전국/,'');
  const candidates=[stem,stem.replace(/(?:자동차|차량|로드)$/,'')];
  for(let v of candidates){
   v=v.replace(headTon,'').replace(edgeTon,'');
   if(aliases.has(v))return typeUrl(aliases.get(v));
   // A weight followed by 화물차 + body type is still a type inquiry.
   for(const mid of mids)if(v.startsWith(mid)&&aliases.has(v.slice(mid.length)))return typeUrl(aliases.get(v.slice(mid.length)));
  }
  return null;
 }
 const major=['화물차','카고','윙바디','탑차','냉동탑차','냉장탑차','리프트탑차','덤프트럭','탱크로리','집게차','카고크레인','특장차'];
 function hubSection(){
  const provinceLinks=provinces.map(r=>'<li><a href="'+esc(servicePath(r,'taksong'))+'">'+esc((shortProvince[r.full_name]||r.name)+'화물차탁송')+'</a> — '+esc(r.full_name)+' 차량 인수·인계</li>').join('');
  const types=data.types.map(t=>'<li id="truck-type-'+esc(t.slug)+'"><strong>'+esc(t.name+'탁송')+'</strong> · '+esc(t.aliases.slice(1,4).map(n=>n+'탁송').join(' · '))+'<p>'+esc(t.description)+' <a href="'+esc(typeUrl(t))+'">차종별 상담 안내</a></p></li>').join('');
  const ton=data.weights.map(w=>'<span>'+esc(w+'톤화물차탁송')+'</span>').join(' · ');
  return '<section id="nationwide-truck-types-20261122"><h2>전국 화물차탁송 종류별 · 1톤부터 25톤까지 로드탁송 상담</h2>'+
   '<p><strong>화물차 자체를 운전해 인수·인계하는 차량탁송</strong> 안내입니다. 화물 적재물만 운송하는 화물운송 계약, 견인·장비 임대 및 운행 불가능 차량의 특수운송과 구분합니다. 전국 어느 시·도에서든 출발지·도착지, 차량 제원을 확인한 뒤 배차 가능 여부를 안내합니다. 지역별 상주 기사나 모든 차종의 운행 가능성을 보장하지 않습니다.</p>'+
   '<h3>차량 톤수별 화물차탁송 검색</h3><p>'+ton+'</p>'+
   '<p>위 톤수는 검색·견적 문의용이며 종류별 차량이 반드시 해당 적재량으로 생산·운행된다는 뜻이 아닙니다. 등록증의 적재량·총중량·전장·전고 및 실제 차량 상태를 확인합니다.</p>'+
   '<h3>카고·윙바디·탑차·냉동탑차·특장차 등 '+data.types.length+'개 차종</h3><ul>'+types+'</ul>'+
   '<h3>전국 17개 시·도 화물차·특장차탁송</h3><ul>'+provinceLinks+'</ul>'+
   '<h3>실제 출발지가 시·군·구·읍·면·동·리라면</h3><p>아래 지역 검색창에 정확한 법정 주소를 입력하면 기존 지역별 자동차탁송 페이지를 선택할 수 있습니다. 화물차 종류+지역 검색어는 기존 대표 URL로 안내되며 차종·동리 조합별 대량 복제 페이지를 만들지 않습니다.</p>'+
   '<form method="get" action="/region/"><input type="hidden" name="service" value="taksong"><label for="nationwide-truck-region-q">출발 시·군·구·읍·면·동·리 <input id="nationwide-truck-region-q" name="q" placeholder="예: 서산시 대산읍"></label> <button type="submit">출발 지역 확인</button></form>'+
   '<p><a href="/fare/?service=taksong">출발·도착 예상요금 조회</a> · <a href="/service/aerial-work-truck-taksong/">고소작업차</a> · <a href="/service/ladder-truck-taksong/">사다리차</a> · <a href="/reviews/history/?kind=taksong">확인된 운행기록</a> · <a href="tel:18114294">1811-4294 상담</a></p>'+
   '<p>특수차량은 적재물·위험물 잔량, 도로 이동 허가, 차량 등록 유형 및 운전 자격·보험 적용 범위에 따라 로드탁송이 불가할 수 있습니다. 확정요금·운행후기는 해당 개별 기록과 구분합니다.</p></section>';
 }
 function regionSection(r,kind){
  if(!r||kind!=='taksong'||!['시도','시','군','구'].includes(r.level))return '';
  const label=r.level==='시도'?shortProvince[r.full_name]||r.name:r.full_name;
  const isProvince=r.level==='시도';
  const picks=['카고','윙바디','탑차','냉동탑차','덤프트럭','특장차'];
  const checks=picks.map(n=>typeByName.get(n)).map(t=>'<li><a href="'+esc(typeUrl(t))+'">'+esc(label+t.name+'탁송')+'</a> · '+esc(t.description)+'</li>').join('');
  const examples=[label+'1톤카고탁송',label+'3.5톤윙바디탁송',label+'5톤탑차탁송',label+'11톤화물차탁송',label+'25톤특장차탁송'];
  const children=isProvince?regions.filter(x=>x.full_name.startsWith(r.full_name+' ')&&['시','군'].includes(x.level)).slice(0,8)
   .map(x=>'<a href="'+esc(servicePath(x,'taksong'))+'">'+esc(x.name+'화물차탁송')+'</a>').join(' · '):'';
  return '<section id="truck-locality-taksong-guide-20261122" aria-label="'+esc(r.full_name)+' 화물차종류별 차량탁송">'+
   '<h2>'+esc(label+'화물차탁송 | 1톤·3.5톤·5톤·11톤·25톤 카고·윙바디·탑차·특장차')+'</h2>'+
   '<p>'+esc(r.full_name)+' 출발에서 전국 다른 시·도·시·군·구로 화물차 자체를 인수·인계하는 차량탁송을 상담합니다. 고객 차량의 등록 차종·적재량과 총중량·차체 높이·주행 가능 여부에 따라 적합한 기사 자격과 보험 적용 범위를 확인해야 합니다. 적재 화물 배송, 특장 장비의 임대·작업, 미등록 운행이나 실적 보장은 아닙니다.</p>'+
   '<h3>'+esc(label)+' 화물차 종류별 준비사항</h3><ul>'+checks+'</ul>'+
   '<h3>톤급·차량 형태 검색 예시</h3><p>'+examples.map(esc).join(' · ')+' 등의 조합으로 지역별 상담을 찾을 수 있습니다. 해당 차종이나 톤수의 즉시 배차를 의미하지 않습니다.</p>'+
   (children?'<nav aria-label="'+esc(label+' 하위 시군 화물차탁송')+'"><h3>시·군별 화물차탁송 바로가기</h3><p>'+children+'</p></nav>':'')+
   '<p><a href="'+HEAVY+'">전국 화물차 26종·톤급별 탁송 안내</a> · <a href="/fare/?service=taksong&amp;from='+encodeURIComponent(r.full_name)+'">출발지 예상요금 조회</a> · <a href="/reviews/history/?kind=taksong">기존 운행기록 확인</a> · <a href="tel:18114294">1811-4294 예약 상담</a></p></section>';
 }
 return Object.freeze({resolve,resolveGeneral,hubSection,regionSection,types:data.types,weights:data.weights,provinceCount:provinces.length});
}
module.exports={create,normalize,HEAVY,AERIAL,LADDER};
