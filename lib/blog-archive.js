'use strict';
// An editorial navigation directory of the owner's published Naver posts.
// We link original posts rather than duplicating article bodies or claiming
// a title alone verifies a completed job. Source records are left untouched.
const raw=require('../blog/posts.json');
const posts=raw.filter(p=>p&&typeof p.title==='string'&&/^https:\/\/blog\.naver\.com\/wjdtnr4757\/\d+$/.test(p.url));
const groups=[
 {id:'mountain-cycle',name:'설악산·지리산·자전거 종주 탁송',keywords:'설악산탁송 · 지리산탁송 · 오색탁송 · 자전거종주탁송',intro:'등산 출발지와 하산지, 인증센터 사이에서 차량을 옮길 때는 인수·인계 장소, 주차장 이용 조건과 기사 복귀를 확인해야 합니다.'},
 {id:'golf-corporate-daily',name:'골프장·법인대리운전·일일기사',keywords:'골프장대리운전 · 법인대리운전 · 일일기사 · 장거리 왕복',intro:'골프장 편도 대리운전과 왕복 일일기사는 다릅니다. 출발 시각, 라운딩 후 대기 시간, 경유지, 식대 및 비용 범위를 예약 전에 확인하세요.'},
 {id:'general-daeri',name:'전국·장거리·지역별 대리운전',keywords:'전국대리운전 · 장거리대리운전 · 부산대리운전 · 대구대리운전',intro:'지역에 따라 기사의 접근 및 복귀 여건이 다릅니다. 차량 주차 위치, 도착지, 희망 시각, 경유 여부를 알려주시면 상담에 도움이 됩니다.'},
 {id:'capital-taksong',name:'서울·경기·인천 자동차탁송',keywords:'서울탁송 · 경기탁송 · 인천탁송 · 수도권탁송',intro:'수도권 출발과 도착은 주차장 인수·인계 동선, 차량 종류, 출고 가능 시각과 도로 혼잡 조건을 구분해 준비하세요.'},
 {id:'gangwon-taksong',name:'강원도 자동차탁송',keywords:'강원도탁송 · 둔내탁송 · 횡성탁송 · 속초탁송',intro:'강원 내륙과 동해안은 기사 접근 및 복귀 교통편에 차이가 있습니다. 외곽 주차장, 산간 지역, 야간 예약은 사전 상담을 권합니다.'},
 {id:'gyeongsang-taksong',name:'부산·대구·경상 자동차탁송',keywords:'부산탁송 · 대구탁송 · 경상북도탁송 · 경상남도탁송',intro:'부산 항만과 경상권 도심·외곽의 차량 인계 장소를 구체적으로 정하고 출고 시간 제한이 있는지 확인해 주세요.'},
 {id:'jeolla-taksong',name:'광주·전북·전남 자동차탁송',keywords:'광주탁송 · 전북탁송 · 전남탁송 · 목포탁송',intro:'도심·산단·항구·농촌 지역은 기사 복귀 이동이 달라집니다. 출발지와 도착지의 실제 인수 장소를 먼저 확정해 주세요.'},
 {id:'chungcheong-taksong',name:'대전·세종·충청 자동차탁송',keywords:'충청남도탁송 · 충청북도탁송 · 대전탁송 · 세종탁송',intro:'충청권의 산업단지·역세권·외곽 차량 이동은 인수·인계 담당자와 가능 시간을 미리 확인해 주세요.'},
 {id:'jeju-taksong',name:'제주도 자동차탁송',keywords:'제주탁송 · 제주도탁송 · 차량탁송',intro:'제주도 차량 이동은 일반 내륙 구간과 달리 선적 및 인계 조건 등이 달라질 수 있으므로 일정과 가능 여부를 개별 상담해야 합니다.'},
 {id:'vehicle-taksong',name:'중고차·수입차·서비스센터·경매장 탁송',keywords:'중고차탁송 · 서비스센터탁송 · 경매장탁송 · 렌트카탁송',intro:'차량 출고와 반납에는 담당자, 차종, 인수 가능 시간, 차량 상태와 키 전달 방법의 사전 확인이 필요합니다.'},
 {id:'other-taksong',name:'실제 탁송후기 및 기타 서비스 정보',keywords:'전국자동차탁송 · 장거리탁송 · 차량운행후기',intro:'여러 지역과 차종을 다룬 공개 글입니다. 제목에 후기나 운행완료가 있어도 완료 여부와 당시 요금은 원문과 검증된 운행기록을 구분해 확인해 주세요.'}
];
function groupOf(p){
 const c=String(p.category||''),t=String(p.title||'');
 if(/인증센터탁송|종주탁송|설악산종주|지리산종주/.test(c))return 'mountain-cycle';
 if(/골프대리운전|법인대리운전|일일기사|고급차대리운전/.test(c))return 'golf-corporate-daily';
 if(/대리운전/.test(c)||(/대리운전/.test(t)&&!/탁송/.test(c)&&!/탁송/.test(t)))return 'general-daeri';
 if(/강원도탁송|강원랜드탁송/.test(c))return 'gangwon-taksong';
 if(/경상북도탁송|경상남도탁송|부산탁송/.test(c))return 'gyeongsang-taksong';
 if(/전라남도탁송|전라북도탁송|광주광역시탁송/.test(c))return 'jeolla-taksong';
 if(/충청북도탁송|충청남도탁송/.test(c))return 'chungcheong-taksong';
 if(/서울탁송|인천탁송|경기남부탁송|경기북부탁송/.test(c))return 'capital-taksong';
 if(/제주도탁송/.test(c))return 'jeju-taksong';
 if(/중고차탁송|수출차탁송|수입차수리탁송|렌트카탁송|공항.*탁송|서비스|정비|벤츠|불루핸즈|오토큐|bmw|아우디|재규어|포드|카드|농산물|탁송1/.test(c))return 'vehicle-taksong';
 return 'other-taksong';
}
const buckets=Object.fromEntries(groups.map(g=>[g.id,[]]));
for(const p of posts)buckets[groupOf(p)].push(p);

