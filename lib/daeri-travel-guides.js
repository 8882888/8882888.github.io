'use strict';
// Destination-first editorial information for service visitors.
// Historical Naver source links are not copied and are not treated as verified rides.
const posts=require('../blog/posts.json');
const originals=new Map(posts.map(p=>[p.id,p]));
const destinations=[
 {
  slug:'samgilpo',
  region:'충청남도',
  locality:'충남 서산시 대산읍 삼길포항',
  title:'삼길포항대리운전｜선상어시장·우럭회·삼길산·대호방조제 여행과 귀가 안내',
  summary:'삼길포항 선상어시장, 신선한 횟감, 삼길산·빨간등대와 대호방조제 주변 여행을 소개합니다. 서산 대산읍 삼길포항에서 돌아가는 대리운전 예약 시 차량 위치, 목적지와 기사 복귀 여건을 안내합니다.',
  intro:'서산의 서해안 항구 삼길포항은 선상어시장과 빨간 등대, 삼길산에서 바라보는 바다 경관으로 알려져 있습니다. 하루를 보내며 횟감을 살펴보고 항구를 산책할 수 있지만, 저녁 식사 이후에는 귀가하는 차량의 위치와 운전 계획까지 생각하는 것이 좋습니다.',
  originalPost:'224452987205',
  sections:[
   {heading:'삼길포항 선상어시장과 우럭회',paragraphs:[
    '삼길포항에서 기억에 남는 풍경은 정박한 배와 선상어시장입니다. 어선 위에서 횟감을 살펴볼 수 있다는 점이 일반적인 시내 횟집 방문과 다릅니다. 우럭·노래미·광어 등은 시기와 어획 상황에 따라 구성이 달라지므로, 특정 어종이 항상 판매된다고 예상하기보다 현장에서 물어보는 편이 좋습니다.',
    '삼길포항맛집을 찾아 방문했다면 생선 종류뿐 아니라 손질 방법, 식사할 장소, 상차림 비용과 영업시간을 따로 확인해 주세요. 이곳을 소개하는 목적은 특정 음식점의 영업 상태나 제휴를 보장하는 것이 아니라, 지역 여행과 귀가 계획을 함께 준비하도록 돕는 것입니다.'
   ]},
   {heading:'삼길산 전망대와 대호방조제·빨간등대',paragraphs:[
    '삼길포항은 서산에서 소개하는 경관 명소 가운데 하나입니다. 항구의 빨간 등대와 삼길산의 산책 경관, 인근 대호방조제는 바다를 바라보는 방식이 서로 다릅니다. 전망대를 걸을 계획이라면 현재의 보행로 상태와 날씨를 확인하고, 항구의 어업시설이나 제한 구역에는 들어가지 않아야 합니다.',
    '도비도와 당진 왜목마을은 삼길포항에서 여행 방향을 연장할 때 생각해볼 수 있는 별도 장소입니다. 여행 일정에 경유지를 추가하면 귀가 출발 시각과 실제 출발 주차장도 달라질 수 있으므로 대리운전 접수 때 변경된 구간을 알려주세요.'
   ]},
   {heading:'서산 대산읍 삼길포항에서 출발하는 대리운전',paragraphs:[
    '항구 앞에서 출발하는 차량과 대산읍 시내에서 출발하는 차량은 기사 접근 조건이 다릅니다. 삼길포항대리운전 예약 시에는 주차장 또는 차량이 있는 위치, 희망 출발 시각, 운행 종료 목적지, 차종과 경유지를 먼저 확인합니다.',
    '서산 시내·당진·아산·천안 방향은 물론 다른 시·도까지 장거리대리운전을 문의할 수 있지만, 실제 기사 배정과 최종 요금은 이동 구간, 시간대, 기사 접근·복귀 여건에 따라 상담으로 정해집니다. 선상어시장 방문 중 술을 마셨다면 직접 운전하지 마세요.'
   ]}
  ],
  tags:['#삼길포항대리운전','#서산대리운전','#대산읍대리운전','#삼길포항','#삼길포선상어시장','#삼길포우럭회','#삼길포맛집','#삼길산','#대호방조제','#서산여행','#서산장거리대리운전','#당진대리운전'],
  sources:[{name:'서산시 문화관광 — 삼길포항',url:'https://www.seosan.go.kr/tour/guideView.do?guidanceNo=135&key=6202&langSe=KOR&lclas=TRRSRT&sclas=BEACH'}]
 },
 {
  slug:'gungpyeong',
  region:'경기도',
  locality:'경기 화성시 서신면 궁평항',
  title:'궁평항대리운전｜수산물직판장·서해 낙조·궁평낙조길·해송숲 관광과 귀가',
  summary:'화성 서신면 궁평항의 수산물직판장과 서해 낙조, 바다 전망 산책, 해송숲 주변 여행을 안내합니다. 궁평항에서 수원·안산·화성·서울 등으로 이동할 때 필요한 대리운전 예약 조건을 확인하세요.',
  intro:'궁평항은 서해 낙조와 항구 산책, 수산물직판장을 한 번에 떠올릴 수 있는 화성 서부 해안의 여행지입니다. 일몰을 보려고 도착했다가 식사까지 마치면 귀가 예정 시각이 늦어질 수 있습니다. 여행의 마지막 차량 이동 계획을 주차 위치와 함께 생각해 보세요.',
  originalPost:'224452992697',
  sections:[
   {heading:'궁평항 수산물직판장과 계절별 해산물',paragraphs:[
    '궁평항 수산물직판장은 수산물을 직접 살펴보며 구매할 수 있는 곳입니다. 횟감과 조개류·건어물 등은 계절 및 매장 운영 상황에 따라 달라지므로 방문 전에 판매·포장 가능 여부와 상차림 조건을 확인하는 것이 좋습니다.',
    '가족과 함께 해산물 식사를 즐기거나 서해안 맛집을 찾는 방문객에게는 식사 시간과 차량 귀가가 모두 중요한 일정입니다. 궁평항맛집을 소개할 때 특정 점포의 현재 영업 상태나 주차 가능 여부를 확인하지 않은 채 단정하지 않습니다.'
   ]},
   {heading:'궁평항 일몰, 해상 전망 데크와 궁평낙조길',paragraphs:[
    '궁평항광장과 주변 방파제의 해상 전망 데크는 바다 풍경을 바라볼 수 있는 장소입니다. 궁평낙조길처럼 바닷가를 따라 걷는 구간도 있어 일몰 사진을 찍거나 해안을 둘러보는 일정에 어울립니다. 다만 낙조 모습은 기상과 계절, 실제 일몰 시각에 따라 달라집니다.',
    '궁평 해송숲을 비롯한 해안 산책 장소를 여러 곳 둘러볼 때는 출발 주차장으로 다시 돌아오는 동선을 확인해 두세요. 대리운전 기사는 관광을 마친 위치가 아니라 실제 차량이 있는 곳으로 이동해야 합니다.'
   ]},
   {heading:'서신면·전곡항·제부도와 궁평항대리운전 예약',paragraphs:[
    '전곡항과 제부도, 백미리어촌체험마을은 화성의 서해안 여행 일정을 확장할 때 함께 고려할 수 있는 별도 장소입니다. 각각의 차량 이동과 현장 상황이 다르므로 경유와 마지막 귀가 출발지를 구분해 알려주세요. 제부도 진입 등은 당일 교통 상황과 통제 정보를 확인해야 합니다.',
    '화성 서신면 궁평항에서 수원·안산·시흥·향남·동탄 또는 수도권 다른 지역으로 귀가하는 경우 출발지의 정확한 주차구역, 출발 희망 시각, 최종 목적지, 차량 종류를 확인합니다. 해안 관광지의 심야 배차는 기사 접근·복귀에 따라 다를 수 있으며, 사전 상담도 즉시 배차를 보장하지는 않습니다. 음주 뒤에는 직접 운전하지 않아야 합니다.'
   ]}
  ],
  tags:['#궁평항대리운전','#화성대리운전','#서신면대리운전','#궁평항','#궁평항맛집','#궁평항수산물직판장','#궁평항낙조','#궁평낙조길','#궁평해송숲','#화성여행','#전곡항대리운전','#제부도대리운전'],
  sources:[
   {name:'한국관광공사 — 궁평항 수산물직판장',url:'https://access.visitkorea.or.kr/ms/detail.do?cotId=c5f43c8c-ba98-46ba-8228-6694d2209545'},
   {name:'한국관광공사 — 궁평항광장',url:'https://access.visitkorea.or.kr/ms/detail.do?cotId=2d802146-3f5d-418d-ba97-b09a5338e46b'}
  ]
 }
];
const bySlug=new Map(destinations.map(x=>[x.slug,x]));
function pathFor(x){return '/daeri/travel/'+x.slug+'/'}
function original(x){
 const p=originals.get(x.originalPost);
 if(!p||!/^https:\/\/blog\.naver\.com\/wjdtnr4757\/\d+$/.test(p.url))throw Error('Missing trusted Naver origin for destination '+x.slug);
 return p;
}
for(const x of destinations){
 original(x);
 if(new Set(x.tags).size!==x.tags.length||x.tags.some(t=>!/^#[\p{L}\p{N}_]{2,45}$/u.test(t)))throw Error('Invalid topical hashtags: '+x.slug);
}
function linksForProvince(region,esc){
 const matches=destinations.filter(x=>x.region===region);
 if(!matches.length)return '';
 return '<section id="local-travel-driver-guides"><h3>맛집·관광지로 찾는 지역 대리운전</h3><p>여행지의 특징을 알아보고 현장 주차 위치와 귀가 시간을 확인하는 지역 안내입니다. 원문 게시글과 현재 예약 조건은 구분합니다.</p><ul>'+matches.map(x=>'<li><a href="'+pathFor(x)+'">'+esc(x.title)+'</a> · '+esc(x.locality)+'</li>').join('')+'</ul></section>';
}
function linksForNational(esc){
 return '<section id="tourism-driver-editorial"><h3>맛집·관광지·바다 여행에서 찾는 대리운전</h3><p>지역명뿐 아니라 항구의 음식과 풍경, 여행 후 안전한 귀가를 함께 설명합니다. 원문에 없는 운행후기나 음식점 이용 경험은 만들지 않습니다.</p><ul>'+destinations.map(x=>'<li><a href="'+pathFor(x)+'">'+esc(x.title)+'</a></li>').join('')+'</ul></section>';
}
function page(slug,{layout,esc,host}){
 const x=bySlug.get(slug);
 if(!x)return null;
 const p=original(x),canonical='https://'+host+pathFor(x);
 const sources=x.sources.map(s=>'<li><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.name)+'</a></li>').join('');
 const sections=x.sections.map(section=>'<section><h2>'+esc(section.heading)+'</h2>'+section.paragraphs.map(p=>'<p>'+esc(p)+'</p>').join('')+'</section>').join('');
 const tags='<section aria-label="관련 여행·지역 키워드"><h2>관련 지역·맛집·관광지 해시태그</h2><p>아래 해시태그는 홈페이지의 내용별 탐색 주제이며, 네이버 블로그 원문에서 수집한 해시태그 목록은 아닙니다. 실제로 다루는 장소만 표시합니다.</p><p>'+x.tags.map(esc).join(' ')+'</p></section>';
 const body='<article class="daeri-travel-guide"><nav aria-label="위치 안내"><a href="/">홈</a> / <a href="/daeri/">전국대리운전</a> / <a href="'+(x.region==='경기도'?'/daeri/gyeonggi/':'/daeri/chungnam/')+'">'+esc(x.region)+'대리운전</a></nav>'+
 '<h1>'+esc(x.title)+'</h1><p><strong>'+esc(x.locality)+'</strong></p><p>'+esc(x.intro)+'</p>'+sections+
 '<section><h2>기존 네이버 블로그 원문에서 더 보기</h2><p>운영 중인 번개탁송대리운전 블로그의 실제 공개 글 제목과 링크입니다. 본문을 복제하지 않고 원문으로 이동하도록 연결했습니다.</p><p><a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer">'+esc(p.title)+'</a></p></section>'+
 tags+'<section><h2>관광지 정보 참고 자료</h2><ul>'+sources+'</ul><p>여행지 운영·기상·교통 정보는 변경될 수 있습니다. 방문 전 현지 운영기관에서 확인하세요.</p></section>'+
 '<section><h2>현재 대리운전 예약 상담</h2><p>현재 요금과 기사 배정은 출발지 차량 위치, 최종 목적지, 출발 시간, 차종, 경유·대기 여부를 확인해야 안내할 수 있습니다. 예전 블로그의 전화번호나 게시 당시 요금과 현재 스마트24 예약 조건은 다릅니다. 대리운전과 자동차탁송은 서로 다른 서비스입니다.</p><p><a href="tel:18114294">스마트24 대표 상담 1811-4294</a> · <a href="/fare/?service=daeri">대리운전 예상요금 조회</a> · <a href="/daeri/">전국 지역별 대리운전 안내</a></p></section></article>';
 return layout(x.title+' | 스마트24 전국대리운전',x.summary,body,canonical);
}
module.exports={destinations,pathFor,linksForProvince,linksForNational,page,original};
