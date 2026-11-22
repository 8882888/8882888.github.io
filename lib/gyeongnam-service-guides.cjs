'use strict';
// Locality-specific, service-distinct original guidance for the existing Gyeongnam URLs.
// The source is not proof of completed rides, prices, partnerships or driver availability.
const source=require('../data/gyeongnam-service-guides-18-20261122.json');
const PROVINCE='경상남도';

function create({regions,regionByFullName,servicePath,esc}){
 if(!Array.isArray(regions)||!(regionByFullName instanceof Map)||typeof servicePath!=='function'||typeof esc!=='function')
  throw Error('Gyeongnam guides require canonical legal regions and HTML escaping');
 const municipalities=regions.filter(r=>r.full_name.startsWith(PROVINCE+' ')&&['시','군'].includes(r.level));
 if(municipalities.length!==18||source.items.length!==18)
  throw Error('Gyeongnam guide coverage must match the 18 official municipalities');
 const byRegion=new Map(),canonicalPaths=new Set();
 for(const item of source.items){
  const region=regionByFullName.get(item.region);
  if(!region||!['시','군'].includes(region.level)||byRegion.has(item.region))
   throw Error('Invalid, duplicate or misplaced Gyeongnam municipality '+item.region);
  if(!Array.isArray(item.areas)||item.areas.length<3||item.areas.length>6||
   !Array.isArray(item.directions)||item.directions.length<2||
   ['daeri','taksong'].some(kind=>typeof item[kind]!=='string'||item[kind].length<75))
   throw Error('Incomplete independently written local service information '+item.region);
  const localAreas=item.areas.map(name=>{
   const matches=regions.filter(r=>r.name===name&&r.full_name.startsWith(region.full_name+' '));
   if(matches.length!==1||!['구','동','읍','면'].includes(matches[0].level))
    throw Error('Area does not resolve to one authoritative Gyeongnam service URL: '+item.region+' '+name);
   return matches[0];
  });
  if(new Set(localAreas.map(r=>r.full_name)).size!==localAreas.length)
   throw Error('Duplicate local-area link '+item.region);
  const row=Object.freeze({...item,localAreas,region});
  byRegion.set(item.region,row);
  for(const kind of ['taksong','daeri'])canonicalPaths.add(servicePath(region,kind));
 }
 if(municipalities.some(r=>!byRegion.has(r.full_name)))throw Error('Missing Gyeongnam city or county');
 const province=regionByFullName.get(PROVINCE);
 if(!province||province.level!=='시도')throw Error('Missing canonical Gyeongnam province');
 for(const kind of ['taksong','daeri'])canonicalPaths.add(servicePath(province,kind));
 const short=r=>r.name.replace(/[시군]$/,'');
 const label=kind=>kind==='taksong'?'탁송':'대리운전';

 function municipality(row,kind){
  const r=row.region,place=short(r),service=label(kind),other=kind==='taksong'?'daeri':'taksong';
  const topic=kind==='taksong'?'자동차탁송·로드탁송·장거리 차량이동':'대리운전·장거리대리운전·골프장대리운전';
  const areas=row.localAreas.map(x=>'<li><a href="'+esc(servicePath(x,kind))+'">'+esc(x.name+service)+'</a> — '+esc(x.full_name)+' 출발 위치·예약 안내</li>').join('');
  const directions=row.directions.join('·');
  const advice=kind==='taksong'
   ?'<h3>'+esc(place)+' 중고차·렌터카·정비소 로드탁송</h3><p>차량이 정상 운행 가능한지, 출고 승인과 주차장 출입 가능시간, 차종, 차량 키 전달자와 도착지 인수자를 확인해야 합니다. 로드탁송은 기사가 차량을 직접 운행하는 방식이며, 별도 차량 운송 방식이 필요한 상황은 상담 후 구분합니다.</p>'
   :'<h3>'+esc(place)+' 법인·골프장·장거리 대리운전</h3><p>골프장 라운딩 종료 뒤 식당에서 이동한다면 차량이 있는 주차장과 고객이 기다리는 장소를 구분합니다. 법인·단체 여러 대를 요청할 경우 차량마다 출발지와 목적지, 출발 희망시간을 별도로 알려주세요. 외곽 심야 운행은 기사 복귀 여건을 확인해야 합니다.</p>';
  const preparation=kind==='taksong'
   ?'차량을 누가 인수하고 어디에서 누가 인계받나요? 정확한 출발 주차장·도착지·인수 가능시각·차량 상태를 알려주세요.'
   :'기사와 어디에서 만나며 언제 출발하나요? 차량이 있는 주차장·주차층·희망시각·최종 목적지를 알려주세요.';
  return '<section id="gyeongnam-local-service-guide-20261122" aria-label="'+esc(r.full_name+' '+topic)+'">'+
   '<h2>'+esc(place+service+' | '+topic+' 지역별 예약 안내')+'</h2>'+
   '<p>'+esc(r.full_name)+' 안에서도 '+esc(row.localAreas.map(x=>x.name).join('·'))+' 등 출발지에 따라 기사 접근과 차량 인수 조건이 달라집니다. 지역명은 서비스 상담을 위한 위치 정보이며 상주기사·지점·제휴를 의미하지 않습니다.</p>'+
   '<h3>'+esc(place+service+' 지역별 출발·인계 확인')+'</h3><p>'+esc(row[kind])+'</p>'+
   advice+
   '<h3>'+esc(place+' 읍·면·동별 '+service+' 바로가기')+'</h3><ul>'+areas+'</ul>'+
   '<h3>'+esc(place+'에서 다른 지역으로 이동하는 장거리 '+service)+'</h3><p>'+esc(directions)+' 방면은 목적지 예시이며 실제 완료 운행 사례나 확정 요금이 아닙니다. 정확한 출발·도착지, 예약시간, 차종, 통행료, 기사 접근·복귀 조건에 따라 요금과 가능 여부를 확인합니다.</p>'+
   '<h3>'+esc(place+service+' 예약 전에 자주 묻는 질문')+'</h3><dl><dt>어떤 정보를 준비하나요?</dt><dd>'+esc(preparation)+'</dd><dt>기존 운행요금이나 예상요금이 그대로 적용되나요?</dt><dd>기록 당시 요금과 현재 견적은 다르며, 홈페이지 조회도 확정요금이나 즉시 배차 보증이 아닙니다.</dd></dl>'+
   '<nav aria-label="'+esc(r.name+' '+service+' 관련 안내')+'"><a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(r.full_name)+'">'+esc(place+service+' 예상요금 조회')+'</a> · '+
   '<a href="'+(kind==='taksong'?'/service/long-distance-taksong/':'/service/long-distance-daeri/')+'">'+esc('장거리'+service+' 이용안내')+'</a> · '+
   '<a href="'+(kind==='taksong'?'/business/used-car/':'/service/golf/')+'">'+esc(kind==='taksong'?'중고차 탁송 안내':'골프장 대리운전 안내')+'</a> · '+
   '<a href="'+esc(servicePath(r,other))+'">'+esc(place+label(other))+'</a> · '+
   '<a href="'+esc(servicePath(province,kind))+'">'+esc('경남 '+service+' 18개 시·군')+'</a> · '+
   '<a href="tel:18114294">1811-4294 상담</a></nav>'+
   '<p>아래 지역 정보는 상담 안내로 작성했습니다. 확인되지 않은 운행완료 후기·주행거리·요금을 생성하지 않으며 실제 완료 기록은 <a href="/reviews/history/?kind='+kind+'&amp;q='+encodeURIComponent(place)+'">원본 운행기록 검색</a>에서 따로 확인합니다.</p></section>';
 }
 function provinceHub(kind){
  const service=label(kind),title=kind==='taksong'?'경남탁송·경상남도자동차탁송':'경남대리운전·경상남도대리운전';
  const rows=[...byRegion.values()].map(x=>{
   const place=short(x.region);
   return '<li><a href="'+esc(servicePath(x.region,kind))+'"><strong>'+esc(place+service)+'</strong></a> — '+
    esc(x.localAreas.slice(0,3).map(r=>r.name).join('·'))+' 출발·'+esc(kind==='taksong'?'차량 인계':'장거리 귀가')+' 안내</li>';
  }).join('');
  const changwon=byRegion.get('경상남도 창원시');
  const districtLinks=changwon.localAreas.map(r=>'<a href="'+esc(servicePath(r,kind))+'">'+esc(r.name+service)+'</a>').join(' · ');
  return '<section id="gyeongnam-eighteen-service-hub-20261122" aria-label="'+esc(title+' 18개 시군')+'">'+
   '<h2>'+esc(title+' | 경상남도 18개 시·군 '+service+' 안내')+'</h2>'+
   '<p>창원·김해·진주·양산·거제·통영·사천·밀양과 경남 10개 군을 기존 공식 지역 서비스 URL로 연결합니다. 시내 이동·장거리 운행·외곽 예약은 출발 주차장 위치 및 기사 접근·복귀 여건을 각각 확인해야 합니다.</p>'+
   '<p>'+esc(kind==='taksong'?'중고차 거래, 정비소·서비스센터, 렌터카 반환, 정상 운행 가능한 차량의 로드탁송은 인수·인계 담당자와 일정이 중요합니다.':'법인·단체, 골프장, 맛집·숙박시설 모임 뒤 대리운전은 출발 시간·주차장·차량별 도착지를 구분해야 합니다.')+'</p>'+
   '<h3>경남 18개 시·군 '+esc(service)+' 지역별 안내</h3><ul>'+rows+'</ul>'+
   '<h3>창원 5개 구 '+esc(service)+'</h3><p>'+districtLinks+'</p>'+
   '<p>안내 지역은 배차 상담을 위한 행정구역이며 기사 상주·지점·개별 업체와의 제휴나 실제 완료 운행을 뜻하지 않습니다. 실제 요금·배차 가능 여부는 출발지·도착지와 예약시각 확인 뒤 안내합니다.</p>'+
   '<p><a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(PROVINCE)+'">경남 '+esc(service)+' 예상요금 조회</a> · <a href="/region/">읍·면·동 검색</a> · <a href="tel:18114294">상담 1811-4294</a></p></section>';
 }
 function regionSection(region,kind){
  if(!region||!['taksong','daeri'].includes(kind))return '';
  if(region.full_name===PROVINCE)return provinceHub(kind);
  const row=byRegion.get(region.full_name);
  return row?municipality(row,kind):'';
 }
 return Object.freeze({regionSection,canonicalPaths:[...canonicalPaths],sourceCount:byRegion.size});
}
module.exports={create};
