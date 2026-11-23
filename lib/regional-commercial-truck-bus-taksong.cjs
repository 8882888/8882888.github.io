'use strict';
// Bus means transport of the vehicle itself, NOT passenger charter or operation.
// Existing canonical region/taksong URLs are reused; no keyword doorway URLs.
const source=require('../data/gyeonggi-truck-bus-regional-20261123.json');
const trucks=require('../data/nationwide-truck-types-20261122.json');
const ROOT='경기도';
const BUS_ANCHOR='/taksong/#national-bus-vehicle-taksong-20261123';
const HEAVY='/service/heavy-truck-taksong/';
const excluded=new Set(['경기도 용인시','경기도 화성시','경기도 평택시','경기도 안성시']);
const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s·,_()\/\-]+/g,'');
const short=r=>r.full_name==='경기도 광주시'?'경기광주':
 r.full_name==='광주광역시'?'광주광역시':r.name.replace(/[시군]$/,'');
function create({regions,regionByFullName,servicePath,esc,nationwideExplorer}){
 if(!Array.isArray(regions)||!(regionByFullName instanceof Map)||
  typeof servicePath!=='function'||typeof esc!=='function'||
  !nationwideExplorer||typeof nationwideExplorer.resolve!=='function')
  throw Error('Truck/bus SEO requires original legal-region index and source-safe resolver');
 const gy=regions.filter(r=>r.full_name.startsWith(ROOT+' ')&&['시','군'].includes(r.level));
 const provinces=regions.filter(r=>r.level==='시도');
 if(gy.length!==31||source.rows.length!==27||provinces.length!==17||
    trucks.types.length!==26||trucks.weights.length!==27||source.bus_types.length!==14)
  throw Error('Original truck, bus or region inventory changed');
 const byName=new Map(),canonicalPaths=new Set();
 for(const entry of source.rows){
  const r=regionByFullName.get(entry.region);
  if(!r||!['시','군'].includes(r.level)||excluded.has(entry.region)||
    !gy.some(x=>x.full_name===entry.region)||byName.has(entry.region)||
    typeof entry.truck!=='string'||entry.truck.length<15||
    typeof entry.bus!=='string'||entry.bus.length<15)
   throw Error('Unverified Gyeonggi truck/bus service scope '+entry.region);
  byName.set(entry.region,Object.freeze({...entry,region:r}));
  canonicalPaths.add(servicePath(r,'taksong'));
 }
 if(byName.size!==27||gy.some(r=>!excluded.has(r.full_name)&&!byName.has(r.full_name)))
  throw Error('Gyeonggi 27 truck/bus source does not cover every included city/county');
 const gyHub=regionByFullName.get(ROOT);
 if(!gyHub||gyHub.level!=='시도')throw Error('Missing Gyeonggi province canonical');
 canonicalPaths.add(servicePath(gyHub,'taksong'));
 if(canonicalPaths.size!==28)throw Error('Expected only 28 existing Gyeonggi taksong URLs');
 const aliases=new Set(),busByAlias=new Map();
 for(const type of source.bus_types){
  if(!type.name||!type.hint||!type.aliases.length)throw Error('Missing bus type fields');
  for(const alias of type.aliases){
   const a=normalize(alias);
   if(aliases.has(a))throw Error('Duplicate bus synonym '+alias);
   aliases.add(a);busByAlias.set(a,type);
  }
 }
 const ordered=[...aliases].sort((a,b)=>b.length-a.length);
 const seats=new Set(source.seats.map(x=>x+'인승'));
 const shortMap=new Map(),ambiguous=new Set();
 for(const r of regions){
  if(!['시','군'].includes(r.level))continue;
  const key=normalize(r.name.replace(/[시군]$/,''));
  if(key.length<2||ambiguous.has(key))continue;
  if(shortMap.has(key)&&shortMap.get(key).full_name!==r.full_name){
   shortMap.delete(key);ambiguous.add(key);
  }else if(!shortMap.has(key))shortMap.set(key,r);
 }
 function localRegion(v){
  if(!v||/^(?:광주|광주시)$/.test(v))return null;
  const match=nationwideExplorer.resolve(v+'탁송');
  if(match?.kind==='taksong'&&match.region)return match.region;
  return shortMap.get(v)||null;
 }
 // Remove a bus body alias and (if present) a seating descriptor on either edge.
 // Avoid reading an unverified origin -> destination sentence as one location.
 function resolve(raw){
  const q=normalize(raw);
  if(!q.endsWith('탁송')||q.length<4||q.length>110||
     /(승객운송|버스대절|버스대여|여객운송|기사모집)/.test(q))return null;
  let stem=q.slice(0,-2).replace(/(?:자동차|차량|로드)$/,'');
  if(stem.startsWith('전국'))stem=stem.slice(2);
  if(!stem||!/(?:버스|승합차|승합자동차)/.test(stem))return null;
  const queue=[{value:stem,bus:false,steps:0}],visited=new Set();
  while(queue.length){
   const item=queue.shift(),key=item.value+'|'+item.bus;
   if(visited.has(key))continue;visited.add(key);
   if(item.bus){
    if(!item.value)return BUS_ANCHOR;
    const r=localRegion(item.value);
    if(r)return servicePath(r,'taksong');
   }
   if(item.steps>=4)continue;
   const next=(v,b)=>{if(v!==item.value)queue.push({value:v,bus:b||item.bus,steps:item.steps+1})};
   for(const alias of ordered){
    if(item.value.startsWith(alias))next(item.value.slice(alias.length),true);
    if(item.value.endsWith(alias))next(item.value.slice(0,-alias.length),true);
   }
   for(const seat of seats){
    if(item.value.startsWith(seat))next(item.value.slice(seat.length),false);
    if(item.value.endsWith(seat))next(item.value.slice(0,-seat.length),false);
   }
  }
  return null;
 }
 const quote=(from,to)=>'/fare/?service=taksong&amp;from='+encodeURIComponent(from)+
   '&amp;to='+encodeURIComponent(to);
 const truckKinds=['카고','윙바디','탑차','냉동탑차','덤프트럭','카고크레인','집게차','특장차'];
 const frontTons=['1','1.2','1.4','1.5','2.5','3.5','5','8','11','14','15','18','25'];
 const busKinds=['버스','전세버스','관광버스','셔틀버스','통근버스','통학버스','마을버스','시내버스','시외버스','대형버스','중형버스','승합차'];
 function localSection(entry){
  const r=entry.region,place=short(r);
  const base=require('../data/gyeonggi-27-municipal-corridors-20261123.json')
   .rows.find(x=>x.region===r.full_name);
  if(!base)throw Error('Missing original 27 region locality guide '+r.full_name);
  const from=r.full_name+' '+base.local[0],to=base.neighbors[0];
  const target=regionByFullName.get(to);
  const truckTerms=frontTons.map(n=>place+n+'톤화물차탁송').join(' · ');
  const typeTerms=truckKinds.map(n=>place+n+'탁송').join(' · ');
  const busTerms=busKinds.map(n=>place+n+'탁송').join(' · ');
  return '<section id="gyeonggi-truck-bus-20261123" aria-label="'+
   esc(r.full_name+' 화물차 톤수별·버스 탁송 검색 안내')+'">'+
   '<h2>'+esc(place+'화물차탁송·버스탁송 | 톤수별·종류별 차량 인수 안내')+'</h2>'+
   '<h3>'+esc(place+' 1톤·3.5톤·5톤·11톤·25톤 화물차탁송')+'</h3>'+
   '<p><strong>지역별 확인사항:</strong> '+esc(entry.truck)+'. 화물차를 직접 운전해 이동시키는 로드탁송이며 적재된 화물의 배송이나 장비 작업을 대신한다는 뜻이 아닙니다. 차량 등록증의 최대적재량·총중량·전고, 적재물 유무, 차량 상태와 기사 면허·보험을 확인해야 합니다.</p>'+
   '<p>'+esc(truckTerms)+'</p>'+
   '<h3>'+esc(place+' 카고·윙바디·탑차·냉동탑차·특장차탁송')+'</h3>'+
   '<p>'+esc(typeTerms)+' 등 차종별 출고 상담 키워드를 안내합니다. 실제 해당 톤급과 차체형식이 조합된 차량인지 등록증으로 확인하며 가상 운행완료 실적을 만들지 않습니다.</p>'+
   '<h3>'+esc(place+' 전세버스·관광버스·통학버스·셔틀버스탁송')+'</h3>'+
   '<p><strong>버스 인계 확인사항:</strong> '+esc(entry.bus)+'. 버스탁송은 <strong>버스 차량만 이동</strong>하는 상담으로 여객운송·승객 동승·전세버스 대절과 다릅니다. 인승 수치는 차량 등록 정원 확인용이며 면허·보험 적용과 현장 운행 가능 여부는 별도 확인합니다.</p>'+
   '<p>'+esc(busTerms)+' · '+esc(place+'15인승승합차탁송 · '+place+'25인승버스탁송 · '+place+'35인승버스탁송 · '+place+'45인승버스탁송')+'</p>'+
   '<h3>'+esc(place+' 화물차·버스 지역간 탁송 요금조회')+'</h3>'+
   '<p><a href="'+quote(from,to)+'">'+esc(base.local[0]+'→'+short(target)+' 차량탁송 거리·예상요금 조회')+'</a> · '+
   '<a href="'+esc(servicePath(target,'taksong'))+'">'+esc(short(target)+'자동차탁송 지역안내')+'</a> · '+
   '<a href="'+esc(servicePath(gyHub,'taksong'))+'">경기도 화물차·버스탁송 지역별 안내</a></p>'+
   '<p><a href="'+HEAVY+'">화물차 27개 톤수·26개 차종 안내</a> · <a href="'+BUS_ANCHOR+'">전세·관광·셔틀·통학버스 종류별 안내</a> · '+
   '<a href="tel:18114294">차량 인수·인계 상담 1811-4294</a></p>'+
   '<p>모든 차종·인승·톤수별 키워드는 <strong>문의 검색 예시</strong>로, 상주 기사·즉시 배차·확정 요금·완료된 운행기록이 아닙니다. 요금조회 화면은 기본 차량 이동 참고용이며 특수차량 실제 견적은 별도 상담으로 확정합니다.</p></section>';
 }
 function provinceSection(){
  const rows=[...byName.values()].map(e=>'<li><a href="'+esc(servicePath(e.region,'taksong'))+'">'+
   esc(short(e.region)+'화물차탁송·'+short(e.region)+'버스탁송')+'</a> — '+
   esc(e.truck+'; '+e.bus)+'</li>').join('');
  return '<section id="gyeonggi-truck-bus-hub-20261123">'+
   '<h2>경기도 27개 시·군 화물차·버스 지역탁송 | 톤수·차종별 검색</h2>'+
   '<p>용인·화성·평택·안성의 별도 기존 작업은 유지하고, 나머지 경기도 27개 시·군의 기존 자동차탁송 페이지를 연결합니다. 화물차 1~25톤급 문의와 카고·윙바디·탑차·특장차, 전세·관광·통근·통학버스·승합차 탁송을 차량 자체 이동으로 구분합니다. 기사 및 차량이 모든 지역에 상주한다는 뜻이 아닙니다.</p>'+
   '<ul>'+rows+'</ul>'+
   '<p><a href="'+HEAVY+'">27개 톤수·26개 화물차 차종</a> · <a href="'+BUS_ANCHOR+'">버스 종류·정원별 탁송</a> · <a href="tel:18114294">예약 상담 1811-4294</a></p></section>';
 }
 function hubSection(){
  const typeItems=source.bus_types.map(t=>'<li><strong>'+esc(t.name+'탁송')+'</strong> · '+
   esc(t.hint)+'</li>').join('');
  const seatItems=source.seats.map(n=>esc(n+'인승버스탁송')).join(' · ');
  const provinceItems=provinces.map(r=>'<a href="'+esc(servicePath(r,'taksong'))+'">'+
    esc(short(r)+'버스탁송')+'</a>').join(' · ');
  return '<section id="national-bus-vehicle-taksong-20261123">'+
   '<h2>전국버스탁송 · 승합차탁송 | 전세버스·관광버스·셔틀버스·통학버스</h2>'+
   '<p>운행 가능한 <strong>버스 차량 자체를 목적지로 이동시키는 탁송</strong> 상담입니다. 승객을 실어 나르는 버스 대절·여객운송 계약과 구분하며, 차량 인수 승인·실제 운행 가능 여부·승차정원에 적합한 운전면허·보험 적용 범위를 사전 확인합니다. 모든 버스 차종의 당일 운행을 보장하지 않습니다.</p>'+
   '<h3>버스·승합차 14개 검색 종류</h3><ul>'+typeItems+'</ul>'+
   '<h3>승차정원별 검색 예시</h3><p>'+seatItems+'</p>'+
   '<p>인승 숫자는 문의할 때 참고하는 키워드일 뿐 특정 버스 제작 제원이나 면허 가능 범위를 보장하지 않습니다. 자동차등록증 승차정원과 실제 운전면허 및 운행 제한을 확인해야 합니다.</p>'+
   '<h3>지역별 버스탁송 안내</h3><p>'+provinceItems+'</p>'+
   '<p><a href="'+esc(servicePath(gyHub,'taksong'))+'">경기도 27개 시군 화물차·버스탁송</a> · '+
   '<a href="'+HEAVY+'">전국 1~25톤 화물차·특장차탁송</a> · '+
   '<a href="/fare/?service=taksong">출발·도착 예상요금 조회</a> · '+
   '<a href="tel:18114294">차량탁송 상담 1811-4294</a></p>'+
   '<p>시내·시외·고속·마을·어린이통학 차량은 업체 인수 승인 및 제반 법적 요건을 반드시 별도 확인합니다. 승객과 화물의 운송, 미등록 차량의 불법 운행, 전 차종의 배차 보장을 뜻하지 않습니다.</p></section>';
 }
 function regionSection(r,kind){
  if(!r||kind!=='taksong')return '';
  if(r.full_name===ROOT)return provinceSection();
  const entry=byName.get(r.full_name);
  return entry?localSection(entry):'';
 }
 return Object.freeze({resolve,hubSection,regionSection,sourceCount:byName.size,
  busTypeCount:source.bus_types.length,canonicalPaths:[...canonicalPaths]});
}
module.exports={create,BUS_ANCHOR,HEAVY,normalize};
