'use strict';
// Focused, non-fabricated customer guidance for EXISTING Haeundae canonical URLs.
// No new doorway pages, dispatch promises, completed rides, prices, route km or branch claims.
const AREAS=Object.freeze({
 '부산광역시 해운대구':{
  short:'해운대구',places:'해운대해수욕장·구남로·센텀시티·마린시티·장산역·송정해수욕장',
  daeri:{
   title:'해운대구대리운전 | 해운대·센텀시티 법인·장거리 예약',
   desc:'부산 해운대구대리운전. 해운대해수욕장·센텀시티·마린시티 출발, 법인·골프장·장거리 대리운전 예상요금과 예약 상담 1811-4294.',
   scene:'해운대해수욕장·구남로 식당가와 해리단길에서 출발할 때는 고객의 위치와 차량 주차장을 구분합니다. 벡스코·센텀시티 행사 종료 후에는 주차층, 출입구, 차량 대수와 출발 희망시각을 함께 확인합니다.',
   purpose:'법인 회식·행사 차량 여러 대는 각 차량의 목적지, 법인 결제 승인, 종료 시각을 개별 확인합니다. CEO·임원 수행, 고급차 운전, 골프장 라운딩 후 귀가는 편도 대리운전과 왕복·대기형 일일기사 중 필요한 방식을 구분합니다.'
  },
  taksong:{
   title:'해운대구탁송 | 부산해운대 로드탁송·정비출고·장거리',
   desc:'부산 해운대구탁송. 우동·좌동·센텀시티 차량 인수·정비 출고·중고차·렌트카·법인 로드탁송, 장거리 예상요금 1811-4294.',
   scene:'센텀시티 업무시설, 우동·중동 호텔 주차장과 좌동·재송동 공동주택의 차량 인수 위치는 서로 다릅니다. 정비센터 입출고나 중고차 거래는 인계 담당자와 출고 승인을 먼저 확인하세요.',
   purpose:'렌트카·사고대차·수입차 서비스센터·법인 차량 회송은 차량 상태, 차종, 차량 키 인계와 수령 시각을 확인합니다. 화물차·버스는 정상 주행 가능 상태와 운전자 자격·보험·차량 규격에 따라 별도 상담합니다.'
  }
 },
 '부산광역시 해운대구 우동':{
  short:'우동',places:'센텀시티·벡스코·마린시티·해운대역',
  daeri:{title:'우동대리운전 | 센텀시티·마린시티 법인·장거리',desc:'부산 해운대 우동대리운전. 벡스코·센텀시티·마린시티 출발, 법인 회식·고급차·장거리 대리운전 예약 1811-4294.',scene:'벡스코 행사나 센텀시티 업무 모임은 행사장 출구와 실제 차량 주차장 입구가 다를 수 있습니다. 마린시티 지하주차장은 건물명과 주차층까지 확인해 주세요.',purpose:'법인·단체 차량은 각 차량별 출발 시각, 목적지, 결제 방법을 구분해 접수합니다.'},
  taksong:{title:'우동탁송 | 센텀시티·마린시티 법인차량 인수',desc:'부산 우동탁송. 센텀시티·마린시티 업무용 차량·수입차·정비센터 인수와 장거리 로드탁송 예약 1811-4294.',scene:'센텀 업무시설과 마린시티 아파트·호텔 주차장에서 차량을 인수할 때는 주차층, 반출 권한과 키 전달자를 확인해야 합니다.',purpose:'법인차량 회송·정비 출고·개인 간 차량 인계는 수령 담당자와 도착 시각을 확정한 뒤 상담합니다.'}
 },
 '부산광역시 해운대구 중동':{
  short:'중동',places:'해운대해수욕장·미포·달맞이길',
  daeri:{title:'중동대리운전 | 해운대해수욕장·미포·달맞이길',desc:'부산 해운대 중동대리운전. 해수욕장·미포·달맞이길 숙박·식사 후 심야·장거리 예약과 예상요금 1811-4294.',scene:'해운대해수욕장 동쪽과 미포·달맞이길은 골목과 언덕길이 있어 실제 주차장 출구 및 승차 위치를 미리 알려주세요.',purpose:'호텔·식당에서 숙소 또는 부산 외곽으로 귀가할 경우 최종 목적지와 경유·대기 여부를 확인합니다.'},
  taksong:{title:'중동탁송 | 해운대·미포 차량인수·정비출고',desc:'부산 해운대 중동탁송. 해운대해수욕장·미포·달맞이길 차량 인수·인계, 정비 출고와 장거리 로드탁송 1811-4294.',scene:'미포·달맞이길 주변 숙박시설 주차장이나 상가 출고는 실제 차량 보관 위치, 통행 가능 진입로를 확인해 주세요.',purpose:'운행 가능한 차량의 인수·인계 시간과 수령 담당자, 기사 복귀 조건을 구분해 상담합니다.'}
 },
 '부산광역시 해운대구 좌동':{
  short:'좌동',places:'장산역·좌동 신시가지·장산 상권',
  daeri:{title:'좌동대리운전 | 장산역·신시가지 심야·장거리',desc:'부산 좌동대리운전. 장산역·좌동 신시가지 식당가 출발 심야·법인·장거리 예약과 예상요금 1811-4294.',scene:'장산역과 좌동 신시가지 상가 출발 시에는 같은 건물에서도 주차장 출입구가 다를 수 있어 출차 위치를 먼저 확인합니다.',purpose:'기장·양산·울산 등 부산 밖 이동은 도착지와 기사 복귀 조건을 포함해 상담합니다.'},
  taksong:{title:'좌동탁송 | 장산역·신시가지 차량인수·장거리',desc:'부산 좌동탁송. 장산역·좌동 신시가지 차량 인수, 중고차·정비소 입출고와 장거리 로드탁송 상담 1811-4294.',scene:'좌동 신시가지 주거단지의 차량 인수는 동·출입구·주차층을 명확하게 지정해야 합니다.',purpose:'정비소 입출고와 개인 간 중고차 탁송은 운행 가능 여부, 차키 인수자 및 목적지 수령 시간을 확인합니다.'}
 },
 '부산광역시 해운대구 재송동':{
  short:'재송동',places:'센텀 인접 업무지구·재송동 주거지역',
  daeri:{title:'재송동대리운전 | 센텀 업무지구 법인·심야',desc:'부산 재송동대리운전. 센텀 인접 업무시설·재송동 회식 후 법인·심야·장거리 대리운전 예약 1811-4294.',scene:'센텀 인접 업무시설과 재송동 상가는 주차구역과 출차 동선이 다르므로 실제 차량 위치를 확인합니다.',purpose:'퇴근 후 법인·단체 예약은 차량 수와 목적지, 결제 및 출발 순서를 구분합니다.'},
  taksong:{title:'재송동탁송 | 센텀 업무용차·정비출고 인계',desc:'부산 재송동탁송. 센텀 인접 법인 차량·정비 출고·개인 차량 인수와 부산 외 장거리 로드탁송 1811-4294.',scene:'재송동 업무용차와 공동주택 차량의 이동은 출입 가능 시간, 키 담당자와 주차장 위치를 확인합니다.',purpose:'법인차량 회송·정비시설 출고는 승인 담당자와 도착지 차량 수령자를 먼저 지정해 주세요.'}
 },
 '부산광역시 해운대구 송정동':{
  short:'송정동',places:'송정해수욕장·송정역·해변 숙박시설',
  daeri:{title:'송정동대리운전 | 송정해수욕장·숙소 심야 예약',desc:'부산 송정동대리운전. 송정해수욕장·송정역 식당·숙박시설 출발 심야·장거리 대리운전 예약 1811-4294.',scene:'송정해수욕장 숙박시설·식당 출발은 해변도로 주변의 실제 차량 위치와 주차장 출구를 정확히 알려주세요.',purpose:'기장 방면 또는 타 시·도 장거리 귀가는 기사 접근 및 복귀편을 확인해 예약합니다.'},
  taksong:{title:'송정동탁송 | 송정해수욕장 차량 인수·장거리',desc:'부산 송정동탁송. 송정해수욕장·송정역 차량 인계와 정비 출고, 부산·울산 장거리 로드탁송 1811-4294.',scene:'송정해변 상가·숙소 주변에서는 차량이 보관된 주차 위치와 접근 가능한 진입로를 알려주세요.',purpose:'차량 인계 시간과 키 전달, 인수자 확인 후 장거리 운행 가능 여부를 상담합니다.'}
 },
 '부산광역시 해운대구 반여동':{
  short:'반여동',places:'반여동 주거지역·반여농산물도매시장 주변',
  daeri:{title:'반여동대리운전 | 주거지역·시장 주변 심야 예약',desc:'부산 반여동대리운전. 반여동 주거지역·농산물도매시장 주변 출발 심야·장거리 요금과 대리운전 예약 1811-4294.',scene:'반여동 상가와 주거단지는 같은 도로에서도 주차장 출구가 달라 실제 주차 위치와 건물명을 확인해 주세요.',purpose:'동래·센텀·기장 방면 또는 장거리 귀가는 도착지와 출발 시각을 우선 확인합니다.'},
  taksong:{title:'반여동탁송 | 차량 회송·정비소 입출고·장거리',desc:'부산 반여동탁송. 주거지·시장 주변 차량 인수와 정비소 입출고, 중고차·장거리 로드탁송 상담 1811-4294.',scene:'반여동 차량 보관 장소는 단지 출입 및 키 인계 방식이 서로 다르므로 정확한 주소와 인수 시각을 확인합니다.',purpose:'중고차 거래와 정비시설 차량 이동은 정상 운행 가능 여부와 수령 담당자를 확인합니다.'}
 },
 '부산광역시 해운대구 반송동':{
  short:'반송동',places:'반송역·반송동 주거지역',
  daeri:{title:'반송동대리운전 | 반송역·외곽 심야·장거리',desc:'부산 반송동대리운전. 반송역·반송동 주거지역 출발 심야·외곽·장거리 대리운전 예상요금 1811-4294.',scene:'반송동은 이동 목적지와 차량 주차 위치를 정확히 알려주어야 기사 접근 경로를 확인하기 쉽습니다.',purpose:'늦은 시간 외곽 출발이나 기장·양산 방면 이동은 기사 복귀 조건을 고려해 상담합니다.'},
  taksong:{title:'반송동탁송 | 외곽 차량인수·장거리 로드탁송',desc:'부산 반송동탁송. 반송역 주변 차량 인수·정비 출고와 기장·양산·울산 방면 장거리 로드탁송 상담 1811-4294.',scene:'반송동 주거지에서 차량 인수 시 진입로·주차 위치·출발 시각을 확인합니다.',purpose:'정비 출고나 장거리 이동은 정상 주행 가능 상태와 최종 인계 담당자가 필요합니다.'}
 },
 '부산광역시 해운대구 석대동':{
  short:'석대동',places:'석대동 업무·주거지역·센텀 인접 이동',
  daeri:{title:'석대동대리운전 | 해운대 외곽·장거리 예약',desc:'부산 석대동대리운전. 해운대 석대동 외곽 출발, 센텀·기장 방면 심야·장거리 대리운전 상담 1811-4294.',scene:'석대동 출발은 정확한 도로명 주소와 차량이 주차된 시설 출입구를 우선 확인합니다.',purpose:'외곽·심야 배차는 기사 접근과 복귀 여건에 따라 가능 시간과 요금이 달라질 수 있습니다.'},
  taksong:{title:'석대동탁송 | 해운대 차량인수·외곽 장거리',desc:'부산 석대동탁송. 해운대 석대동 차량 인수·정비소 출고와 기장·양산·울산 방면 장거리 로드탁송 1811-4294.',scene:'석대동에서 차량을 인수할 경우 위치와 담당자, 출입 가능 시각을 미리 확인해 주세요.',purpose:'차종과 주행 가능 상태, 기사 복귀 여건을 포함해 최종 견적을 확인합니다.'}
 }
});
const CONTACT='1811-4294';
function create({regionByFullName,servicePath,esc}){
 if(!(regionByFullName instanceof Map)||typeof servicePath!=='function'||typeof esc!=='function')throw Error('Haeundae SEO needs canonical region utilities');
 function meta(region,kind){
  const c=AREAS[region?.full_name]?.[kind];
  return c&&['daeri','taksong'].includes(kind)?{title:c.title,description:c.desc}:null;
 }
 function section(region,kind){
  const area=AREAS[region?.full_name],c=area?.[kind];
  if(!c||!['daeri','taksong'].includes(kind))return '';
  const isT=kind==='taksong',service=isT?'탁송':'대리운전';
  const fare='/fare/?service='+kind+'&amp;from='+encodeURIComponent(region.full_name);
  const history='/reviews/history/?kind='+kind+'&amp;q='+encodeURIComponent(region.full_name);
  const siblingLinks=Object.keys(AREAS).filter(full=>full!=='부산광역시 해운대구'&&(region.full_name==='부산광역시 해운대구'||full!==region.full_name)).map(full=>{
   const r=regionByFullName.get(full);return r?'<li><a href="'+esc(servicePath(r,kind))+'">'+esc(AREAS[full].short+service)+'</a></li>':'';
  }).filter(Boolean);
  const parent=regionByFullName.get('부산광역시 해운대구');
  const fromLabel=area.short+service;
  const routes=isT?'해운대 → 김해·양산·울산·대구·수도권 자동차탁송':'해운대 → 기장·김해·양산·창원·울산·대구 장거리대리운전';
  const serviceLinks=isT?
   [['정비·서비스센터 탁송','/service/taksong/'],['장거리 차량탁송','/service/long-distance-taksong/'],['화물차·특장차 종류별 탁송','/taksong/types/']]:
   [['법인대리운전','/service/corporate/'],['골프장대리운전','/service/golf/'],['일일기사·CEO 수행','/service/daily-driver/'],['장거리대리운전','/service/daeri/']];
  return '<section id="haeundae-customer-intent-20261124" aria-label="'+esc(region.full_name+' '+service+' 고객 이용 안내')+'">'+
   '<h2>'+esc(fromLabel+' | '+area.places+' 예약·요금 확인')+'</h2>'+
   '<p>'+esc(c.scene)+'</p><h3>'+esc(isT?'해운대 차량탁송·정비 출고·법인 차량 회송':'해운대 법인·CEO·골프장·심야 대리운전')+'</h3><p>'+esc(c.purpose)+'</p>'+
   '<h3>'+esc(routes)+' 구간 상담</h3><p>위 목적지는 실제 운행을 완료했다는 의미가 아닌 예약 문의 가능 구간의 예시입니다. 출발지·도착지, 이용 날짜·시각, 차종과 기사 복귀 조건에 따라 요금과 배차 가능 여부가 달라집니다. 운행거리(km)·고정요금·실시간 배차를 추정해 표시하지 않습니다.</p>'+
   '<p>'+serviceLinks.map(([label,url])=>'<a href="'+esc(url)+'">'+esc(label)+'</a>').join(' · ')+'</p>'+
   '<h3>'+esc(fromLabel+' 예상요금 및 실제 운행기록')+'</h3><p><a href="'+fare+'">출발·도착 주소로 현재 예상요금 조회</a> · <a href="'+history+'">출발·도착이 확인된 완료 운행기록 검색</a> · <a href="'+esc(servicePath(region,isT?'daeri':'taksong'))+'">이 지역 '+esc(isT?'대리운전':'자동차탁송')+' 안내</a> · <a href="tel:18114294">전화 상담 '+CONTACT+'</a></p>'+
   '<p>완료 운행기록이 없는 지역은 안내와 구분합니다. 과거 기록의 요금은 현재 확정 견적이 아닙니다.</p>'+
   (parent?'<h3>해운대구 생활권별 '+service+' 안내</h3><p><a href="'+esc(servicePath(parent,kind))+'">해운대구 대표 안내</a></p><ul>'+siblingLinks.join('')+'</ul>':'')+
   '</section>';
 }
 return Object.freeze({meta,section,regions:Object.keys(AREAS)});
}
module.exports={create};
