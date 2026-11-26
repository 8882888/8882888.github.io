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
function create({rows,regions,servicePath,esc}){
 const targets=reviewTargets(rows);
 const byName=new Map(regions.map(r=>[r.full_name,r]));
 const byShort=new Map();
 for(const r of regions){
  const last=r.full_name.split(' ').at(-1),list=byShort.get(last)||[];
  list.push(r);byShort.set(last,list);
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
  const local=evidence?'<h4>지역별 차량 위치와 이용 조건</h4><p>'+esc(evidence[kind])+'</p><p>지역 정보 출처: <a href="'+esc(evidence.source)+'">'+esc(evidence.name)+'</a></p>':'';
  return '<div class="locality-evidence-guide" id="locality-evidence-guide-20261127"><h3>'+esc(r.full_name+' '+label+' 주소 확인 및 예약 조건')+'</h3>'+exact+local+otherPlaces+parentLink+route+'</div>';
 }
 return {targets,plans,render};
}
module.exports={reviewTargets,intentGuide,create};
