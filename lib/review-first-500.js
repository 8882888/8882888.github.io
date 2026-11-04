'use strict';
// 100 real regions x 5 distinct services. A route is not evidence of a completed trip.
const targets=require('../data/review-first-500-services.json');
const {matchingHistoryRegion}=require('./regional-history-evidence');
const names={taksong:'자동차탁송',daeri:'대리운전',corporate:'법인대리운전','daily-driver':'일일기사',golf:'골프대리운전'};
const parents={taksong:'/service/taksong/',daeri:'/service/daeri/',corporate:'/service/corporate/','daily-driver':'/service/daily-driver/',golf:'/service/golf/'};
const tips={taksong:'차량 인수 위치, 차키 전달, 차량 상태와 도착지 인계자를 확인합니다.',daeri:'차량 주차 위치, 동승 여부, 출발 시각과 경유지를 확인합니다.',corporate:'법인 담당자, 승인 절차, 법인카드와 후불 정산 여부를 확인합니다.','daily-driver':'왕복 운행 시간, 대기 시간, 식대와 통행료를 구분합니다.',golf:'골프장 위치, 라운딩 종료 시각, 대기와 왕복 조건을 확인합니다.'};
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const legacySet=new Map(targets.regions.map(x=>[x.slug,x.full_name]));
const route=(kind,slug)=>'/reviews/local/'+kind+'/'+slug+'/';
function create(regions,publicRecords,posts,host='jeongukdaeri.kr'){
 const bySlug=new Map(regions.map(r=>[r.slug,r]));
 const set=new Map(regions.map(r=>[r.slug,r.full_name]));
 const totalCombinations=regions.length*Object.keys(names).length;
 const verified=publicRecords.filter(x=>x.verified===true&&x.status==='completed'&&['daeri','taksong'].includes(x.service));
 function sourceLinks(kind,r){
  const re={corporate:/법인대리운전|법인기사/,'daily-driver':/일일기사|왕복일일기사/,golf:/골프대리운전|골프장대리운전/}[kind];
  if(!re)return [];
  const key=r.level==='시도'?r.name.replace(/(특별시|광역시|특별자치도|도)$/,''):r.full_name;
  return posts.filter(x=>re.test(x.title||'')&&(x.title||'').includes(key)&&/^https:\/\/blog\.naver\.com\/wjdtnr4757\/\d+$/.test(x.url||'')).slice(0,3);
 }
 function evidence(kind,r){
  if(!['daeri','taksong'].includes(kind))return [];
  return verified.filter(x=>x.service===kind&&matchingHistoryRegion({rawDeparture:x.departure,rawDestination:x.destination},r,regions)).slice(0,3);
 }
 function html(title,body,path,indexable){
  return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape(title)+' | 스마트24</title><meta name="description" content="'+escape(title)+' · 기존 운행정보 확인 및 상담 1811-4294"><link rel="canonical" href="https://'+host+path+'"><meta name="robots" content="'+(indexable?'index,follow':'noindex,follow')+'"><style>body{margin:0;background:#f5f8fc;color:#1b2c44;font:17px/1.75 system-ui,sans-serif}header,footer{background:#102544;color:white;padding:18px 5%}header a,footer a{color:#ffe16b}main{max-width:880px;margin:auto;padding:18px 5%}section,article{background:#fff;border:1px solid #cfdeed;border-radius:12px;margin:15px 0;padding:18px}h1{font-size:clamp(26px,5vw,38px)}a{color:#07539c}</style></head><body><header><a href="/">스마트24 홈</a> · <a href="/reviews/local/">전국 후기형 서비스</a></header><main>'+body+'</main><footer><a href="tel:18114294">전국 상담 1811-4294</a></footer></body></html>';
 }
 function render(kind,slug){
  if(!Object.hasOwn(names,kind)||!set.has(slug))return null;
  const r=bySlug.get(slug);if(!r||r.full_name!==set.get(slug))return null;
  const rows=evidence(kind,r),postsFound=sourceLinks(kind,r);
  const prefix=r.level==='시도'?r.name.replace(/(특별시|광역시|특별자치도|도)$/,''):r.full_name;
  const title=rows.length?prefix+' '+names[kind]+' 후기｜'+rows[0].departure+'→'+rows[0].destination+' 실제 운행기록':prefix+' '+names[kind]+' 후기·운행기록 확인｜예약 안내';
  const facts=rows.map(x=>'<article><h2>'+escape(x.departure)+' → '+escape(x.destination)+' '+escape(names[kind])+' 운행기록</h2><p>운행일 '+escape(x.date)+' · 당시 요금 '+escape(x.fare)+'</p><p>완료 검증 자료를 바탕으로 작성한 사실 중심 후기입니다. 당시 고객 발언이나 기사 대기시간은 추정하지 않습니다.</p></article>').join('');
  const notice=rows.length?'<p>출발지와 도착지, 완료 운행일과 당시 기록요금만 확인했습니다. 과거 금액은 현재 견적이 아닙니다.</p>':'<p>이 지역의 '+escape(names[kind])+' 완료 운행으로 독립 검증된 공개 사례가 아직 연결되지 않았습니다. 일반 대리운전 기록을 법인·일일기사·골프 대리운전 완료 사례로 바꾸지 않습니다.</p>';
  const blog=postsFound.length?'<section><h2>관련 공개 원문</h2><p>기존 블로그 글 제목과 링크이며 운행완료 증빙이 아닙니다.</p><ul>'+postsFound.map(x=>'<li><a href="'+escape(x.url)+'">'+escape(x.title)+'</a></li>').join('')+'</ul></section>':'';
  const links='<p><a href="'+parents[kind]+'">서비스 안내</a> · <a href="/fare/">요금조회</a> · <a href="/reviews/history/">운행기록</a> · <a href="tel:18114294">전화 1811-4294</a></p>';
  const other='<section><h2>같은 지역의 다른 서비스</h2><ul>'+Object.keys(names).filter(k=>k!==kind).map(k=>'<li><a href="'+route(k,slug)+'">'+escape(prefix+' '+names[k])+' 후기·예약 안내</a></li>').join('')+'</ul></section>';
  return html(title,'<h1>'+escape(title)+'</h1>'+notice+links+facts+blog+'<section><h2>운행 예약 시 확인사항</h2><p>'+escape(tips[kind])+'</p><p>차량·일정·거리와 기사 수급에 따라 실제 요금과 배차 가능 여부가 달라집니다.</p>'+links+'</section>'+other,route(kind,slug),rows.length>0&&legacySet.has(slug));
 }
 function index(){
  const content='<h1>전국 5개 차량 운행 서비스 후기·지역 안내 500개</h1><p>100개 행정구역 × 5개 서비스 안내입니다. 500개 URL은 500건의 완료 후기가 아닙니다. 확인되지 않은 후기는 생성하지 않습니다.</p>'+targets.regions.map(r=>'<section><h2>'+escape(r.full_name)+'</h2><p>'+Object.keys(names).map(k=>'<a href="'+route(k,r.slug)+'">'+escape(names[k])+' 후기 확인</a>').join(' · ')+'</p></section>').join('');
  return html('전국 5개 운행 서비스 실제 후기·예약 안내',content,'/reviews/local/',true);
 }
 function nationwideIndex(page=1){
  const perPage=20;
  const pages=Math.ceil(regions.length/perPage);
  const n=Number(page);
  if(!Number.isSafeInteger(n)||n<1||n>pages)return null;
  const selected=regions.slice((n-1)*perPage,n*perPage);
  const path='/reviews/local/nationwide/'+(n===1?'':'?page='+n);
  const nav='<nav aria-label="전국 지역 페이지 탐색">'+
   (n>1?'<a href="/reviews/local/nationwide/'+(n===2?'':'?page='+(n-1))+'">이전 지역 20개</a> · ':'')+
   '<strong>'+n+' / '+pages+' 페이지</strong>'+
   (n<pages?' · <a href="/reviews/local/nationwide/?page='+(n+1)+'">다음 지역 20개</a>':'')+
   '</nav>';
  const cards=selected.map(r=>'<section><h2>'+escape(r.full_name)+' · '+escape(r.level)+'</h2><p>'+
    Object.keys(names).map(kind=>'<a href="'+route(kind,r.slug)+'">'+escape(names[kind])+' 후기·운행기록 확인</a>').join(' · ')+
    '</p><p><a href="/region/'+r.slug+'/">지역 서비스·인수 위치 안내</a></p></section>').join('');
  const intro='<h1>전국 시·도·시·군·구·읍·면·동·리 5대 서비스 안내</h1>'+
    '<p>공식 행정구역 '+regions.length.toLocaleString('ko-KR')+'개 × 대리운전·탁송·법인대리운전·일일기사·골프대리운전 5개 = '+
    totalCombinations.toLocaleString('ko-KR')+'개 지역 서비스 조합입니다. 이는 실제 운행후기 수나 검색 색인 수가 아닙니다.</p>'+
    '<p>확인되지 않은 후기의 검색 대량 노출을 방지하기 위해 기존 검증된 지역 외 신규 페이지는 noindex로 유지합니다.</p>';
  // Paginated directories also remain noindex to avoid 1,029 near-identical search listings.
  return html('전국 '+totalCombinations.toLocaleString('ko-KR')+'개 지역 서비스 안내 · '+n+'페이지',intro+nav+cards+nav,path,false);
 }
 return {render,index,nationwideIndex,evidence,totalCombinations};
}
module.exports={create,names,targets};
