'use strict';
// A million useful lookup combinations, not a million duplicate SEO pages.
// Official 20,562 places x five distinct services x ten inquiry intents.
const serviceNames={taksong:'자동차탁송',daeri:'대리운전',corporate:'법인대리운전','daily-driver':'일일기사',golf:'골프대리운전'};
const intentNames=['요금 문의','예약 상담','장거리 이동','야간·새벽','출발지 인수','도착지 인계','일정·대기','공개 운행후기','운행 조건','전화 상담'];
const intentIds=['fare','reserve','long-distance','late-night','pickup','handover','waiting','history','conditions','call'];
const htmlEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=s=>String(s??'').normalize('NFKC').replace(/\s+/g,'').replace(/(법인대리운전|골프대리운전|자동차탁송|대리운전|일일기사|차량탁송|탁송)$/,'').toLowerCase();
function create(regions,servicePath,host='jeongukdaeri.kr'){
 const records=regions.map(r=>({region:r,short:normalize(r.name),full:normalize(r.full_name),compactFull:normalize(r.full_name).replace(/(특별자치도|특별자치시|특별시|광역시)/g,'')}));
 const combinations=regions.length*Object.keys(serviceNames).length*intentNames.length;
 function lookup(q='',max=12){
  const search=normalize(String(q).slice(0,60));
  if(!search)return regions.filter(r=>r.level==='시도').slice(0,12);
  const hits=[];
  for(const row of records){
   let weight=0;
   if(row.full===search||row.compactFull===search)weight=5;
   else if(row.short===search)weight=4;
   else if(row.full.endsWith(search)||row.compactFull.endsWith(search))weight=3;
   else if(search.length>=2&&(row.full.includes(search)||row.compactFull.includes(search)))weight=2;
   else if(search.length>=2&&row.short.includes(search))weight=1;
   if(weight)hits.push({weight,region:row.region});
  }
  hits.sort((a,b)=>b.weight-a.weight||a.region.full_name.length-b.region.full_name.length||a.region.full_name.localeCompare(b.region.full_name,'ko'));
  return hits.slice(0,Math.max(1,Math.min(20,Number(max)||12))).map(x=>x.region);
 }
 function url(r,kind){
  return kind==='taksong'||kind==='daeri'?servicePath(r,kind):'/reviews/local/'+kind+'/'+r.slug+'/';
 }
 function search(q='',service='',intent=''){
  const kind=Object.hasOwn(serviceNames,service)?service:'';
  const intentId=intentIds.includes(intent)?intent:'';
  const matches=lookup(q,12);
  return {count:combinations,regions:regions.length,services:Object.keys(serviceNames).length,intents:intentNames.length,query:String(q).slice(0,60),selectedService:kind,selectedIntent:intentId,results:matches.map(r=>({name:r.full_name,level:r.level,slug:r.slug,links:(kind?[kind]:Object.keys(serviceNames)).map(k=>({kind:k,label:serviceNames[k],url:url(r,k)}))}))};
 }
 function page(q='',service='',intent=''){
  const data=search(q,service,intent),hasQuery=Boolean(String(q).trim()),hasSelection=hasQuery||Boolean(data.selectedService)||Boolean(data.selectedIntent),h=htmlEscape;
  const canonical='https://'+host+'/find/';
  const cards=data.results.map(r=>'<article class="place"><h2>'+h(r.name)+' <small>'+h(r.level)+'</small></h2><div class="actions">'+r.links.map(link=>'<a href="'+h(link.url)+'">'+h(link.label)+' 안내·후기</a>').join('')+'</div></article>').join('');
  const kinds='<option value="">전체 5개 서비스</option>'+Object.entries(serviceNames).map(([k,v])=>'<option value="'+k+'"'+(data.selectedService===k?' selected':'')+'>'+h(v)+'</option>').join('');
  const intents='<option value="">상담 목적 선택</option>'+intentIds.map((id,i)=>'<option value="'+id+'"'+(data.selectedIntent===id?' selected':'')+'>'+h(intentNames[i])+'</option>').join('');
  const intention=data.selectedIntent?'<p class="notice"><strong>상담 목적: '+h(intentNames[intentIds.indexOf(data.selectedIntent)])+'</strong> · 운행 가능 여부와 실제 견적은 출발지·도착지·일정을 확인한 뒤 안내합니다. '+(data.selectedIntent==='fare'?'<a href="/fare/">예상요금 입력</a>':data.selectedIntent==='history'?'<a href="/reviews/history/">실제 운행기록 확인</a>':data.selectedIntent==='call'?'<a href="tel:18114294">전화상담 1811-4294</a>':'<a href="tel:18114294">예약·운행조건 상담</a>')+'</p>':'';
  const suggestions=!hasQuery?'<nav aria-label="주요 지역 바로가기" class="suggest">'+['서울','부산','대구','인천','강화','제주','속초','창원'].map(x=>'<a href="/find/?q='+encodeURIComponent(x)+'">'+x+'</a>').join('')+'</nav>':'';
  const context=hasQuery?'<p class="notice">검색 결과는 지명과 행정구역의 일치 정도로 정렬합니다. 같은 이름의 동·리는 전체 주소로 구분하세요. 표시된 URL이 실제 배차 완료나 기사 상주를 뜻하지는 않습니다.</p>':'<p class="notice">지역 검색에서 실제 출발지를 찾고 서비스별 운행조건·후기를 확인하세요. 빈 지역의 후기나 확정 요금은 만들어 표시하지 않습니다.</p>';
  const body=cards||'<p class="empty">일치하는 지역이 없습니다. 시·군·구 또는 읍·면·동 이름으로 다시 검색해 주세요. <a href="tel:18114294">전화상담 1811-4294</a></p>';
  return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
   '<title>전국 지역별 대리운전·자동차탁송·일일기사 찾기 | 스마트24</title>'+
   '<meta name="description" content="전국 20,562개 행정구역에서 자동차탁송, 대리운전, 법인대리운전, 일일기사, 골프대리운전의 실제 운행후기·요금 상담 안내를 찾으세요. 1811-4294.">'+
   '<meta name="robots" content="'+(hasSelection?'noindex,follow':'index,follow')+'"><link rel="canonical" href="'+canonical+'">'+
   '<style>*,*::before,*::after{box-sizing:border-box}body{margin:0;background:#f4f7fb;color:#14263d;font:16px/1.65 system-ui,-apple-system,sans-serif}header,footer{padding:15px max(5vw,15px);background:#10284c;color:white}a{color:#075799}header a,footer a{color:#fff}main{max-width:1060px;margin:auto;padding:28px 18px}h1{font-size:clamp(27px,4vw,43px);line-height:1.22;letter-spacing:-.04em}h2{font-size:18px;margin:0 0 12px}.lead{font-size:18px;max-width:780px}.search{display:grid;grid-template-columns:minmax(180px,1fr) minmax(135px,190px) minmax(130px,180px) auto;gap:9px;padding:17px;border:1px solid #c7d8e9;background:#fff;border-radius:16px}input,select,button{font:inherit;min-height:52px;border-radius:9px;padding:10px;border:1px solid #91a8bf}button{background:#005fac;color:#fff;border:0;font-weight:750;cursor:pointer}.stats{font-weight:750;color:#075799}.notice{background:#ecf4fc;padding:12px;border-radius:9px}.list{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:12px;margin:20px 0}.place{background:white;border:1px solid #d8e2ee;border-radius:12px;padding:16px}.place small{color:#65748a;font-size:12px}.actions{display:flex;flex-wrap:wrap;gap:7px}.actions a,.suggest a{border:1px solid #c8d7e8;padding:7px 10px;border-radius:8px;text-decoration:none;font-size:14px}.suggest{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}.bottom{padding:18px;background:#fff;border-radius:12px}.bottom a{font-weight:750}.empty{padding:30px;background:#fff}@media(max-width:650px){.search{grid-template-columns:1fr}button{width:100%}.list{grid-template-columns:1fr}main{padding:20px 13px}}</style></head><body>'+
   '<header><a href="/">스마트24 전국대리운전·자동차탁송</a> · <a href="tel:18114294">전화 1811-4294</a></header><main>'+
   '<h1>내 지역에서 필요한 운행 서비스, 한 번에 찾기</h1><p class="lead">대리운전 · 차량탁송 · 법인대리운전 · 일일기사 · 골프대리운전</p>'+
   '<p class="stats">행정구역 '+regions.length.toLocaleString('ko-KR')+'개 × 서비스 5개 × 상담 목적 10종 = '+combinations.toLocaleString('ko-KR')+'개 조회 조합</p>'+
   '<p>조회 가능한 조합 수는 실제 운행후기 수나 네이버 검색 색인 수와 다릅니다.</p>'+
   '<form class="search" action="/find/" method="get" role="search"><label><span>지역명</span><input type="search" name="q" value="'+h(data.query)+'" maxlength="60" placeholder="예: 강화군, 부산 해운대구, 속초시" aria-label="지역명" autocomplete="off"></label><label><span>서비스</span><select name="service" aria-label="운행 서비스">'+kinds+'</select></label><label><span>상담 목적</span><select name="intent" aria-label="상담 목적">'+intents+'</select></label><button type="submit">지역·서비스 찾기</button></form>'+suggestions+context+intention+
   '<div class="list">'+body+'</div><section class="bottom"><h2>요금과 예약은 별도 확인합니다</h2><p>공개된 기존 운행금액은 현재 요금이 아닙니다. 출발지·도착지·차종·시간·대기·기사 접근과 복귀 조건을 알려주세요.</p><p><a href="/fare/">출발·도착 예상요금</a> · <a href="/reviews/history/">실제 운행기록</a> · <a href="tel:18114294">전화 1811-4294</a></p></section></main><footer>스마트24 · 전국 상담 1811-4294</footer></body></html>';
 }
 return {search,page,lookup,combinations,intentNames};
}
module.exports={create,serviceNames,intentNames};
