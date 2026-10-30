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
 return `<article id="gangwon-blog-guide" aria-labelledby="gangwon-blog-guide-title" style="margin:24px 0;padding:22px;background:#f4f9fd;border:1px solid #bdd8e8;border-radius:14px">
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
 <ul>${links}</ul>
 <h3>예약 시 자주 확인하는 사항</h3>
 <p><strong>산간지역 출발도 가능한가요?</strong> 가능 여부는 출발 위치와 기사 수급, 도로 및 복귀 상황을 확인한 뒤 안내합니다. 모든 시간대 배차를 보장하지 않습니다.</p>
 <p><strong>당일 요금은 이전 후기와 같나요?</strong> 날짜·차종·경유·대기·기사 복귀 조건에 따라 달라질 수 있습니다. 과거 후기는 당시 기록으로만 참고해 주세요.</p>
 <p><strong>미리 준비할 것은 무엇인가요?</strong> 출발지·도착지, 차량 종류, 운행 희망 시각, 정확한 주차 및 인수·인계 장소를 알려주세요.</p>
 <p><a href="/taksong/gangwon/">강원도 자동차탁송 지역 안내</a> · <a href="/fare/">출발·도착지 예상요금 조회</a> · <a href="tel:18114294">스마트24 전국탁송 상담 1811-4294</a></p>
 </article>`;
}

function otherTopicEditorialGuide(g,esc){
 const configs={
  'mountain-cycle':{
   lead:'설악산·지리산 종주 차량회수와 자전거 인증센터 이동',
   intro:'산행은 등산 시작 지점과 하산 지점이 달라지는 경우 차량을 어디에 둘지 미리 결정해야 합니다. 자전거 종주는 인증센터 사이를 이동하는 동안 출발지에 남겨 둔 차량을 회수할 방법을 따로 준비해야 합니다. 두 서비스는 차량 인수 장소, 키 전달 시각, 최종 인계 지점이 서로 다르므로 구분해 상담해 주세요.',
   steps:[['설악산·지리산 종주 산행','오색·한계령·백담사 등 출발 주차장과 소공원 등 하산지에서의 차량 인계 여부를 먼저 확인하고, 지리산은 성삼재·중산리·대원사·백무동처럼 실제 일정에 맞는 지점을 구분합니다. 산행 시간·기상·주차장 이용 조건은 변경될 수 있습니다.'],['자전거 인증센터 종주','동해안·섬진강·영산강·국토종주 등은 인증센터가 외곽에 있는 경우가 있어 차량을 어디에서 맡기고 어디에서 받을지 정해야 합니다. 자전거 운송까지 포함되는지는 별도 상담 사항입니다.']],
   ids:['224453074981','224451230156','224450163134','224452067282'],
   links:[['/taksong/gangwon/','강원도 차량탁송 지역 안내'],['/blog/archive/gangwon-taksong/','강원도탁송 공개 글']]
  },
  'golf-corporate-daily':{
   lead:'골프장 대리운전·왕복 일일기사·법인 운전기사 준비',
   intro:'골프장에서 라운딩을 마친 뒤 집으로 돌아가는 편도 대리운전과, 이른 아침 출발해 라운딩 내내 대기하고 왕복으로 귀가하는 일일기사는 요금과 시간 계산 방식이 다릅니다. 단체·법인 이용은 차량 대수, 기사 배정, 식대와 대기 범위를 추가로 확인해야 합니다.',
   steps:[['골프장 편도 대리운전','골프장 출입구·클럽하우스 차량 위치, 라운딩 종료 예상 시간, 목적지와 경유 여부를 확인합니다. 당일 기사 수급과 복귀 조건에 따라 가능 여부가 달라집니다.'],['왕복·장거리 일일기사','새벽 출발, 현장 대기, 복귀 운행을 하나의 일정으로 계획합니다. 실제 운행시간과 클럽하우스 대기시간을 구분하고 식대·고속도로 비용 등 추가 조건을 예약 전에 확인해 주세요.']],
   ids:['224451280349','224417611971','224445462278'],
   links:[['/service/golf/','골프장 대리운전 안내'],['/service/daily-driver/','왕복 일일기사 안내']]
  },
  'vehicle-taksong':{
   lead:'중고차·서비스센터·렌트카·경매장 차량탁송 인수 안내',
   intro:'중고차 매매단지 출고, 서비스센터 정비 입출고, 렌트카 사고대차 및 경매장 차량 이동은 모두 자동차탁송에 속하지만 서류·키 전달과 차량을 내보낼 수 있는 시간에 차이가 있습니다. 출고 담당자와 인수 장소를 확인하지 않은 상태에서 운행 완료를 약속하지 않습니다.',
   steps:[['서비스센터·정비소 입출고','입고 예약 시각과 차량 수령 가능 시간, 정비 담당자, 키 인계 절차와 차량이 실제 주차된 위치를 먼저 확인해 주세요. 운행 불가 차량은 일반 로드탁송이 어려울 수 있습니다.'],['경매장·수출단지·렌트카 이동','차량 인계 허용 시간, 출입 절차, 차량 상태와 인수 담당자 정보를 준비해 주세요. 새벽·야간 배차는 지역·기사 수급과 현장 출고 규정에 따라 달라집니다.']],
   ids:['224427052635','224421653506','224430950314','224419673150'],
   links:[['/taksong/','전국 자동차탁송 안내'],['/reviews/history/','실제 완료 운행기록 확인']]
  }
 };
 const info=configs[g.id];if(!info)return '';
 const originals=info.ids.map(id=>posts.find(p=>p.id===id)).filter(Boolean);
 const sourceList=originals.map(p=>'<li><a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer">'+esc(p.title)+'</a> <small>('+esc(p.date||'발행일 미확인')+' 원문)</small></li>').join('');
 const steps=info.steps.map((step,i)=>'<h3>'+esc((i+1)+'. '+step[0])+'</h3><p>'+esc(step[1])+'</p>').join('');
 const serviceLinks=info.links.map(([href,label])=>'<a href="'+href+'">'+esc(label)+'</a>').join(' · ');
 return '<article id="'+g.id+'-editorial" style="margin:24px 0;padding:22px;border-radius:14px;background:#f6faff;border:1px solid #d4e5f3"><h2>'+esc(info.lead)+'</h2><p>'+esc(info.intro)+'</p>'+steps+'<h3>실제 발행된 네이버 블로그 원문</h3><p>아래 글은 실제 공개된 원문 링크입니다. 제목에 기재된 운행완료 여부·요금·시각은 게시 당시 내용으로, 현재 운행 가능 여부나 가격을 보장하지 않습니다.</p><ul>'+sourceList+'</ul><p>'+serviceLinks+' · <a href="tel:18114294">현재 상담 1811-4294</a></p></article>';
}

