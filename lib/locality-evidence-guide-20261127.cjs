'use strict';
// Deterministic evidence-limited guidance for the existing editorial backlog.
// This is navigation and address disambiguation, NOT local ride evidence.
// Source-backed first remediation batch; public landmarks are not ride records.
const localSources={
  "서울특별시 은평구 불광동": {
    "source": "https://pts.map.naver.com/end-subway/ends/web/322/home",
    "name": "불광역 3·6호선 환승 안내",
    "daeri": "불광역 환승 구역에서 귀가를 요청할 때는 지하철 출구 번호만 전달하지 말고 차량이 정차 가능한 지상 도로와 탑승 장소를 구분해 주세요. 통일로 건너편에서 만나는 경우에는 고객과 기사가 같은 방향에 있는지 확인합니다.",
    "taksong": "불광역 주변 차량을 인수할 때는 통일로 접근 방향과 실제 주차장 입구를 먼저 확인합니다. 지하철 출구는 차량 인수 장소가 아니므로 주차 위치와 차키 전달 방식을 별도로 정합니다."
  },
  "부산광역시 남구 용당동": {
    "source": "https://www.busanpa.com/board/view.bpa?boardId=BBS_0000011&dataSid=5205&menuCd=DOM_000000102006001001&paging=ok&startPage=117",
    "name": "부산항만공사 신선대부두 위치 안내",
    "daeri": "신선대부두 인근에서 퇴근하거나 귀가할 때는 항만 출입구 안쪽인지 일반 도로에서 만날 수 있는지 먼저 알려 주세요. 출입 제한 구역이라면 허용된 외부 만남 장소와 실제 차량 위치를 확인합니다.",
    "taksong": "신선대부두 관련 차량 이동이라면 일반 도로 주차 차량인지 항만 내부 반출 차량인지 구분해야 합니다. 항만 출입 및 반출 권한은 고객 또는 담당 업체가 확인하며, 차량 제원과 인계 지점을 기준으로 육상 이동 견적을 문의할 수 있습니다."
  },
  "강원특별자치도 양양군 현남면": {
    "source": "https://tour.yangyang.go.kr/pub/yysea.do?sfld=hit",
    "name": "양양군 인구항·현남면 관광 안내",
    "daeri": "인구항 주변에서 귀가를 요청한다면 항구 방문 장소와 실제 차량을 세워 둔 숙소 또는 주차 장소가 같은지 확인해 주세요. 해안에서 출발해 다른 시군으로 이동할 때는 귀가 시간과 최종 하차지를 함께 알려 주시면 됩니다.",
    "taksong": "인구항과 인근 해변을 방문한 뒤 차량만 이동시키려면 항구명 대신 실제 차량이 있는 주차장이나 숙소 주소를 전달해 주세요. 주차장 출차 가능 여부와 열쇠 인계 방법을 확인한 뒤 목적지까지의 이동을 상담합니다."
  },
  "전북특별자치도 무주군 무주읍": {
    "source": "https://tour.muju.go.kr/tour/contents.do?key=155",
    "name": "무주군 반딧불장터 안내",
    "daeri": "무주반딧불장터 주변에서 귀가할 때는 시장 안 점포 이름보다 차량이 주차된 도로 쪽 위치를 먼저 확인합니다. 다른 읍면이나 인접 시군으로 이동한다면 최종 하차 주소를 예약 때 전달해 주세요.",
    "taksong": "무주반딧불장터 주변에서 차량 인수가 필요한 경우 시장 방문 장소와 실제 차고지를 구분합니다. 상가에 맡겨 둔 차량이면 보관자의 인계 동의와 차키 위치, 출차 조건을 확인한 뒤 차량 이동을 의뢰해 주세요."
  },
  "경상남도 김해시 내동": {
    "source": "https://access.visitkorea.or.kr/ms/detail.do?cotId=4eda0e4f-a05b-47aa-a019-ca51f00d6787",
    "name": "한국관광공사 연지공원 위치 안내",
    "daeri": "연지공원 방문 후 대리운전을 이용할 때는 산책로에서 기다리는 대신 실제 차량 주차 구역과 합류 가능한 장소를 알려 주세요. 금관대로1368번길 인근이라면 차량이 있는 쪽을 정확히 확인합니다.",
    "taksong": "연지공원 인근 차량을 탁송할 때는 공원 주소와 차량이 실제 보관된 장소를 구분합니다. 주차장 출차 승인과 요금 정산 여부를 확인하고 수령인에게 도착 예정 장소를 전달해 주세요."
  },
  "대구광역시 서구 내당동": {
    "source": "https://www.data.go.kr/data/15119035/fileData.do?recommendDataYn=Y",
    "name": "대구교통공사 역 위치 공공데이터",
    "daeri": "내당역 부근에서 귀가할 때는 달구벌대로 어느 방향에서 차량에 탑승할지 확인해 주세요. 도로를 건너야 하는 경우 고객과 기사에게 같은 합류 지점을 안내하고 버스 정류장 등 정차 제한 구간은 피합니다.",
    "taksong": "내당역 주변 차량 탁송은 달구벌대로의 차량 접근 방향과 건물 주차장 진입로가 중요합니다. 역 출구가 아닌 실제 차량 보관 장소와 출차 승인 담당자를 전달해 주세요."
  },
  "광주광역시 북구 양산동": {
    "source": "https://www.gwangju.go.kr/envi/contentsView.do?pageId=envi287",
    "name": "광주광역시 양산저수지 공원 안내",
    "daeri": "양산저수지 산책이나 모임 이후 귀가할 경우 수변 산책로의 위치와 차량을 세운 도로 쪽 위치를 구분해 주세요. 공원 안에서 기다리기보다 차량에 접근할 수 있는 안전한 합류 장소를 협의합니다.",
    "taksong": "양산저수지 인근에서 차량을 맡길 때는 공원 방문 위치가 아니라 실제 보관지 주소를 기준으로 접수합니다. 주변 상가나 주거지 주차 차량이라면 관리자의 출차 조건과 차키 인계 방법을 확인해 주세요."
  },
  "울산광역시 동구 방어동": {
    "source": "https://donggu.ulsan.kr/donggu/contents/contents.do?mId=7070301",
    "name": "울산 동구 방어진항 공영주차장 안내",
    "daeri": "방어진항 공영주차장에 차량을 두고 식사한 뒤 귀가하는 경우 항구 내 방문 점포보다 주차 구역을 먼저 알려 주세요. 주차장 운영 및 출차 조건은 이용 시점에 확인하고 탑승 위치를 협의합니다.",
    "taksong": "방어진항 공영주차장 또는 주변 사업장에 보관된 차량은 서로 다른 인수 장소로 접수해야 합니다. 항만이나 사업장 출입이 제한되는 경우 허가된 외부 인계 장소를 정하고 주차 요금 처리 여부를 확인합니다."
  },
  "경기도 이천시 부발읍": {
    "source": "https://pts.map.naver.com/end-subway/ends/web/11229/home",
    "name": "부발역 경강선 위치 안내",
    "daeri": "부발역 신아로 주변에서 귀가할 때는 열차 도착 시각과 고객이 실제 차량에 합류할 시간을 구분해 주세요. 부발읍 다른 리에 주차했다면 역 이름만으로 접수하지 말고 해당 차량 위치를 알려 주세요.",
    "taksong": "부발역 주변에 차량을 남겨 두고 철도로 이동하는 경우 열차 출발 전에 차키 인계 가능 시간을 협의해 주세요. 신아로 역 주소와 실제 주차장 주소가 다를 수 있으므로 출차 가능 여부 및 수령인 연락 방법도 확인합니다."
  },
  "경기도 군포시 당동": {
    "source": "https://www.bustrain.kr/subway/3",
    "name": "군포역 위치 및 출구 안내",
    "daeri": "군포역1길 주변에서 대리운전을 예약할 때는 역 앞에서 합류할지 당동 골목 안 주차 위치에서 만날지 정해 주세요. 차량이 있는 좁은 골목까지 접근이 어려우면 안전하게 만날 수 있는 지점을 협의합니다.",
    "taksong": "군포역1길 인근 주거지나 상가에 보관된 차량은 건물명과 주차장 진입 방향을 함께 알려 주세요. 골목 내 주차 차량의 이동이 가능한 상태인지 확인하고 차량 인도 권한을 가진 담당자와 차키 전달을 정합니다."
  },
  "서울특별시 강동구 고덕동": {
    "source": "https://www.gangdong.go.kr/web/newportal/contents/gdp_004_001_003_001",
    "name": "강동구청 행정구역도",
    "daeri": "고덕동 법인카드 대리운전은 고덕1동과 고덕2동 중 실제 차량이 있는 주소를 확인하는 것부터 시작합니다. 회사 행사 장소와 차량이 주차된 아파트 또는 업무시설이 다르면 정산 담당자에게 출발지를 별도로 전달하고 법인카드 결제 가능 여부를 예약 전에 확인해 주세요."
  },
  "부산광역시 사상구 덕포동": {
    "source": "https://meis.kr/m/mMetroLine.jsp?afc=6228&line=202&sel=0",
    "name": "덕포역 운영 및 주소 안내",
    "daeri": "사상로 지하 320-1에 위치한 덕포역 인근에서 법인 대리운전을 요청할 경우 사상로 양방향 중 차량이 있는 쪽과 합류 가능한 장소를 확인해 주세요. 업무 방문 후 귀가하는 차량이 여러 대라면 각각의 하차지와 회사 정산 담당자를 구분해 접수합니다."
  },
  "경기도 김포시 통진읍": {
    "source": "https://www.gcf.or.kr/main/content/view.do?sn=44",
    "name": "김포문화재단 통진두레문화센터",
    "daeri": "통진두레문화센터는 마송리 김포대로 2347-8에 있습니다. 통진읍 행사 참석 후 법인카드 대리운전이 필요하다면 공연장 방문 주소와 실제 차량 주차 장소가 같은지 확인해 주세요. 행사 종료 시각이 달라질 수 있으므로 차량별 출발 예정 시각과 정산 방식을 미리 협의합니다."
  },
  "경기도 양평군 서종면": {
    "source": "https://www.yp21.go.kr/sj/contents.do?key=194",
    "name": "양평군 서종면 기본현황 및 지리",
    "daeri": "북한강에 인접한 서종면은 여러 리로 구성되므로 북한강로의 식당이나 숙소 이름만으로 법인 대리운전 출발지를 확정하지 않습니다. 실제 주차 주소와 서울 등 최종 하차지를 함께 전달하고, 회사 카드 결제와 장거리 통행료 정산 조건을 사전에 확인해 주세요."
  },
  "대전광역시 중구 목동": {
    "source": "https://djjunggu.go.kr/kr/sub05_04_02_01.do",
    "name": "대전 중구청 목동 소개",
    "daeri": "목동 행정복지센터가 있는 목중로39번길과 목동의 다른 골목 주소를 구분해 법인카드 대리운전 출발지를 접수합니다. 서울 양천구 목동과 혼동하지 않도록 대전 중구를 함께 전달하고, 업무 방문지와 실제 차량 주차지가 다르면 주차지 기준으로 예약해 주세요."
  },
  "강원특별자치도 고성군 간성읍": {
    "source": "https://access.visitkorea.or.kr/ms/detail.do?cotId=9513f504-5b86-4e6a-8b87-3721397c963b",
    "name": "한국관광공사 간성전통시장 안내",
    "daeri": "간성전통시장의 장날은 매월 끝자리가 2일 또는 7일인 날입니다. 시장 방문 뒤 법인카드 대리운전을 요청할 때는 행사나 거래처 방문 종료 시각과 실제 주차 장소를 알려 주세요. 경남 고성군과 구분하고 속초 등 다른 시군으로 이동할 경우 최종 하차지와 정산 조건도 협의합니다."
  },
  "대구광역시 달서구 성당동": {
    "source": "https://access.visitkorea.or.kr/ms/detail.do?cotId=e62af88b-6f5a-463e-b25f-75689a969c41",
    "name": "한국관광공사 성당못 안내",
    "daeri": "성당못은 공원순환로 216에 위치합니다. 두류공원 일대에서 법인 모임을 마친 뒤 귀가한다면 행사 장소와 실제 주차 위치가 일치하는지 확인합니다. 여러 임직원이 서로 다른 방향으로 귀가할 경우 차량별 탑승 인원과 하차지를 구분해 회사 정산 담당자에게 전달해 주세요."
  },
  "경기도 남양주시 오남읍": {
    "source": "https://www.nyj.go.kr/www/viewTnResrceU.do?key=4691&resrceNo=386",
    "name": "남양주시 오남호수공원 안내",
    "daeri": "오남호수공원(팔현로 85-1) 주변 모임 후 법인대리운전을 예약하는 경우 오남역과 호수공원 주차장을 서로 다른 출발 후보로 구분해 주세요. 실제 차량 위치와 모임 종료 예정 시각을 확인한 후 차량별 하차지 및 회사 정산 담당자를 전달하면 됩니다."
  },
  "부산광역시 수영구 남천동": {
    "source": "https://www.busan.go.kr/depart/traditionalmarket02?bbsNo=13&curPage=11",
    "name": "부산광역시 전통시장 현황",
    "daeri": "남천해변시장은 광안해변로15번길 77에 있습니다. 남천동 식사 모임 뒤 법인대리운전을 요청할 때는 시장 골목의 방문 장소와 차량을 맡긴 주차시설을 구분하고, 해변도로 방면에서 합류할지 실제 주차 위치에서 만날지 협의해 주세요. 회사별 정산과 다수 차량의 목적지는 각각 확인합니다."
  },
  "서울특별시 영등포구 도림동": {
    "source": "https://yeyak.seoul.go.kr/web/reservation/selectReservView.do?rsv_svc_id=S201224140828388288",
    "name": "서울시 공공서비스예약 도림동 주민센터 안내",
    "daeri": "도영로7길 10의 도림동 주민센터는 서울시 안내에 따르면 주차 공간이 부족한 시설입니다. 인근 업무 모임에서 법인대리운전을 요청할 때 주민센터를 무조건 승차 장소로 지정하지 말고 실제 주차시설과 출차 가능 시각을 알려 주세요. 법인 정산은 차량별 목적지와 함께 협의합니다."
  },
  "대전광역시 동구 원동": {
    "source": "https://www.donggu.go.kr/dg/kor/contents/137",
    "name": "대전 동구청 전통시장 주차 안내",
    "daeri": "원동 중앙시장 제1공영주차장은 대전로779번길 8에 있습니다. 거래처 방문이나 시장 주변 회식 뒤 법인대리운전을 요청할 때는 이용한 주차장의 명칭과 출구를 확인하고, 시장 골목 안 방문지와 구분해 주세요. 주차 정산과 법인 결제 조건은 별도로 확인합니다."
  },
  "경상북도 경주시 교동": {
    "source": "https://www.gyeongju.go.kr/gyochon/page.do?mnu_uid=3039",
    "name": "경주시 교촌마을 공식 안내",
    "daeri": "교촌마을 안내 주소는 교촌길 39-2입니다. 교동 한옥 체험이나 업무 행사 후 법인대리운전을 이용할 경우 체험장과 실제 차량 주차 위치를 구분합니다. 다른 관광지를 경유하거나 숙소로 먼저 이동할 계획이라면 경유 순서와 차량별 법인 정산 조건을 예약 시 알려 주세요."
  },
"대구광역시 수성구 상동": {
    "source": "https://www.suseong.kr/index.do?menu_id=00031392",
    "name": "수성구청 공영주차장 현황",
    "daeri": "수성못공영주차장은 상동 481-6에 있습니다. 수성못 주변 식사 후 장거리대리운전을 예약한다면 방문한 식당과 실제 주차장 명칭을 구분하고, 출차 정산 후 합류할 위치를 알려 주세요. 다른 시군으로 이동할 때는 최종 하차지와 경유 순서를 함께 확인합니다."
  },
  "광주광역시 서구 금호동": {
    "source": "https://seogufmc.or.kr/board.es?bid=0024&mid=a10102010100",
    "name": "서구시설관리공단 공영주차장 안내",
    "daeri": "금호동 공영주차장 위치는 금호동 764입니다. 금호동에서 장거리대리운전을 요청할 때는 공영주차장에 차량을 두었는지 상가 주차시설에 있는지 먼저 구분합니다. 장시간 이동 전에 출차 가능 여부와 최종 하차 주소, 통행료 정산 조건을 협의해 주세요."
  }
};
const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
const key=x=>x.kind+'|'+x.region;
function reviewTargets(rows){
 const counts=new Map();
 for(const row of rows)for(const f of ['pickup','handover']){
  const k=f+'|'+clean(row[f]);counts.set(k,(counts.get(k)||0)+1);
 }
 const out=new Map();
 for(const row of rows){
  const region=clean(row.region),keyword=clean(row.keyword),topic=clean(row.topic);
  const pickup=clean(row.pickup),handover=clean(row.handover),related=clean(row.related),issues=[];
  if(!region||!keyword)issues.push('missing_region_or_keyword');
  if(topic.length<13)issues.push('thin_topic');
  if(pickup.length<80)issues.push('thin_pickup_context');
  if(handover.length<75)issues.push('thin_handover_context');
  if(!related)issues.push('missing_related_service_link');
  if(counts.get('pickup|'+pickup)>1)issues.push('repeated_pickup_text');
  if(counts.get('handover|'+handover)>1)issues.push('repeated_handover_text');
  if(/100%\s*(?:보장|배차)|즉시\s*배차\s*보장|상시\s*상주|무조건\s*배차/.test([topic,pickup,handover].join(' ')))issues.push('review_unverified_dispatch_claim');
  if(region.split(' ').at(-1)&&![topic,pickup,handover].join(' ').includes(region.split(' ').at(-1)))issues.push('last_locality_not_in_guidance');
  if(issues.length)out.set(key(row),issues);
 }
 return out;
}
function intentGuide(info){
 const text=info.keyword+' '+info.topic+' '+info.related;
 if(info.kind==='taksong'){
  if(/렌트|렌터|rental/i.test(text))return ['렌터카 반납·회수','계약상 반납점과 업체 승인 여부','반납 검수 시각, 추가 정산 담당자'];
  if(/서비스센터|정비|출고|repair|service-center/i.test(text))return ['정비 입출고','정비 접수 또는 완료 상태, 운행 가능 여부','센터 인계 담당자와 영업시간'];
  if(/수출|항만|항구|선적|export-port/i.test(text))return ['항만·선적 연계','반출 승인, 선적 접수 번호 및 실제 인수 장소','선적과 육상 이동 구간을 분리해 견적'];
  if(/화물|특수|트럭|truck/i.test(text))return ['화물·특수차','차종·톤수·제원, 정상 주행 및 면허 조건','차량 제원에 맞는 기사와 운행 가능 조건'];
  if(/중고|매매|경매|used-car|auction/i.test(text))return ['거래 차량 인수','차량 인도 승인, 차키 보관자 및 차량 상태','판매·구매 당사자 인계 시각'];
  if(/법인|기업|corporate/i.test(text))return ['법인 차량 이동','차량별 반출 승인 및 담당자','정산 증빙과 수령 부서'];
  if(/장거리|시외|long-distance/i.test(text))return ['장거리 차량 이동','시·군·구가 포함된 양쪽 주소와 정상 주행 여부','도착 시각, 통행료·주차료 및 기사 복귀 조건'];
  return ['일반 차량 이동','차량 주차 위치, 차키와 소유자 이동 승인','수령인, 도착지 주차 위치 및 인계 방식'];
 }
 if(/법인|기업|회식|corporate/i.test(text))return ['법인·단체 귀가','차량별 출발시간과 탑승자','정산 담당자, 증빙 조건 및 목적지별 배차'];
 if(/골프|golf/i.test(text))return ['골프장 이동','실제 골프장 명칭과 차량 주차 구역','라운드 종료 예상 시간과 기사 대기 여부'];
 if(/일일기사|왕복|daily-driver/i.test(text))return ['일일기사·왕복','출발·경유지·종료지 및 전체 일정','대기 시간과 추가 경유, 종료 조건'];
 if(/장거리|시외|long-distance/i.test(text))return ['장거리 동승 이동','탑승 위치, 최종 하차지 및 경유 순서','유료도로, 대기, 기사 복귀 교통 조건'];
 return ['일반 동승 이동','차량 위치와 고객 탑승 지점을 구분','최종 하차지, 경유 및 대기 여부'];
}

