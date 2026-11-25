'use strict';
// Only explicitly approved public reviewed ride records that have a published
// canonical URL and sitemap ownership can provide a local evidence journey.
// No raw archive fields, guesses about subdistricts or new landing pages.
const {identifier}=require('./published-case-feed');
const plans=[
  {
    "date": "2026-11-11",
    "departure": "원주시",
    "destination": "고양시",
    "fare": "70,000원",
    "fromRegion": "강원특별자치도 원주시",
    "toRegion": "경기도 고양시",
    "fromPath": "/taksong/gangwon/wonju-si/",
    "toPath": "/taksong/gyeonggi/goyang-si/",
    "fromNote": "원주에서 차량을 보낼 때는 실제 보관지와 고양의 수령 시각을 먼저 맞추고 기사 복귀 조건을 상담하세요. 원주 출발이라는 기록만으로 혁신도시·기업도시 등 세부 장소를 특정하지 않습니다.",
    "toNote": "고양에서 받을 차량은 원주 출발 시각과 고양 내 실제 수령 장소를 구분해 확인하세요. 이 기록은 고양에서 출발한 사례가 아니며 일산·덕양 등 구별 인도 위치는 별도로 확인합니다.",
    "service": "taksong"
  },
  {
    "date": "2026-11-10",
    "departure": "구미시",
    "destination": "김천시",
    "fare": "40,000원",
    "fromRegion": "경상북도 구미시",
    "toRegion": "경상북도 김천시",
    "fromPath": "/taksong/gyeongbuk/gumi-si/",
    "toPath": "/taksong/gyeongbuk/gimcheon-si/",
    "fromNote": "구미에서 김천으로 보내는 경우 차량이 있는 주차장 또는 업체의 출고 승인과 도착 수령인을 먼저 확인하세요. 이 기록만으로 산업단지 출고나 기업 계약을 주장하지 않습니다.",
    "toNote": "김천 도착 예정 차량은 구미에서 인수할 시각과 김천 수령 담당자를 조율하세요. 김천혁신도시와 다른 김천 시내 주소는 별도로 지정하며 이 기록에서 세부 인계 장소는 확인되지 않습니다.",
    "service": "taksong"
  },
  {
    "service": "taksong",
    "date": "2026-11-11",
    "departure": "안동시",
    "destination": "시흥시",
    "fare": "130,000원",
    "fromRegion": "경상북도 안동시",
    "toRegion": "경기도 시흥시",
    "fromPath": "/taksong/gyeongbuk/andong-si/",
    "toPath": "/taksong/gyeonggi/siheung-si/",
    "fromNote": "안동에서 시흥으로 보내는 장거리 차량은 실제 주차 위치와 열쇠 인계 방법을 정하고 시흥 수령 가능 시간을 확인하세요. 기록에는 안동 내 세부 출발 장소가 공개되지 않았습니다.",
    "toNote": "시흥에서 안동 출발 차량을 받을 때는 차량을 받을 건물이나 공용 주차장, 수령 담당자의 가능 시간을 먼저 지정하세요. 시흥 출발 역방향이나 산업단지 입고 실적을 뜻하지 않습니다."
  },
  {
    "service": "daeri",
    "date": "2026-10-23",
    "departure": "고흥군",
    "destination": "종로숭인동",
    "fare": "190,000원",
    "fromRegion": "전라남도 고흥군",
    "toRegion": "서울특별시 종로구",
    "fromPath": "/daeri/jeonnam/goheung-gun/",
    "toPath": "/daeri/seoul/jongro-gu/",
    "fromNote": "고흥에서 서울 종로로 귀가할 때는 읍·면별 차량 주차 위치, 실제 출발 시각, 장거리 기사 복귀 조건을 미리 협의하세요. 이 기록에는 고흥의 세부 출발 장소와 배차 시간이 공개되지 않았습니다.",
    "toNote": "종로구 숭인동으로 도착한 과거 운행입니다. 고흥 출발 고객은 종로 내 실제 하차 및 차량 주차 위치와 경유 여부를 정하세요. 종로 출발 대리운전 요금은 별도로 조회해야 합니다."
  },
  {
    "service": "daeri",
    "date": "2026-10-23",
    "departure": "해운대중동",
    "destination": "평택신장동",
    "fare": "170,000원",
    "fromRegion": "부산광역시 해운대구",
    "toRegion": "경기도 평택시",
    "fromPath": "/daeri/busan/haeundae-gu/",
    "toPath": "/daeri/gyeonggi/pyeongtaek-si/",
    "fromNote": "해운대 중동에서 평택까지 고객 차량으로 이동할 때는 실제 주차장 출입 위치, 희망 출발 시간, 경유나 대기 조건을 확인하세요. 이 기록은 특정 호텔·식당과의 제휴 또는 심야 배차 보장을 뜻하지 않습니다.",
    "toNote": "평택 신장동 도착 고객은 목적지 주차 가능 위치를 확인하고 해운대 출발 시각을 협의하세요. 평택 출발 역방향은 별도 견적이며 기록 당시 요금으로 확정되지 않습니다."
  },
  {
    "service": "taksong",
    "date": "2026-10-20",
    "departure": "유성구지족동",
    "destination": "화성시방교동",
    "fare": "70,000원",
    "fromRegion": "대전광역시 유성구",
    "toRegion": "경기도 화성시",
    "fromPath": "/taksong/daejeon/yuseong-gu/",
    "toPath": "/taksong/gyeonggi/hwaseong-si/",
    "fromNote": "유성구 지족동에서 화성시 방교동으로 차량을 보낼 때는 주거단지 지하주차장 출입 방법과 차량 열쇠 전달 시각을 먼저 확인하세요. 실제 주차장이나 차종은 공개 기록에 없습니다.",
    "toNote": "화성시 방교동에서 차량을 수령할 때는 동탄 생활권 내 실제 인계 주소와 수령 담당자의 가능 시간을 확인하세요. 유성구에서 출발한 기록이며 공장 출고나 법인차량 운행으로 단정하지 않습니다."
  },
  {
    "service": "taksong",
    "date": "2026-10-23",
    "departure": "세종시 부강면",
    "destination": "연수구",
    "fare": "90,000원",
    "fromRegion": "세종특별자치시 (직할) 부강면",
    "toRegion": "인천광역시 연수구",
    "fromPath": "/taksong/sejong/jikhal/bugang-myeon/",
    "toPath": "/taksong/incheon/yeonsu-gu/",
    "fromNote": "부강면에서 연수구까지 차량을 보낼 때는 읍면 도로의 실제 주차 위치와 기사 접근 방법, 목적지 인수 가능 시각을 확인하세요. 이 기록은 세종 정부청사 출발이나 특정 사업장 차량 운행을 뜻하지 않습니다.",
    "toNote": "연수구에서 부강면 출발 차량을 받을 때는 송도·연수동 등 실제 도착 동네와 건물 출입 조건을 확인하세요. 원본에는 연수구 내 세부 장소가 기록되지 않았으므로 송도 도착 실적으로 구분하지 않습니다."
  },
  {
    "service": "daeri",
    "date": "2026-10-23",
    "departure": "고촌읍 향산리",
    "destination": "화곡동",
    "fare": "60,000원",
    "fromRegion": "경기도 김포시",
    "toRegion": "서울특별시 강서구",
    "fromPath": "/daeri/gyeonggi/gimpo-si/",
    "toPath": "/daeri/seoul/gangseo-gu/",
    "fromNote": "김포 고촌읍 향산리에서 화곡동으로 이동할 때는 모임 장소와 차량이 주차된 위치를 구분해 전달하세요. 김포공항 출발이나 특정 식당 이용으로 해석하지 않으며 희망 출발 시각에 맞춰 기사 접근 여건을 상담합니다.",
    "toNote": "강서구 화곡동 도착 대리운전은 주택가 진입과 실제 주차 가능 위치를 먼저 확인하세요. 고촌읍 향산리 출발 기록이므로 화곡동 출발 김포행의 요금이나 배차 가능성을 보장하지 않습니다."
  },
  {
    "service": "daeri",
    "date": "2026-10-22",
    "departure": "생연동",
    "destination": "의정부용현동",
    "fare": "35,000원",
    "fromRegion": "경기도 동두천시",
    "toRegion": "경기도 의정부시",
    "fromPath": "/daeri/gyeonggi/dongducheon-si/",
    "toPath": "/daeri/gyeonggi/uijeongbu-si/",
    "fromNote": "동두천 생연동에서 의정부 용현동으로 이동하려면 차량이 세워진 상가나 주택가의 실제 출입 위치를 알려주세요. 동두천역 주변 출발 또는 특정 식당 이용으로 단정하지 않고 희망 시간대에 맞춰 상담합니다.",
    "toNote": "의정부 용현동 도착 시 주거지 또는 사업장 진입 방법과 최종 주차 위치를 확인하세요. 생연동 출발 기록이므로 의정부에서 동두천으로 돌아가는 요금은 별도로 조회합니다."
  },
  {
    "service": "daeri",
    "date": "2026-10-24",
    "departure": "부산연산동",
    "destination": "부산장전동",
    "fare": "20,000원",
    "fromRegion": "부산광역시 연제구",
    "toRegion": "부산광역시 금정구",
    "fromPath": "/daeri/busan/yeonje-gu/",
    "toPath": "/daeri/busan/geumjeong-gu/",
    "fromNote": "연제구 연산동의 모임 장소와 실제 차량 주차장이 다르면 기사에게 각각 알려주세요. 장전동 도착 위치와 경유 여부를 확인하며, 특정 음식점 또는 심야 시간의 배차 실적을 뜻하지 않습니다.",
    "toNote": "금정구 장전동에서 차량을 세울 때는 대학가 상권과 주거지 중 실제 목적지, 골목 진입 및 주차 가능 여부를 확인하세요. 연산동 출발 기록이며 금정구 출발 요금은 별도로 확인합니다."
  },
  {
    "service": "taksong",
    "date": "2026-11-12",
    "departure": "동해시",
    "destination": "부산",
    "fare": "140,000원",
    "fromRegion": "강원특별자치도 동해시",
    "toRegion": "부산광역시",
    "fromPath": "/taksong/gangwon/donghae-si/",
    "toPath": "/taksong/busan/",
    "fromNote": "동해시에서 부산으로 장거리 탁송을 접수할 때는 차량 보관 위치, 출차 가능 시각과 부산 수령 일정을 함께 확인하세요. 동해항·묵호항에서 출발했다거나 선박을 이용했다는 기록은 없습니다.",
    "toNote": "동해시 출발 차량을 부산에서 수령할 때는 실제 도착 구와 담당자, 주차장 출입 방법을 먼저 지정하세요. 부산항 입고 또는 해운대 등 특정 구 도착 실적은 확인되지 않습니다."
  },
  {
    "service": "taksong",
    "date": "2026-11-05",
    "departure": "오산시",
    "destination": "서울",
    "fare": "50,000원",
    "fromRegion": "경기도 오산시",
    "toRegion": "서울특별시",
    "fromPath": "/taksong/gyeonggi/osan-si/",
    "toPath": "/taksong/seoul/",
    "fromNote": "오산시에서 서울로 차량을 보낼 때는 세교지구 등 실제 차량 소재지와 서울의 수령 장소를 구분해 전달하세요. 기록만으로 세교 출발이나 중고차 매매에 따른 이동을 특정할 수 없습니다.",
    "toNote": "서울에서 오산 출발 차량을 받으려면 실제 도착 자치구, 건물 진입 조건, 수령 가능 시간을 확인하세요. 서울 내 특정 구와 차량 종류는 공개 기록에 없으며 현재 견적은 별도입니다."
  },
  {
    "service": "taksong",
    "date": "2026-11-03",
    "departure": "인천",
    "destination": "양주시",
    "fare": "40,000원",
    "fromRegion": "인천광역시",
    "toRegion": "경기도 양주시",
    "fromPath": "/taksong/incheon/",
    "toPath": "/taksong/gyeonggi/yangju-si/",
    "fromNote": "인천에서 양주로 차량을 보내려면 실제 출발 구와 주차 장소, 차종 및 양주 인계 시각을 먼저 확인하세요. 이 기록은 인천공항이나 수출단지에서 출발한 것으로 해석하지 않습니다.",
    "toNote": "양주시에서 인천 출발 차량을 수령할 때는 옥정·회천 등 생활권과 읍면의 실제 인계 주소를 구분해 알려주세요. 기록의 도착 범위는 양주시이며 세부 지점이나 고정 요금은 확인되지 않습니다."
  }
];
function createRegionalEvidenceJourneys({reviewedRides,publishedCases,regionByFullName,servicePath,owners,esc}){
 const publicById=new Map(reviewedRides.filter(x=>x.verified===true&&x.status==='completed'&&['taksong','daeri'].includes(x.service)).map(x=>[identifier(x),x]));
 const publishedById=new Map(publishedCases.map(x=>[x.id,x]));
 const map=new Map();
 for(const p of plans){
  const id=identifier(p),source=publicById.get(id),published=publishedById.get(id);
  const from=regionByFullName.get(p.fromRegion),to=regionByFullName.get(p.toRegion);
  if(!source||!published||published.service!==p.service||published.path!=='/reviews/verified/'+id+'/'||
     published.rideDate!==source.date||published.departure!==source.departure||published.destination!==source.destination||published.fare!==source.fare||
     !owners[published.path]||!from||!to||servicePath(from,p.service)!==p.fromPath||servicePath(to,p.service)!==p.toPath||
     !owners[p.fromPath]||!owners[p.toPath])continue;
  map.set(p.service+'|'+p.fromRegion,{p,source,published,origin:true,other:p.toPath,note:p.fromNote});
  map.set(p.service+'|'+p.toRegion,{p,source,published,origin:false,other:p.fromPath,note:p.toNote});
 }
 function render(r,kind){
  const item=map.get(kind+'|'+r.full_name);if(!item)return '';
  const {source,published,origin,other,note}=item;
  const role=origin?'출발':'도착',label=kind==='daeri'?'대리운전':'자동차탁송';
  const quote='/fare/?'+new URLSearchParams({service:kind,from:source.departure,to:source.destination});
  return '<section id="regional-source-directed-journey-20261125" aria-label="'+esc(r.full_name.replace(/\s*\(직할\)\s*/g,' ')+' 공개 운행 '+role+' 안내')+'"><h2>'+esc(r.name+' '+label+' 실제 '+role+' 기록과 예약 준비')+'</h2>'+
   '<p><a href="'+esc(published.path)+'">'+esc(source.departure+' → '+source.destination)+'</a> · <time datetime="'+esc(source.date)+'">'+esc(source.date)+'</time> · 당시 '+esc(source.fare)+' · 이 지역 '+role+' 기록</p>'+
   '<p>'+esc(note)+'</p><p><a href="'+esc(quote)+'">기록 구간 현재 예상요금 조회</a> · <a href="'+esc(other)+'">'+esc((origin?source.destination:source.departure)+' '+(origin?'도착':'출발')+' 지역 안내')+'</a></p>'+
   '<p>기록 금액은 당시 요금입니다. 역방향은 별도 견적이며 실제 차량 위치를 입력해야 합니다.</p></section>';
 }
 return {render,size:map.size,regions:[...map.keys()]};
}
module.exports={createRegionalEvidenceJourneys,plans};
