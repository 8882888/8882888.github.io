'use strict';
// Five existing canonical regional hubs. Service-intent copy is specific to each city
// and is never offered as evidence of a completed trip or current driver availability.
const CONFIG=Object.freeze({
 '부산광역시':{
  short:'부산',alias:'부산시',pickup:'서면·해운대·광안리·기장',
  areas:['부산광역시 부산진구','부산광역시 해운대구','부산광역시 수영구','부산광역시 강서구','부산광역시 기장군'],
  daeri:'서면과 해운대 상권은 차량을 주차한 건물·출입구를 먼저 확인합니다. 광안리 식사 후 귀가와 기장 방면 이동은 출발 시각·경유지·기사 복귀 조건을 구분해야 합니다.',
  taksong:'부산항·감만동 출고 차량은 반출 허가 담당자·차량 보관 구역·인수 가능 시간을 확인합니다. 연산동·해운대·기장 차량은 주차장 출입과 도착지 수령자·열쇠 전달 조건을 따로 확인합니다.',
  driverTitle:'부산대리운전 | 서면·해운대·광안리 예약·예상요금',
  rideTitle:'부산탁송 실제 운행후기 | 연산동·부산항·장거리 요금',
  taksongTitle:'부산탁송 | 연산동·부산항 차량 인수·장거리 요금',
  driverDescription:'부산대리운전·부산시대리운전. 서면·해운대·광안리·기장 출발 심야·법인·장거리 예약과 예상요금. 상담 1811-4294.',
  taksongDescription:'부산탁송·부산시탁송. 연산동·해운대·부산항 차량 인수·인계와 장거리 예상요금, 완료기록 확인. 상담 1811-4294.'
 },
 '울산광역시':{
  short:'울산',alias:'울산시',pickup:'삼산동·성남동·방어진·언양',
  areas:['울산광역시 남구','울산광역시 중구','울산광역시 동구','울산광역시 북구','울산광역시 울주군'],
  daeri:'삼산동과 성남동의 식사·업무시설은 실제 주차 위치와 만날 출입구를 구분합니다. 방어진·언양 등 외곽 목적지는 야간 출발 시각과 기사 복귀 조건을 함께 확인합니다.',
  taksong:'온산·언양 산업시설 출고 차량은 승인 담당자·반출 시간·주행 가능 상태를 먼저 확인합니다. 방어진·달천 등 동구·북구 출발 차량은 주차 위치와 열쇠 전달·도착지 수령 시각을 확인합니다.',
  driverTitle:'울산대리운전 | 삼산동·방어진·언양 심야·장거리 예약',
  rideTitle:'울산탁송 실제 운행기록 | 온산·방어진·언양 요금',
  taksongTitle:'울산탁송 | 온산·방어진 차량 인수·장거리 요금',
  driverDescription:'울산대리운전·울산시대리운전. 삼산동·성남동·방어진·언양 출발 심야·장거리 예약, 예상요금 상담 1811-4294.',
  taksongDescription:'울산탁송·울산시탁송. 온산·언양 출고와 방어진·달천 차량 인수·인계, 장거리 요금·운행기록 안내. 상담 1811-4294.'
 },
 '경상남도 창원시':{
  short:'창원',alias:'창원시',pickup:'상남동·중앙동·마산·진해',
  areas:['경상남도 창원시 의창구','경상남도 창원시 성산구','경상남도 창원시 마산합포구','경상남도 창원시 마산회원구','경상남도 창원시 진해구'],
  daeri:'상남동 식당가·중앙동 업무시설 출발은 주차층과 출입구를 확인합니다. 마산합포구·마산회원구·진해구는 출발 지역과 이동 거리가 달라 야간·골프장·법인 단체 예약 시 차량별 목적지를 구분합니다.',
  taksong:'성산구 산업시설과 진해구 항만 인접 차량은 출입 허가·보관 장소를, 마산권 정비·중고차 출고 차량은 담당자·키·서류 인계 시각을 구분합니다. 부산·김해 방면 목적지 인계 가능 시간을 확인합니다.',
  driverTitle:'창원대리운전 | 상남동·마산·진해 심야·골프장 예약',
  rideTitle:'창원탁송 실제 운행후기 | 성산·마산·진해 인수·요금',
  taksongTitle:'창원탁송 | 성산·마산·진해 차량 인수·요금',
  driverDescription:'창원대리운전·창원시대리운전. 상남동·중앙동·마산·진해 출발 심야·골프장·법인 예약과 예상요금. 1811-4294.',
  taksongDescription:'창원탁송·창원시탁송. 성산구 산업시설·마산 정비소·진해 차량 인수·인계와 부산·김해 방면 요금 상담 1811-4294.'
 },
 '경상남도 양산시':{
  short:'양산',alias:'양산시',pickup:'물금읍·동면·평산동·하북면',
  areas:['경상남도 양산시 물금읍','경상남도 양산시 동면','경상남도 양산시 평산동','경상남도 양산시 하북면','경상남도 양산시 원동면'],
  daeri:'물금읍·동면 상권과 평산동 주거지 출발은 실제 차량 주차장을 구분합니다. 하북면·원동면 관광지·숙박시설에서 부산·울산 방향으로 이동할 때는 희망 출발 시각과 기사 복귀 여건을 확인합니다.',
  taksong:'물금읍 주거·상업시설과 동면·평산동 출고 차량은 지하주차장 출입 방법을 확인합니다. 하북면·원동면 외곽 차량은 인수 시각·정상 주행 가능 여부와 부산·울산 방면 인계 위치를 확인합니다.',
  driverTitle:'양산대리운전 | 물금·동면·평산동·하북면 예약·요금',
  rideTitle:'양산탁송 실제 운행기록 | 물금·동면·평산동 요금',
  taksongTitle:'양산탁송 | 물금·동면·하북면 차량 인수·요금',
  driverDescription:'양산대리운전·양산시대리운전. 물금읍·동면·평산동·하북면 출발 심야·장거리 예약과 예상요금. 상담 1811-4294.',
  taksongDescription:'양산탁송·양산시탁송. 물금읍·동면·평산동 차량 인수·정비 출고, 부산·울산 방면 장거리 요금 상담 1811-4294.'
 },
 '부산광역시 기장군':{
  short:'기장군',alias:'부산기장',pickup:'기장읍·정관읍·일광읍·장안읍',
  areas:['부산광역시 기장군 기장읍','부산광역시 기장군 정관읍','부산광역시 기장군 일광읍','부산광역시 기장군 장안읍','부산광역시 기장군 철마면'],
  daeri:'기장읍 식당가·일광읍 해안권·정관읍 주거시설은 차량이 있는 주차장과 출발 시각을 따로 확인합니다. 장안읍·철마면 외곽 출발과 부산·울산 방면 장거리 이동은 기사 복귀 조건에 따라 예약 여건이 달라집니다.',
  taksong:'기장읍·정관읍·일광읍 출고 차량은 건물·주차층·열쇠 담당자를 구분합니다. 장안읍·철마면 외곽과 정비센터·개인 간 중고차 인계는 차량 상태와 출고 승인·도착지 수령 시간을 확인합니다.',
  driverTitle:'기장군대리운전 | 정관·일광·기장읍 예약·요금',
  rideTitle:'기장군탁송 실제 운행후기 | 정관·일광·장거리 요금',
  taksongTitle:'기장군탁송 | 정관·일광·기장읍 차량 인수·요금',
  driverDescription:'기장군대리운전·부산기장대리운전. 정관읍·일광읍·기장읍·장안읍 출발 예약·장거리 예상요금. 1811-4294.',
  taksongDescription:'기장군탁송·부산기장탁송. 정관읍·일광읍·기장읍 차량 인수·중고차 인계와 장거리 예상요금 상담 1811-4294.'
 }
});
const FIVE=Object.freeze(Object.keys(CONFIG));
function create({regionByFullName,servicePath,esc}){
 if(!(regionByFullName instanceof Map)||typeof servicePath!=='function'||typeof esc!=='function')throw Error('Five-city SEO requires real locality index and safe rendering');
 for(const full of FIVE){
  const cfg=CONFIG[full];
  if(!regionByFullName.has(full))throw Error('Missing target legal region '+full);
  if(cfg.driverDescription.length>80||cfg.taksongDescription.length>80)throw Error('Meta must stay concise in '+full);
  for(const area of cfg.areas)if(!regionByFullName.has(area))throw Error('Invalid local service URL for '+area);
 }
 const isValidKind=kind=>kind==='taksong'||kind==='daeri';
 function meta(region,kind,{hasEvidence=false}={}){
  const cfg=CONFIG[region?.full_name];
  if(!cfg||!isValidKind(kind))return null;
  return kind==='daeri'?{title:cfg.driverTitle,description:cfg.driverDescription}
   :{title:hasEvidence?cfg.rideTitle:cfg.taksongTitle,description:cfg.taksongDescription};
 }
 function section(region,kind,{hasEvidence=false}={}){
  const cfg=CONFIG[region?.full_name];if(!cfg||!isValidKind(kind))return '';
  const isT=kind==='taksong',label=isT?'탁송':'대리운전';
  const local=cfg.areas.map(full=>regionByFullName.get(full))
   .map(r=>'<a href="'+esc(servicePath(r,kind))+'">'+esc(r.name+label)+'</a>').join(' · ');
  const related=FIVE.filter(full=>full!==region.full_name).map(full=>{
   const r=regionByFullName.get(full);
   return '<a href="'+esc(servicePath(r,kind))+'">'+esc(CONFIG[full].short+label)+'</a>';
  }).join(' · ');
  const body=isT?'<h3>'+esc(cfg.short)+'탁송: 실제 차량 인수·인계 준비</h3><p>'+esc(cfg.taksong)+'</p>'+
   '<p>자동차탁송·장거리탁송·서비스센터 입출고·중고차 차량 이동은 차종과 정상 주행 가능 여부, 인수 담당자, 키 전달 방법이 다릅니다. 출발지와 목적지를 확인하고 도로거리 예상요금을 조회하세요. 카캐리어·적재 운송은 로드탁송과 구분해야 합니다.</p>'+
   (hasEvidence?'<p><strong>실제 완료 운행기록이 연결된 지역입니다.</strong> 아래에 공개된 출발→도착·운행일·당시 요금과 운행기록 원문을 함께 확인하세요. 과거 금액으로 오늘 배차를 확약하지 않습니다.</p>':
    '<p>해당 지역의 공개 완료 운행 여부는 원본 기록 검색에서 확인하세요. 검색 키워드만으로 운행후기나 실제 주행거리(km)를 만들어 표시하지 않습니다.</p>')
   :'<h3>'+esc(cfg.short)+'대리운전: 출발 위치·심야·장거리 예약</h3><p>'+esc(cfg.daeri)+'</p>'+
    '<p>일반대리운전·법인대리운전·골프장대리운전·장거리대리운전의 접수 방식은 다릅니다. 출발 주차장과 목적지·희망 시각을 준비하고 기사 수급·복귀 조건을 상담해 주세요. 해당 지역 상주기사나 즉시배차를 보장하지 않습니다.</p>';
  const archive='/reviews/history/?kind='+kind+'&amp;q='+encodeURIComponent(cfg.short);
  const fare='/fare/?service='+kind+'&amp;from='+encodeURIComponent(region.full_name);
  return '<section id="southeast-five-intent-seo-20261123" aria-label="'+esc(cfg.short+label+' 지역별 이용 안내')+'">'+
   '<h2>'+esc(cfg.short+label+' | '+cfg.pickup+' 출발·'+(isT?'완료 기록·차량 인계':'심야·장거리 예약'))+'</h2>'+
   '<p>'+esc(cfg.short+label+'·'+cfg.alias+label)+' 검색자는 '+esc(region.full_name)+' 내에서도 출발지가 다르므로 '+esc(cfg.pickup)+' 등 실제 차량 위치부터 확인해야 합니다.</p>'+
   body+
   '<h3>'+esc(cfg.short+' 세부 지역 '+label)+' 안내</h3><nav aria-label="'+esc(cfg.short+' 공식 세부 지역 서비스 경로')+'"><p>'+local+'</p></nav>'+
   '<h3>부산·울산·창원·양산·기장 인접 지역 '+esc(label)+' 연결</h3><nav aria-label="동남권 시군구 서비스 연결"><p>'+related+'</p></nav>'+
   '<p><a href="'+fare+'">'+esc(cfg.short+label+' 출발·도착 예상요금 조회')+'</a> · <a href="'+archive+'">'+(isT?'실제 완료 탁송기록 확인':'완료 대리운전 기록 참고')+'</a> · <a href="tel:18114294">대표 상담 1811-4294</a></p>'+
   '<p><small>지역 안내는 특정 업체 제휴·기사 상주·즉시 배차 확약이 아닙니다. 최종 금액과 가능 여부는 상담으로 확인합니다.</small></p></section>';
 }
 return Object.freeze({meta,section,regions:FIVE});
}
function approvedDescription(region,kind){
 const cfg=CONFIG[region];if(!cfg)return null;
 return kind==='daeri'?cfg.driverDescription:kind==='taksong'?cfg.taksongDescription:null;
}
module.exports={create,approvedDescription};