const regionalArchiveTopics={"capital-taksong":{"title":"서울·경기·인천탁송 | 수도권 자동차 인수·인계와 실제후기","description":"서울·경기·인천 자동차탁송, 도심 주차장 인수·인계와 인천항·중고차단지 출고 조건을 공개 블로그 실제 원문과 함께 확인하세요.","lead":"서울·경기·인천 차량탁송, 도심·공항·매매단지별 인수 방법","intro":"수도권은 이동 거리가 짧아 보여도 출발 주차장에 기사가 들어갈 수 있는지, 차 키를 누구에게 받는지, 차량이 언제 출고 가능한지에 따라 배차 조건이 달라집니다. 지역명만 전달하기보다 정확한 건물 출입구·주차 구역·연락 담당자를 먼저 확인해 주세요.","sections":[["서울 도심·업무시설 출발","강남·서초·성수·용산 등은 건물 지하주차장이나 정비시설에 차량이 있는 경우 출입 절차와 인계 담당자가 중요합니다. 퇴근 시간대와 건물 출입 가능 시각을 예약 전에 확인합니다."],["경기 신도시·인천항·중고차 매매단지","동탄·수원·부천·고양·인천 연수구·부평 등은 단지 내부 차량 위치와 출고 가능 시간을 확인합니다. 인천항·송도 수출단지처럼 별도 출입 절차가 있는 장소는 담당자 안내가 필요합니다."]],"ids":["224452097042","224452072174","224451107355","224451097227"],"links":[["/taksong/","전국 자동차탁송 안내"],["/region/","서울·경기·인천 지역 검색"]]},"gyeongsang-taksong":{"title":"부산·대구·경상탁송 | 항만·산단·장거리 운행 원문","description":"부산·대구·경북·경남 자동차탁송, 부산항 주변·대구 도심·경북 동서권과 경남 산업단지 출고 조건 및 실제 공개 글 안내.","lead":"부산·대구·경북·경남 차량탁송, 항만과 산업단지 이동을 구분하세요","intro":"부산 해운대·기장과 항만 주변, 대구 수성·달서와 산업단지, 경북 포항·구미 및 경남 창원·김해·거제의 출발 여건은 다릅니다. 출고 마감 시각이나 기사 복귀 교통편을 확인하지 않고 모든 지역에서 즉시 배차된다고 안내하지 않습니다.","sections":[["부산·울산·경남 출고 및 장거리 이동","중고차 매매단지·항만·산업단지는 차량 주차 위치와 외부 기사 출입 규정을 먼저 확인해 주세요. 해안·섬 지역과 야간 출발은 기사 접근과 운행 후 복귀 여건을 함께 상담합니다."],["대구·경북 도심과 동서권","대구 도심 출발과 포항·경주·경산 동부권, 구미·김천·상주 서부권은 이동 방향이 다릅니다. 차종, 인수 가능 시간, 장거리 목적지와 운행 후 기사 복귀 교통편을 구체적으로 알려주세요."]],"ids":["224452088793","224452085535","224450082013","224445300887"],"links":[["/taksong/busan/","부산 자동차탁송 안내"],["/taksong/daegu/","대구 자동차탁송 안내"],["/taksong/","전국 차량탁송 상담"]]},"jeolla-taksong":{"title":"광주·전북·전남탁송 | 목포항·산단·산간 차량이동","description":"광주·전북·전남 자동차탁송, 목포항·광주 도심·군산항·여수·순천과 무주·지리산 산간 지역의 차량 인수 및 공개 원문 안내.","lead":"광주·전북·전남 차량탁송, 항구·도심·산간지역 출발 전 준비","intro":"광주 도심 상가·산단, 목포항·군산항 등 항만 주변, 여수·순천 같은 해안권과 무주·남원·진안 등 산간 지역은 기사 접근 경로와 차량 인계 여건이 다릅니다. 제주 차량 선적이 포함되는지와 일반 육지 차량 이동인지를 먼저 구분해 주세요.","sections":[["광주·목포·여수·순천과 항만 인계","차량이 실제로 있는 위치, 항만 출입 조건, 인수 담당자와 항구에서 종료되는 일정인지 최종 목적지까지 이동하는 일정인지 구분합니다. 도심·산단 출발도 주차장 인계 절차가 필요할 수 있습니다."],["전북 내륙·산간 및 장거리탁송","전주·완주·익산·군산 같은 도심·산업단지 이동과 무주·장수·남원 등 산간 출발을 구분합니다. 산행 관련 차량회수는 일반 차량탁송과 다른 지점·일정 확인이 필요합니다."]],"ids":["224449892895","224449871939","224448781333","224447539054"],"links":[["/taksong/","전국 자동차탁송 안내"],["/blog/archive/mountain-cycle/","산행 종주 차량회수 공개 글"]]},"chungcheong-taksong":{"title":"대전·세종·충청탁송 | 천안·청주·서산 실제후기","description":"대전·세종·충남·충북 자동차탁송, 천안·아산·당진·서산·청주·진천 등 산업단지·역세권 출고 및 실제 공개 운행 원문.","lead":"대전·세종·충청 차량탁송, 산업단지·역세권·외곽 차량 인수","intro":"천안·아산·당진·서산 등 충남 서북권과 청주·진천·음성·제천 등 충북 내륙은 기사 접근·복귀 동선이 서로 다릅니다. 대전과 세종의 관공서·업무시설 출발은 담당자 인계 및 주차장 출입 시간을 확인하세요.","sections":[["충남 천안·아산·서산·당진 및 대전·세종","산업단지·자동차 관련 업체·역세권은 건물 출입구와 실제 차량 주차 위치, 출고 담당자 및 인수 가능 시간을 확인합니다. 대전·세종 도심과 서해안 외곽 지역은 배차 여건이 다를 수 있습니다."],["충북 청주·진천·음성·제천·단양","도심 주차장 인수와 외곽 공장·산간 지역 인계는 같은 방식으로 처리하기 어렵습니다. 장거리 출발은 차종과 기사 복귀 가능 여부를 미리 상담해 주세요."]],"ids":["224452906198","224451239682","224447657132","224434019317"],"links":[["/taksong/","전국 차량탁송 서비스"],["/region/","대전·세종·충청 지역 검색"]]},"general-daeri":{"title":"전국·장거리 대리운전 | 지역별 귀가·예약 실제원문","description":"전국·장거리 대리운전, 서해안 관광지·심야 귀가·인천·대구 장거리 운행 안내와 공개 블로그 원문. 예약 시간과 기사 복귀 조건을 확인하세요.","lead":"전국·장거리 대리운전, 심야 귀가와 외곽 이동은 어떻게 예약하나요?","intro":"장거리 대리운전은 고객 차량을 기사에게 맡겨 목적지까지 이동하는 방식입니다. 출발지·도착지 외에 동승 여부, 예약 시각, 경유와 운행 후 기사 복귀 교통편을 확인해야 합니다. 블로그 원문에는 과거 글의 분류에 따라 다른 서비스 안내가 함께 들어갈 수 있으므로 실제 이용 목적을 구분해 읽어 주세요.","sections":[["서해안 관광지·펜션·외곽 출발","오이도·대부도·선재도·영흥도·궁평항·삼길포항처럼 늦은 시간 대중교통이 제한되는 지역은 정확한 주차 위치와 출발 예상 시간을 상담에 알려주세요. 현장 기사 상주나 모든 시간대 즉시 배차를 보장하지 않습니다."],["시·도 간 장거리대리운전","인천에서 대구 방향 등 장거리 이동은 톨게이트·경유지·희망 출발시각과 기사 복귀 비용을 함께 고려해야 합니다. 과거 후기의 운행요금은 현재 예약의 확정 금액이 아닙니다."]],"ids":["224453006635","224452992697","224452987205","224445451429"],"links":[["/daeri/","전국 대리운전 예약 안내"],["/service/daily-driver/","왕복·대기 포함 일일기사 구분"]]}};
function regionalArchiveGuide(g,esc){
 const topic=regionalArchiveTopics[g.id];if(!topic)return '';
 const originals=topic.ids.map(id=>posts.find(p=>p.id===id)).filter(Boolean);
 const links=originals.map(p=>'<li><a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer">'+esc(p.title)+'</a> <small>('+esc(p.date||'발행일 미확인')+' 원문)</small></li>').join('');
 const sections=topic.sections.map((x,i)=>'<h3>'+esc(String(i+1)+'. '+x[0])+'</h3><p>'+esc(x[1])+'</p>').join('');
 const nav=topic.links.map(x=>'<a href="'+esc(x[0])+'">'+esc(x[1])+'</a>').join(' · ');
 return '<article id="'+g.id+'-regional-guide" style="margin:22px 0;padding:22px;border:1px solid #d3e2ef;border-radius:14px;background:#f6f9fd"><h2>'+esc(topic.lead)+'</h2><p>'+esc(topic.intro)+'</p>'+sections+'<h3>발행된 블로그 원문에서 참고하기</h3><p>다음 링크는 실제 공개된 네이버 블로그 원문입니다. 원문 제목만으로 모든 운행의 완료·요금·배차를 확인한 것은 아닙니다. 당시 요금과 일정은 현재 예약 조건과 다를 수 있습니다.</p><ul>'+links+'</ul><p>'+nav+' · <a href="tel:18114294">현재 상담 1811-4294</a></p></article>';
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
 const isTopic=['mountain-cycle','golf-corporate-daily','vehicle-taksong'].includes(g.id);
 const isRegionalTopic=Boolean(regionalArchiveTopics[g.id]);
 const topicTitles={'mountain-cycle':'설악산·지리산 종주탁송·자전거 인증센터 차량회수 실제원문','golf-corporate-daily':'골프장대리운전·일일기사 예약과 실제후기 원문','vehicle-taksong':'중고차·서비스센터·렌트카·경매장탁송 실제원문'};
 const topicDescriptions={'mountain-cycle':'설악산 오색·한계령·백담사 산행과 지리산 종주 및 자전거 인증센터 차량회수 준비, 공개된 실제 운행후기 원문을 확인하세요.','golf-corporate-daily':'골프장 편도 대리운전과 왕복 일일기사, 클럽하우스 대기·식대·예약 조건을 실제 공개된 후기와 함께 확인하세요.','vehicle-taksong':'중고차 매매단지·서비스센터·렌트카·경매장 차량 인수와 출고 시간 확인, 자동차탁송 공개 원문 안내.'};
 const currentPhone=isJeju?'1877-5245':'1811-4294';
 const currentHref=isJeju?'18775245':'18114294';
 // Full editorial guidance belongs on the canonical first page, not repeated on page 2+.
 const jejuGuide=isJeju&&n===1?jejuEditorialGuide(esc):'';
 const gangwonGuide=isGangwon&&n===1?gangwonEditorialGuide(esc):'';
 const topicGuide=isTopic&&n===1?otherTopicEditorialGuide(g,esc):'';
 const regionalGuide=isRegionalTopic&&n===1?regionalArchiveGuide(g,esc):'';
 const specialHeading=isJeju?'제주탁송 차량선적·항구 인계와 실제후기 원문':isGangwon?'강원도탁송 영동·영서 지역 안내와 실제후기 원문':isTopic?topicTitles[g.id]:isRegionalTopic?regionalArchiveTopics[g.id].title:g.name+' 공개 글 모음';
 const html='<section><p><a href="/blog/archive/">전체 블로그 분류</a></p><h1>'+esc(specialHeading)+'</h1><p>'+esc(g.intro)+'</p><p>관련 주제: '+esc(g.keywords)+'</p><p>번개탁송대리운전의 네이버 블로그 원문 '+items.length+'편 중 '+((n-1)*PAGE_SIZE+1)+'~'+Math.min(n*PAGE_SIZE,items.length)+'편. 원문 제목에 적힌 연락처·요금은 과거 게시 당시 기준일 수 있습니다. 현재 상담번호는 '+currentPhone+'입니다.</p>'+jejuGuide+gangwonGuide+topicGuide+regionalGuide+'<ol>'+list+'</ol>'+nav+'<h2>현재 상담 시 확인할 내용</h2><p>출발지와 도착지, 희망 운행 날짜·시간, 차량 종류, 주차 위치와 인수·인계 조건을 알려주시면 상담에 도움이 됩니다. 외곽 지역이나 장거리 운행은 기사 접근과 복귀 조건에 따라 요금 및 배차 여부가 달라질 수 있습니다.</p><p><a href="/fare/">예상요금 조회</a> · <a href="/reviews/history/">확인된 완료 운행기록</a> · <a href="tel:'+currentHref+'">예약 상담 '+currentPhone+'</a></p></section>';
 const canonical=base+urlBase+(n>1?'?page='+n:'');
 const seoTitle=(isJeju?'제주탁송 차량선적·실제후기 원문 | 1877-5245':isGangwon?'강원도탁송 영동·영서 지역 안내와 실제후기 | 스마트24':isTopic?topicTitles[g.id]+' | 스마트24':isRegionalTopic?regionalArchiveTopics[g.id].title:g.name+' 공개 글 모음')+(n>1?' | '+n+'페이지':'');
 const seoDesc=isJeju?'제주탁송 차량선적, 목포항·제주항 인계 방법과 실제 공개된 차량탁송 원문을 살펴보세요. 제주탁송 대표 상담 1877-5245.':isGangwon?'강원도탁송 영동·영서 지역별 차량 인수와 기사 복귀 여건, 속초·양양·강릉·원주·횡성 운행 관련 공개 글을 확인하세요. 상담 1811-4294.':isTopic?topicDescriptions[g.id]:isRegionalTopic?regionalArchiveTopics[g.id].description:g.name+' 관련 원문 '+items.length+'편을 주제별로 탐색하세요. '+g.intro;
 const collectionSchema=(isJeju||isGangwon||isTopic||isRegionalTopic)&&n===1?JSON.stringify({'@context':'https://schema.org','@type':'CollectionPage',name:seoTitle,description:seoDesc,url:canonical,inLanguage:'ko-KR',mainEntity:{'@type':'ItemList',itemListElement:shown.slice(0,8).map((p,i)=>({'@type':'ListItem',position:i+1,name:p.title,url:p.url}))}}).replace(/</g,'\\u003c'):'';
 const structuredContent=collectionSchema?'<script type="application/ld+json">'+collectionSchema+'</script>'+html:html;
 const rendered=layout(seoTitle,seoDesc,structuredContent,canonical);
 // Replace only the global footer contact on the Jeju-specific page. Preserve historical blog titles intact.
 const footerContact='<footer>상담 <a href="tel:18114294" aria-label="1811-4294 전화 상담">1811-4294</a>';
 const jejuFooterContact='<footer>제주탁송 상담 <a href="tel:18775245" aria-label="제주탁송 대표번호 1877-5245 전화 상담">1877-5245</a>';
 return {status:200,html:isJeju?rendered.replace(footerContact,jejuFooterContact):rendered};
}
module.exports={handle,groups,counts:Object.fromEntries(groups.map(g=>[g.id,buckets[g.id].length])),total:posts.length};
