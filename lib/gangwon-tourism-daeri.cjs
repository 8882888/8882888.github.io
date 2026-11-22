'use strict';
// 18 verified legal Gangwon municipalities; one canonical daeri page per city/county.
// Source tourist-place names and booking-use cases are NOT records of actual trips,
// operating lodging or restaurant businesses, pricing, or permanently stationed drivers.
const raw=require('../data/gangwon-tourism-daeri-18-20261122.json');
const PROVINCE='강원특별자치도';
function create({regions,regionByFullName,servicePath,esc}){
 if(!Array.isArray(regions)||!(regionByFullName instanceof Map)||typeof servicePath!=='function'||typeof esc!=='function')
  throw Error('Gangwon guide requires existing authoritative legal regions and HTML escaping');
 const legal=regions.filter(r=>r.full_name.startsWith(PROVINCE+' ')&&['시','군'].includes(r.level));
 if(legal.length!==18||raw.items.length!==18)throw Error('Gangwon source must cover all 18 official cities and counties');
 const byRegion=new Map();
 for(const entry of raw.items){
  const r=regionByFullName.get(entry.region);
  if(!r||!['시','군'].includes(r.level)||!r.full_name.startsWith(PROVINCE+' ')||byRegion.has(entry.region))
   throw Error('Unknown, duplicate or mislocated Gangwon guide: '+entry.region);
  if(!Array.isArray(entry.attractions)||entry.attractions.length<3||
   entry.attractions.some(x=>typeof x!=='string'||x.length<2)||
   ['food','lodging','golf','longDistance'].some(k=>typeof entry[k]!=='string'||entry[k].length<8)||
   typeof entry.pickup!=='string'||entry.pickup.length<35)
   throw Error('Insufficient distinctive tourist daeri source: '+entry.region);
  if(!entry.pickup.includes('주차')&&!entry.pickup.includes('차량'))throw Error('Missing pickup conditions: '+entry.region);
  byRegion.set(entry.region,Object.freeze({...entry,url:servicePath(r,'daeri')}));
 }
 if(legal.some(r=>!byRegion.has(r.full_name)))throw Error('Missing Gangwon municipality from 18-source list');
 const regionName=region=>region.name.replace(/[시군]$/,'');
 function municipality(entry,region){
  const short=regionName(region);
  const service=short+'대리운전';
  const attractions=entry.attractions.map(x=>esc(x+'대리운전')).join(' · ');
  return '<section id="gangwon-municipal-tourism-daeri-20261122" aria-label="'+esc(region.full_name)+' 관광지·맛집·숙박·골프·장거리 대리운전">'+
   '<h2>'+esc(short)+'대리운전 | 관광지·유원지·맛집 주변 예약</h2>'+
   '<p>'+esc(region.full_name)+'에서 '+attractions+' 등을 찾는 경우 실제 차량을 세운 장소를 기준으로 상담합니다. 관광지 이름은 출발 위치를 찾기 위한 참고 지명이지 해당 장소의 기사 상주나 특정 업체와의 제휴를 뜻하지 않습니다.</p>'+
   '<p><strong>'+esc(short)+' 관광지 차량 인수 확인:</strong> '+esc(entry.pickup)+'</p>'+
   '<h3>'+esc(short)+' 맛집·식당가 대리운전</h3><p>'+esc(entry.food)+'에서 식사 후 출발하는 경우 방문한 식당과 실제 차량 주차장이 다를 수 있으므로 차키를 가진 분과 주차장 출구를 지정해 주세요. 음식점의 영업 여부·예약·제휴는 별도 확인이 필요합니다.</p>'+
   '<h3>'+esc(short)+' 호텔·펜션·리조트 대리운전</h3><p>'+esc(entry.lodging)+' 방문객은 체크아웃 시각보다 차량 출발 희망시각과 숙소 주차장 진출입 방법을 우선 확인해야 합니다. 호텔·펜션 안내는 객실 운영·제휴·대리기사 상주를 보장하는 광고가 아닙니다.</p>'+
   '<h3>'+esc(short)+' 골프장·골프모임 대리운전</h3><p>'+esc(entry.golf)+'이 필요합니다. 골프장 라운딩 종료 뒤 식당에서 출발한다면 기사 방문 주소가 달라지므로 차량별 목적지·주차위치·동시출발 시각을 구분해 상담하세요.</p>'+
   '<h3>'+esc(short)+' 장거리대리운전·심야 예약</h3><p>'+esc(region.full_name)+'에서 '+esc(entry.longDistance)+' 장거리대리운전을 문의할 때는 차량이 있는 장소, 출발 날짜·시각, 목적지·경유지, 차종과 동승 인원을 정확히 알려주세요. 산간·해안·심야 출발은 기사 접근 및 운행 후 복귀 조건에 따라 요금과 배차 가능 여부가 달라집니다.</p>'+
   '<nav aria-label="'+esc(service)+' 예약·고객 안내"><a href="/service/long-distance-daeri/">장거리대리운전 이용 방법</a> · <a href="/service/golf/">골프장대리운전·일일기사</a> · <a href="/fare/?service=daeri&amp;from='+encodeURIComponent(region.full_name)+'">출발·도착 예상요금</a> · <a href="tel:18114294">1811-4294 상담</a></nav>'+
   '<p>실제 완료 운행후기·거리·확정요금·기사 실시간 위치는 이 관광 안내에서 생성하지 않습니다. 확인된 사례는 <a href="/reviews/history/?kind=daeri">기존 운행기록</a>에서 별도로 확인하세요.</p></section>';
 }
 function province(r){
  const links=[...byRegion.values()].map(entry=>{
   const name=entry.region.split(' ').at(-1);
   const short=name.replace(/[시군]$/,'');
   return '<li><a href="'+esc(entry.url)+'"><strong>'+esc(short+'대리운전·'+short+'장거리대리운전')+'</strong></a> — '+esc(entry.attractions.slice(0,2).join('·'))+
    ' 관광지, '+esc(entry.food)+' / 호텔·펜션·골프장 예약 조건 확인</li>';
  }).join('');
  return '<section id="gangwon-eighteen-tourism-daeri-20261122" aria-label="강원특별자치도 18개 시군 관광지 맛집 호텔 펜션 골프장 대리운전">'+
   '<h2>강원도대리운전 18개 시·군 | 관광지·맛집·호텔·펜션·골프장·장거리대리운전</h2>'+
   '<p>춘천·원주·강릉·속초·양양부터 동해·삼척·평창·정선 및 강원 전역 18개 시·군의 기존 지역 서비스 안내를 연결합니다. 관광지 주변의 저녁 식사와 호텔·리조트·펜션 숙박, 골프장 라운딩 후 귀가, 다른 시·도까지 장거리 운행은 각각 출발 위치와 기사 복귀 조건이 다릅니다.</p>'+
   '<p>아래 명소·식당가는 실제 출발지를 확인하기 위한 지역 정보입니다. 업체 제휴·상주기사·현재 영업 상태·실제 완료 운행이 확인됐다는 의미는 아니며, 요금과 배차는 출발·도착지 확인 후 안내합니다.</p>'+
   '<ul>'+links+'</ul>'+
   '<p><a href="/service/long-distance-daeri/">전국 장거리대리운전 안내</a> · <a href="/service/golf/">골프장·일일기사 안내</a> · <a href="/fare/?service=daeri">장거리 예상요금 조회</a> · <a href="https://www.gangwon.to/gwtour/" rel="noopener noreferrer" target="_blank">강원관광 공식 관광지 안내</a></p></section>';
 }
 function regionSection(region,kind){
  if(kind!=='daeri'||!region)return '';
  if(region.full_name===PROVINCE&&region.level==='시도')return province(region);
  const entry=byRegion.get(region.full_name);
  return entry?municipality(entry,region):'';
 }
 return Object.freeze({regionSection,byRegion,sourceCount:byRegion.size});
}
module.exports={create};
