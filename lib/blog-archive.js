'use strict';
// An editorial navigation directory of the owner's published Naver posts.
// We link original posts rather than duplicating article bodies or claiming
// a title alone verifies a completed job. Source records are left untouched.
const raw=require('../blog/posts.json');
const originalTags=require('./blog-post-tags');
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
const PAGE_SIZE=30;
const path=g=>'/blog/archive/'+g.id+'/';
function handle(pathname,url,{layout,esc,host}){
 const base='https://'+host,home='/blog/archive/';
 const q=String(url.searchParams.get('q')||'').trim().normalize('NFC').slice(0,40);
 if(pathname===home||pathname===home.slice(0,-1)){
  const sections=groups.map(g=>'<li><a href="'+path(g)+'">'+esc(g.name)+'</a> ('+buckets[g.id].length+'편) — '+esc(g.intro)+'</li>').join('');
  const searchForm='<form action="/blog/archive/" method="get" role="search"><label for="blog-keyword">지역·서비스 키워드로 공개 글 찾기</label> <input id="blog-keyword" name="q" maxlength="40" value="'+esc(q)+'" placeholder="예: 횡성탁송, 골프장대리운전" required> <button type="submit">찾기</button></form><p>검색 대상은 게시글 제목·카테고리·원문 확인된 해시태그입니다. 제목에서 임의로 해시태그를 만들지 않습니다.</p>';
  const found=q?posts.filter(p=>(p.title+' '+p.category+' '+originalTags.get(p.id).join(' ')).normalize('NFC').toLowerCase().includes(q.toLowerCase())):[];
  const foundList=q?'<h2>“'+esc(q)+'” 검색 결과 '+found.length+'편</h2>'+(found.length?'<ol>'+found.slice(0,50).map(p=>'<li><a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer">'+esc(p.title)+'</a> <small>['+esc(p.category||'기타')+']</small></li>').join('')+'</ol><p>최대 50개를 표시합니다. 다른 단어로 검색하면 더 좁힐 수 있습니다.</p>':'<p>일치하는 공개 글이 없습니다. 다른 지역명 또는 서비스명으로 검색해 주세요.</p>'):'';
  
  const html='<section><h1>지역별 대리운전·자동차탁송 블로그 글 모음</h1><p>번개탁송대리운전 네이버 블로그에 공개된 글 '+posts.length+'편의 제목과 원문 링크를 분야별로 정리했습니다. 블로그 글을 홈페이지에 복사해 중복 발행하지 않으며, 원문의 운행 여부 및 당시 요금과 현재 스마트24 예약 상담을 구분합니다.</p>'+searchForm+foundList+'<p>지역 키워드는 글 찾기를 돕는 분류용입니다. 해당 지역의 기사 상주나 개별 운행완료를 뜻하지 않습니다.</p><ul>'+sections+'</ul><h2>예약 전 준비사항</h2><p>대리운전은 출발지·도착지·희망 시각과 차종을, 차량탁송은 인수·인계 위치 및 담당자, 날짜와 차량 조건을 알려주세요. 현재 요금과 배차 여부는 대표전화 1811-4294 상담으로 확인합니다.</p><p><a href="/blog/">최근 네이버 블로그 글</a> · <a href="/reviews/history/">홈페이지의 확인된 운행기록</a> · <a href="/fare/">예상요금 조회</a></p></section>';
  const rendered=layout('지역별 블로그 자료실 | 공개 글 검색','전국대리운전·자동차탁송·골프장·산행·자전거종주 등 운영 블로그의 공개 글을 지역과 서비스별로 찾아보세요.',html,base+home);
  return {status:200,html:q?rendered.replace('content="index,follow,max-image-preview:large"','content="noindex,follow"'):rendered};
 }
 const m=pathname.match(/^\/blog\/archive\/([a-z-]+)\/?$/);
 if(!m)return null;
 const g=groups.find(x=>x.id===m[1]);if(!g)return {status:404,html:'자료실 분류를 찾을 수 없습니다.'};
 const items=buckets[g.id],pages=Math.max(1,Math.ceil(items.length/PAGE_SIZE));
 const n=Number(url.searchParams.get('page')||1);
 if(!Number.isInteger(n)||n<1||n>pages)return {status:404,html:'해당 페이지를 찾을 수 없습니다.'};
 const shown=items.slice((n-1)*PAGE_SIZE,n*PAGE_SIZE),urlBase=path(g);
 const list=shown.map(p=>{const tags=originalTags.get(p.id);return '<li><a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer">'+esc(p.title)+'</a> <small>['+esc(p.category||'분류 없음')+']</small>'+(tags.length?' <small>원문 확인 해시태그: '+tags.slice(0,8).map(esc).join(' ')+'</small>':'')+'</li>'}).join('');
 const nav='<nav aria-label="블로그 목록 페이지"><p>'+(n>1?'<a href="'+urlBase+(n===2?'':'?page='+(n-1))+'">이전 글</a> · ':'')+' '+n+' / '+pages+' 페이지 '+(n<pages?' · <a href="'+urlBase+'?page='+(n+1)+'">다음 글</a>':'')+'</p></nav>';
 const html='<section><p><a href="/blog/archive/">전체 블로그 분류</a></p><h1>'+esc(g.name)+' 공개 글 모음</h1><p>'+esc(g.intro)+'</p><p>관련 주제: '+esc(g.keywords)+'</p><p>번개탁송대리운전의 네이버 블로그 원문 '+items.length+'편 중 '+((n-1)*PAGE_SIZE+1)+'~'+Math.min(n*PAGE_SIZE,items.length)+'편. 원문 제목에 적힌 연락처·요금은 과거 게시 당시 기준일 수 있습니다. 현재 스마트24 문의는 1811-4294로 해주세요.</p><ol>'+list+'</ol>'+nav+'<h2>현재 상담 시 확인할 내용</h2><p>출발지와 도착지, 희망 운행 날짜·시간, 차량 종류, 주차 위치와 인수·인계 조건을 알려주시면 상담에 도움이 됩니다. 외곽 지역이나 장거리 운행은 기사 접근과 복귀 조건에 따라 요금 및 배차 여부가 달라질 수 있습니다.</p><p><a href="/fare/">예상요금 조회</a> · <a href="/reviews/history/">확인된 완료 운행기록</a> · <a href="tel:18114294">예약 상담 1811-4294</a></p></section>';
 const canonical=base+urlBase+(n>1?'?page='+n:'');
 return {status:200,html:layout(g.name+' | 공개 글 '+n+' / '+pages+'페이지',g.name+' 관련 원문 '+items.length+'편을 주제별로 탐색하세요. '+g.intro,html,canonical)};
}
module.exports={handle,groups,counts:Object.fromEntries(groups.map(g=>[g.id,buckets[g.id].length])),total:posts.length};
