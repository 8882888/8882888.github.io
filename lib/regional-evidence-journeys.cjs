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
    "toNote": "고양에서 받을 차량은 원주 출발 시각과 고양 내 실제 수령 장소를 구분해 확인하세요. 이 기록은 고양에서 출발한 사례가 아니며 일산·덕양 등 구별 인도 위치는 별도로 확인합니다."
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
    "toNote": "김천 도착 예정 차량은 구미에서 인수할 시각과 김천 수령 담당자를 조율하세요. 김천혁신도시와 다른 김천 시내 주소는 별도로 지정하며 이 기록에서 세부 인계 장소는 확인되지 않습니다."
  },
  {
    "date": "2026-10-19",
    "departure": "여수시",
    "destination": "용인시",
    "fare": "250,000원",
    "fromRegion": "전라남도 여수시",
    "toRegion": "경기도 용인시",
    "fromPath": "/taksong/jeonnam/yeosu-si/",
    "toPath": "/taksong/gyeonggi/yongin-si/",
    "fromNote": "여수에서 용인으로 이동하는 장거리 차량 인수는 주차장·키 전달과 수령 가능 시간을 사전에 협의하세요. 항만 출입이나 선박 선적이 포함된 운행으로 해석하지 않습니다.",
    "toNote": "용인에서 여수 출발 차량을 받을 때는 처인·기흥·수지 등 실제 인계 주소를 알려주세요. 과거 여수 출발 금액을 용인 출발 역방향이나 다른 차종의 확정 요금으로 적용하지 않습니다."
  }
];
function createRegionalEvidenceJourneys({reviewedRides,publishedCases,regionByFullName,servicePath,owners,esc}){
 const publicById=new Map(reviewedRides.filter(x=>x.verified===true&&x.status==='completed'&&x.service==='taksong').map(x=>[identifier(x),x]));
 const publishedById=new Map(publishedCases.map(x=>[x.id,x]));
 const map=new Map();
 for(const p of plans){
  const id=identifier({...p,service:'taksong'}),source=publicById.get(id),published=publishedById.get(id);
  const from=regionByFullName.get(p.fromRegion),to=regionByFullName.get(p.toRegion);
  if(!source||!published||published.service!=='taksong'||published.path!=='/reviews/verified/'+id+'/'||
     published.rideDate!==source.date||published.departure!==source.departure||published.destination!==source.destination||published.fare!==source.fare||
     !owners[published.path]||!from||!to||servicePath(from,'taksong')!==p.fromPath||servicePath(to,'taksong')!==p.toPath||
     !owners[p.fromPath]||!owners[p.toPath])continue;
  map.set(p.fromRegion,{p,source,published,origin:true,other:p.toPath,note:p.fromNote});
  map.set(p.toRegion,{p,source,published,origin:false,other:p.fromPath,note:p.toNote});
 }
 function render(r,kind){
  if(kind!=='taksong')return '';
  const item=map.get(r.full_name);if(!item)return '';
  const {source,published,origin,other,note}=item;
  const role=origin?'출발':'도착';
  const quote='/fare/?'+new URLSearchParams({service:'taksong',from:source.departure,to:source.destination});
  return '<section id="regional-source-directed-journey-20261125" aria-label="'+esc(r.full_name+' 공개 운행 '+role+' 안내')+'"><h2>'+esc(r.name+' 자동차탁송 실제 '+role+' 기록과 예약 준비')+'</h2>'+
   '<p><a href="'+esc(published.path)+'">'+esc(source.departure+' → '+source.destination)+'</a> · <time datetime="'+esc(source.date)+'">'+esc(source.date)+'</time> · 당시 '+esc(source.fare)+' · 이 지역 '+role+' 기록</p>'+
   '<p>'+esc(note)+'</p><p><a href="'+esc(quote)+'">기록 구간 현재 예상요금 조회</a> · <a href="'+esc(other)+'">'+esc((origin?source.destination:source.departure)+' '+(origin?'도착':'출발')+' 지역 안내')+'</a></p>'+
   '<p>기록 금액은 당시 요금입니다. 역방향은 별도 견적이며 실제 차량 위치를 입력해야 합니다.</p></section>';
 }
 return {render,size:map.size,regions:[...map.keys()]};
}
module.exports={createRegionalEvidenceJourneys,plans};
