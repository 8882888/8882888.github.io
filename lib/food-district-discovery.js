'use strict';
// Publicly discoverable venue names and broad neighborhoods. Not Naver Place
// verification, an endorsement, a commercial relationship, or trip evidence.
const guides=[
 {slug:'busan',city:'부산',district:'서면·광안리',region:'/daeri/busan/',venues:[
  ['푸주인 서면점','부산진구 부전동 가야대로784번길','돼지고기 구이','서면역 주변에서는 차량이 있는 주차장 출입구와 일방통행 방향을 먼저 확인합니다.'],
  ['제줏간 부산서면점','부산진구 중앙대로691번가길','돼지고기 구이','식사 장소와 차량 주차 위치가 다른 경우 건물명과 지하 주차층을 구분합니다.'],
  ['고베규카츠 광안리점','수영구 남천바다로','규카츠·일식','광안리 해변 주변에서는 차가 실제로 있는 유료주차장 출구와 만나기로 한 도로를 구분합니다.']]},
 {slug:'daegu',city:'대구',district:'동성로·수성못',region:'/daeri/daegu/',venues:[
  ['미진분식','중구 동성로','김밥·우동·쫄면','동성로 보행 구역과 인근 유료주차장 위치를 구분해 차량 인수 장소를 알려주세요.'],
  ['다나 대구동성로본점','중구 동성로2길','파스타·양식','동성로 골목 상권은 도보 방문 위치와 자동차 출차 장소가 다를 수 있습니다.'],
  ['샤브20 수성못점','수성구 무학로','샤브샤브','수성못 주변은 주차 구역과 출입구 방향을 정확히 전달해 주세요.']]},
 {slug:'ulsan',city:'울산',district:'삼산동',region:'/daeri/ulsan/',venues:[
  ['외식명가 삼산정','남구 화합로','한우·갈비','삼산동 식당과 숙박·상업시설의 차량 위치가 다를 수 있으므로 주차 건물명을 확인합니다.'],
  ['두울원 삼산점','남구 삼산중로84번길','칼국수·수제비','상가 골목에서는 주차장 출구 또는 차량이 정차한 도로명을 알려주세요.'],
  ['홍익돈까스 울산삼산점','남구 돋질로','돈까스','매장 주소를 그대로 기사 인수 위치로 쓰지 말고 실제 주차 위치를 확인합니다.']]},
 {slug:'changwon',city:'창원',district:'상남동',region:'/daeri/gyeongnam/changwon-si/',venues:[
  ['맛찬들왕소금구이 창원상남점','성산구 상남동 원이대로682번길 일대','숙성 돼지고기 구이','상남동 상업지구에서는 주차장 층과 출차 방향, 목적지를 함께 알려주세요.']]},
 {slug:'daejeon',city:'대전',district:'둔산동·봉명동',region:'/daeri/daejeon/',venues:[
  ['원조태평소국밥 둔산점','서구 둔산로31번길','소국밥','둔산동 도심 상가에서는 주차 건물명과 차량 위치를 별도로 전달합니다.'],
  ['상무초밥 대전둔산직영점','서구 둔산로31번길','초밥','식사 장소와 실제 차량이 있는 곳을 구분하여 배차 시 혼선을 줄입니다.'],
  ['맛찬들왕소금구이 봉명점','유성구 봉명동','돼지고기 구이','봉명동 숙박·음식 상권은 주차 건물의 정확한 출구를 확인해 주세요.']]}
];
function page(slug,{layout,esc,host}){
 const guide=guides.find(g=>g.slug===slug);if(!guide)return null;
 const route='/daeri/food-district/'+slug+'/';
 const title=guide.city+' '+guide.district+' 음식점·식사 상권 안내와 대리운전 귀가 준비 | 스마트24';
 const desc=guide.city+' '+guide.district+' 실제 매장 이름과 음식 종류, 주차장 차량 인수 위치 확인과 대리운전 상담 안내. 제휴 및 운행 실적을 의미하지 않습니다.';
 const item=guide.venues.map(v=>'<li><h3>'+esc(v[0])+'</h3><p>지역: '+esc(v[1])+' / 음식: '+esc(v[2])+'</p><p>'+esc(v[3])+'</p></li>').join('');
 const nav=guides.map(g=>'<a href="/daeri/food-district/'+g.slug+'/">'+esc(g.city+' '+g.district)+'</a>').join(' · ');
 const body='<article><h1>'+esc(guide.city+' '+guide.district+' 음식점과 대리운전 귀가 준비')+'</h1>'+
 '<p>지역 상권을 찾는 방문자를 위한 음식·차량 이동 정보입니다. 아래 상호는 공개된 외부 매장 정보에서 참고한 예시이며 네이버 플레이스 등록·최신 영업 상태까지 보증하지 않습니다. 제휴 식당·실제 운행 후기·추천 순위가 아닙니다. 방문 전 지도 서비스와 매장 공식 안내를 확인해 주세요.</p>'+
 '<h2>상권별 음식점 이름과 음식 종류</h2><ul>'+item+'</ul>'+
 '<h2>식사 후 차량을 안전하게 이동하려면</h2><ol><li>차량이 있는 주차장 건물명과 층·출구를 먼저 확인하세요.</li><li>대리운전 요청 시 출발 주소·목적지·희망시각·차종·경유 여부를 알려주세요.</li><li>지하 주차장 출차비·주차 정산·대기 여부를 확인하고 현재 요금과 기사 수급을 상담하세요.</li><li>음주 시 운전하지 말고 대중교통이나 대리운전을 이용하세요.</li></ol>'+
 '<p><a href="'+esc(guide.region)+'">'+esc(guide.city+' 대리운전 지역 안내')+'</a> · <a href="/fare/?service=daeri">예상요금 확인</a> · <a href="/recruit/daeri/">대리기사 지원 안내</a> · <a href="tel:18114294">전화 상담 1811-4294</a></p>'+
 '<h2>다른 지역 식사 상권</h2><nav aria-label="다른 도시 음식상권">'+nav+'</nav>'+
 '<p><small>음식점 정보 확인 기준 2026년 11월. 상호명·메뉴·운영 상태는 변할 수 있으며 특정 업체와의 제휴 또는 실제 완료 운행을 뜻하지 않습니다.</small></p></article>';
 return layout(title,desc,body,'https://'+host+route);
}
module.exports={guides,page};