function jejuEditorialGuide(esc){
 const ids=['224371918565','224387354617','224415828744','224433990134'];
 const articles=ids.map(id=>posts.find(p=>p.id===id)).filter(Boolean);
 const sourceLinks=articles.map(p=>'<li><a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer">'+esc(p.title)+'</a> <small>('+esc(p.date||'게시일 미확인')+' 공개 원문)</small></li>').join('');
 return `<article id="jeju-blog-guide" aria-labelledby="jeju-blog-guide-title" style="margin:24px 0;padding:22px;background:#f5f9ff;border:1px solid #c8dbee;border-radius:14px">
 <p style="margin:0 0 4px;color:#165a96;font-weight:800">제주도탁송 · 차량 선적 · 공개 원문으로 읽는 이동 준비</p>
 <h2 id="jeju-blog-guide-title">제주탁송을 알아볼 때 먼저 확인할 3가지</h2>
 <p>제주도 자동차탁송은 육지에서의 차량 이동과 선박 선적, 제주항 도착 후 차량 인계가 연결되는 일정입니다. 단순한 도로 거리만으로 요금이나 가능 날짜를 확정하기 어렵습니다. 다음 내용은 예약 준비 안내이며, 특정 선사·항구·일정의 이용 가능성을 보장하지 않습니다.</p>
 <nav aria-label="제주탁송 안내 목차"><a href="#jeju-port">항구와 선적</a> · <a href="#jeju-cost">요금 구성</a> · <a href="#jeju-checklist">예약 체크리스트</a> · <a href="#jeju-originals">공개된 운행 글</a></nav>
 <h3 id="jeju-port">① 출발지, 선적항, 제주 인계 장소를 구분하세요</h3>
 <p>예를 들어 태안에서 제주로 보내는 차량은 차량을 맡길 위치, 목포항 같은 선적 예정 항구, 제주항에서 차량을 받을 사람과 장소를 따로 정해야 합니다. 제주에서 육지로 나가는 차량은 제주 측 인수 및 선적, 육지 항구 도착 후 목적지 인계 순서로 확인합니다. 항구 선택과 선박 운항 여부는 날짜, 차종, 기상 상황에 따라 달라질 수 있습니다.</p>
 <h3 id="jeju-cost">② 제주탁송 요금은 육지 이동비만으로 결정되지 않습니다</h3>
 <p>내륙 기사 운행·복귀 조건, 선박 차량 선적료, 제주 쪽 차량 인계 또는 이동, 대기 및 일정 변경 여부를 구분해 확인해야 합니다. 선적료는 차종·선사·운항일에 따라 달라질 수 있습니다. 이 글에는 확인되지 않은 고정 금액이나 당일 출고 보장 문구를 넣지 않았으며, 실제 가능 여부와 견적은 상담 후 확인합니다.</p>
 <h3 id="jeju-checklist">③ 예약 문의 전에 준비하면 좋은 사항</h3>
 <ol><li>차량 모델과 크기, 차량 상태 및 운행 가능 여부</li><li>정확한 출발지와 제주·육지 쪽 최종 인계 장소</li><li>차량을 맡길 수 있는 날짜와 반드시 수령해야 하는 날짜</li><li>차량 소유자 및 인수·인계 담당자 연락 방법</li><li>선박 결항·지연 시 조정 가능한 일정</li></ol>
 <h3 id="jeju-originals">제주 차량 이동에 관한 공개 블로그 원문</h3>
 <p>다음 링크는 번개탁송대리운전 네이버 블로그에 실제로 게시된 글의 제목과 원문 링크입니다. 제목에 적힌 후기·운행 사실은 원문을 통해 확인해야 하며, 홈페이지의 별도 확인 운행기록과 혼동하지 않습니다.</p>
 <ul>${sourceLinks}</ul>
 <h3>자주 묻는 질문</h3>
 <p><strong>제주항까지만 보내는 것과 제주도 최종 목적지까지 보내는 것은 같은가요?</strong> 같지 않을 수 있습니다. 제주항에서 인계하는지, 제주 시내·서귀포 등 최종 주소까지 추가 이동하는지 상담에서 구분해야 합니다.</p>
 <p><strong>배편이 결항되면 어떻게 하나요?</strong> 선박 일정에 영향을 받으므로 선적 가능일과 변경·대기 조건을 미리 확인해야 합니다. 지정일 도착을 보장할 수 없습니다.</p>
 <p><strong>기존 블로그 후기에 적힌 금액으로 지금 예약할 수 있나요?</strong> 과거 운행 내용과 현재 배차·선적·인계 조건은 다를 수 있습니다. 최종 견적과 가능 여부는 별도로 확인합니다.</p>
 <p><a href="/taksong/jeju/">제주도탁송 서비스 안내</a> · <a href="/fare/jeju/">제주 차량 선적 예상요금</a> · <a href="/reviews/history/">확인된 운행기록</a> · <a href="tel:18775245">제주탁송 대표 상담 1877-5245</a></p>
 </article>`;
}


