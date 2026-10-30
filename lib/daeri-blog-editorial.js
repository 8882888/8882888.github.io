'use strict';
// Curated editorial layer: use only existing Naver links, not copied blog bodies,
// fabricated hashtags, completed rides, synthetic photos, or thin new URLs.
const originalPosts=require('../blog/posts.json');
const byId=new Map(originalPosts.map(p=>[String(p.id),p]));
const travelGuides=require('./daeri-travel-guides');
const provinces=[
 {region:'서울특별시',title:'서울대리운전｜강남·서초·도심 심야와 프리미엄 예약',summary:'강남 업무지구와 도심 모임 후 귀가할 때는 주차장 층·출구, 출발 희망 시각과 도착 주소를 구분해 알려주세요.',tip:'수입차·고급차나 법인 이용은 차종, 기사 복장 요청, 결제 방식과 경유·대기 조건을 예약 전에 함께 확인합니다.',ids:['224386422952','224384384911','224445462278']},
 {region:'부산광역시',title:'부산대리운전｜해운대·광안리·기장과 장거리 귀가',summary:'해운대·광안리·기장 지역은 해안 상권의 차량 주차 위치와 기사 만남 장소를 미리 정하는 것이 중요합니다.',tip:'부산에서 서울·경남 등 타 지역으로 이동하는 장거리 운행은 출발 시간과 운행 종료 후 기사 복귀 여건을 함께 상담하세요.',ids:['224452970245','224445462278']},
 {region:'대구광역시',title:'대구대리운전｜수성구·범어동·동성로·골프장 왕복',summary:'수성구·범어동 업무 및 골프 일정은 편도 대리운전과 라운딩 중 대기하는 왕복 일일기사의 요금 조건이 다릅니다.',tip:'골프장 출발·도착 예정 시각, 클럽하우스 대기 시간, 식대와 도착지까지의 운행 범위를 예약 시 구분해 주세요.',ids:['224451280349','224417611971','224445451429']},
 {region:'인천광역시',title:'인천대리운전｜송도·주안·강화도·섬 지역 예약',summary:'인천 도심 주차장 출발과 강화군의 외곽 펜션·해안 출발은 기사 접근 조건이 크게 다를 수 있습니다.',tip:'강화도 관광지·펜션은 정확한 도로명주소와 귀가 목적지를, 인천↔지방 장거리는 희망 시간과 기사 복귀 조건을 알려주세요.',ids:['224445451429','224415862069','224404751909']},
 {region:'광주광역시',title:'광주대리운전｜상무지구·첨단·동명동과 전남 장거리',summary:'광주광역시의 도심 식사·모임 후 이동과 전남 시·군으로 향하는 장거리 운전은 차량 위치와 목적지를 분리해 안내해야 합니다.',tip:'광산구·서구·북구·동구·남구의 정확한 출발 위치, 귀가 시각, 경유지와 동승 여부를 먼저 확인하세요.',ids:[]},
 {region:'대전광역시',title:'대전대리운전｜둔산·유성·봉명동 심야 귀가',summary:'대전 도심과 유성 지역에서는 상가 밀집 구역의 만남 장소와 차량 주차장 출구를 구체적으로 알려주세요.',tip:'대전에서 세종·충남·충북으로 이동하는 장거리 운행은 시외 목적지와 종료 시각, 기사 복귀 여건을 확인합니다.',ids:[]},
 {region:'울산광역시',title:'울산대리운전｜삼산·언양·울주군 외곽과 장거리',summary:'울산 도심 모임과 울주군 외곽·산업단지 주변 출발은 기사 접근 시간과 출차 동선을 함께 확인해야 합니다.',tip:'울산에서 부산·경남·경북으로 이동하는 예약은 출발지 주차구역, 차량 종류, 귀가 시간과 경유지를 알려주세요.',ids:[]},
 {region:'세종특별자치시',title:'세종대리운전｜업무지구·정부청사·일일기사 예약',summary:'세종의 정부청사·업무시설 출발은 건물 출입구와 차량 주차 위치를 구분하고 업무 종료 시각을 확인해 주세요.',tip:'일일기사·출장 운전은 편도 이동과 달리 대기 시간, 여러 경유지, 종료 위치 및 식대 조건을 따로 협의해야 합니다.',ids:['224446554098']},
 {region:'경기도',title:'경기도대리운전｜수원·용인·가평·포천·화성 외곽',summary:'경기도 시내 귀가와 가평 펜션·포천 관광지·서해안 항구 출발은 기사 도착 및 운행 후 복귀 조건이 다릅니다.',tip:'산정호수·가평·궁평항 등 외곽 이용은 정확한 주차장과 출발 시각을, 골프장 왕복은 현장 대기 시간까지 전달하세요.',ids:['224452992697','224446435922','224430960127','224395897045']},
 {region:'강원특별자치도',title:'강원도대리운전｜양양 인구해변·강원랜드·정선 심야',summary:'양양 해변과 속초·강릉 관광지, 정선 강원랜드 주변은 주말·야간 이용 시 기사 수급과 외곽 복귀 이동을 고려해야 합니다.',tip:'관광지·리조트·숙소의 실제 주차 위치를 확인하고 새벽·장거리 이동은 날짜와 목적지를 미리 상담해 주세요.',ids:['224420736659','224365575850','224364697651']},
 {region:'충청북도',title:'충북대리운전｜청주·충주·제천·단양 장거리',summary:'충북의 도심 출발과 제천·단양 등 외곽 관광지 출발은 기사 접근 및 복귀 교통편을 별도로 확인해야 합니다.',tip:'청주·충주·제천의 정확한 출발 위치와 다른 시·도로 향하는 도착지, 출발 희망 시각을 예약 전에 알려주세요.',ids:[]},
 {region:'충청남도',title:'충남대리운전｜천안·아산·당진·서산·부여·해안',summary:'충남 내륙 모임과 서해안 항구·관광지 출발은 차량 위치, 진입로와 운행 종료 후 복귀 조건을 함께 확인해야 합니다.',tip:'삼길포·당진·서산·부여처럼 외곽 출발지는 당일 심야 호출보다 출발 예정 시각을 미리 알려주는 것이 좋습니다.',ids:['224452987205','224373790358']},
 {region:'전북특별자치도',title:'전북대리운전｜전주·군산·익산·남원·무주',summary:'전주의 도심 약속 후 귀가와 군산·익산·무주 등 시·군 간 장거리 이동은 출발 위치와 목적지를 정확히 확인해야 합니다.',tip:'무주·덕유산 등 산간·관광지 출발은 기사 접근·복귀 여건에 따라 배차가 달라질 수 있으므로 예정 시각을 먼저 알려주세요.',ids:[]},
 {region:'전라남도',title:'전남대리운전｜목포·여수·순천·고흥·완도 장거리',summary:'전남의 항구·관광지·시외 출발은 운행 거리 외에 기사 복귀 이동이 주요 예약 조건입니다.',tip:'목포·여수·순천·고흥·완도 등에서 서울이나 다른 지역으로 장거리 귀가할 경우 차량 위치·출발 시각·경유지를 미리 확인해 주세요.',ids:['224381997772','224388328571']},
 {region:'경상북도',title:'경북대리운전｜포항·경주·구미·안동·청송 외곽',summary:'경북의 도심 모임과 동해안·내륙 산간 관광지 출발은 기사 접근 경로와 돌아갈 교통편이 서로 다릅니다.',tip:'포항·경주·구미·안동·청송의 정확한 차량 주차 위치와 최종 도착지, 운행 종료 예정 시간을 알려주세요.',ids:[]},
 {region:'경상남도',title:'경남대리운전｜창원·김해·양산·진주·거제 장거리',summary:'창원·김해·양산의 시내 출발과 거제·남해안 숙소 출발은 기사 접근·복귀 환경을 구분해 예약해야 합니다.',tip:'부산·울산·수도권 방향 장거리는 도착 주소와 출발 시각, 차량 종류, 경유·대기 여부를 함께 알려주세요.',ids:[]},
 {region:'제주특별자치도',title:'제주대리운전｜제주시·서귀포·숙소·관광지 예약',summary:'제주에서 관광지·숙소로 이동하는 경우 도착지보다 실제 차량 주차 위치와 기사 만남 장소가 먼저 확인되어야 합니다.',tip:'제주시·서귀포시의 출발지와 이동 시각, 차량 종류를 상담하되 제주 지역의 배차 가능 여부와 최종 요금은 개별 확인해야 합니다.',ids:[]}
];
// Distinct verified place-name themes; editorial suggestions, not original blog hashtags.
const localCulture={
 '서울특별시':{food:'광장시장 먹거리·종로 골목식당',places:'북촌·남산·한강공원',tags:['#서울대리운전','#광장시장','#북촌한옥마을','#남산','#종로맛집']},
 '부산광역시':{food:'동래파전·기장 해산물·자갈치시장',places:'동래읍성·해운대·광안리·기장 바다',tags:['#부산대리운전','#동래파전','#동래읍성','#해운대','#부산맛집']},
 '대구광역시':{food:'서문시장 먹거리·동성로 맛집',places:'수성못·동성로·앞산 전망',tags:['#대구대리운전','#서문시장','#동성로','#수성못','#대구맛집']},
 '인천광역시':{food:'강화도 장어구이·소래포구 해산물',places:'송도 센트럴파크·강화 동막해변',tags:['#인천대리운전','#강화도여행','#송도센트럴파크','#소래포구','#강화도맛집']},
 '광주광역시':{food:'양림동 식사 골목·송정역시장 먹거리',places:'무등산·양림동 역사문화마을·국립아시아문화전당',tags:['#광주대리운전','#무등산','#양림동','#송정역시장','#광주맛집']},
 '대전광역시':{food:'중앙시장 먹거리·유성온천 일대 식당',places:'한밭수목원·유성온천·계족산',tags:['#대전대리운전','#유성온천','#한밭수목원','#중앙시장','#대전맛집']},
 '울산광역시':{food:'언양불고기·방어진 해산물',places:'태화강국가정원·대왕암공원·간절곶',tags:['#울산대리운전','#언양불고기','#태화강국가정원','#대왕암공원','#울산맛집']},
 '세종특별자치시':{food:'조치원 전통시장 먹거리',places:'세종호수공원·국립세종수목원',tags:['#세종대리운전','#조치원시장','#세종호수공원','#국립세종수목원','#세종맛집']},
 '경기도':{food:'가평 잣요리·화성 궁평항 수산물',places:'포천 산정호수·궁평항 서해 낙조·가평 계곡',tags:['#경기도대리운전','#산정호수','#궁평항','#가평계곡','#경기도맛집']},
 '강원특별자치도':{food:'속초 항구 회·강릉 바다 카페·산간 식당',places:'대포항·동명항·설악항·설악산·강릉 안목해변',tags:['#강원도대리운전','#대포항','#동명항','#설악항','#속초맛집']},
 '충청북도':{food:'청주 육거리시장 먹거리·충주 지역 식당',places:'청남대·충주호·단양 도담삼봉',tags:['#충북대리운전','#청남대','#충주호','#도담삼봉','#청주맛집']},
 '충청남도':{food:'서산 삼길포항 우럭회·천안 호두과자',places:'삼길포항 선상어시장·부여 궁남지·당진 왜목마을',tags:['#충남대리운전','#삼길포항','#삼길포우럭회','#궁남지','#충남여행']},
 '전북특별자치도':{food:'전주비빔밥·한옥마을 먹거리',places:'전주한옥마을·군산 근대역사거리·무주 덕유산',tags:['#전북대리운전','#전주비빔밥','#전주한옥마을','#덕유산','#전북여행']},
 '전라남도':{food:'목포 항구 음식·여수 해산물·순천 남도 음식',places:'여수 해안·순천만국가정원·목포항',tags:['#전남대리운전','#여수밤바다','#순천만국가정원','#목포항','#전남맛집']},
 '경상북도':{food:'포항 죽도시장 해산물·경주 황리단길 식당',places:'경주 대릉원·황리단길·영덕 해맞이공원',tags:['#경북대리운전','#죽도시장','#황리단길','#대릉원','#경북여행']},
 '경상남도':{food:'통영 중앙시장 해산물·진주 냉면',places:'창원 진해 군항·통영 동피랑·거제 바다',tags:['#경남대리운전','#통영중앙시장','#동피랑','#거제여행','#경남맛집']},
 '제주특별자치도':{food:'동문시장 먹거리·제주 해산물',places:'성산일출봉·함덕해변·서귀포 올레길',tags:['#제주대리운전','#동문시장','#성산일출봉','#함덕해변','#제주여행']}
};
if(provinces.some(p=>!localCulture[p.region])||Object.keys(localCulture).length!==provinces.length)throw Error('Missing cultural profile');
const featured=[
 {name:'전국·장거리 대리운전',intro:'도시 간 이동이나 관광지 심야 귀가에서 필요한 예약 정보입니다.',ids:['224431732696','224445451429','224452970245','224452992697']},
 {name:'강남·프리미엄·법인 대리운전',intro:'차량 종류와 업무 일정, 법인 결제 방식 등은 이용 전에 확인하세요.',ids:['224386422952','224371958009']},
 {name:'골프장·왕복 일일기사',intro:'편도 대리운전과 하루 동안 대기하는 기사 일정의 차이를 살펴보세요.',ids:['224451280349','224417611971','224445462278']},
 {name:'관광지·외곽·새벽 대리운전',intro:'해안·산간·펜션·리조트의 출발 위치와 기사 복귀 여건을 확인하세요.',ids:['224420736659','224365575850','224452987205']}
];
function sourcePost(id){
 const p=byId.get(id);
 if(!p||!/^https:\/\/blog\.naver\.com\/wjdtnr4757\/\d+$/.test(p.url)||
    !/대리운전|일일기사/.test(p.title))
   throw Error('Unverified designated-driver source: '+id);
 return p;
}
for(const profile of provinces)for(const id of profile.ids)sourcePost(id);
for(const section of featured)for(const id of section.ids)sourcePost(id);
function sourceList(ids,esc){
 return '<ul class="daeri-blog-links">'+ids.map(id=>{
  const p=sourcePost(id);
  return '<li><a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer">'+esc(p.title)+'</a> <small>네이버 블로그 원문</small></li>';
 }).join('')+'</ul>';
}
function national(regions,servicePath,esc){
 const byName=new Map(regions.map(r=>[r.full_name,r]));
 const cards=provinces.map(x=>{
  const r=byName.get(x.region);if(!r)throw Error('Missing nationwide province: '+x.region);
  return '<li><a href="'+esc(servicePath(r,'daeri'))+'">'+esc(x.title)+'</a><p>'+esc(x.summary)+'</p><p>먹거리: '+esc(localCulture[x.region].food)+' / 관광: '+esc(localCulture[x.region].places)+'</p></li>';
 }).join('');
 return '<section id="national-daeri-blog-editorial"><h2>전국대리운전 지역별 블로그형 안내｜17개 시·도</h2>'+
 '<p>실제 네이버 블로그에서 사용한 지역명과 대리운전·일일기사 주제를 토대로 전국 지역을 연결합니다. 아래 지역별 내용은 예약 준비 안내이며 기사 상주·즉시 배차 또는 특정 운행 완료를 주장하지 않습니다.</p>'+
 '<p><a href="/travel/food-map/">전국 맛집·여행지도에서 17개 시·도별 먹거리·관광지를 찾고, 지역별 대리운전·탁송 이용 조건을 확인하세요.</a></p><ul class="daeri-regional-editorial-index" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;list-style:none;padding:0">'+cards+'</ul>'+travelGuides.linksForNational(esc)+
 featured.map(x=>'<section class="daeri-blog-feature"><h3>'+esc(x.name)+' · 기존 네이버 블로그 글</h3><p>'+esc(x.intro)+'</p>'+sourceList(x.ids,esc)+'</section>').join('')+
'<p><strong>월요일 및 기상 악화 시 안내:</strong> 월요일 중 일부 시간대나 폭우·강풍·폭설 등 악천후에 지방 외곽과 관광지에서 대리운전 기사 배정이 지연되거나 안전상 배차가 어려울 수 있습니다. 월요일마다 지연된다는 뜻은 아니며 시간대와 실제 기사 수급·도로 상태에 따라 다릅니다.</p>'+
 '<p><strong>원문 확인 안내:</strong> 게시글 제목에 포함된 당시 요금·연락처·운행완료 표현은 과거 원문 그대로이며, 이를 현재 스마트24의 확정 요금이나 검증 완료 운행기록으로 간주하지 않습니다. 현재 배차 문의는 <a href="tel:18114294">1811-4294</a>로 확인해 주세요.</p></section>';
}
function province(r,children,servicePath,esc){
 const x=provinces.find(p=>p.region===r.full_name);
 if(!x)return '';
 const links=children.slice(0,60).map(y=>'<li><a href="'+esc(servicePath(y,'daeri'))+'">'+esc(y.name)+' 대리운전</a></li>').join('');
 const source=x.ids.length?'<h3>'+esc(r.name)+' 관련 실제 네이버 블로그 원문</h3><p>게시글의 제목과 원문 링크를 연결했습니다. 원문만으로 현재 예약 가능 여부나 운행 완료 실적을 확정하지 않습니다.</p>'+sourceList(x.ids,esc):
 '<p>현재 저장된 블로그 목록에는 이 시·도 전용 제목으로 검증해 연결할 원문이 부족하여, 확인되지 않은 후기를 추가하지 않았습니다.</p>';
 return '<section class="province-daeri-blog-guide" id="province-daeri-blog-guide"><h2>'+esc(x.title)+'</h2>'+
 '<p>'+esc(x.summary)+'</p><h3>지역의 맛집·먹거리와 관광 특색</h3><p>지역 먹거리: '+esc(localCulture[x.region].food)+'</p><p>주요 관광·산책 장소: '+esc(localCulture[x.region].places)+'</p><p>이름을 소개한 곳의 현재 영업·입장 여부와 특정 업체 제휴는 확인된 사실이 아닙니다. 방문 전 현지 정보를 확인해 주세요.</p><p><a href="/travel/food-map/">전국 맛집·여행지도에서 지역별 대리운전·탁송 함께 찾기</a></p><p><strong>관련 홈페이지 주제 키워드:</strong> '+localCulture[x.region].tags.map(esc).join(' ')+'</p><h3>이 지역에서 대리운전 예약할 때</h3><p>'+esc(x.tip)+'</p>'+travelGuides.linksForProvince(x.region,esc)+
 source+'<h3>지역별 대리운전 안내 선택</h3><ul style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:5px 15px">'+links+'</ul>'+
 '<p>전국 장거리·골프장·법인·일일기사 이용 전에는 <a href="/daeri/">전국 대리운전 안내</a>와 <a href="/fare/?service=daeri">대리운전 예상요금 조회</a>를 참고하세요. 최종 요금과 기사 배정 가능 여부는 <a href="tel:18114294">1811-4294</a>로 상담합니다.</p></section>';
}
module.exports={national,province,provinces,featured,sourcePost,localCulture};