function normalizedCopy(text,row){
 let value=String(text||'').normalize('NFKC').toLowerCase();
 const parts=row.region.split(/\s+/);
 for(const alias of [...new Set([row.region,parts.join(''),...parts])].sort((a,b)=>b.length-a.length)){
  if(alias)value=value.split(alias.toLowerCase()).join('지역');
 }
 return value.replace(/[^\p{L}\p{N}]/gu,'');
}
function duplicateKeys(rows,targets){
 const groups=new Map();
 for(const row of rows){
  if(!targets.has(key(row)))continue;
  const fingerprint=row.kind+'|'+['topic','pickup','handover'].map(f=>normalizedCopy(row[f],row)).join('|');
  const group=groups.get(fingerprint)||[];
  group.push(key(row));groups.set(fingerprint,group);
 }
 return new Set([...groups.values()].filter(group=>group.length>1).flat());
}

function create({rows,regions,servicePath,esc,historyFor=()=>[],publishedPosts=[],reviewedOriginals=require('../data/seo-reviewed-local-originals-20261116.json').items,priorityOriginals=require('../data/priority-blog-links.json').pages}){
 const targets=reviewTargets(rows);
 const duplicates=duplicateKeys(rows,targets);
 const byName=new Map(regions.map(r=>[r.full_name,r]));
 const postById=new Map(publishedPosts.filter(p=>p&&/^https:\/\/blog\.naver\.com\/wjdtnr4757\/\d+$/.test(p.url||'')).map(p=>[p.url.split('/').at(-1),p]));
 const exactOriginals=new Map();
 function addOriginal(region,kind,id,note){
  if(!byName.has(region)||!['daeri','taksong'].includes(kind)||!postById.has(String(id)))return;
  const k=kind+'|'+region,list=exactOriginals.get(k)||[];
  if(!list.some(p=>p.id===String(id)))list.push({id:String(id),post:postById.get(String(id)),note:String(note||'')});
  exactOriginals.set(k,list);
 }
 for(const item of reviewedOriginals)if(item.scope!=='related_service')addOriginal(item.region,item.kind,item.post_id,item.note);
 for(const item of priorityOriginals)for(const id of item.ids||[])addOriginal(item.region,item.kind,id,item.focus);
 const byShort=new Map(),byParent=new Map();
 const curatedKeys=new Set(rows.map(key));
 for(const r of regions){
  const last=r.full_name.split(' ').at(-1),list=byShort.get(last)||[];
  list.push(r);byShort.set(last,list);
  const parentName=r.full_name.split(' ').slice(0,-1).join(' ');
  const siblings=byParent.get(parentName)||[];siblings.push(r);byParent.set(parentName,siblings);
 }
 const plans=new Map();
 for(const info of rows){
  const issues=targets.get(key(info));if(!issues)continue;
  const r=byName.get(info.region);
  if(!r)throw Error('Unresolved reviewed locality: '+info.region);
  const hierarchy=info.region.split(' ');
  const parent=byName.get(hierarchy.slice(0,-1).join(' '))||null;
  const homonyms=(byShort.get(hierarchy.at(-1))||[]).filter(x=>x.full_name!==info.region);
  plans.set(key(info),{region:r,parent,homonyms,issues,info,intent:intentGuide(info)});
 }



 // Build collision-checked aliases from the complete legal registry, not the target subset.
 const aliases=new Map(),byAliasRegion=new Map(),matchers=new Map(),originalCache=new Map();
 const shorten=(p,i)=>i===0?p.replace(/특별자치도$|특별자치시$|특별시$|광역시$|도$/,''):p.replace(/[시군구읍면동리]$/,'');
 for(const name of byName.keys()){
  const parts=name.split(' ');
  const variants=new Set([parts.join('')]);
  for(let start=0;start<parts.length-1;start++){
   const tail=parts.slice(start);
   // Require at least two administrative components for abbreviated matching.
   variants.add(tail.join(''));
   variants.add(tail.map((p,i)=>shorten(p,start+i)).join(''));
   variants.add(tail.map((p,i)=>i===tail.length-1?p:shorten(p,start+i)).join(''));
  }
  for(const a of variants){
   if(a.length<4)continue;
   if(!aliases.has(a))aliases.set(a,name);
   else if(aliases.get(a)!==name)aliases.set(a,null);
  }
  byAliasRegion.set(name,variants);
 }
 function titleMatches(name,title){
  const words=title.normalize('NFKC');
  if(matchers.has(name))return matchers.get(name).some(re=>re.test(words));
  const compiled=[];
  for(const a of byAliasRegion.get(name)||[]){
   if(aliases.get(a)!==name)continue;
   // Prevent matching inside a longer Korean place name.
   const pattern=a.split('').join('\\s*');
   const re=new RegExp('(?:^|[^가-힣])'+pattern+'(?=$|[^가-힣]|에서|으로|까지|탁송|대리운전|자동차탁송)');
   compiled.push(re);
  }
  matchers.set(name,compiled);
  return compiled.some(re=>re.test(words));
 }

 // Only match full or collision-checked qualified administrative names in the published title.
 // A category or a bare neighborhood name alone is never sufficient.
 function publishedFor(r,kind){
  const cacheKey=kind+'|'+r.full_name;
  if(originalCache.has(cacheKey))return originalCache.get(cacheKey);
  const result=[];
  for(const post of publishedPosts){
   if(!post||!/^https:\/\/blog\.naver\.com\/wjdtnr4757\/\d+$/.test(post.url||''))continue;
   const title=String(post.title||''),category=String(post.category||'');
   if(kind==='taksong'?(!/탁송/.test(title)||/대리운전/.test(title)):(!/대리운전/.test(title)||/탁송/.test(title)))continue;
   if(!titleMatches(r.full_name,title))continue;
   result.push(post);
   if(result.length===3)break;
  }
  originalCache.set(cacheKey,result);
  return result;
 }

 function batchEvidence(plan,kind){
  if(!duplicates.has(kind+'|'+plan.region.full_name))return '';
  const {region:r,parent}=plan;
  const label=kind==='taksong'?'자동차탁송':'대리운전';
  const children=(byParent.get(r.full_name)||[]).filter(x=>curatedKeys.has(kind+'|'+x.full_name));
  const siblings=parent?(byParent.get(parent.full_name)||[]).filter(x=>x.full_name!==r.full_name&&curatedKeys.has(kind+'|'+x.full_name)):[];
  const links=children.length?children:siblings;
  const ancestorNames=r.full_name.split(' ');
  const ancestors=ancestorNames.slice(0,-1).map((_,i)=>byName.get(ancestorNames.slice(0,i+1).join(' '))).filter(Boolean).reverse();
  const relatedAreas=ancestors.filter(x=>curatedKeys.has(kind+'|'+x.full_name)).slice(0,3);
  const relatedNavigation='<nav aria-label="'+esc(r.full_name+' '+label+' 관련 안내')+'" class="locality-batch-navigation"><p><a href="/'+kind+'/">전국 '+label+' 안내</a>'+relatedAreas.map(x=>' · <a href="'+esc(servicePath(x,kind))+'">'+esc(x.full_name+' '+label)+'</a>').join('')+'</p><p>상위 지역 안내는 해당 세부 지역의 운행 실적이나 고유자료를 뜻하지 않습니다.</p></nav>';
  const scope=children.length?'하위 행정구역':'같은 상위 행정구역의 다른 지역';
  const navigation=links.length?'<p>'+scope+' 안내 ('+links.length+'개): '+links.slice(0,5).map(x=>'<a href="'+esc(servicePath(x,kind))+'">'+esc(x.full_name)+'</a>').join(' · ')+'</p>':'';
  const records=(historyFor(r,kind)||[]).filter(x=>x.service===kind&&/^excel-\d+$/.test(x.id)&&x.departure&&x.destination&&x.departure!=='지역 비공개'&&x.destination!=='지역 비공개').slice(0,3);
  const history=records.length?'<p>해당 행정구역과 일치하는 공개 완료 운행기록:</p><ul>'+records.map(x=>'<li><a href="/reviews/history/'+esc(x.id)+'/">'+esc(x.departure+' → '+x.destination)+'</a> · '+esc(x.date)+'</li>').join('')+'</ul><p>과거 기록이며 현재 배차나 요금을 보장하지 않습니다.</p>':'<p>이 안내에 연결된 공개 완료 운행기록이 없습니다. 다른 지역의 운행을 이 지역의 실적으로 표시하지 않습니다.</p>';
  const posts=publishedFor(r,kind);
  const originals=posts.length?'<div class="locality-original-articles"><p>해당 행정구역 또는 구분 가능한 축약 지명이 제목에 명시된 공개 블로그 자료 (완료 운행 증빙과 별도):</p><ul>'+posts.map(p=>'<li><a href="'+esc(p.url)+'" rel="noopener noreferrer">'+esc(p.title)+'</a></li>').join('')+'</ul></div>':'';
  const reviewed=(exactOriginals.get(kind+'|'+r.full_name)||[]).filter(x=>!posts.some(p=>p.url===x.post.url));
  const reviewedMarkup=reviewed.length?'<div class="locality-reviewed-originals"><p>기존 수동 검토 지역 안내 원문 (완료 운행 증빙과 별도):</p><ul>'+reviewed.map(x=>'<li><a href="'+esc(x.post.url)+'" rel="noopener noreferrer">'+esc(x.post.title)+'</a> · '+esc(x.note)+'</li>').join('')+'</ul></div>':'';
  const parentScope=parent?'<p>'+esc(parent.full_name)+' 전체 안내와 '+esc(r.full_name)+'의 실제 차량 위치는 구분하여 상담합니다.</p>':'';
  return '<div class="locality-batch-evidence"><h4>'+esc(r.full_name+' '+label+' 지역 선택 및 운행자료')+'</h4>'  +history+originals+reviewedMarkup+navigation+relatedNavigation+parentScope+'</div>';
 }

 function render(r,kind){
  const plan=plans.get(kind+'|'+r.full_name);if(!plan)return '';
  const {parent,homonyms,info,intent,issues}=plan;
  const label=kind==='taksong'?'자동차탁송':'대리운전';
  // Retain every original field in source files and in existing SSR copy.
  // Add only actual registry distinctions and booking checks, not invented local landmarks.
  const parentLink=parent?'<p>상위 행정구역 안내: <a href="'+esc(servicePath(parent,kind))+'">'+esc(parent.full_name+' '+label)+'</a></p>':'';
  const otherPlaces=homonyms.length?'<p>같은 마지막 행정구역 명칭이 다른 주소에도 '+homonyms.length+'곳 있습니다. '+esc(homonyms.slice(0,3).map(x=>x.full_name).join(' · '))+(homonyms.length>3?' 등':'')+'과 구분해 전체 주소를 확인해 주세요.</p>':'';
  const exact='<dl><dt>행정구역</dt><dd>'+esc(r.full_name)+'</dd><dt>이용 유형</dt><dd>'+esc(intent[0])+'</dd><dt>출발 전</dt><dd>'+esc(intent[1])+'</dd><dt>도착·정산 전</dt><dd>'+esc(intent[2])+'</dd></dl>';
  const route='<p><a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(r.full_name)+'">이 주소에서 출발</a> · <a href="/fare/?service='+kind+'&amp;to='+encodeURIComponent(r.full_name)+'">이 주소로 도착</a> · <a href="/reviews/history/?kind='+kind+'&amp;region='+encodeURIComponent(r.slug)+'">해당 행정구역 기록 확인</a></p>';
  const evidence=localSources[r.full_name];
  const local=evidence&&evidence[kind]?'<h4>지역별 차량 위치와 이용 조건</h4><p>'+esc(evidence[kind])+'</p><p>지역 정보 출처: <a href="'+esc(evidence.source)+'">'+esc(evidence.name)+'</a></p>':'';
  return '<div class="locality-evidence-guide" id="locality-evidence-guide-20261127"><h3>'+esc(r.full_name+' '+label+' 주소 확인 및 예약 조건')+'</h3>'+exact+local+batchEvidence(plan,kind)+otherPlaces+parentLink+route+'</div>';
 }
 return {targets,plans,duplicates,render};
}
module.exports={reviewTargets,intentGuide,duplicateKeys,create};