function gangwonEditorialGuide(esc){
 const sources=[
  '224452920151', // 영동권 통합 안내
  '224452928413', // 영서권 통합 안내
  '224437809013', // 강릉항 → 양양
  '224426969224', // 영월 → 서울
  '224415810728'  // 동해 → 구미
 ];
 const articles=sources.map(id=>posts.find(p=>p.id===id)).filter(Boolean);
 const links=articles.map(p=>'<li><a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer">'+esc(p.title)+'</a> <small>('+esc(p.date||'발행일 미확인')+' 게시 원문)</small></li>').join('');
 return \`<article id="gangwon-blog-guide" aria-labelledby="gangwon-blog-guide-title" style="margin:24px 0;padding:22px;background:#f4f9fd;border:1px solid #bdd8e8;border-radius:14px">
 <p style="margin:0 0 4px;font-weight:800;color:#14588a">강원도탁송 · 영동과 영서의 차량 인수·인계 안내</p>
 <h2 id="gangwon-blog-guide-title">강원도탁송, 속초·강릉 동해안과 원주·횡성 내륙의 차이</h2>
 <p>강원도 안에서도 차량을 인수하는 환경은 다릅니다. 영동의 해안·관광지 출발과 영서의 도심·산업단지·산간 지역 출발은 기사 접근 경로와 운행 후 복귀 교통편이 달라질 수 있습니다. 강원도탁송을 알아볼 때는 실제 주차 위치, 이동 방향, 인계 담당자와 시간을 함께 확인해 주세요.</p>
 <nav aria-label="강원도탁송 글 목차"><a href="#gangwon-east">영동권 탁송</a> · <a href="#gangwon-west">영서권 탁송</a> · <a href="#gangwon-mountain">산행 차량회수</a> · <a href="#gangwon-originals">공개 원문</a></nav>
 <h3 id="gangwon-east">영동권: 속초·양양·주문진·강릉·동해·삼척</h3>
 <p>해안 주차장, 항구 주변, 숙박시설이나 장거리 목적지로 차량을 보내는 경우 실제 차량 위치와 인수 가능 시간을 먼저 확인합니다. 관광 성수기·야간·악천후에는 기사 배정과 이동 후 복귀 여건이 달라질 수 있어 여유 있는 일정 상담이 유리합니다. 영동권 통합 안내 글에는 고성·속초·양양·강릉·동해·삼척을 함께 다룹니다.</p>
 <h3 id="gangwon-west">영서권: 춘천·원주·홍천·횡성·둔내·평창·영월·정선</h3>
 <p>원주 도심·문막 같은 업무 지역과 횡성·둔내·평창의 외곽 출발은 기사 접근과 복귀 동선을 다르게 고려합니다. 차종이 승용차인지 화물차인지, 차량 출고 담당자와 인계 시간에 제약이 있는지 구분해 문의해 주세요. 단순 거리만으로 모든 구간의 최종요금이 같아지지는 않습니다.</p>
 <h3 id="gangwon-mountain">설악산 산행 후 차량회수는 일반 차량 이동과 다릅니다</h3>
 <p>오색·한계령·백담사에서 산행을 시작해 소공원 등 다른 지점으로 내려오는 일정은 출발 전 차량 키 전달과 주차장 위치, 하산 후 차량 인계 방법을 조율해야 합니다. 실제 산행 탁송은 <a href="/blog/archive/mountain-cycle/">설악산·자전거 종주 원문 목록</a>에서 별도로 찾아볼 수 있습니다.</p>
 <h3 id="gangwon-originals">강원도탁송 공개 블로그 원문</h3>
 <p>아래는 실제 발행된 번개탁송대리운전 네이버 블로그 글입니다. 강릉항에서 양양으로 이동한 글, 영월에서 서울 방향 장거리 탁송 글, 동해에서 구미까지의 차량 이동 글을 포함합니다. 원문 제목에 적힌 운행완료·금액은 게시 당시 내용이며 현재 요금이나 배차를 보장하지 않습니다.</p>
 <ul>\${links}</ul>
 <h3>예약 시 자주 확인하는 사항</h3>
 <p><strong>산간지역 출발도 가능한가요?</strong> 가능 여부는 출발 위치와 기사 수급, 도로 및 복귀 상황을 확인한 뒤 안내합니다. 모든 시간대 배차를 보장하지 않습니다.</p>
 <p><strong>당일 요금은 이전 후기와 같나요?</strong> 날짜·차종·경유·대기·기사 복귀 조건에 따라 달라질 수 있습니다. 과거 후기는 당시 기록으로만 참고해 주세요.</p>
 <p><strong>미리 준비할 것은 무엇인가요?</strong> 출발지·도착지, 차량 종류, 운행 희망 시각, 정확한 주차 및 인수·인계 장소를 알려주세요.</p>
 <p><a href="/taksong/gangwon/">강원도 자동차탁송 지역 안내</a> · <a href="/fare/">출발·도착지 예상요금 조회</a> · <a href="tel:18114294">스마트24 전국탁송 상담 1811-4294</a></p>
 </article>\`;
}

const PAGE_SIZE=30;
const path=g=>'/blog/archive/'+g.id+'/';
function handle(pathname,url,{layout,esc,host}){
 const base='https://'+host,home='/blog/archive/';
 if(pathname===home||pathname===home.slice(0,-1)){
  const sections=groups.map(g=>'<li><a href="'+path(g)+'">'+esc(g.name)+'</a> ('+buckets[g.id].length+'편) — '+esc(g.intro)+'</li>').join('');
  const html='<section><h1>지역별 대리운전·자동차탁송 블로그 글 모음</h1><p>번개탁송대리운전 네이버 블로그에 공개된 글 '+posts.length+'편의 제목과 원문 링크를 분야별로 정리했습니다. 블로그 글을 홈페이지에 복사해 중복 발행하지 않으며, 원문의 운행 여부 및 당시 요금과 현재 스마트24 예약 상담을 구분합니다.</p><p>지역 키워드는 글 찾기를 돕는 분류용입니다. 해당 지역의 기사 상주나 개별 운행완료를 뜻하지 않습니다.</p><ul>'+sections+'</ul><h2>예약 전 준비사항</h2><p>대리운전은 출발지·도착지·희망 시각과 차종을, 차량탁송은 인수·인계 위치 및 담당자, 날짜와 차량 조건을 알려주세요. 현재 요금과 배차 여부는 대표전화 1811-4294 상담으로 확인합니다.</p><p><a href="/blog/">최근 네이버 블로그 글</a> · <a href="/reviews/history/">홈페이지의 확인된 운행기록</a> · <a href="/fare/">예상요금 조회</a></p></section>';
  return {status:200,html:layout('지역별 블로그 자료실 | 630여 개 공개 글 안내','전국대리운전·자동차탁송·골프장·산행·자전거종주 등 운영 블로그의 공개 글을 지역과 서비스별로 찾아보세요.',html,base+home)};
 }
 const m=pathname.match(/^\/blog\/archive\/([a-z-]+)\/?$/);
 if(!m)return null;
 const g=groups.find(x=>x.id===m[1]);if(!g)return {status:404,html:'자료실 분류를 찾을 수 없습니다.'};
 const items=buckets[g.id],pages=Math.max(1,Math.ceil(items.length/PAGE_SIZE));
 const n=Number(url.searchParams.get('page')||1);
 if(!Number.isInteger(n)||n<1||n>pages)return {status:404,html:'해당 페이지를 찾을 수 없습니다.'};
 const shown=items.slice((n-1)*PAGE_SIZE,n*PAGE_SIZE),urlBase=path(g);
 const list=shown.map(p=>'<li><a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer">'+esc(p.title)+'</a> <small>['+esc(p.category||'분류 없음')+']</small></li>').join('');
 const nav='<nav aria-label="블로그 목록 페이지"><p>'+(n>1?'<a href="'+urlBase+(n===2?'':'?page='+(n-1))+'">이전 글</a> · ':'')+' '+n+' / '+pages+' 페이지 '+(n<pages?' · <a href="'+urlBase+'?page='+(n+1)+'">다음 글</a>':'')+'</p></nav>';
 const isJeju=g.id==='jeju-taksong';
 const isGangwon=g.id==='gangwon-taksong';
 const currentPhone=isJeju?'1877-5245':'1811-4294';
 const currentHref=isJeju?'18775245':'18114294';
 // Full editorial guidance belongs on the canonical first page, not repeated on page 2+.
 const jejuGuide=isJeju&&n===1?jejuEditorialGuide(esc):'';
 const gangwonGuide=isGangwon&&n===1?gangwonEditorialGuide(esc):'';
 const specialHeading=isJeju?'제주탁송 차량선적·항구 인계와 실제후기 원문':isGangwon?'강원도탁송 영동·영서 지역 안내와 실제후기 원문':g.name+' 공개 글 모음';
 const html='<section><p><a href="/blog/archive/">전체 블로그 분류</a></p><h1>'+esc(specialHeading)+'</h1><p>'+esc(g.intro)+'</p><p>관련 주제: '+esc(g.keywords)+'</p><p>번개탁송대리운전의 네이버 블로그 원문 '+items.length+'편 중 '+((n-1)*PAGE_SIZE+1)+'~'+Math.min(n*PAGE_SIZE,items.length)+'편. 원문 제목에 적힌 연락처·요금은 과거 게시 당시 기준일 수 있습니다. 현재 상담번호는 '+currentPhone+'입니다.</p>'+jejuGuide+gangwonGuide+'<ol>'+list+'</ol>'+nav+'<h2>현재 상담 시 확인할 내용</h2><p>출발지와 도착지, 희망 운행 날짜·시간, 차량 종류, 주차 위치와 인수·인계 조건을 알려주시면 상담에 도움이 됩니다. 외곽 지역이나 장거리 운행은 기사 접근과 복귀 조건에 따라 요금 및 배차 여부가 달라질 수 있습니다.</p><p><a href="/fare/">예상요금 조회</a> · <a href="/reviews/history/">확인된 완료 운행기록</a> · <a href="tel:'+currentHref+'">예약 상담 '+currentPhone+'</a></p></section>';
 const canonical=base+urlBase+(n>1?'?page='+n:'');
 const seoTitle=(isJeju?'제주탁송 차량선적·실제후기 원문 | 1877-5245':isGangwon?'강원도탁송 영동·영서 지역 안내와 실제후기 | 스마트24':g.name+' 공개 글 모음')+(n>1?' | '+n+'페이지':'');
 const seoDesc=isJeju?'제주탁송 차량선적, 목포항·제주항 인계 방법과 실제 공개된 차량탁송 원문을 살펴보세요. 제주탁송 대표 상담 1877-5245.':isGangwon?'강원도탁송 영동·영서 지역별 차량 인수와 기사 복귀 여건, 속초·양양·강릉·원주·횡성 운행 관련 공개 글을 확인하세요. 상담 1811-4294.':g.name+' 관련 원문 '+items.length+'편을 주제별로 탐색하세요. '+g.intro;
 const collectionSchema=(isJeju||isGangwon)&&n===1?JSON.stringify({'@context':'https://schema.org','@type':'CollectionPage',name:seoTitle,description:seoDesc,url:canonical,inLanguage:'ko-KR',mainEntity:{'@type':'ItemList',itemListElement:shown.slice(0,8).map((p,i)=>({'@type':'ListItem',position:i+1,name:p.title,url:p.url}))}}).replace(/</g,'\\u003c'):'';
 const structuredContent=collectionSchema?'<script type="application/ld+json">'+collectionSchema+'</script>'+html:html;
 const rendered=layout(seoTitle,seoDesc,structuredContent,canonical);
 // Replace only the global footer contact on the Jeju-specific page. Preserve historical blog titles intact.
 const footerContact='<footer>상담 <a href="tel:18114294" aria-label="1811-4294 전화 상담">1811-4294</a>';
 const jejuFooterContact='<footer>제주탁송 상담 <a href="tel:18775245" aria-label="제주탁송 대표번호 1877-5245 전화 상담">1877-5245</a>';
 return {status:200,html:isJeju?rendered.replace(footerContact,jejuFooterContact):rendered};
}
module.exports={handle,groups,counts:Object.fromEntries(groups.map(g=>[g.id,buckets[g.id].length])),total:posts.length};
