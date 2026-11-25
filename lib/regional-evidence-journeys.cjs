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
  return '<section id="regional-source-directed-journey-20261125" aria-label="'+esc(r.full_name+' 공개 운행 '+role+' 안내')+'"><h2>'+esc(r.name+' '+label+' 실제 '+role+' 기록과 예약 준비')+'</h2>'+
   '<p><a href="'+esc(published.path)+'">'+esc(source.departure+' → '+source.destination)+'</a> · <time datetime="'+esc(source.date)+'">'+esc(source.date)+'</time> · 당시 '+esc(source.fare)+' · 이 지역 '+role+' 기록</p>'+
   '<p>'+esc(note)+'</p><p><a href="'+esc(quote)+'">기록 구간 현재 예상요금 조회</a> · <a href="'+esc(other)+'">'+esc((origin?source.destination:source.departure)+' '+(origin?'도착':'출발')+' 지역 안내')+'</a></p>'+
   '<p>기록 금액은 당시 요금입니다. 역방향은 별도 견적이며 실제 차량 위치를 입력해야 합니다.</p></section>';
 }
 return {render,size:map.size,regions:[...map.keys()]};
}
module.exports={createRegionalEvidenceJourneys,plans};
