'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const ROOT=__dirname,PORT=Number(process.env.PORT||3000),BRAND='스마트전국대리운전 스마트24탁송',PHONE='1811-4294';
const {matchingHistoryRegion,publicPlace}=require('./lib/regional-history-evidence');
const {observeCrawlerRequest}=require('./lib/crawler-observability');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const load=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const baseRegions=load('data/regions.json').regions||[];
function loadLegalRegions(){
 const folder=path.join(ROOT,'data/legal-regions');
 if(!fs.existsSync(folder))return baseRegions;
 const files=fs.readdirSync(folder).filter(n=>/^\d{2}\.json$/.test(n)).sort();
 if(files.length!==17)throw Error('Incomplete nationwide region files: '+files.length+'/17');
 const regions=[],byFull=new Map();
 for(const file of files){
  const doc=JSON.parse(fs.readFileSync(path.join(folder,file),'utf8'));
  for(const full of doc.full_names){
   if(byFull.has(full))continue;
   const parts=full.split(' '),name=parts.at(-1),parentFull=parts.slice(0,-1).join(' ');
   const parent=byFull.get(parentFull);
   if(parts.length>1&&!parent)throw Error('Missing parent for '+full);
   const level=parts.length===1?'시도':/리$/.test(name)?'리':/읍$/.test(name)?'읍':/면$/.test(name)?'면':/구$/.test(name)?'구':/군$/.test(name)?'군':/시$/.test(name)?'시':'동';
   const region={name,slug:'area-'+(regions.length+1),level,parent_name:parent?.name||'대한민국',parent_slug:parent?.slug||null,full_name:full,services:['daeri','taksong','daily']};
   regions.push(region);byFull.set(full,region);
  }
 }
 return regions;
}
const regions=loadLegalRegions();
const priorityRegionalPages=load('data/priority-regions.json').pages;
const publishedBlogPosts=load('blog/posts.json').filter(p=>p&&typeof p.title==='string'&&/^https:\/\/blog\.naver\.com\/wjdtnr4757\/\d+$/.test(p.url));
const daeriBlogEditorial=require('./lib/daeri-blog-editorial');
const daeriTravelGuides=require('./lib/daeri-travel-guides');
const foodTravelMap=require('./lib/food-travel-map');
const priorityByKey=new Map(priorityRegionalPages.map(x=>[x.kind+'|'+x.region,x]));
if(priorityRegionalPages.length!==26||priorityByKey.size!==26)throw Error('Expected 26 unique priority regional pages');
for(const guide of priorityRegionalPages){
 if(!['daeri','taksong'].includes(guide.kind)||!regions.some(r=>r.full_name===guide.region)||!guide.topic||!guide.detail)
  throw Error('Invalid priority region entry: '+JSON.stringify([guide.kind,guide.region]));
}

const bySlug=new Map(regions.map(r=>[r.slug,r]));
const childrenByParent=new Map();
for(const r of regions){if(!r.parent_slug)continue;const a=childrenByParent.get(r.parent_slug)||[];a.push(r);childrenByParent.set(r.parent_slug,a)}

// Stable readable paths, derived from the existing legal-administrative hierarchy.
const romanInitial=['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
const romanMedial=['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
const romanFinal=['','k','k','k','n','n','n','t','l','k','m','p','l','l','p','l','m','p','p','t','t','ng','t','t','k','t','p','t'];
function romanizeKorean(value){return [...String(value)].map(ch=>{const n=ch.charCodeAt(0)-44032;if(n<0||n>=11172)return /[a-z0-9]/i.test(ch)?ch.toLowerCase():'-';const initial=Math.floor(n/588),medial=Math.floor(n%588/28),final=n%28;return romanInitial[initial]+romanMedial[medial]+romanFinal[final]}).join('').replace(/-+/g,'-').replace(/^-|-$/g,'')}
const romanOverrides={'서울특별시':'seoul','부산광역시':'busan','인천광역시':'incheon','대구광역시':'daegu','광주광역시':'gwangju','대전광역시':'daejeon','울산광역시':'ulsan','세종특별자치시':'sejong','경기도':'gyeonggi','강원특별자치도':'gangwon','충청북도':'chungbuk','충청남도':'chungnam','전북특별자치도':'jeonbuk','전라남도':'jeonnam','경상북도':'gyeongbuk','경상남도':'gyeongnam','제주특별자치도':'jeju','강화군':'ganghwa-gun','강화읍':'ganghwa-eup','불은면':'bureun-myeon'};
const byPath=new Map();
const pathBySlug=new Map();
for(const r of regions){const parentPath=r.parent_slug?pathBySlug.get(r.parent_slug):'';const suffixMatch=r.name.match(/^(.*?)(특별자치시|특별시|광역시|특별자치도|자치도|도|시|군|구|읍|면|동|리)$/);
 const suffixLabels={'특별자치시':'si','특별시':'si','광역시':'si','특별자치도':'do','자치도':'do','도':'do','시':'si','군':'gun','구':'gu','읍':'eup','면':'myeon','동':'dong','리':'ri'};
 const segment=romanOverrides[r.name]||(suffixMatch&&suffixMatch[1]?romanizeKorean(suffixMatch[1])+'-'+suffixLabels[suffixMatch[2]]:romanizeKorean(r.name));const proposed=(parentPath?parentPath+'/':'')+segment;const unique=byPath.has(proposed)?proposed+'-'+r.slug:proposed;pathBySlug.set(r.slug,unique);byPath.set(unique,r)}
function servicePath(r,kind){return '/'+kind+'/'+pathBySlug.get(r.slug)+'/'}
const rides=load('data/ride-history.json');
const excelReviewFiles=['data/daeri-review-drafts-202610.json','data/taksong-review-drafts-202610.json'];
const excelCompleted=excelReviewFiles.flatMap(file=>{try{const doc=load(file);const service=({'대리운전':'daeri','탁송':'taksong','daeri':'daeri','taksong':'taksong'})[String(doc.service||'').trim()];if(!service)return [];return (doc.items||[]).filter(x=>x.publication_status==='사용자 확인 운행완료').map(x=>({...x,service,status:'completed',verified:true,verification_source:'user-confirmed Excel'}))}catch{return []}});
const reviewedRides=load('data/public-reviewed-rides-202610.json');
const verifiedRides=[...reviewedRides,...(Array.isArray(rides)?rides.filter(x=>x.verified===true&&['completed','종료','운행종료'].includes(String(x.status||'').trim())):[]),...excelCompleted];
const publicRides=verifiedRides.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x.date||''))&&String(x.departure||'').trim()&&String(x.destination||'').trim()&&['taksong','daeri'].includes(x.service)).map(x=>({...x,publicId:require('node:crypto').createHash('sha256').update([x.date,x.service,x.departure,x.destination].join('|')).digest('hex').slice(0,16)}));
const publicRideById=new Map(publicRides.map(x=>[x.publicId,x]));
// Excel-derived completed dispatch records: classified by departure 탁 or destination 톨포.
// Display a privacy-preserving summary; raw address and customer notes are never published.
const historicalRides=(Array.isArray(rides)?rides:[]).map((x,i)=>{
 const dep=String(x.departure||''),dest=String(x.destination||'');
 const service=/탁/.test(dep)||/톨포/.test(dest)?'taksong':'daeri';
 const place=publicPlace;
 return {id:'excel-'+String(i+1).padStart(4,'0'),date:x.date,service,departure:place(dep),destination:place(dest),fare:x.fare||'',rawDeparture:dep,rawDestination:dest};
});
function vehicleGuideLink(kind){
 const label=kind==='taksong'?'자동차탁송':'대리운전';
 return '<p class="vehicle-guide-link"><a href="/'+kind+'/#vehicle-guide">국산차·수입차 '+label+' 차량 안내</a>에서 차종별 소개 이미지를 확인하세요. 예약할 때 차종, 차량 크기와 특이사항을 알려주시면 이용 조건을 상담합니다.</p>';
}
function serviceVehicleGallery(kind){
 const label=kind==='taksong'?'자동차탁송':'대리운전';
 return '<section id="vehicle-guide"><h2>국산차·수입차 '+label+' 안내</h2><p>차량 종류와 이용 목적을 함께 알려주세요. 아래 사진은 서비스 소개용 홍보 이미지이며, 보유 차량이나 실제 운행 사례를 뜻하지 않습니다.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px">'+[['domestic','국산차'],['imported','수입차']].map(([key,name])=>'<figure style="margin:0"><img src="/assets/vehicles/'+key+'-fleet-1811.webp" alt="'+name+' 차종별 '+label+' 서비스 소개 이미지, 상담 1811-4294" width="1536" height="1024" loading="lazy" decoding="async" style="width:100%;height:auto"><figcaption>'+name+' · <a href="/fare/?service='+kind+'">예상요금 조회</a> · <a href="tel:18114294">예약 상담 1811-4294</a></figcaption></figure>').join('')+'</div></section>';
}
function serviceJourneyLinks(kind){
 const isT=kind==='taksong',label=isT?'자동차탁송':'대리운전';
 return vehicleGuideLink(kind)+'<section class="service-journey" aria-label="'+label+' 요금 예약 운행기록"><h2>'+label+' 요금·예약·실제 운행기록</h2><nav aria-label="'+label+' 이용 단계"><ol><li><a href="/'+kind+'/">'+label+' 서비스와 지역 안내</a></li><li><a href="/fare/?service='+kind+'">'+label+' 예상요금 조회</a></li><li><a href="/'+kind+'/#reservation-guide">'+label+' 예약 준비와 인수·인계 안내</a></li><li><a href="/reviews/history/?kind='+kind+'">'+label+' 완료 운행기록과 당시 요금</a></li></ol></nav><p>운행기록의 요금은 당시 금액입니다. 현재 일정과 차량 조건에 따른 최종 요금은 <a href="tel:18114294">1811-4294</a>로 확인하세요.</p></section>';
}
function peakDispatchNotice(){
 return '<section><h2>피크타임·지방·오지의 당일 호출과 요금</h2><p>주말, 야간·새벽, 피크타임 또는 기사 접근·복귀가 어려운 지방·산간·오지에서는 예약 없이 급히 호출하면 기사 배차가 어렵거나 지연될 수 있습니다. 먼 곳에서 기사를 이동시키고 복귀 교통편을 확보해야 하는 경우도 있습니다.</p><p><strong>긴급 배차는 평소보다 훨씬 높은 요금, 상황에 따라 2배 이상의 금액이 제시될 수도 있습니다.</strong> 이는 모든 호출에 적용되는 고정 할증률이 아니며 기사 수급, 접근·복귀, 차량 조건에 따라 실제 금액이 달라집니다.</p><p>운영자가 확인해 준 바로는 지금까지 예약 확정한 운행은 안내 금액 그대로 100% 배차·운행완료했습니다. 이는 이미 예약 확정해 수행한 건에 관한 실적이며 앞으로 모든 요청에 동일한 배차를 보장한다는 뜻은 아닙니다.</p><p>해당 운행 기록에 표시된 요금이 긴급 할증금액이었다는 의미도 아닙니다. 기록된 사실과 일반적인 배차 안내는 구분해 설명합니다.</p></section>';
}
function historyDetailPage(x){
 const kind=x.service==='taksong'?'자동차탁송':'대리운전';
 const title=x.departure+'에서 '+x.destination+'까지 '+kind+' 완료 운행후기｜'+x.date+' · 요금 '+x.fare;
 const relatedRoute=routeKeywordPages.reviewed.forRide(x);
 const movement=x.service==='taksong'
 ?'<p>자동차탁송은 고객 차량을 출발지에서 인수해 목적지로 이동시키는 방식입니다. 차키 전달, 차량 운행 가능 상태, 인수·인계 장소 및 기사 복귀 여건은 실제 접수 시 별도로 확인합니다.</p>'
 :'<p>대리운전은 고객의 차량을 기사에게 맡겨 이동하는 서비스입니다. 차량 주차 위치, 동승·경유 여부, 목적지 도착 후 기사 복귀 여건을 실제 접수 시 따로 확인합니다.</p>';
 const body='<article><h1>'+esc(title)+'</h1><p><strong>'+esc(x.date)+'</strong> 운행내역에 '+esc(x.departure)+' 출발, '+esc(x.destination)+' 도착, <strong>'+esc(x.fare)+'</strong> 요금의 '+kind+' 건이 기록되어 있습니다. 운행완료 내역을 바탕으로 내용을 정리한 후기이며 고객정보와 상세 주소는 공개하지 않습니다.</p><h2>실제 기록에서 확인되는 내용</h2><dl><dt>운행일</dt><dd>'+esc(x.date)+'</dd><dt>서비스</dt><dd>'+kind+'</dd><dt>출발 지역</dt><dd>'+esc(x.departure)+'</dd><dt>도착 지역</dt><dd>'+esc(x.destination)+'</dd><dt>당시 운행요금</dt><dd>'+esc(x.fare)+'</dd></dl><p>실제 요금은 당시 배차 조건에서 기록된 금액입니다. 자료에 예약 여부, 차종, 기사 이동 수단이나 정확한 배차 시각이 없으면 임의로 추가하지 않습니다.</p><h2>출발에서 도착까지 배차 시 확인할 사항</h2>'+movement+'<p>기사 접근거리와 도착 후 복귀, 운행 시각, 통행료·주차·대기 여부 등에 따라 같은 구간도 배차 가능 여부와 현재 요금이 달라질 수 있습니다. 운행 당시 요금으로 지금도 배차된다는 뜻은 아닙니다.</p>'+peakDispatchNotice()+(relatedRoute?'<p>이 운행은 출발지·도착지의 방향이 확인된 기록입니다. <a href="'+routeKeywordPages.reviewed.routePath(relatedRoute)+'">'+esc(relatedRoute.from.name+'에서 '+relatedRoute.to.name+'까지 '+kind+' 실제 구간 후기 모음')+'</a>에서도 해당 기록을 볼 수 있습니다.</p>':'')+'<h2>같은 구간 예약·배차 상담</h2><p>정확한 출발지와 목적지, 희망 날짜·시간, 차량 종류를 알려주시면 기사 수급과 요금 조건을 확인합니다. 지방·오지 출발이나 피크타임에는 일정을 미리 전달하는 것이 중요합니다.</p><p><a href="tel:18114294">배차 상담 1811-4294</a> · <a href="/route-search/?from='+encodeURIComponent(x.departure)+'&amp;to='+encodeURIComponent(x.destination)+'&amp;service='+x.service+'">출발·도착지 조합 검색</a> · <a href="/reviews/history/">전국 완료 운행후기 목록</a></p></article>';
 return layout(title,kind+' 실제 완료 운행내역에 근거한 후기. '+x.departure+' 출발 '+x.destination+' 도착 당시 요금 '+x.fare+'.',body+serviceJourneyLinks(x.service),'https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr')+'/reviews/history/'+x.id+'/');
}
function matchingHistoricalRides(origin,destination){
 const aliases=[origin,origin.replace(/(특별자치시|특별시|광역시|특별자치도|시|군|구)$/,'')].filter(x=>x.length>1);
 const destAliases=[destination,destination.replace(/(역|시청)$/,''),destination==='서울역'?'서울':destination==='인천시청'?'인천':''].filter(x=>x.length>1);
 return historicalRides.filter(x=>aliases.some(a=>x.rawDeparture.includes(a))&&destAliases.some(d=>x.rawDestination.includes(d))).slice(0,8).map(x=>({url:'/reviews/history/'+x.id+'/',date:x.date,from:x.departure,to:x.destination,service:x.service}));
}
function historyIndexPage(page=1,kind='all'){
 const list=historicalRides.filter(x=>kind==='all'||x.service===kind),size=40,pages=Math.max(1,Math.ceil(list.length/size)),p=Math.max(1,Math.min(pages,page)),part=list.slice((p-1)*size,p*size);
 const nav='<p><a href="/reviews/history/?kind=all">전체</a> · <a href="/reviews/history/?kind=daeri">대리운전</a> · <a href="/reviews/history/?kind=taksong">자동차탁송</a> · <a href="/fare/routes/">전국 1,000개 예상요금</a></p>';
 const items=part.map(x=>'<li><a href="/reviews/history/'+x.id+'/">운행기록 상세</a> · '+esc(x.date)+' · '+(x.service==='taksong'?'자동차탁송':'대리운전')+' · '+esc(x.departure)+' → '+esc(x.destination)+' · '+esc(x.fare)+' <small>(운행기록 기준)</small></li>').join('');
 const canonicalParams=kind==='all'&&p===1?'':'?kind='+kind+(p>1?'&page='+p:'');
 const historicalConnections='<section id="history-original-distinction"><h2>완료 운행기록과 공개 블로그 원문의 구분</h2><p>이 목록은 저장된 운행기록의 완료 내역으로, 네이버 블로그에서 게시된 글 수와 별개입니다. 게시물 제목에 적힌 운행완료·요금 표현을 이 기록과 자동으로 연결하지 않습니다. 과거 요금은 현재 배차 견적이 아닙니다.</p><p><a href="/blog/archive/">네이버 블로그 공개 원문 자료실</a> · <a href="/blog/archive/capital-taksong/">수도권 차량탁송 글</a> · <a href="/blog/archive/general-daeri/">전국 대리운전 글</a> · <a href="/reviews/">사용자 확인 완료 기록</a></p></section>';
 const pagination='<p>'+(p>1?'<a href="?kind='+kind+'&page='+(p-1)+'">이전</a> ':'')+' '+p+'/'+pages+' '+(p<pages?'<a href="?kind='+kind+'&page='+(p+1)+'">다음</a>':'')+'</p>';
 return layout('전국 대리운전·자동차탁송 완료 운행기록'+(p>1?' '+p+'페이지':'')+(kind==='all'?'':kind==='daeri'?' | 대리운전':' | 자동차탁송'),'기존 완료 운행기록 '+list.length+'건 기준 출발·도착 지역과 당시 요금을 확인합니다. 개인 상세주소는 표시하지 않습니다.','<section><h1>전국 운행완료 기록</h1><p><a href="/routes/reviewed/">출발→도착 조합별 실제 운행완료 후기 모음</a></p><p>총 '+list.length+'건 · 상세주소와 고객정보 비공개 · 기록 당시 요금으로 현재 예상요금과 다를 수 있습니다.</p>'+historicalConnections+nav+'<ol>'+items+'</ol>'+pagination+'<h2>예약 방법</h2><p>대리운전은 출발지와 목적지, 희망 시간을 알려주세요. 자동차탁송은 차량 종류, 인수·인계 장소와 예약 시간을 알려주시면 배차 가능 여부와 요금을 안내합니다.</p><p>상담 <a href="tel:18114294">1811-4294</a></p></section>','https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr')+'/reviews/history/'+canonicalParams);
}

const rideUrl=x=>'/reviews/'+x.publicId+'/';
function ridePage(x){
 const service=x.service==='taksong'?'탁송':'대리운전',base='https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr');
 const title=[x.departure,x.destination].filter(Boolean).join(' → ')+' '+service+' 운행완료'+(x.fare?' | 요금 '+x.fare:'')+' | '+x.date;
 const desc=x.date+' '+service+' 완료 운행 기록. 출발·도착 지역과 운행 요금은 확인된 기록을 기준으로 안내합니다.';
 const safePlace=v=>String(v||'').replace(/\d{1,5}(?:-\d{1,5})?/g,'(상세주소 비공개)').slice(0,100);
 const body='<article><h1>'+esc(title)+'</h1><p>사용자 확인 완료 기록에 근거한 실제 운행 안내입니다. 개인정보 보호를 위해 상세 주소는 일부 생략합니다.</p><section><h2>운행 정보</h2><dl><dt>날짜</dt><dd>'+esc(x.date)+'</dd><dt>서비스</dt><dd>'+service+'</dd><dt>출발</dt><dd>'+esc(safePlace(x.departure))+'</dd><dt>도착</dt><dd>'+esc(safePlace(x.destination))+'</dd>'+(x.fare?'<dt>기록 요금</dt><dd>'+esc(x.fare)+'</dd>':'')+'</dl></section><section><h2>예약·요금 상담</h2><p>위 금액은 해당 운행 당시의 기록입니다. 출발지·도착지·시간대 및 기사 이동 여건에 따라 달라집니다.</p><p><a href="tel:18114294">상담 1811-4294</a></p></section>'+peakDispatchNotice()+'<p><a href="/reviews/">완료 운행 기록 목록</a> · <a href="/'+x.service+'/">'+service+' 서비스 안내</a></p></article>';
 return layout(title,desc,body+ridePriorityRegionLinks(x)+serviceJourneyLinks(x.service),base+rideUrl(x),base+'/assets/smart24-business-card-inline-v2.png');
}
function ridesIndex(){const base='https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr');return layout('실제 완료 운행 기록','확인된 전국 탁송·대리운전 완료 운행 사례', '<section><h1>실제 완료 운행 기록</h1><p>확인된 운행만 공개하며 미확인 기록은 자동 발행하지 않습니다.</p><ul>'+publicRides.slice().reverse().slice(0,100).map(x=>'<li><a href="'+rideUrl(x)+'">'+esc(x.date+' '+(x.service==='taksong'?'탁송':'대리운전')+' 완료 운행'+(x.fare?' · 당시 요금 '+x.fare:''))+'</a></li>').join('')+'</ul></section>'+serviceJourneyLinks('daeri')+serviceJourneyLinks('taksong'),base+'/reviews/');}
const verifiedProvinceLocalityTokens={
 '강원특별자치도':['백담사 탐방지원센터','설악산 소공원','정선읍'],
 '부산광역시':['해운대중동']
};
function tripMatchesRegion(x,r){
 // Even a user-confirmed ride needs geographically valid attribution.
 // "방교동" is not 속초시 교동; "광주경안동" is not 광주광역시.
 const rawDeparture=String(x.departure||''),rawDestination=String(x.destination||'');
 if(r.level==='시도'&&(verifiedProvinceLocalityTokens[r.full_name]||[]).some(token=>
  [rawDeparture,rawDestination].some(place=>place.includes(token))))return true;
 return matchingHistoryRegion({rawDeparture,rawDestination},r,regions);
}

function ridePriorityRegionLinks(x){
 // Only independently confirmed public rides link back to matching regional service pages.
 const matches=priorityRegionalPages.filter(p=>p.kind===x.service).map(p=>regions.find(r=>r.full_name===p.region)).filter(r=>r&&tripMatchesRegion(x,r)).slice(0,6);
 if(!matches.length)return '';
 const label=x.service==='taksong'?'자동차탁송':'대리운전';
 return '<section><h2>이 운행기록과 관련된 지역별 '+label+' 안내</h2><ul>'+matches.map(r=>'<li><a href="'+servicePath(r,x.service)+'">'+esc(seoRegionLabel(r)+label)+' 지역 안내</a></li>').join('')+'</ul><p>지역 안내는 예약 조건과 기사 접근을 설명하며 실제 완료 기록은 이 운행 페이지의 확인된 내용에 한정됩니다.</p></section>';
}
function tripLine(x){return '<li>'+esc([x.date,x.departure+' → '+x.destination,x.fare].filter(Boolean).join(' · '))+' · '+esc(x.service||'운행')+' 완료</li>'}
const clean=s=>String(s||'').trim().slice(0,80);
const compact=s=>String(s||'').replace(/\s+/g,'').toLowerCase();
const shortPlace=s=>String(s||'').replace(/(특별자치시|특별시|광역시|특별자치도|자치시|시|군|구|읍|면|동|리)$/,'');
const provinceSeoLabels={
 '서울특별시':'서울','부산광역시':'부산','대구광역시':'대구','인천광역시':'인천',
 '광주광역시':'광주','대전광역시':'대전','울산광역시':'울산','세종특별자치시':'세종',
 '경기도':'경기','강원특별자치도':'강원도','충청북도':'충북','충청남도':'충남',
 '전북특별자치도':'전북','전라남도':'전남','경상북도':'경북','경상남도':'경남','제주특별자치도':'제주'
};
const seoRegionBase=r=>r.level==='시도'?(provinceSeoLabels[r.name]||shortPlace(r.name)):['구','읍','면','동','리'].includes(r.level)?r.name:shortPlace(r.name);
const seoRegionCounts=new Map();
for(const region of regions){const name=seoRegionBase(region);seoRegionCounts.set(name,(seoRegionCounts.get(name)||0)+1)}
// A national keyword belongs on the national hub; duplicate locality names need their full legal hierarchy.
function seoRegionLabel(r){const short=seoRegionBase(r);return r.level==='리'||seoRegionCounts.get(short)>1?r.full_name:short}

const regionAliases=r=>{
 const n=r.name,short=shortPlace(n),a=new Set([n]);if(['시도','시','군'].includes(r.level))a.add(short);
 if(r.level==='시도'){
  if(/광역시$/.test(n))a.add(short+'시');
  if(n==='서울특별시')a.add('서울시');
  if(n==='세종특별자치시')a.add('세종시');
  if(n==='강원특별자치도')a.add('강원도');
  if(n==='전북특별자치도'){a.add('전라북도');a.add('전북');}
  if(n==='제주특별자치도')a.add('제주도');
  const abbr={'경기도':'경기','충청북도':'충북','충청남도':'충남','전라남도':'전남','경상북도':'경북','경상남도':'경남'};
  if(abbr[n])a.add(abbr[n]);
 }
 return [...a].filter(Boolean);
};
const placeNames=r=>[r.full_name,r.name,shortPlace(r.name),regionAncestors(r).map(x=>shortPlace(x.name)).join(' ')].filter(Boolean);
const landmarks=[
 ['충북혁신도시',['진천군','음성군','덕산읍','맹동면']],
 ['강원혁신도시',['원주시']],['전북혁신도시',['전주시','완주군']],
 ['광주전남혁신도시',['나주시']],['경북혁신도시',['김천시']],
 ['경남혁신도시',['진주시']],['대구혁신도시',['동구']],
 ['부산혁신도시',['부산광역시']],['울산혁신도시',['중구']],['제주혁신도시',['서귀포시']],
 ['서울역',['서울특별시']],['광명역',['광명시']],['수서역',['강남구']],
 ['천안아산역',['아산시','천안시']],['강남역',['강남구','서초구']],
 ['역삼역',['역삼동']],['태백역',['태백시']],['정선역',['정선군']],
 ['부평역',['부평구']],['인천역',['중구','인천광역시']],
 ['경포대',['강릉시']],['경포해수욕장',['강릉시']],['주문진해수욕장',['강릉시']],['정동진해수욕장',['강릉시']],
 ['속초해수욕장',['속초시']],['낙산해수욕장',['양양군']],['하조대해수욕장',['양양군']],['서피비치',['양양군']],['망상해수욕장',['동해시']],['삼척해수욕장',['삼척시']],
 ['대천해수욕장',['보령시']],['무창포해수욕장',['보령시']],['만리포해수욕장',['태안군']],['꽃지해수욕장',['태안군']],['몽산포해수욕장',['태안군']],
 ['을왕리해수욕장',['중구','인천광역시']],['왕산해수욕장',['중구','인천광역시']],['동막해변',['강화군']],['제부도',['화성시']],
 ['해운대해수욕장',['해운대구']],['광안리해수욕장',['수영구']],['송정해수욕장',['해운대구']],['송도해수욕장',['서구','부산광역시']],['다대포해수욕장',['사하구']],
 ['일산해수욕장',['동구','울산광역시']],['진하해수욕장',['울주군']],['주전몽돌해변',['동구','울산광역시']],
 ['구룡포해수욕장',['포항시']],['영일대해수욕장',['포항시']],['월포해수욕장',['포항시']],['장사해수욕장',['영덕군']],['고래불해수욕장',['영덕군']],
 ['경주감포항',['경주시']],['구룡포항',['포항시']],['죽변항',['울진군']],['후포항',['울진군']],['대포항',['속초시']],['주문진항',['강릉시']],['묵호항',['동해시']],
 ['군산항',['군산시']],['격포항',['부안군']],['목포항',['목포시']],['여수항',['여수시']],['여수엑스포항',['여수시']],['녹동항',['고흥군']],['완도항',['완도군']],
 ['통영항',['통영시']],['삼천포항',['사천시']],['장승포항',['거제시']],['옥포항',['거제시']],['부산항',['부산광역시']],
 ['변산해수욕장',['부안군']],['격포해수욕장',['부안군']],['선유도해수욕장',['군산시']],['명사십리해수욕장',['완도군']],['율포해수욕장',['보성군']],['돌산해수욕장',['여수시']],
 ['상주은모래비치',['남해군']],['구조라해수욕장',['거제시']],['학동흑진주몽돌해변',['거제시']],['와현해수욕장',['거제시']],
 ['협재해수욕장',['제주시']],['금능해수욕장',['제주시']],['함덕해수욕장',['제주시']],['김녕해수욕장',['제주시']],['이호테우해수욕장',['제주시']],
 ['중문색달해수욕장',['서귀포시']],['표선해수욕장',['서귀포시']],['성산일출봉',['서귀포시']],['성산항',['서귀포시']],['모슬포항',['서귀포시']],
 ['용추계곡',['가평군']],['명지계곡',['가평군']],['어비계곡',['가평군']],['중원계곡',['양평군']],['벽계구곡',['양평군']],['백운계곡',['포천시']],['지장산계곡',['포천시']],['비둘기낭폭포',['포천시']],['송추계곡',['양주시']],['장흥유원지',['양주시']],['청평유원지',['가평군']],['산정호수',['포천시']],
 ['동막골계곡',['연천군']],['재인폭포',['연천군']],['남이섬',['춘천시']],['소양강댐',['춘천시']],['구곡폭포',['춘천시']],['흥정계곡',['평창군']],['장전계곡',['평창군']],['무릉계곡',['동해시']],['덕풍계곡',['삼척시']],['미인폭포',['삼척시']],['미천골계곡',['양양군']],['주전골계곡',['양양군']],['천불동계곡',['속초시']],['백담계곡',['인제군']],['내린천',['인제군']],['아침가리계곡',['인제군']],['수타사계곡',['홍천군']],['용소계곡',['홍천군']],
 ['화양구곡',['괴산군']],['쌍곡계곡',['괴산군']],['선유동계곡',['괴산군']],['송계계곡',['제천시']],['덕동계곡',['제천시']],['수옥폭포',['괴산군']],['월악산송계계곡',['제천시']],['만수계곡',['보은군']],['장령산자연휴양림',['옥천군']],['무창포유원지',['보령시']],['삽교호관광지',['당진시']],['예당호출렁다리',['예산군']],['계룡산동학사계곡',['공주시']],['갑사계곡',['공주시']],['칠갑산장곡사',['청양군']],
 ['내장산계곡',['정읍시']],['뱀사골계곡',['남원시']],['달궁계곡',['남원시']],['구천동계곡',['무주군']],['구천동관광특구',['무주군']],['운일암반일암',['진안군']],['대아저수지',['완주군']],['고산자연휴양림',['완주군']],['선운산도솔계곡',['고창군']],['채석강',['부안군']],
 ['담양관방제림',['담양군']],['죽녹원',['담양군']],['곡성섬진강기차마을',['곡성군']],['화순적벽',['화순군']],['백아산하늘다리',['화순군']],['피아골계곡',['구례군']],['화엄사계곡',['구례군']],['천은사계곡',['구례군']],['지리산중산리계곡',['산청군']],['대원사계곡',['산청군']],['백무동계곡',['함양군']],['칠선계곡',['함양군']],
 ['수승대유원지',['거창군']],['월성계곡',['거창군']],['용추계곡함양',['함양군']],['농월정계곡',['함양군']],['얼음골계곡',['밀양시']],['표충사계곡',['밀양시']],['호박소계곡',['밀양시']],['장유대청계곡',['김해시']],['내원사계곡',['양산시']],['홍류동계곡',['합천군']],['합천영상테마파크',['합천군']],
 ['팔공산동화사',['대구광역시']],['비슬산자연휴양림',['달성군']],['주왕산절골계곡',['청송군']],['주산지',['청송군']],['불영계곡',['울진군']],['왕피천계곡',['울진군']],['덕구계곡',['울진군']],['성류굴',['울진군']],['보경사계곡',['포항시']],['옥계계곡',['영덕군']],['용연폭포',['영덕군']],['문경새재',['문경시']],['선유동계곡문경',['문경시']],
 ['에버랜드',['용인시']],['한국민속촌',['용인시']],['서울대공원',['과천시']],['서울랜드',['과천시']],['롯데월드',['송파구']],['이월드',['달서구']],['경주월드',['경주시']],['통도환타지아',['양산시']],['제주신화월드',['서귀포시']],['천지연폭포',['서귀포시']],['정방폭포',['서귀포시']],['돈내코계곡',['서귀포시']],['쇠소깍',['서귀포시']],['안덕계곡',['서귀포시']]
];
const landmarkSlug=name=>'place-'+Buffer.from(name,'utf8').toString('hex');
const landmarkBySlug=new Map(landmarks.map(item=>[landmarkSlug(item[0]),item]));
const landmarkRegions=item=>regions.filter(r=>item[1].some(area=>regionAncestors(r).some(x=>x.name===area))).filter(r=>item[1].includes(r.name)).slice(0,8);
function landmarkPage(item){
 const linkedKeyword=keywordEngine.byTerm.get(keywordEngine.compact(item[0]));if(linkedKeyword)return keywordEngine.itemPage(linkedKeyword);
 const [name,areas]=item,slug=landmarkSlug(name),base='https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr'),url=base+'/place/'+slug+'/';
 const linked=landmarkRegions(item);
 const category=name.includes('혁신도시')?'혁신도시 생활권':name.endsWith('역')?'철도역 주변':/(해수욕장|해변|비치|경포대|제부도)/.test(name)?'해수욕장·해변 관광권':/(항|포항)$/.test(name)?'항구·항만·포구':/(계곡|구곡|폭포|천|골)$/.test(name)?'계곡·자연휴양지':/(유원지|월드|랜드|관광지|테마파크|호수|대공원|민속촌)/.test(name)?'유원지·관광시설':'주요 생활권';
 const desc=name+' 대리운전·탁송 예약, 예상요금 및 빠른배차 상담 안내. 인근 행정구역과 연결되는 이동은 정확한 출발지·도착지와 시간에 따라 배차 조건이 달라집니다.';
 const body='<section><h2>'+esc(name)+' 대리운전·탁송 예약 안내</h2><p>'+esc(category)+'에서 대리운전과 차량탁송을 이용하려면 정확한 출발 위치, 목적지, 날짜와 희망 시간을 알려주세요. 철도역은 승하차 위치를, 해수욕장·해변은 주차장과 성수기 통제를, 항구·포구는 부두 출입 제한을, 계곡·유원지는 진입로·주차장·통제 시간과 기사 복귀 동선을 확인해야 합니다. 실제 배차 가능 여부는 상담 후 안내합니다.</p><h3>예상요금 확인</h3><p>도로거리·시간대·차량 종류·기사 이동 및 복귀 조건·통행료에 따라 참고요금이 달라질 수 있습니다. 최종 요금은 상담으로 확인합니다.</p><p><a href="/fare/">참고요금 계산기 →</a></p><h3>빠른배차 상담</h3><p>정확한 주소와 차량 위치를 전달하면 기사 배정 가능 여부를 신속히 확인하는 데 도움이 됩니다. 즉시 배차를 보장하지 않습니다.</p><p><a class="cta" href="tel:18114294">예약·요금·빠른배차 '+PHONE+'</a></p></section><section><h2>인근 지역 대리운전·탁송</h2><ul>'+linked.map(r=>'<li><a href="'+canonical(r.slug)+'">'+esc(r.full_name)+' 대리운전·탁송</a></li>').join('')+'</ul><p>인근 지역 연결은 서비스 상담을 위한 정보이며 기사 상주를 의미하지 않습니다.</p></section>';
 return layout(name+' 대리운전·탁송 | 예약·예상요금·빠른배차',desc,body,url);
}
const landmarkMatches=(r,query)=>landmarks.some(([name,areas])=>compact(name).includes(compact(query))&&areas.some(a=>regionAncestors(r).some(x=>x.name===a)));
const regionMatches=(r,q)=>placeNames(r).some(n=>compact(n).includes(compact(q)))||landmarkMatches(r,q);
const regionAncestors=r=>{const a=[];let cur=r;while(cur){a.unshift(cur);cur=cur.parent_slug?bySlug.get(cur.parent_slug):null}return a};
const regionContext=r=>({읍:'읍내·인접 마을',면:'면 소재지·인접 마을',리:'마을·인접 읍면',동:'주거지·상업시설',구:'구내 주요 생활권',군:'읍·면·리 지역',시:'시내·외곽 지역',시도:'시·군·구별 지역'})[r.level]||'해당 지역';
const cardArtFile=path.join(ROOT,'assets/smart24-business-card-inline.webp');
const cardArtData=fs.readFileSync(cardArtFile).toString('base64');
const serviceCardArt={daeri:path.join(ROOT,'assets/smart24-daeri-brand.webp'),taksong:path.join(ROOT,'assets/smart24-taksong-brand.webp')};
const serviceCardData=Object.fromEntries(Object.entries(serviceCardArt).map(([kind,file])=>[kind,fs.readFileSync(file).toString('base64')]));
function serviceBrand(kind){return kind==='daeri'?'스마트전국대리운전':'스마트24시전국탁송'}
const cardSvg=(label,kind)=>{
 const full=String(label||'전국').trim(),place=label?shortPlace(full.split(/\s+/).at(-1)):'';
 const prefix=place?place+' ':'';
 if(kind){
  const brand=serviceBrand(kind),heading=esc(prefix+brand),size=Math.min(48,Math.floor(850/(prefix.length+brand.length)));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img" aria-labelledby="card-title"><title id="card-title">${esc(full)} ${esc(brand)} 1811-4294</title><image href="data:image/webp;base64,${serviceCardData[kind]}" width="1200" height="800"/><defs><linearGradient id="banner" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#007e91"/><stop offset="0.55" stop-color="#004252"/><stop offset="1" stop-color="#008d9d"/></linearGradient></defs><rect x="200" y="7" width="884" height="74" rx="8" fill="url(#banner)"/><text x="642" y="59" fill="#fff04b" stroke="#002b3a" stroke-width="2" paint-order="stroke fill" font-family="sans-serif" font-weight="900" font-size="${size}" text-anchor="middle">${heading}</text><rect x="76" y="731" width="184" height="29" fill="#031b3a"/><text x="84" y="752" fill="#ffffff" font-family="sans-serif" font-weight="700" font-size="16">전 직원 100% 보험가입</text></svg>`;
 }
 const first=prefix+'스마트전국대리운전',second=prefix+'스마트24시탁송';
 const daeriHeading=esc(first),taksongHeading=esc(second),size=Math.min(32,Math.floor(850/Math.max(first.length,second.length)));
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img" aria-labelledby="card-title"><title id="card-title">${esc(full)} 스마트전국대리운전 스마트24시탁송 1811-4294</title><image href="data:image/webp;base64,${cardArtData}" x="0" y="0" width="1200" height="800"/><defs><linearGradient id="banner" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#007e91"/><stop offset="0.55" stop-color="#004252"/><stop offset="1" stop-color="#008d9d"/></linearGradient></defs><rect x="200" y="7" width="884" height="74" rx="8" fill="url(#banner)"/><g font-family="sans-serif" font-weight="900" font-size="${size}" text-anchor="middle" stroke="#002b3a" stroke-width="1.8" paint-order="stroke fill"><text x="642" y="36" fill="#ffffff">${daeriHeading}</text><text x="642" y="70" fill="#fff04b">${taksongHeading}</text></g></svg>`;
};
function renderCardArtwork(label,kind){
 const overlay=cardSvg(label,kind).replace(/<image[^>]+\/>/,'');
 return require('sharp')(kind?serviceCardArt[kind]:cardArtFile).composite([{input:Buffer.from(overlay),left:0,top:0}]).png({palette:true,quality:95,effort:3}).toBuffer();
}
const regionalCardPngs=new Map();
function regionalCardPng(r,kind,topic){
 const key=r.slug+(kind?'-'+kind:'');
 if(regionalCardPngs.has(key))return regionalCardPngs.get(key);
 const promise=renderCardArtwork(r.full_name,kind).catch(err=>{regionalCardPngs.delete(key);throw err});
 regionalCardPngs.set(key,promise);
 if(regionalCardPngs.size>16)regionalCardPngs.delete(regionalCardPngs.keys().next().value);
 return promise;
}
const cardPath=(slug)=>'/card/'+encodeURIComponent(slug)+'.svg';
const cardPngPath=(slug,kind)=>'/card/'+encodeURIComponent(slug)+(kind?'-'+kind+'-brand.png':'-inline-v2.png');
const canonical=(slug)=>'/region/'+encodeURIComponent(slug)+'/';
const link=(slug)=>'https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr')+canonical(slug);
const compactTrafficPanel="<aside class=\"traffic-stats\" id=\"traffic-stats-panel\" aria-label=\"스마트24 접속 기록 및 전화 버튼 통계\">\n <div class=\"traffic-stats-lines\" aria-live=\"polite\">\n  <span class=\"traffic-stat\" title=\"검색 노출 수가 아닌 브라우저 접속 기록입니다. 점검 방문이 포함될 수 있습니다.\">오늘 접속 <strong id=\"today-visit-number\">—</strong></span>\n  <span class=\"traffic-stat\" title=\"집계 시작 이후 기록된 브라우저 접속 횟수입니다.\">누적 기록 <strong id=\"total-visit-number\">—</strong></span>\n  <button type=\"button\" class=\"traffic-call-trigger\" id=\"traffic-call-trigger\" aria-controls=\"traffic-sources-detail\" aria-expanded=\"false\" title=\"누적 전화 버튼 클릭과 접속 집계 기준 확인\">누적 전화클릭 <strong id=\"phone-click-number\">—</strong> ▾</button>\n </div>\n <div class=\"traffic-sources\" id=\"traffic-sources-detail\" hidden>\n  <strong class=\"traffic-source-heading\">접속 집계 안내</strong>\n  <p>오늘·누적 수치는 실제 네이버 검색 노출이나 순방문자가 아닙니다. 직접 작업·점검한 방문도 포함될 수 있으며, 전화 클릭은 통화 연결 건수가 아닙니다.</p>\n  <label class=\"traffic-optout-label\"><input type=\"checkbox\" id=\"exclude-my-visits\"> 이 브라우저의 내 점검 방문·전화 버튼 클릭 집계 제외</label>\n  <small class=\"traffic-mode-note\" id=\"traffic-mode-note\">이 설정은 이후 접속부터 적용됩니다. 이미 기록된 수치는 자동 차감되지 않습니다.</small>\n  <strong class=\"traffic-source-heading\">전화 버튼 클릭 경로</strong>\n  <ol id=\"phone-source-list\" aria-live=\"polite\"><li>확인 중입니다.</li></ol>\n  <small class=\"traffic-source-note\">정확한 네이버 검색 노출·클릭 수는 네이버 서치어드바이저에서 확인해야 합니다.</small>\n </div>\n</aside>";
const layout=(title,desc,body,canonicalUrl,cardUrl)=>`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="naver-site-verification" content="84fa95fd88543581b31253642e024bcd7afde755"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | ${BRAND}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(canonicalUrl)}"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="website"><meta property="og:site_name" content="스마트24 전국대리운전·24시탁송"><meta property="og:url" content="${esc(canonicalUrl)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">${cardUrl?`<meta property="og:image" content="${esc(cardUrl)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(cardUrl)}">`:``}<link rel="stylesheet" href="/assets/traffic-summary.css?v=20261030"><style>*{box-sizing:border-box}body{margin:0;background:#f4f7fc;color:#15243a;font:17px/1.8 system-ui,'Malgun Gothic',sans-serif}header,footer{background:#102544;color:#fff;padding:20px 5%}header{display:flex;flex-wrap:wrap;align-items:flex-start;gap:10px}header .service-head-links{display:flex;flex-wrap:wrap;gap:7px}header>.page-title,header>h1,header>p{flex-basis:100%;margin:3px 0}header a,footer a{color:#ffdc50}main{max-width:940px;margin:auto;padding:14px}section{background:#fff;padding:20px;border-radius:12px;margin:15px 0;border:1px solid #d6e0ee}h1,.page-title{font-size:clamp(25px,5vw,38px)}h2{font-size:23px}a{color:#07539c}.cta{display:inline-block;background:#ffe05d;color:#15243a;padding:12px 20px;border-radius:10px;font-weight:800;text-decoration:none}li{margin:7px 0}@media(max-width:600px){section{padding:15px}}</style></head><body><header><nav class="service-head-links" aria-label="바로가기"><a href="/">홈</a> · <a href="/daeri/">대리운전</a> · <a href="/taksong/">자동차탁송</a> · <a href="/region/">지역 검색</a></nav>${compactTrafficPanel}${/<h1(?:\s|>)/i.test(body)?`<p class="page-title">${esc(title)}</p>`:`<h1>${esc(title)}</h1>`}<p>${BRAND}</p></header><main>${body}</main><footer>상담 <a href="tel:18114294" aria-label="1811-4294 전화 상담">${PHONE}</a> · <a href="https://open.kakao.com/o/sGV88r7h" target="_blank" rel="noopener noreferrer">카카오톡 상담</a> (08:00~20:00) · 실제 배차·요금은 상담 후 확인</footer></body></html>`;
const localAreaGuides={
 '속초시':{nearby:['양양군','고성군','인제군'],places:['설악동','대포항','속초해수욕장','청호동','조양동'],description:'속초 시내와 관광·숙박 지역에서 출발하는 대리운전, 설악산 산행 후 차량 회수 탁송, 양양·고성·인제 방면 및 수도권 장거리 운행은 출발 장소와 기사 접근·복귀 동선을 함께 확인해야 합니다. 외곽이나 야간에는 예약 시간과 정확한 주차 위치를 미리 알려주세요.'}
};
function bookingGuide(kind,r){
 const isT=kind==='taksong',label=isT?'탁송':'대리운전';
 const location=r?(r.full_name||r.name):'전국';
 const fare='/fare/?service='+kind+(r?'&amp;from='+encodeURIComponent(location):'');
 const local=r?(/강원/.test(location)?'강원 출발은 영서·영동 사이 이동과 운행 후 복귀 교통편을 함께 확인하세요. 해변·숙박시설 출발이라면 주차장 이름과 차량 위치를 알려주세요.':/제주/.test(location)?'제주 내 차량 이동과 선박을 이용하는 육지 이동은 인수 절차가 다릅니다. 항만 인계나 선적이 필요한 경우 별도 가능 여부부터 상담하세요.':/[면리]$/.test(r.name)?'마을 진입로와 차량을 인수할 수 있는 지점을 확인하세요. 주소만으로 주차 위치를 찾기 어려우면 건물명이나 위치 설명을 함께 전달해주세요.':/[동구]$/.test(r.name)?'지하주차장 층·구역과 출차 방법을 알려주세요. 혼잡한 상가나 공동주택은 기사와 만날 위치를 정하면 인수 지연을 줄일 수 있습니다.':'시내와 외곽은 기사 접근·복귀 조건이 다를 수 있습니다. 정확한 주소와 희망 시간을 기준으로 배차 가능 여부를 확인하세요.'):'';
 const checks=isT?[
 ['차량을 직접 운전하는 탁송인가요?','차량을 기사가 운전해 이동하는 방식과 캐리어·견인 운송은 다릅니다. 차량 운행 가능 상태와 필요한 방식을 먼저 설명해주세요.'],
 ['보험은 어디까지 적용되나요?','배정 기사와 차량에 적용되는 보험, 보상 한도·면책금·제외 항목을 출발 전에 확인하세요. 고가차·화물차·특수차는 차종을 구체적으로 전달해주세요.'],
 ['견적 외 비용이 있나요?','통행료·주유비·주차비·대기비·경유 비용의 포함 여부와 부담 주체를 확인하고, 조건이 달라지면 출발 전에 다시 협의하세요.'],
 ['인수·인계는 어떻게 준비하나요?','차량 외관·계기판·주행거리·연료 상태를 사진으로 남기고 키 전달 방법, 인계 담당자, 도착 후 확인 방법을 정하세요.']
 ]:[
 ['어떤 운행을 예약하나요?','귀가·장거리·골프장 이동 등 이용 목적, 고객 동승 인원, 경유지와 차종을 알려주세요.'],
 ['기사는 어디서 만나나요?','상호명만 전달하기보다 주차장 층·구역, 출차 방법과 만날 위치를 알려주세요.'],
 ['요금 외 확인할 비용은 무엇인가요?','경유·대기·통행료·주차비의 포함 여부를 확인하세요. 목적지나 대기 시간이 바뀌면 운행 전에 요금을 다시 협의하세요.'],
 ['차량과 보험 확인은 어떻게 하나요?','수동변속기·대형차·수입차 등 차량 조건과 기사 운전 가능 여부, 적용 보험과 보상 조건을 배차 상담에서 확인하세요.']
 ];
 return '<section class="booking-guide"><h2>'+label+' 업체 선택 전 확인할 4가지</h2><p>가격과 함께 운행 방식·비용 범위·차량 인계 조건을 비교하세요. 아래는 상담에서 확인할 항목이며 특정 보험이나 보상 조건을 보장하는 안내는 아닙니다.</p>'+checks.map(([q,a])=>'<h3>'+q+'</h3><p>'+a+'</p>').join('')+'</section>'+(local?'<section><h2>'+esc(location)+' 출발 전 확인</h2><p>'+local+'</p><p>출발지: '+esc(location)+' 내 정확한 주소 · 도착지 · 희망 시간 · 차종을 준비해주세요.</p></section>':'')+'<section><h2>요금조회부터 차량 인계까지</h2><ol><li>출발지·도착지를 입력해 도로거리와 참고요금을 조회합니다.</li><li>전화로 시간·차종·경유·추가 비용과 배차 가능 여부를 확인합니다.</li><li>기사 배정과 최종 금액, 만날 장소를 확인한 뒤 운행을 진행합니다.</li><li>목적지 도착 후 차량 상태와 키 인계를 확인합니다.</li></ol><p><a class="cta" href="'+fare+'">'+label+' 예상요금 조회</a> <a class="cta" href="tel:18114294">전화 상담 '+PHONE+'</a></p></section>';
}
const neighborhoodStories=[
 {name:'경리단길',area:'서울특별시 용산구',title:'비 오는 경리단길, 파전과 막걸리 뒤의 귀갓길',text:'이태원과 해방촌 사이 골목에서 저녁 약속을 마쳤다면 주차 위치와 귀가 목적지를 미리 확인하세요. 비가 내리는 날에는 기사와 만날 출입구를 구체적으로 정하는 것이 좋습니다.'},
 {name:'가로수길',area:'서울특별시 강남구',title:'가로수길의 가을밤, 저녁 모임 뒤 편안한 귀가',text:'신사동 가로수길에서 식사와 모임을 마친 뒤에는 건물 앞 정차 가능 위치와 차량 주차장을 확인하세요. 강남에서 수도권 외곽으로 가는 장거리 대리운전도 사전 예약을 상담할 수 있습니다.'},
 {name:'해방촌',area:'서울특별시 용산구',title:'해방촌의 겨울밤, 골목길을 내려오는 귀갓길',text:'경사진 골목과 주차 위치가 서로 다를 수 있어 정확한 차량 위치를 전달하는 것이 중요합니다. 눈이 내리는 날에는 출발 가능 시각과 도로 상황을 함께 확인하세요.'},
 {name:'연남동',area:'서울특별시 마포구',title:'연남동의 비 오는 저녁, 골목 맛집에서 집으로',text:'연트럴파크 주변 저녁 모임을 마친 뒤 차량이 있는 주차장과 기사 만남 장소를 구분해 알려주세요.'},
 {name:'성수동',area:'서울특별시 성동구',title:'성수동의 늦은 저녁, 서울숲 근처에서 돌아가는 길',text:'성수동 카페거리와 서울숲 주변은 목적지에 따라 이동 동선이 달라집니다. 모임 전에 귀가 시간을 알려주면 예약 상담에 도움이 됩니다.'},
 {name:'해리단길',area:'부산광역시 해운대구',title:'비 오는 해리단길의 저녁, 해운대에서 안전한 귀가',text:'해운대역 인근 골목에서 식사 후 이동할 때는 정확한 차량 주차장과 목적지를 전달하세요. 부산 시내뿐 아니라 타 지역 장거리 예약도 상담할 수 있습니다.'},
 {name:'광안리',area:'부산광역시 수영구',title:'광안리 야경이 아름다운 밤, 모임 뒤 부산대리운전',text:'광안리 해변 주변은 주말 저녁 차량과 보행자가 많을 수 있습니다. 해변 인근 주차장 이름과 기사 만남 장소를 미리 정해주세요.'},
 {name:'전포카페거리',area:'부산광역시 부산진구',title:'전포카페거리의 가을 저녁, 서면에서 돌아가는 길',text:'전포동 골목과 서면 일대는 주차 위치를 정확히 공유하는 것이 중요합니다. 늦은 귀가나 장거리 이동은 출발 시간을 미리 상담하세요.'},
 {name:'양리단길',area:'강원특별자치도 양양군',title:'양리단길의 여름밤, 인구해변에서 돌아가는 길',text:'양양 인구해변과 죽도해변 일대의 저녁 모임 뒤에는 숙소와 차량 위치를 구분해 알려주세요. 관광 성수기에는 기사 수급을 고려한 사전 예약이 유리할 수 있습니다.'},
 {name:'동성로',area:'대구광역시 중구',title:'동성로의 반짝이는 밤, 저녁 모임 후 대구대리운전',text:'대구 도심의 모임을 마치고 귀가할 때는 차량이 있는 주차장과 출차 가능 시간을 먼저 확인하세요.'},
 {name:'교동',area:'대구광역시 중구',title:'대구 교동의 비 오는 밤, 골목 식당에서 귀가까지',text:'교동 골목에서 모임 후 출발할 때는 차량 위치와 기사 만남 장소를 미리 알려주세요.'},
 {name:'봉명동',area:'대전광역시 유성구',title:'봉명동의 주말 저녁, 유성에서 편안하게 돌아가는 길',text:'유성구 봉명동에서 식사나 모임을 마쳤다면 귀가 목적지와 출발 예정 시간을 전달해 대리운전 배차를 상담하세요.'},
 {name:'동명동',area:'광주광역시 동구',title:'동명동 골목의 가을밤, 광주대리운전 예약 안내',text:'광주 동명동의 저녁 모임 후에는 차량 주차 위치와 기사와 만날 곳을 구체적으로 안내해 주세요.'},
 {name:'객리단길',area:'전북특별자치도 전주시 완산구',title:'객리단길의 막걸리 한상, 전주에서 돌아가는 길',text:'전주 객사 주변에서 식사와 모임을 마친 뒤에는 주차 위치와 귀가 방향을 미리 확인해 주세요.'},
 {name:'황리단길',area:'경상북도 경주시',title:'황리단길의 밤 산책 뒤, 경주대리운전 귀갓길',text:'경주 황남동 일대는 관광객이 많은 시간에 차량 위치와 출발 장소를 명확히 정하는 것이 좋습니다.'},
 {name:'누웨마루거리',area:'제주특별자치도 제주시',title:'제주 누웨마루거리의 저녁, 여행 뒤 안전한 귀가',text:'제주시 연동 일대 저녁 모임 후 숙소로 이동한다면 출발지와 주차장 위치, 기사 배차 가능 여부를 미리 확인해 주세요.'}
];
function neighborhoodStorySection(r,kind){
 if(kind!=='daeri')return '';
 const full=r.full_name||r.name;
 const matches=neighborhoodStories.filter(x=>x.area.includes(full)||full.includes(x.area));
 if(!matches.length)return '';
 return '<section><h2>'+esc(shortPlace(r.name))+' 유명 거리·계절별 대리운전 이야기</h2><p>비 오는 날의 파전, 눈 내리는 골목, 여름 해변의 저녁처럼 지역의 분위기를 담은 이용 안내입니다. 아래 내용은 실제 배차 완료 후기가 아닌 지역별 예약 가이드입니다.</p>'+matches.map(x=>'<article><h3>'+esc(x.title)+'</h3><p><strong>'+esc(x.name)+'</strong> · '+esc(x.text)+'</p><p>대리운전 예약 시 출발지·도착지·희망 시각을 알려주세요. <a href="/fare/?service=daeri&amp;from='+encodeURIComponent(x.area+' '+x.name)+'">해당 거리 출발 예상요금 계산</a> · <a href="tel:18114294">배차 상담 '+PHONE+'</a></p></article>').join('')+'</section>';
}
const RoadFareServer=require('./assets/road-fare.js');
const roadRouteCache=new Map();
let roadRouteActive=0;
async function cachedRoadDistance(from,to){
 const key=from+'|'+to,now=Date.now(),old=roadRouteCache.get(key);
 if(old&&old.expires>now)return old.km;
 // Bound server-side routing lookups so a crawler cannot flood the external route provider.
 if(roadRouteActive>=4)return null;
 roadRouteActive++;
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  let km=null;
  try{
   const url='https://white-voice-6eab.k337711.workers.dev/route?'+new URLSearchParams({from,to});
   const response=await fetch(url,{signal:controller.signal,headers:{Origin:'https://jeongukdaeri.kr'}});
   if(response.ok){const data=await response.json();const n=Number(data.distanceKm);if(Number.isFinite(n)&&n>0&&n<2000)km=n}
  }finally{clearTimeout(timer)}
  roadRouteCache.set(key,{km,expires:now+(km?24*3600*1000:5*60*1000)});
  if(roadRouteCache.size>300)roadRouteCache.delete(roadRouteCache.keys().next().value);
  return km;
 }catch{return null}finally{roadRouteActive--}
}
function regionalRouteDestinations(r){
 const city=shortPlace(r.name);
 return ['서울역','인천시청','대구역','대전역','부산역','광주송정역','강릉역'].filter(x=>!x.startsWith(city)).slice(0,5);
}
async function regionalQuoteLinks(r,kind){
 const label=kind==='taksong'?'탁송':'대리운전',origin=r.full_name||r.name,city=shortPlace(r.name);
 const routes=regionalRouteDestinations(r).map(to=>({from:origin,to,service:kind}));
 // Preserve indexable regional pages without external route requests;
 // users can request an exact road distance only after opening and submitting the calculator.
 const serverLookup=false; // Never call paid routing providers while rendering indexable regional pages. Exact quotes remain available from the interactive fare calculator. // Small locality pages must not wait for external routing services.
 const distances=[];
  if(serverLookup){
   for(let i=0;i<routes.length;i+=4){
    distances.push(...await Promise.all(routes.slice(i,i+4).map(x=>cachedRoadDistance(x.from,x.to))));
   }
  }else distances.push(...routes.map(()=>null));
 const rows=routes.map((x,i)=>{
  const km=distances[i],band=km?RoadFareServer.roadQuote(km,kind,x.from,x.to).band:null;
  const value=band?band.map(n=>n.toLocaleString('ko-KR')+'원').join(' ~ ')+' (예상)':'거리 확인 후 예상요금 조회';
  const distance=km?Math.round(km*10)/10+'km':'조회 필요';
  return '<tr><td>'+esc(x.from)+'</td><td>'+esc(x.to)+'</td><td>'+esc(distance)+'</td><td class="quote-amount">'+esc(value)+'</td><td><a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(x.from)+'&amp;to='+encodeURIComponent(x.to)+'">상세 조회</a></td></tr>';
 }).join('');
 return '<section><h2>'+esc(city+label)+' 출발·도착지별 도로거리·예상요금 및 배차 안내</h2><p>구간별 상세 조회에서 도로거리와 예상요금을 확인할 수 있습니다. 표에 표시된 금액은 참고용이며 확정 요금이 아닙니다. 요금은 출발지·도착지·시간과 배차 상황에 따라 달라집니다.</p><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;text-align:left"><thead><tr><th>출발</th><th>도착</th><th>도로거리</th><th>자동계산 예상요금</th><th>조회</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+(kind==='daeri'?'<h3>대리운전 사전 예약 시 탁송요금 수준의 견적 상담</h3><p>출발지·도착지와 출발 시간을 미리 알려주시면 기사 이동·복귀 동선을 고려해 장거리 대리운전 요금을 조정할 수 있습니다. 조건에 따라 탁송요금과 비슷한 수준의 예약 견적이 가능할 수 있으나 동일·할인 요금을 보장하지 않습니다. 최종요금은 배차 확인 후 안내합니다.</p><p><a href="/fare/?service=taksong&amp;from='+encodeURIComponent(origin)+'">같은 구간의 탁송 예상요금 비교하기</a></p>':'')+'<h3>산간·오지·항구·섬 지역 사전 예약 안내</h3><p>산간마을, 외진 읍·면·리, 항구·여객선터미널, 관광지·골프장·등산로 입구는 기사 접근·복귀 거리가 길거나 주변 기사 수가 적을 수 있습니다. 당일 호출이나 심야·새벽 긴급 배차는 기사 이동비·복귀비 등으로 사전 예약보다 요금이 높아질 수 있으며, 배차가 지연되거나 불가능할 수도 있습니다. 모든 지역에 추가요금이 발생하는 것은 아니며 최종요금은 상담 후 확인합니다.</p><p>항구·여객선 이용 시 선박 운항 및 차량 선적 가능 여부와 터미널 출입 조건을 확인하세요. 산행·자전거 종주 시 주차장 위치, 셔틀·통제, 통신 여건과 희망 시간을 미리 알려주세요.</p><h3>'+esc(city+label)+' 예약·기사 배차 안내</h3><p>장거리·야간·새벽 운행은 사전 예약을 권합니다. 출발지·도착지·출발 시간·차종을 알려주세요. 기사 접근 및 복귀 동선, 통행료·주차비·경유·대기 비용 포함 여부는 상담 시 확인합니다.</p><p><a class="cta" href="tel:18114294">배차 상담 '+PHONE+'</a></p></section>';
}

function regionalUsage(r,kind){
 const name=esc(r.full_name||r.name),isT=kind==='taksong';
 const examples=isT?[
 ['중고차를 다른 지역으로 보낼 때','판매자와 구매자가 차량을 넘겨줄 장소·담당자·가능 시간을 정해주세요. 차량의 정상 운행 여부, 키 전달 방법과 도착 후 확인 절차를 상담합니다.'],
 ['정비 입고·출고 차량을 맡길 때','서비스센터의 입고 예약 또는 출고 가능 여부를 먼저 확인해주세요. 담당자 연락처와 접수 마감 시간을 전달하고, 이동 중 경고등이나 운행 제한이 있는지 알려주세요.'],
 ['산행·자전거 일정 후 차량을 회수할 때','차량이 있는 주차장과 회수할 목적지를 구분해 알려주세요. 일정 종료 예상 시간, 주차장 출입 방법, 통신이 어려운 경우의 연락 방법을 사전에 협의하세요.']
 ]:[
 ['식사·모임 후 귀가할 때','주차장 이름과 층·구역, 목적지, 동승 인원을 알려주세요. 기사와 만날 위치를 정하고 경유지나 출차 비용이 있으면 출발 전에 확인합니다.'],
 ['장거리 편도 운전이 필요할 때','출발 주소와 목적지, 원하는 출발 시간을 알려주세요. 운행 후 기사 복귀 교통편에 따라 배차 조건이 달라질 수 있으므로 일정이 정해지면 미리 상담하세요.'],
 ['골프장·출장 왕복 운전이 필요할 때','왕복 구간과 출발·복귀 예상 시각, 현장 대기 시간을 전달해주세요. 편도 대리운전과 대기를 포함하는 일일기사는 이용 조건이 다르므로 일정에 맞춰 상담합니다.']
 ];
 const example=(r.full_name==='강원특별자치도 강릉시')?'<h3>강릉시 → 서울역 예상요금 계산 예시</h3><p>도로거리 약 227km · 예상 주행시간 239분 · '+(isT?'탁송 80,000~110,000원':'대리운전 105,000~145,000원')+'</p><p>2026년 10월 24일 계산기 조회 기준 참고 예시입니다. 강릉시 대표 위치를 기준으로 계산했으며 실제 차량 주소·경로·시간대에 따라 요금이 달라집니다.</p>':'';
 const quoteForm='<h3>'+name+' 출발 예상요금은 얼마인가요?</h3>'+example+'<form action="/fare/" method="get"><input type="hidden" name="from" value="'+name+'"><input type="hidden" name="service" value="'+kind+'"><input type="hidden" name="auto" value="1"><label>도착지 주소 <input name="to" maxlength="150" required placeholder="예: 서울역 또는 도로명주소" style="max-width:100%;padding:12px;font:inherit"></label> <button type="submit" class="cta" style="border:0;cursor:pointer;font:inherit">예상요금 바로 계산</button></form><p>정확한 출발 주소는 계산기에서 수정할 수 있습니다. 도로거리·소요시간·5,000원 단위 참고요금을 조회하며 통행료·주차비·대기 등 비용 포함 여부는 상담으로 확인하세요.</p>';
 return '<p>'+name+'에서 '+(isT?'차량 이동':'대리운전')+'을 준비할 때 참고할 상황별 이용 안내입니다. 아래 설명은 실제 완료 운행후기가 아닙니다.</p>'+quoteForm+examples.map(([q,a])=>'<h3>'+q+'</h3><p>'+a+'</p>').join('')+'<p><a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(r.full_name||r.name)+'">'+name+' 출발 참고요금 조회</a> · <a href="tel:18114294">상담 '+PHONE+'</a></p>';
}
function dispatchCopy(kind){return kind==='daeri'?'대리운전 빠른배차 상담':kind==='taksong'?'탁송 즉시배차 가능 여부 확인':'대리운전 빠른배차 상담 · 탁송 즉시배차 가능 여부 확인'}
function dispatchNotice(kind){return '<aside aria-label="빠른배차 상담" style="margin:12px 0;padding:16px;background:#eaf8ff;border:1px solid #8bcfe5;border-radius:12px;color:#123f60"><strong style="font-size:1.15em">'+dispatchCopy(kind)+'</strong><p style="margin:8px 0">출발지·도착지·차종·희망 시간을 알려주세요. 실제 배차 가능 여부와 소요시간은 출발 위치·시간대·기사 수급을 확인해 안내합니다.</p><a class="cta" href="tel:18114294">배차 상담 '+PHONE+'</a></aside>'}
// Regional guides have separate tasks, canonical URLs and related service links.
const regionalIntentTypes={daeri:['fare','long-distance'],taksong:['fare','handover']};
const regionalIntentAreas=regions.filter(r=>['시도','시','군','구'].includes(r.level));
const regionalIntentSlugs=new Set(regionalIntentAreas.map(r=>r.slug));
function regionalIntentArea(r){return [...regionAncestors(r)].reverse().find(x=>regionalIntentSlugs.has(x.slug))||r}
function regionalIntentPath(r,kind,topic){return servicePath(regionalIntentArea(r),kind)+topic+'/'}
function regionalIntentTitle(r,kind,topic){
 const place=seoRegionLabel(r),service=kind==='daeri'?'대리운전':'탁송';
 if(topic==='fare')return place+service+'요금';
 return place+(kind==='daeri'?' 장거리대리운전':' 자동차탁송 예약·인계');
}
function regionalIntentImage(r,kind,topic){return cardPngPath(r.slug,kind)}
function regionalIntentNav(r,current){
 const area=regionalIntentArea(r),entries=Object.entries(regionalIntentTypes).flatMap(([kind,topics])=>topics.map(topic=>({kind,topic,title:regionalIntentTitle(area,kind,topic),url:regionalIntentPath(area,kind,topic)})));
 return '<section aria-label="지역별 요금과 이용 안내"><h2>'+esc(area.full_name)+' 요금·예약 안내</h2><ul>'+entries.map(x=>'<li>'+(x.url===current?'<strong aria-current="page">'+esc(x.title)+'</strong>':'<a href="'+x.url+'">'+esc(x.title)+'</a>')+'</li>').join('')+'</ul><p><a href="'+servicePath(area,'daeri')+'">'+esc(area.name)+' 대리운전</a> · <a href="'+servicePath(area,'taksong')+'">'+esc(area.name)+' 탁송</a></p></section>';
}
function regionalQuoteForm(r,kind){return '<form action="/fare/" method="get"><input type="hidden" name="service" value="'+kind+'"><input type="hidden" name="auto" value="1"><label for="guide-from">출발지 주소</label><input id="guide-from" name="from" maxlength="150" required value="'+esc(r.full_name)+'" style="display:block;width:100%;padding:12px;font:inherit"><label for="guide-to">도착지 주소</label><input id="guide-to" name="to" maxlength="150" required placeholder="차량이 도착할 주소 또는 건물명" style="display:block;width:100%;padding:12px;font:inherit"><button type="submit" class="cta" style="border:0;font:inherit;cursor:pointer;margin-top:12px">도로거리·예상요금 조회</button></form>'}
function regionalIntentPage(r,kind,topic){
 const title=regionalIntentTitle(r,kind,topic),full=esc(r.full_name),service=kind==='daeri'?'대리운전':'탁송',base='https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr');
 const pathname=regionalIntentPath(r,kind,topic),image=regionalIntentImage(r,kind,topic);
 const isFare=topic==='fare',isLong=topic==='long-distance';
 const desc=title+' · '+dispatchCopy(kind)+'. '+r.full_name+' '+(isFare?service+'요금 계산 방법과 거리·차종·추가 비용 확인':isLong?'장거리 대리운전 편도·왕복·경유·대기 예약 준비':'자동차탁송 예약과 차량 상태 점검, 키 전달·인수·인계 준비')+'. 예상요금 조회와 상담 '+PHONE+'.';
 const breadcrumb='<nav aria-label="현재 위치"><a href="/">홈</a> / <a href="'+servicePath(r,kind)+'">'+full+' '+service+'</a> / '+esc(title)+'</nav>';
 const lead=isFare?'출발지와 도착지를 기준으로 참고요금을 조회하고, 실제 견적에 반영되는 조건을 확인하세요.':isLong?'장거리 운행은 이동 구간뿐 아니라 동승·경유·대기·왕복 일정을 함께 정해야 합니다.':'차량을 맡기는 사람과 받는 사람의 일정, 주차장 출입 방법과 차량 상태를 먼저 정리하세요.';
 const intro='<section>'+breadcrumb+'<h2>'+esc(title)+' 안내</h2><p>'+lead+'</p><p><a class="cta" href="tel:18114294">전화 상담 '+PHONE+'</a></p></section>';
 const card='<figure style="margin:15px 0"><a href="tel:18114294"><img src="'+image+'" alt="'+esc(title)+' '+serviceBrand(kind)+' 1811-4294" width="1200" height="800" style="width:100%;height:auto"></a><figcaption>'+esc(title)+' 상담 '+PHONE+dispatchNotice(kind)+'</figcaption></figure>';
 let content;
 if(isFare){
  const factors=kind==='taksong'?[
   ['도로거리와 기사 이동','차량이 실제로 이동할 도로거리와 인수 장소까지의 기사 접근, 운행 후 복귀 동선을 확인합니다. 직선거리만으로 최종 금액을 확정하지 않습니다.'],
   ['차종과 운행 가능 상태','승용차·SUV와 대형 화물차·특수차의 배차 조건은 다릅니다. 차종, 변속기, 차량 크기와 정상 운행 여부를 상담에서 알려주세요.'],
   ['인수 시간과 현장 조건','출고 마감, 야간 인수, 외곽 주차장, 경유나 현장 대기가 있으면 요청 단계에서 전달하세요.'],
   ['비용의 포함 범위','통행료·주유비·주차비·대기비·경유 비용이 견적에 포함되는지, 누가 부담하는지 출발 전에 확인하세요.']
  ]:[
   ['거리와 이용 시각','고객 차량의 출발지·도착지와 이용 시각을 기준으로 조회합니다. 기사 수급과 운행 후 복귀 여건에 따라 실제 안내 금액은 달라질 수 있습니다.'],
   ['경유지와 대기 시간','중간에 사람을 내려주거나 여러 곳을 들르는 경우 순서를 알려주세요. 현장 대기가 예상되면 시간과 비용 조건을 확인합니다.'],
   ['차종과 동승 인원','수동변속기·대형차·수입차 등 운전 조건과 동승 인원을 알려주시면 적합한 기사 배차 가능 여부를 확인하는 데 도움이 됩니다.'],
   ['편도와 왕복 일정','왕복·골프장 대기·출장처럼 운행이 이어지는 일정은 편도 대리운전과 조건이 다릅니다. 전체 일정과 대기 시간을 함께 상담하세요.']
  ];
  content='<section><h2>'+full+' 출발 예상요금 계산</h2><p>대표 지역명이 입력돼 있습니다. 정확한 차량 위치와 목적지로 수정하면 도로거리·예상시간·참고요금을 조회할 수 있습니다.</p>'+regionalQuoteForm(r,kind)+'<p>자동 조회는 예약이나 기사 배정이 아닙니다. 최종 금액과 배차 가능 여부는 상담으로 확인하세요.</p></section><section><h2>'+service+'요금에 영향을 주는 조건</h2>'+factors.map(([h,p])=>'<h3>'+h+'</h3><p>'+p+'</p>').join('')+'</section><section><h2>계산 금액을 어떻게 읽나요?</h2><p>홈페이지 계산기는 거리 구간별 참고요금을 5,000원 단위로 올림합니다. 대리운전은 탁송 참고 기준보다 약 30% 가산하는 현재 계산 규칙을 사용합니다. 일부 외곽 지역과 특정 구간에는 별도 지역 참고 기준이 적용될 수 있으며, 계산 결과에서 안내합니다.</p><p>화면의 금액은 실시간 배차 확정가격이 아닙니다. 출발 주소·목적지·차종·시간·추가 비용 조건이 같아야 견적을 비교할 수 있습니다.</p></section>';
 }else if(isLong){
  content='<section><h2>편도·왕복·일일기사, 어떤 일정을 알려야 하나요?</h2><h3>다른 지역으로 편도 이동</h3><p>출발 주소, 최종 목적지, 출발 희망 시각과 고객 동승 인원을 전달하세요. 장거리에서는 기사 복귀 교통편과 외곽 접근 조건을 함께 확인합니다.</p><h3>골프장 왕복과 현장 대기</h3><p>출발·라운딩 종료·복귀 예상 시각, 대기 장소와 식사 등 비용 조건을 상담하세요. 대기 시간을 포함하는 일일기사와 편도 두 번 이용은 견적 조건이 다를 수 있습니다.</p><h3>출장·관광·여러 곳 경유</h3><p>방문 순서와 각 장소에서 머무를 시간, 운행 종료 지점을 알려주세요. 목적지나 대기 시간이 바뀌면 변경된 비용과 배차 가능 여부를 운행 전에 협의합니다.</p></section><section><h2>예약 전에 전달할 일정표</h2><ol><li>차량 위치와 출발 희망 시각</li><li>방문 순서·경유지·대기 예정 시간</li><li>차종·동승 인원·편도 또는 왕복 여부</li><li>최종 종료 위치와 복귀 예상 시각</li></ol><p>외곽·야간 출발은 미리 상담하면 기사 이동과 복귀 여건을 확인하는 데 도움이 됩니다. 즉시 배차나 상주 기사를 보장하지 않습니다.</p></section><section><h2>장거리 편도 참고요금 조회</h2>'+regionalQuoteForm(r,kind)+'<p>계산기는 편도 도로거리 기준입니다. 왕복·다일 일정·골프장 대기가 포함된 최종 견적은 전체 일정으로 상담하세요.</p></section>';
 }else{
  content='<section><h2>탁송 예약에 필요한 정보</h2><ol><li>출발지·도착지의 정확한 주소와 차량 주차 위치</li><li>차종·변속기·차량 크기와 정상 운행 여부</li><li>인수·인계 담당자와 연락 가능한 시간</li><li>차량 키 전달 방법, 출입 등록·출차 승인 절차</li><li>정비소·매매단지 등의 입출고 마감 시각</li></ol></section><section><h2>차량을 맡기기 전</h2><p>차량 외관과 계기판·주행거리·연료 또는 충전량을 사진으로 남기세요. 경고등·배터리 이상·수리 중인 부분·적재물·별도 조작이 있으면 기사에게 설명합니다.</p><p>운행이 어려운 차량은 직접 운전하는 로드탁송과 필요한 운송 방식이 다를 수 있으므로, 차량 상태를 먼저 상담하세요.</p></section><section><h2>배정 확인부터 목적지 인계까지</h2><ol><li>상담 접수 후 실제 기사 배정과 도착 예상 연락을 확인합니다.</li><li>차량 위치·키 전달·보험 적용 및 보상 조건을 확인합니다.</li><li>통행료·주유비·주차비·경유·대기 비용과 최종 금액을 확인합니다.</li><li>목적지 담당자가 차량 상태와 키를 확인한 뒤 인계합니다.</li></ol><p>접수가 곧 기사 배정 완료를 뜻하지 않습니다. 일정이나 인수자가 바뀌면 출발 전에 알려주세요.</p></section><section><h2>이용 상황별 인수 준비</h2><h3>중고차 거래</h3><p>판매자·구매자의 차량 준비 여부와 인수 가능 시간을 맞추고 키·서류의 전달 범위를 미리 정하세요.</p><h3>정비소 입출고</h3><p>입고 예약과 출고 승인, 담당자, 마감 시각을 먼저 확인하세요. 정상 주행 가능 여부도 함께 전달합니다.</p><h3>산행·자전거 일정의 차량 회수</h3><p>차량 주차장과 회수 목적지를 구분하고, 일정 종료 예상 시간과 주차장 출입 조건을 협의하세요. 키 보관 방법은 상담을 통해 안전하게 정합니다.</p></section>';
 }
 const children=(childrenByParent.get(r.slug)||[]).slice(0,12);
 const local='<section><h2>'+full+' 내 출발 지역 확인</h2><p>'+esc(regionContext(r))+'에서 차량을 인수할 정확한 도로명주소와 건물명·주차 위치를 알려주세요. 아래 지역 안내에서 실제 출발지를 더 구체적으로 찾을 수 있습니다.</p><ul>'+children.map(x=>'<li><a href="'+servicePath(x,kind)+'">'+esc(x.full_name)+' '+service+'</a></li>').join('')+'</ul></section>';
 const data=JSON.stringify({'@context':'https://schema.org','@type':'WebPage',url:base+pathname,name:title,description:desc,primaryImageOfPage:{'@type':'ImageObject',contentUrl:base+image,width:1200,height:800}}).replace(/</g,'\\u003c');
 return layout(title+' | '+(isFare?'예상비용·추가 비용 확인':isLong?'편도·왕복·골프장 예약':'차량 준비·키 전달 안내'),desc,'<script type="application/ld+json">'+data+'</script>'+intro+card+content+remoteRegionGuidance(r)+local+regionalIntentNav(r,pathname),base+pathname,base+image);
}

const provinceServiceProfiles={"서울특별시":["도심 모임·업무 일정","업무시설·상가·공동주택은 건물명과 주차장 층·구역을 구분해 알려주세요. 도심에서 외곽으로 이동하는 일정은 경유지와 도착 후 차량 인계 방법을 함께 정합니다."],"부산광역시":["도심·공항·항만 차량 이동","공항 주차장이나 항만 시설에서 인수한다면 주차 구역·출입 가능 시간과 현장 담당자를 확인하세요. 시내 이동과 다른 시·도로 보내는 장거리 이동은 목적지 인계 시간을 나누어 상담합니다."],"인천광역시":["공항·항만·섬 지역 일정","공항은 터미널과 주차장 구역을, 항만은 시설 출입과 담당자 인계 조건을 확인하세요. 섬으로 이동하는 일정은 차량 진입과 선박 이용 여부를 먼저 설명해 주세요."],"경기도":["시·군별 출발지와 골프·업무 일정","같은 경기도 안에서도 출발 시·군과 외곽 위치에 따라 기사 이동 조건이 달라집니다. 골프장 왕복이나 지방 출장은 경유·대기·종료 예정 시간을 함께 알려주세요."],"강원특별자치도":["산행·해변·외곽 출발 일정","산행 차량 회수는 산행 시작 주차장과 종료 후 차량을 받을 곳을 구분하세요. 해변·숙소나 산간 출발은 정확한 진입 위치, 차량 키 전달 방법과 기사 복귀 교통편을 함께 확인합니다."],"대구광역시":["도심 귀가·정비소 입출고","상가·숙박시설 출발은 차량 주차 위치와 출차 가능 시각을 알려주세요. 서비스센터 이동은 접수·출고 담당자와 마감 시간을 확인한 뒤 다른 지역으로 이동할 일정까지 상담합니다."],"대전광역시":["업무 출장·도시 간 이동","업무시설 차량 인계는 담당자와 출입 가능한 시각을 확인하세요. 세종·충청권 또는 수도권으로 이동하는 일정은 출발지·목적지와 경유·대기 여부를 함께 알려주세요."],"광주광역시":["시내·전남 방향 이동","시내 출발과 전남의 다른 시·군으로 이동하는 일정을 구분해 상담하세요. 외곽 목적지는 차량을 받을 담당자, 인계 가능한 시간과 기사 복귀 조건을 확인합니다."],"울산광역시":["업무시설·도심 차량 이동","업무시설이나 공장 구역에서 차량을 넘길 때는 출입 허가와 담당자 만남 장소를 확인하세요. 부산·경남 등 다른 지역으로 이동하는 일정은 최종 인계 시간까지 함께 알려주세요."],"세종특별자치시":["업무 일정·인근 도시 이동","업무시설 주차장과 실제 기사 만남 장소를 구분해 알려주세요. 대전·충청권이나 수도권 이동은 출발 예정 시각, 경유 업무와 대기 여부를 확인합니다."],"충청북도":["시·군 간 이동·출장 일정","차량 위치가 있는 시·군과 읍·면을 정확히 알려주세요. 여러 업무 장소를 방문하는 일정은 경유 순서와 대기·종료 예정 시간을 미리 정하면 견적 상담에 도움이 됩니다."],"충청남도":["도시·해안·외곽 차량 인계","해안 시설·숙소·외곽 주차장에서 차량을 인수한다면 진입 위치와 출차 조건을 확인하세요. 타 시·도로 보내는 차량은 목적지 담당자와 인계 마감 시간을 함께 전달해 주세요."],"전북특별자치도":["도시권·산행 차량 회수","도시권 차량 이동과 산행 후 차량 회수는 준비할 정보가 다릅니다. 산행은 차량을 둔 주차장, 종료 지점과 열쇠 인계 방법을, 일반 이동은 정확한 출발·도착 주소를 알려주세요."],"전라남도":["시·군·항만·섬 연결 일정","항만이나 섬 관련 차량 이동은 차량 진입과 선박 이용 조건을 먼저 확인해야 합니다. 출발 주차장과 목적지의 차량 인수 담당자, 접수 가능한 시각을 구분해 알려주세요."],"경상북도":["도시 간 장거리·외곽 출발","출발 시·군과 차량 주차 위치를 정확히 알려주세요. 다른 지역으로 이동하거나 외곽에서 출발하는 일정은 기사 접근·복귀 교통편과 목적지 인계 시간을 함께 상담합니다."],"경상남도":["도시권·해안·업무 차량 이동","업무시설·정비소·해안 숙소 등 차량이 있는 장소에 따라 인수 조건을 확인하세요. 인근 도시 이동과 수도권 장거리 이동을 구분하고 경유·대기·인계 시간을 알려주세요."],"제주특별자치도":["제주 내 이동·육지 연계 구분","제주도 안에서 차량을 이동하는 일정과 선박을 이용해 육지와 연결하는 일정은 견적 조건이 다릅니다. 항만 인수 여부, 차량 종류와 선적 일정, 제주항 이후 이동 범위를 별도로 확인하세요."]};
function provinceServiceGuide(r,kind){
 if(r.level!=='시도')return '';
 const profile=provinceServiceProfiles[r.name];if(!profile)return '';
 if(kind==='daeri')return daeriBlogEditorial.province(r,childrenByParent.get(r.slug)||[],servicePath,esc);
 const label=kind==='taksong'?'자동차탁송':'대리운전';
 const children=childrenByParent.get(r.slug)||[];
 const links=children.map(x=>'<li><a href="'+servicePath(x,kind)+'">'+esc(x.name)+' '+label+'</a></li>').join('');
 return '<section class="province-service-guide"><h2>'+esc(shortPlace(r.name))+' '+label+' · '+esc(profile[0])+'</h2><p>'+esc(profile[1])+'</p><p><strong>24시탁송 안내:</strong> 전국 장거리·심야 차량 이동도 상담하나, 월요일 일부 시간대와 폭우·폭설·강풍 등 악천후에는 지방 외곽의 기사 배정이 지연되거나 불가능할 수 있습니다. 현재 기사 수급과 안전한 도로 운행 가능 여부는 상담으로 확인해야 합니다.</p><p>'+(kind==='taksong'?'차량만 보내는 경우 인수·인계 담당자와 차량 운행 가능 상태를 확인합니다.':'고객 차량으로 이동하며 골프 왕복·일일기사 일정은 편도 이동과 구분해 상담합니다.')+'</p><h3>'+esc(shortPlace(r.name))+' 출발 지역 선택</h3><ul style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:4px 16px">'+links+'</ul><p><a class="cta" href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(r.name)+'">출발·도착지 예상요금 조회</a> · <a href="/'+kind+'/#reservation-guide">예약 준비사항</a> · <a href="/reviews/history/?kind='+kind+'">서비스별 완료 운행기록</a></p></section>';
}
const verifiedRepairShops=load('data/verified-repair-shops.json').shops;
const verifiedScrapyards=load('data/verified-scrapyards.json').shops;
function verifiedScrapyardSection(r,kind){
 if(kind!=='taksong')return '';
 const shops=verifiedScrapyards.filter(shop=>shop.placeVerified===true&&/^https:\/\/m\.place\.naver\.com\/place\/\d+\/home(?:\?.*)?$/.test(String(shop.placeUrl||''))&&typeof shop.name==='string'&&typeof shop.address==='string'&&/^https:\/\//.test(String(shop.verificationSourceUrl||''))&&typeof shop.verificationMethod==='string'&&Array.isArray(shop.regionFullNames)&&shop.regionFullNames.includes(r.full_name));
 if(!shops.length)return '';
 return '<section><h2>'+esc(r.name)+' 폐차업체 명칭 확인 및 차량탁송</h2><p>공개 자료의 네이버 플레이스 연결 상호·주소를 다른 업체 자료와 교차 대조한 결과를 안내합니다. 플레이스 상세화면 직접 열람이 제한된 경우 이를 별도 기록하며, 최신 상호·영업 여부 및 입고 가능 여부를 전화로 재확인해야 합니다. 업체와 제휴하거나 폐차·견인·말소 업무를 직접 수행한다는 의미가 아닙니다. 운행 불가능한 차량은 견인·특수 운송을 별도로 확인해야 합니다.</p><ul>'+shops.map(shop=>'<li><strong>'+esc(shop.name)+'</strong> · '+esc(shop.address)+' · '+esc(shop.name+'탁송')+' · <a href="'+esc(shop.placeUrl)+'" rel="noopener noreferrer" target="_blank">업체 정보 확인</a></li>').join('')+'</ul></section>';
}

function verifiedRepairShopSection(r,kind){
 if(kind!=='taksong')return '';
 const shops=verifiedRepairShops.filter(shop=>shop.region===r.name||String(shop.address||'').includes(r.full_name||'__unknown__'));
 if(!shops.length)return '';
 return '<section><h2>'+esc(r.name)+' 실제 등록 정비업체 주변 차량탁송 안내</h2><p>공개 자동차정비업체 자료에서 확인한 지역 업체의 위치를 참고한 차량 이동 상담 예시입니다. 업체와의 제휴·예약·입고 허가·운행 완료를 의미하지 않으며, 업체명 검색어는 차량탁송을 찾는 데 도움을 주기 위한 안내입니다.</p><ul>'+shops.map(shop=>'<li><strong>'+esc(shop.name)+'</strong> ('+esc(shop.address)+') · '+esc(shop.keywords.join(' · '))+' — 정비 입고·출고 차량 이동은 업체와 사전 협의 후 상담</li>').join('')+'</ul><p><a href="https://www.data.go.kr/data/15028204/standard.do" target="_blank" rel="noopener noreferrer">자동차정비업체 공공데이터 출처</a> · <a href="/fare/?service=taksong">탁송 예상요금 조회</a></p></section>';
}
function priorityLocalGuide(r,kind){
 const info=priorityByKey.get(kind+'|'+r.full_name);
 if(!info)return '';
 const label=kind==='daeri'?'대리운전':'자동차탁송';
 return '<section id="priority-region-guide"><h2>'+esc(r.name)+' '+label+' 상세 준비사항: '+esc(info.topic)+'</h2><p>'+esc(info.detail)+'</p><p>이 내용은 지역별 예약 준비 안내이며 해당 구간의 운행을 완료했다는 주장이 아닙니다. 실제 운행내역은 출발지와 도착지가 확인된 자료만 별도로 연결합니다.</p><p><a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(r.full_name)+'">이 지역 출발 예상요금 조회</a> · <a href="tel:18114294">예약 상담 '+PHONE+'</a></p></section>';
}

function blogPostMatchesService(post,kind){
 const title=String(post.title||'').replace(/번개탁송대리운전(?:\s*\d{2,4}-?\d{3,4}-?\d{4})?/g,'');
 const category=String(post.category||'');
 const mixed=/탁송\s*[+·/&]\s*대리운전/.test(title);
 if(kind==='daeri'){
  // A taksong post must not masquerade as a driver service just because the brand ends in 대리운전.
  if(/탁송/.test(category)&&!mixed)return false;
  if(/탁송/.test(title)&&!mixed)return false;
  return /대리운전|일일기사/.test(title);
 }
 if(/대리운전|일일기사/.test(category)&&!/탁송/.test(category)&&!mixed)return false;
 return /탁송|차량회수/.test(title);
}
function regionalBlogLinks(r,kind){
 if(!['시도','시','군','구'].includes(r.level))return '';
 // Curated province-level driver articles are handled by daeriBlogEditorial.
 if(kind==='daeri'&&r.level==='시도')return '';
 const service=kind==='taksong'?'자동차탁송':'대리운전';
 const compact=s=>String(s||'').replace(/[\s·｜|,，\-]/g,'');
 const trimSuffix=s=>String(s||'').replace(/(특별자치시|특별시|광역시|특별자치도|자치도|시|군|구)$/,'');
 const names=[r.full_name,r.name,seoRegionLabel(r),...regionAliases(r),trimSuffix(r.name)].filter(Boolean).map(compact).filter(x=>x.length>=2);
 const ambiguous=regions.filter(x=>x.name===r.name).length>1;
 const parents=regionAncestors(r).filter(a=>a.level==='시도').flatMap(a=>[trimSuffix(a.name),seoRegionLabel(a),...regionAliases(a)]).map(compact).filter(x=>x.length>=2);
 const chosen=publishedBlogPosts.filter(p=>{
  if(!blogPostMatchesService(p,kind))return false;
  const title=compact(p.title);
  if(r.name==='포항시'&&title.includes('삼길포항')&&!/포항시|포항탁송|경북동부|경상북도/.test(title))return false;
  if(r.full_name==='경상남도 김해시'&&/김해공항|김해국제공항/.test(title)&&!/김해시|장유|율하|진영/.test(title))return false;
  return names.some(n=>title.includes(n))&&(!ambiguous||parents.some(n=>title.includes(n)));
 }).sort((a,b)=>{
  // Prioritize articles about this region instead of passing destination mentions.
  // Prefer posts dedicated to this service rather than mixed-service summaries.
  const score=p=>{
   const title=compact(p.title).replace(/^#+/,'');
   const regionFirst=names.some(n=>title.startsWith(n));
   const regionEarly=!regionFirst&&names.some(n=>title.slice(0,28).includes(n));
   const serviceEarly=(kind==='taksong'?/탁송/:/대리운전/).test(title.slice(0,38));
   const mixed=/탁송/.test(title)&&/대리운전/.test(title);
   // Prioritize only the user-confirmed source of a phone inquiry in Gangwon.
   // An inquiry does not prove a completed delivery or a fixed fare.
   const inquirySignal=kind==='taksong'&&r.full_name==='강원특별자치도'&&p.id==='224378263508'?30:0;
   return inquirySignal+(regionFirst?12:regionEarly?6:0)+Number(serviceEarly)*3-Number(mixed)*4
    +Number(/운행완료|운행후기|배차완료|배차후기/.test(title))*4+Number(/후기|완료/.test(title));
  };
  return score(b)-score(a);
 }).slice(0,3);
 if(!chosen.length)return '';
 return '<section id="regional-blog-links"><h2>'+esc(r.full_name)+' '+service+' 관련 네이버 블로그</h2><p>번개탁송대리운전 블로그의 공개 게시글입니다. 운행 완료 여부와 당시 요금은 원문에서 확인하며, 스마트24의 현재 예약요금과 구분합니다.</p><ul>'+chosen.map(p=>'<li><a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer">'+esc(p.title)+'</a></li>').join('')+'</ul><p><a href="/blog/">다른 블로그 게시글 보기</a> · <a href="/reviews/history/?kind='+kind+'">확인된 완료 운행기록 보기</a></p></section>';
}

function priorityServiceUseCases(r,kind){
 if(!priorityByKey.has(kind+'|'+r.full_name))return '';
 const label=esc(seoRegionLabel(r));
 if(kind==='taksong'){
  return '<section id="priority-service-use-cases"><h2>'+label+' 차량 입고·출고 목적별 준비</h2><p>공업사탁송 또는 자동차검사소탁송이 필요한 경우 업체의 차량 인수 가능 시간, 차량 열쇠 전달 방법, 검사·정비 완료 시점을 먼저 확인합니다. 업체와의 제휴나 예약 대행을 의미하지 않습니다.</p><p>폐차장탁송·폐차산업탁송은 차량이 스스로 운행 가능한 상태인지부터 확인해야 하며, 운행이 불가능하면 별도 견인·특수운송이 필요할 수 있습니다. 블랙박스탁송 같은 시공업체 이동은 사전 예약한 입고 시간과 출고 담당자를 확인합니다.</p><p><a href="/taksong/types/">차종별 차량 이동 안내</a> · <a href="/fare/?service=taksong">탁송 요금 참고하기</a></p></section>';
 }
 return '<section id="priority-service-use-cases"><h2>'+label+' 이용 상황별 예약 확인</h2><p>골프장대리운전은 라운딩 종료 예정 시간, 차량이 있는 클럽하우스 주차 위치, 목적지를 구분해서 알려주세요. 일일기사·왕복 일정은 편도 운행과 달리 대기와 식대 조건을 별도로 확인합니다.</p><p>법인대리운전은 이용 담당자, 업무 일정 및 결제 방식에 대한 사전 협의가 필요합니다. 이용 가능 여부와 최종 요금은 시간·지역·기사 수급에 따라 상담으로 확인합니다.</p><p><a href="/service/golf/">골프장 대리운전 안내</a> · <a href="/service/corporate/">법인 이용 안내</a></p></section>';
}
function jejuTaksongBlogEditorial(){
 return '<section id="jeju-source-route-guide" aria-labelledby="jeju-source-heading"><h2 id="jeju-source-heading">제주도탁송 실제 운행후기와 차량 선적·항만 인계 확인</h2>'+
 '<p>제주도 차량 이동은 제주도 안에서 차량을 로드탁송하는 경우와, 육지에서 항만까지 운반하고 선박 선적 후 제주항에서 인계하거나 반대로 육지로 보내는 경우를 구분해야 합니다. 출발지·도착지·차종 외에 차량 선적일, 항구의 인수 담당자, 차량 열쇠와 서류 전달 방법, 항만 이후 이동이 견적에 포함되는지를 확인해 주세요. 선박 운항 일정과 기상·항만 사정에 따라 실제 인계 시각은 달라질 수 있습니다.</p>'+
 '<h3>8월에 게시된 제주도 왕복탁송·선적탁송 실제 원문</h3><ul>'+
 '<li><a href="https://blog.naver.com/wjdtnr4757/224371918565" target="_blank" rel="noopener noreferrer">8월 8일 제주도 왕복탁송: 트랙스 제주 인도 후 스포티지 반납 사례</a></li>'+
 '<li><a href="https://blog.naver.com/wjdtnr4757/224387354617" target="_blank" rel="noopener noreferrer">8월 23일 청주 오송 출발, 목포항 경유 제주 차량 선적탁송 후기</a></li>'+
 '<li><a href="https://blog.naver.com/wjdtnr4757/224362663400" target="_blank" rel="noopener noreferrer">7월 30일 제주도 차량탁송과 선적 준비 안내</a></li></ul>'+
 '<h3>육지·제주도 연계 시 확인할 차량 인수 동선</h3><p>제주항·목포항 등 항만을 이용하는 일정은 차량이 출발하는 실제 위치, 항만 인계 방식, 선박 적재 가능 여부와 반대편 항구 도착 후 운행 범위를 나누어 상담합니다. 제주 시내·서귀포시·애월·성산 등 섬 안에서의 이동은 선적이 필요 없는 경우도 있으므로 먼저 구분하세요. 특정 항로의 운항·예약 또는 항만 상주 기사를 보장하지 않습니다.</p>'+
 '<p><a href="/blog/archive/jeju-taksong/">제주탁송 차량선적·실제후기 블로그 자료실</a> · <a href="/fare/jeju/">제주 차량탁송·선적 예상요금 구성 보기</a> · <a href="tel:18775245">제주탁송 대표 상담 1877-5245</a></p>'+
 '<p>위 링크는 공개된 기존 네이버 블로그 원문입니다. 당시 사례의 차량·요금·일정은 현재의 고정 요금이나 모든 구간의 배차 가능을 의미하지 않습니다.</p></section>';
}

async function servicePage(r,kind){
 const service=kind==='taksong'?'탁송':'대리운전',name=r.full_name||r.name,host=process.env.PUBLIC_HOST||'jeongukdaeri.kr';
 const keyword=seoRegionLabel(r)+service;
 const parentRegion=r.parent_slug?bySlug.get(r.parent_slug):null;
 const preciseLocality=seoRegionLabel(r);
 const qualifiedKeyword=name+' '+service;
 // Spread general and industry intent over broader pages; small locality pages focus on pickup details.
 const scope=r.level==='시도'?'province':['시','군','구'].includes(r.level)?'district':['읍','면'].includes(r.level)?'town':'neighborhood';
 const localIntentByScope=kind==='taksong'?{
  province:['공업사탁송','정비소탁송','자동차검사소탁송','서비스센터탁송','중고차탁송','폐차장탁송','폐차탁송','폐차산업탁송','폐차장입고탁송','썬팅탁송','블랙박스탁송','디테일링탁송'],
  district:['자동차탁송','장거리탁송','공업사탁송','서비스센터탁송','폐차장탁송','자동차검사소탁송'],
  town:['장거리탁송','차량인수탁송','정비입고탁송'],
  neighborhood:['차량인수탁송','차량인계탁송']
 }:{
  province:['장거리대리운전','골프장대리운전','법인대리운전','예약대리운전'],
  district:['장거리대리운전','골프장대리운전','예약대리운전'],
  town:['예약대리운전','장거리대리운전'],
  neighborhood:['대리운전예약','주차장대리운전']
 };
 const locationIntent=localIntentByScope[scope];
 const localIntentLinks='<section><h2>'+esc(preciseLocality)+' '+(kind==='taksong'?'차량탁송 이용 목적':'대리운전 이용 목적')+'</h2><p>'+locationIntent.map(term=>esc(preciseLocality+term)).join(' · ')+' 등은 '+esc(name)+' 출발·도착지와 실제 이용 조건을 확인해 상담합니다. 해당 업종과 제휴하거나 해당 지역에 기사가 상주한다는 뜻은 아닙니다.</p><p><a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(name)+'">지역별 예상요금 조회</a> · <a href="tel:18114294">1811-4294 전화 상담</a></p></section>';
 const crumbItems=[{name:'홈',item:'https://'+host+'/'},{name:'전국 '+service,item:'https://'+host+'/'+kind+'/'},...regionAncestors(r).map(a=>({name:seoRegionLabel(a)+service,item:'https://'+host+servicePath(a,kind)}))].map((a,i)=>({'@type':'ListItem',position:i+1,...a}));
 const priorityMeta=priorityByKey.get(kind+'|'+r.full_name);
 const focusedTitle=priorityMeta?keyword+' | '+priorityMeta.topic:keyword+' | '+(scope==='neighborhood'?(kind==='taksong'?'차량 인수·인계·예약':'이용 위치·예약·요금'):scope==='town'?(kind==='taksong'?'장거리 차량탁송·예약':'예약 대리운전·장거리'):kind==='taksong'?'자동차탁송·장거리 요금·예약':'대리운전·장거리 요금·예약');
 const provinceProfile=r.level==='시도'?provinceServiceProfiles[r.name]:null;
 const riContext=r.level==='리'?' 마을 출발 위치와 기사 접근·복귀 여건을 확인합니다.':'';
 const provinceSpecificGuide=scope==='province'&&provinceProfile?(priorityByKey.get(kind+'|'+r.full_name)?.detail||provinceProfile[1]):'';
 const priorityFirstSentence=priorityMeta?priorityMeta.detail.split(/[.!?。]/)[0].trim():'';
 const focusedDesc=priorityMeta
  ?keyword+' · '+priorityMeta.topic+'. '+priorityFirstSentence+'. 예약상담 '+PHONE+'.'
  :name+' '+(kind==='taksong'?'자동차탁송':'대리운전')+' 예상요금·예약 안내. '+(provinceSpecificGuide?provinceSpecificGuide+' ':'')+(kind==='taksong'?'차량 인수·인계 장소, 차종, 이동 시간과 기사 접근·복귀 여건을 확인합니다.':'출발·도착지, 동승·경유·대기 여부와 기사 복귀 여건을 확인합니다.')+' 최종요금과 배차 가능 여부는 상담 후 안내합니다. '+PHONE+'.'+riContext;
 const jejuSearchPage=kind==='taksong'&&r.name==='제주특별자치도';
 const searchTitle=jejuSearchPage?'제주도탁송 · 차량선적·실제후기':focusedTitle;
 const searchDesc=jejuSearchPage?'제주도탁송, 목포항·제주항 차량선적과 항만 인계, 7~8월 실제 운행후기 안내. 제주탁송 대표 상담 1877-5245.':focusedDesc;
 const hierarchyNote='행정구역 경로: '+regionAncestors(r).map(a=>a.name).join(' → ')+'. '+(r.level==='리'?'마을 단위 상세 위치와 차량 인수 지점을 확인합니다.':r.level==='동'?'건물 출입구와 주차 위치를 확인합니다.':r.level==='면'?'면 소재지와 외곽의 기사 이동 여건을 확인합니다.':'지역별 출발지와 목적지의 이동 조건을 확인합니다.');
 const aliasTerms=[...new Set(regionAliases(r).map(x=>x+service))].filter(x=>x!==name+' '+service&&x!==keyword);const aliasSection=aliasTerms.length?'<section><h2>지역명별 '+service+' 검색 안내</h2><p>'+esc(aliasTerms.join(' · '))+'은(는) '+esc(name)+' 지역의 동일한 서비스 안내를 가리킵니다. 지역별 별도 업체나 기사 상주를 뜻하지 않습니다.</p></section>':'';
 const intro=kind==='taksong'?'자동차탁송은 고객이 지정한 출발지에서 차량을 인수해 목적지로 이동시키는 서비스입니다. 차량 인수·인계 장소와 차종, 도로거리, 시간대, 기사 접근·복귀 동선, 통행료에 따라 요금이 달라집니다.':'대리운전은 고객 차량을 기사에게 맡겨 목적지까지 이동하는 서비스입니다. 고객의 동승 여부와 이용 조건을 상담 시 확인하며, 출발지·도착지·시간대·장거리 여부·기사 복귀 여건에 따라 요금과 배차가 달라집니다.';
 const historicalMatches=historicalRides.filter(x=>x.service===kind&&matchingHistoryRegion(x,r,regions)).slice(0,6);
 const historicalCards=historicalMatches.length?'<section><h2>'+esc(name)+' 실제 완료 운행내역에서 작성한 후기</h2><p>기존 운행기록 중 이 지역명이 실제 출발·도착 내용에 포함된 기록을 정리했습니다. 아래 금액은 각 운행 당시 요금으로 새로운 예약 견적이 아닙니다. 원본에 예약 여부나 배차 시간 정보가 없는 건은 추측하지 않습니다.</p>'+historicalMatches.map(x=>'<article style="border-top:1px solid #d6e0ee;padding:14px 0"><h3><a href="/reviews/history/'+x.id+'/">'+esc(x.departure+' → '+x.destination+' '+service+' 완료 후기')+'</a></h3><p>운행일 '+esc(x.date)+' · 당시 배차요금 <strong>'+esc(x.fare)+'</strong></p><p>기사 수급이 어려운 피크타임이나 지방·오지 지역에서 급히 호출하면 배차가 지연되거나 요금이 크게 오를 수 있으므로 미리 가능 여부를 확인하는 것이 중요합니다.</p></article>').join('')+'</section>':'';
 const matches=publicRides.filter(x=>{const raw=String(x.departure||'')+' '+String(x.destination||'');const type=String(x.service||x.service_type||x.kind||'').toLowerCase();return tripMatchesRegion(x,r)&&(kind==='taksong'?/탁송|taksong/.test(type)||(!type&&/탁\//.test(raw)):/대리|daeri/.test(type)||(!type&&!/탁\//.test(raw)))}).slice(0,8);
 const reviewCards=matches.length?'<section><h2>'+esc(keyword)+' 실제 운행완료 후기 · 출발지·도착지·요금</h2><p>확인된 완료 운행 자료만 사용합니다. 예약 시각·배차 과정 등 미제공 정보는 임의로 작성하지 않습니다. 현재 요금은 이용 조건에 따라 달라집니다.</p>'+matches.slice(0,5).map(x=>'<article style="border-top:1px solid #d6e0ee;padding:14px 0"><h3>'+esc(x.departure+' → '+x.destination+' '+service+' 운행완료')+'</h3><p><strong>운행일:</strong> '+esc(x.date)+' · <strong>출발:</strong> '+esc(x.departure)+' · <strong>도착:</strong> '+esc(x.destination)+' · <strong>운행요금:</strong> '+esc(x.fare||'미기록')+'</p><p><strong>예약·배차:</strong> 운행완료 확인. 예약 접수 및 배차 세부 과정은 미기록입니다.</p><p>해당 구간의 '+service+' 운행이 완료된 사례입니다. 요금과 배차 가능 여부는 실제 이용 조건에 따라 달라질 수 있습니다.</p><p><a href="'+rideUrl(x)+'">운행 기록 보기</a> · <a href="tel:18114294">예약·배차 상담 '+PHONE+'</a></p></article>').join('')+'</section>':historicalMatches.length?historicalCards:priorityMeta?'<section><h2>'+esc(keyword)+' 운행기록 확인 현황</h2><p>현재 공개 가능한 완료 운행기록에서 이 지역의 출발 또는 도착이 명확하게 확인된 사례는 찾지 못했습니다. 다른 지역의 운행을 이 지역의 실적으로 표시하지 않습니다.</p><p><a href="/reviews/history/?kind='+kind+'">전국 실제 운행기록 확인</a> · <a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(name)+'">'+esc(name)+' 예상요금 상담</a></p></section>':'<section><h2>'+esc(name)+' 실제 운행기록 확인 안내</h2><p>현재 공개 가능한 기록에서 이 행정구역의 출발 또는 도착이 확인된 운행은 없습니다. 이름이 비슷한 다른 지역의 운행사례를 이곳의 실적으로 표시하지 않습니다.</p><p><a href="/reviews/history/?kind='+kind+'">전국 전체 운행기록 보기</a> · <a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(name)+'">'+esc(name)+' 예상요금·예약 안내</a></p></section>';

 const verifiedFeatured=priorityMeta?[
  ...matches.slice(0,3).map(x=>({
   url:rideUrl(x),date:x.date,from:x.departure,to:x.destination,fare:x.fare,
   origin:tripMatchesRegion({...x,destination:''},r),source:'사용자 확인 공개 운행'
  })),
  ...historicalMatches.slice(0,3).map(x=>({
   url:'/reviews/history/'+x.id+'/',date:x.date,from:x.departure,to:x.destination,fare:x.fare,
   origin:matchingHistoryRegion({...x,rawDestination:''},r,regions),source:'기존 완료 운행기록'
  }))
 ]:[];
 const priorityEvidence=priorityMeta?'<section id="priority-verified-rides"><h2>'+esc(keyword)+' 실제 확인된 운행 사례</h2>'+
  (verifiedFeatured.length?'<p>다음은 실제 완료 운행 자료에서 이 지역이 출발지 또는 도착지로 확인된 사례입니다. 기록 당시 요금은 현재 예약 견적이 아니며, 고객 상세주소와 연락처는 공개하지 않습니다.</p><ul>'+
   verifiedFeatured.map(x=>'<li><a href="'+esc(x.url)+'">'+esc(x.from+' → '+x.to+' '+service+' 완료 운행')+'</a> · '+esc(x.date)+' · 당시 요금 '+esc(x.fare||'미기록')+' · '+esc(x.origin?'이 지역 출발':'이 지역 도착')+' · '+esc(x.source)+'</li>').join('')+
   '</ul>':'<p>현재 공개 가능한 운행기록에서 이 지역의 출발·도착이 명확하게 확인된 사례는 찾지 못했습니다. 다른 지역의 운행을 이 지역의 실적처럼 표시하지 않습니다.</p>')+
  '<p><a href="/reviews/history/?kind='+kind+'">전체 확인 운행기록</a> · <a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(name)+'">'+esc(name)+' 요금·배차 상담</a></p></section>':'';
 const history=matches.length?'<p>아래는 확인된 실제 완료 운행 기록입니다. 기록 요금은 당시 운행 조건에 따른 금액이며 현재 예상요금과 다를 수 있습니다.</p><ul>'+matches.map(x=>'<li><a href="'+rideUrl(x)+'">'+esc([x.departure+' → '+x.destination,service+' 운행완료',x.fare?'요금 '+x.fare:'',x.date].filter(Boolean).join(' · '))+'</a></li>').join('')+'</ul><p><a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(name)+'">'+esc(name)+' 출발·도착지 입력해 현재 예상요금 조회</a></p>':regionalUsage(r,kind);
 const taebaekGuide=(r.name==='태백시'&&kind==='taksong')?'<section><h2>태백시탁송 지역별 차량 인수·인계 안내</h2><p>태백시 황지동·황연동·상장동·삼수동·장성동·철암동 등에서는 차량 위치와 기사 접근 경로를 구체적으로 확인해야 합니다. 아래 지역은 서비스 상담 가능 지역 안내이며, 기사 상주나 실제 운행완료를 의미하지 않습니다.</p><h3>황지동·황연동·상장동 출발 차량탁송</h3><p>출발 건물의 주차 위치와 차량 열쇠 인계 방식, 목적지의 차량 수령 가능 시간을 상담 시 확인합니다.</p><h3>삼수동·장성동·철암동 차량탁송</h3><p>외곽 출발지의 정확한 위치와 기사 접근·복귀 여건에 따라 배차 가능 여부와 요금이 달라질 수 있습니다. 장거리 운행은 사전 예약을 권장합니다.</p><h3>태백에서 삼척·정선·원주·강릉 및 수도권 방향</h3><p>이동 방향은 상담 가능한 예시 구간입니다. 차종·이동 거리·통행료·시간대 등을 확인한 후 요금을 안내합니다.</p><p><a href="/fare/?service=taksong&amp;from=%ED%83%9C%EB%B0%B1%EC%8B%9C">태백시 출발 탁송 예상요금 조회</a> · <a href="tel:18114294">스마트24탁송 1811-4294 상담</a></p></section>':'';
 const near=(childrenByParent.get(r.parent_slug)||[]).filter(x=>x.slug!==r.slug).slice(0,8).map(x=>'<li><a href="'+servicePath(x,kind)+'">'+esc(x.full_name)+' '+service+'</a></li>').join('');
 const body=(priorityMeta?priorityEvidence+priorityLocalGuide(r,kind)+regionalBlogLinks(r,kind)+routeKeywordPages.links(r,kind):routeKeywordPages.links(r,kind)+priorityLocalGuide(r,kind)+reviewCards+regionalBlogLinks(r,kind))+vehicleGuideLink(kind)+(priorityMeta?priorityServiceUseCases(r,kind):localIntentLinks)+'<section><nav aria-label="지역별 '+service+' 경로"><a href="/">홈</a> / <a href="/'+kind+'/">전국 '+service+'</a> / '+regionAncestors(r).map(a=>'<a href="'+servicePath(a,kind)+'">'+esc(seoRegionLabel(a))+' '+service+'</a>').join(' / ')+'</nav><h2>'+esc(keyword)+'</h2><h3>'+esc(name)+' '+service+' 전문 안내</h3><p>'+intro+'</p><p>기사 상주를 보장하지 않으며 배차 가능 여부는 상담 시 확인합니다.</p><p><a class="cta" href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(name)+'">'+service+' 예상요금 조회</a> <a class="cta" href="tel:18114294">전화 상담 '+PHONE+'</a></p></section>'+provinceServiceGuide(r,kind)+regionalIntentNav(r)+remoteRegionGuidance(r)+(await regionalQuoteLinks(r,kind))+routeGuides.regionSection(r)+neighborhoodStorySection(r,kind)+taebaekGuide+bookingGuide(kind,r)+(priorityMeta?'':aliasSection)+'<section><h2>'+esc(name)+' '+service+' 상담 명함</h2><p><strong>'+esc(serviceBrand(kind))+'</strong></p><p><a href="tel:18114294">대표전화 '+PHONE+' 전화 상담</a></p></section><section><h2>예약·예상요금·빠른배차</h2><p>출발지·도착지·출발 시간·차종을 알려주시면 배차 가능 여부와 예상요금을 안내합니다. 추가 비용 여부는 상담 시 확인하세요.</p><p><a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(name)+'">'+service+' 출발지·도착지 예상요금 확인하기</a></p></section><section><h2>'+esc(name)+' '+(matches.length?'실제 완료 운행정보':service+' 상황별 이용 안내')+'</h2>'+(priorityMeta&&matches.length?'<p>상단에 표시된 확인 완료 사례에서 실제 출발·도착지와 당시 요금을 확인할 수 있습니다. 현재 견적은 별도 상담으로 안내합니다.</p><p><a href="/reviews/history/?kind='+kind+'">전체 운행기록 더 보기</a></p>':history)+'</section><section><h2>주변 지역 '+service+'</h2><ul>'+near+'</ul></section>'+hierarchyServiceLinks(r,kind)+'<section><h2>관련 서비스</h2><a href="'+servicePath(r,kind==='taksong'?'daeri':'taksong')+'">'+esc(name)+' '+(kind==='taksong'?'대리운전':'탁송')+'</a></section>';
 const imageUrl='https://'+host+cardPngPath(r.slug,kind);
 const card='<figure><a href="tel:18114294" aria-label="'+esc(name)+' '+service+' 1811-4294 전화 상담"><img src="'+cardPngPath(r.slug,kind)+'" alt="'+esc(name)+' '+serviceBrand(kind)+' 명함 1811-4294" width="1200" height="800" loading="lazy" style="width:100%;height:auto"></a></figure>';
 const pageUrl='https://'+host+servicePath(r,kind);
 const imageId=imageUrl+'#image';
 const imageData=JSON.stringify({'@context':'https://schema.org','@graph':[{'@type':'WebPage','@id':pageUrl,url:pageUrl,name:focusedTitle,breadcrumb:{'@id':pageUrl+'#breadcrumb'},primaryImageOfPage:{'@id':imageId}},{'@type':'ImageObject','@id':imageId,contentUrl:imageUrl,url:imageUrl,name:name+' '+serviceBrand(kind)+' 상담 명함',caption:name+' '+serviceBrand(kind)+' 대표전화 '+PHONE,width:1200,height:800,encodingFormat:'image/png'},{'@type':'BreadcrumbList','@id':pageUrl+'#breadcrumb',itemListElement:crumbItems}]}).replace(/</g,'\\u003c');
 const caption='<figcaption style="text-align:center">'+esc(name)+' '+serviceBrand(kind)+' 상담 명함 · <a href="tel:18114294">'+PHONE+'</a>'+dispatchNotice(kind)+'</figcaption>';
 const visibleCard=card.replace('</figure>',caption+'</figure>');
 const jejuLead=jejuSearchPage?jejuTaksongBlogEditorial():'';
 const gangwonArchiveLead=kind==='taksong'&&r.name==='강원특별자치도'?'<section id="gangwon-source-archive" aria-labelledby="gangwon-source-archive-heading"><h2 id="gangwon-source-archive-heading">강원도탁송 영동·영서 실제 블로그 글과 차량 인수 안내</h2><p>영동의 속초·양양·주문진·강릉·동해·삼척, 영서의 춘천·원주·홍천·횡성·평창·정선은 차량 인수 위치와 기사 복귀 여건이 서로 다릅니다. 별도 지역 홍보글을 반복하기보다 실제 공개된 원문과 주차장·인계 준비사항을 함께 확인할 수 있도록 정리했습니다.</p><p><a href="/blog/archive/gangwon-taksong/">강원도탁송 영동·영서 블로그 자료실 읽기</a> · <a href="/blog/archive/mountain-cycle/">설악산 종주 차량회수 관련 글</a> · <a href="tel:18114294">전국탁송 상담 1811-4294</a></p></section>':'';
 const jejuPageSchema=jejuSearchPage?JSON.stringify({'@context':'https://schema.org','@type':'WebPage',name:searchTitle,description:searchDesc,url:pageUrl,about:{'@type':'Service',name:'제주탁송',provider:{'@type':'Organization',name:BRAND,telephone:'1877-5245'}}}).replace(/</g,'\\u003c'):'';
 const jejuContact=jejuSearchPage?'<section id="jeju-dedicated-contact"><h2>제주탁송 대표번호 1877-5245</h2><p>제주도 차량 선적·항구 인계 및 육지 연계 탁송은 제주탁송 전용 번호로 상담해 주세요.</p><p><a class="cta" href="tel:18775245">제주탁송 전화 상담 1877-5245</a></p></section>':'';
 const rendered=layout(searchTitle,searchDesc,'<script type="application/ld+json">'+(jejuSearchPage?jejuPageSchema:imageData)+'</script>'+body.replace('</section>','</section>'+(jejuSearchPage?jejuContact:visibleCard)+jejuLead+gangwonArchiveLead)+(kind==='taksong'?'<section><h2>'+esc(name)+' 자동차 정비·관리 업체 차량탁송</h2><p>공업사·모터스·정비소 입고와 출고, 자동차검사소 방문, 디테일링·손세차·광택·유리막코팅 업체 방문, 썬팅·블랙박스·내비게이션·PPF·랩핑 시공업체 방문을 위한 운행 가능한 차량의 이동을 상담합니다. 해당 정비·검사·시공을 직접 제공하거나 특정 업체와 제휴한다는 의미는 아닙니다.</p><p>차량 인수 장소, 업체 주소, 예약 시각, 차종, 차량 키 인계 방법을 알려주세요. 운행할 수 없는 차량은 별도 견인이 필요할 수 있습니다.</p><p><a href="/fare/?service=taksong">자동차탁송 예상요금 조회</a> · <a href="/taksong/">전국 자동차탁송 안내</a></p></section>':'')+verifiedScrapyardSection(r,kind)+verifiedRepairShopSection(r,kind)+keywordEngine.regionSection(r,kind)+(kind==='taksong'&&r.name==='제주특별자치도'?'<section><h2>서울·대구 출발 제주탁송 예상요금</h2><p>아반떼급·월~토·목포항 경유·제주항 인수 기준 계산 예시: 서울역 출발 약 275,000원, 대구시청 출발 약 220,000~250,000원. 2026년 10월 25일 조회 기준 참고금액이며, 제주항 이후 이동과 주유·통행·대기 등 비용은 상담으로 확인합니다.</p><p><a class="cta" href="/fare/jeju/">육지 탁송료 + 차량 선적비 합산 계산 →</a></p></section>':''),pageUrl,jejuSearchPage?null:imageUrl);
 // The shared site footer and regional template use the national phone. Change only the Jeju taksong response;
 // do not edit any saved trip records, other provinces, or original Naver post titles.
 return jejuSearchPage?rendered.replaceAll('1811-4294','1877-5245').replaceAll('18114294','18775245'):rendered;
}
function remoteRegionGuidance(r){
 const full=r.full_name||'',names=[
  ['울진','경상북도','울진·동해안 구간은 기사 접근 거리와 운행 후 복귀 교통편을 함께 확인해야 합니다. 외곽 출발은 사전 예약을 권합니다.'],
  ['영덕','경상북도','영덕 해안·외곽 구간은 기사 수급과 복귀 동선에 따라 배차 조건이 달라질 수 있습니다.'],
  ['고성','강원','강원 고성은 접경·외곽 지역 출발 위치에 따라 기사 이동시간과 복귀 교통편을 확인해야 합니다. 경남 고성과는 별도 지역입니다.'],
  ['거제','경상남도','거제 지역은 실제 차량 위치와 육지 방향 복귀 동선을 확인한 뒤 배차 가능 여부를 안내합니다.'],
  ['완도','전라남도','완도 지역은 섬·연륙 구간과 기사 복귀 이동 조건을 확인해야 하므로 예약 시간을 여유 있게 상담하세요.'],
  ['해남','전라남도','해남 외곽 지역은 기사 접근과 운행 후 복귀 교통편이 요금 및 배차에 영향을 줄 수 있습니다.']
 ];
 const match=names.find(([name,province])=>full.includes(province)&&full.includes(name));
 if(!match)return '';
 return '<section><h2>'+esc(full)+' 장거리탁송·대리운전 지역별 배차 안내</h2><p>'+esc(match[2])+'</p><p>이 지역은 요금계산기에서 기본 거리별 참고요금에 임시 지역 보정 20%를 적용할 수 있습니다. 장거리 대리운전은 탁송 참고요금 대비 약 30% 가산해 추정합니다. 요금과 배차 가능 여부는 실제 출발지·도착지와 시간대에 따라 달라집니다.</p><p><a href="/fare/">대리운전·탁송 예상요금 조회 →</a></p></section>';
}
function regionPage(r){
 const fullName=r.full_name||[r.parent_name==='대한민국'?'':r.parent_name,r.name].filter(Boolean).join(' ');
 const full=esc(fullName),short=esc(r.name),context=esc(regionContext(r));
 const ancestors=regionAncestors(r);
 const breadcrumb='<nav aria-label="지역 경로"><a href="/region/">전국 지역</a> / '+ancestors.map((x,i)=>i===ancestors.length-1?'<strong>'+esc(x.name)+'</strong>':'<a href="'+canonical(x.slug)+'">'+esc(x.name)+'</a>').join(' / ')+'</nav>';
 const title=fullName+' 대리운전·탁송 | '+shortPlace(r.name)+' 대리운전·탁송 상담';
 const serviceLinks='<section><h2>지역별 서비스 상세 안내</h2><p><a href="'+servicePath(r,'daeri')+'">'+full+' 대리운전</a> · <a href="'+servicePath(r,'taksong')+'">'+full+' 탁송</a> · <a href="/places/">펜션·캠핑장·관광지·행사장 등 장소별 안내</a> · <a href="/taksong/types/">렉카·암롤·윙바디 등 차종별 탁송</a></p></section>';
 const shortDaeri=r.name.replace(/(특별자치시|특별시|광역시|특별자치도|자치시|시|군|구)$/,'')+'대리';
 const localDaeri=r.name+'대리';
 const qualifiedDaeri=fullName+' 대리';
 const intro=fullName+' 대리운전·탁송, '+shortPlace(r.name)+' 대리운전·탁송 상담 안내. 정식 행정구역명과 간략 지역명을 함께 안내합니다. 출발지와 도착지, 차종, 예약 시간에 따라 기사 배차 가능 여부와 요금이 달라집니다. 전국대리운전·24시탁송·장거리 서비스도 상담합니다.';
 const matches=verifiedRides.filter(x=>tripMatchesRegion(x,r)).slice(0,12);
 const records=matches.length?'<ul>'+matches.map(x=>'<li>'+esc([x.date,x.departure+' → '+x.destination,x.fare].filter(Boolean).join(' · '))+'</li>').join('')+'</ul>':regionalUsage(r,'taksong')+'<p><a href="'+servicePath(r,'daeri')+'">'+esc(fullName)+' 대리운전 이용 안내 보기</a></p>';
 const children=childrenByParent.get(r.slug)||[];
 const parent=r.parent_slug?bySlug.get(r.parent_slug):null;
 const serviceTip=({시도:'광역권 이동은 출발 시·군·구와 도착 시·군·구를 함께 알려주시면 상담에 도움이 됩니다.',시:'시내와 외곽의 기사 이동 거리가 다를 수 있어 출발 지점을 구체적으로 알려주세요.',군:'읍·면 지역은 기사 복귀 교통편이 제한될 수 있으므로 희망 출발 시간을 미리 알려주세요.',구:'같은 구 안에서도 번화가와 주거지의 출발 여건이 다를 수 있어 상세 주소가 필요합니다.',읍:'읍 소재지와 외곽 마을의 출발 조건이 다를 수 있으므로 도로명주소 또는 인근 건물을 알려주세요.',면:'면 지역은 야간에 기사 접근 및 복귀 이동이 어려울 수 있으므로 사전 상담을 권합니다.',동:'같은 동에서도 건물 출입구나 주차장 위치에 따라 인수 장소가 달라질 수 있습니다.',리:'리 단위 마을은 주소만으로 위치가 모호할 수 있으므로 진입로·주차 위치와 가까운 지점을 알려주세요.'})[r.level]||'출발 위치를 자세히 알려주세요.';
 const siblingList=parent?(childrenByParent.get(parent.slug)||[]).filter(x=>x.slug!==r.slug).slice(0,8):[];
 const localGuide='<section><h2>'+full+' 출발지 확인 안내</h2><p>'+esc(serviceTip)+'</p><p>지역 구분: '+esc(ancestors.map(x=>x.name).join(' → '))+'</p><p>상담 시 출발 주소와 목적지, 희망 시간, 차량 종류를 알려주시면 조건을 확인할 수 있습니다. 실제 배차 가능 여부는 확인 후 안내합니다.</p></section>';
 const bookingSection='<section><h2>'+full+' 대리운전·탁송 예약 · 예상요금 · 빠른배차 안내</h2><h3>'+full+' 예약 방법</h3><p>출발지와 도착지, 이용 날짜와 시간, 차량 종류를 알려주시면 대리운전 또는 탁송 예약 상담을 진행합니다. 인수·인계 장소와 경유지, 장거리·야간 여부도 함께 확인합니다.</p><h3>'+full+' 예상요금 확인</h3><p>예상요금은 실제 도로거리, 이동 시간, 기사 접근·복귀 조건, 차량 상태, 통행료 및 예약 시간에 따라 달라질 수 있습니다. 홈페이지 참고요금 계산기를 이용할 수 있으며, 최종 요금은 상담 후 안내합니다.</p><p><a href="/fare/?from='+encodeURIComponent(fullName)+'&service=taksong">'+full+' 출발 탁송요금 조회 →</a> · <a href="/fare/?from='+encodeURIComponent(fullName)+'&service=daeri">'+full+' 출발 대리운전 요금 조회 →</a></p><h3>'+full+' 빠른배차 문의</h3><p>정확한 출발 주소와 주차 위치, 희망 출발 시각을 알려주시면 배차 가능 여부를 신속히 확인하는 데 도움이 됩니다. 야간·외곽·장거리에서는 기사 수급에 따라 지연될 수 있으며 즉시 배차는 보장되지 않습니다.</p><p><a class="cta" href="tel:18114294">예약·요금·빠른배차 상담 '+PHONE+'</a></p></section>';
 const areaGuide=localAreaGuides[r.name];
 const localAreaSection=areaGuide?'<section><h2>'+full+' 대리운전·탁송 인근 지역 연결 안내</h2><p>'+esc(areaGuide.description)+'</p><p>주요 출발지: '+areaGuide.places.map(esc).join(' · ')+'</p><h3>인근 지역 이동 상담</h3><ul>'+areaGuide.nearby.map(name=>{const dest=regions.find(x=>x.name===name);return '<li>'+(dest?'<a href="'+canonical(dest.slug)+'">'+esc(name)+' 대리운전·탁송</a>':esc(name+' 대리운전·탁송'))+'</li>'}).join('')+'</ul><p>지역별 실제 배차 가능 여부와 요금은 상담 후 확인하며 해당 지역에 기사가 상주한다는 뜻은 아닙니다.</p></section>':'';
 const nearby=siblingList.length?'<section><h2>'+esc(parent.full_name)+'의 다른 지역 안내</h2><ul>'+siblingList.map(x=>'<li><a href="'+canonical(x.slug)+'">'+esc(x.name)+' 대리운전·탁송</a></li>').join('')+'</ul></section>':'';
 const scenarioByLevel={
 시도:[['광역권 장거리 차량 이동','출발 시·군·구와 도착 시·군·구가 확정된 차량 이동은 실제 주행거리뿐 아니라 기사 복귀 동선까지 확인해야 합니다.'],['다른 지역에서 차량 가져오기','중고차 구매·차량 인도처럼 차량 소유자와 인수 장소가 다르면 인수 가능 시간과 인계 담당자를 먼저 확인합니다.']],
 시:[['시내에서 외곽으로 차량 보내기','시내 출발과 외곽 출발은 기사 접근 조건이 다릅니다. 출발 건물과 실제 차량 주차 위치를 함께 알려주세요.'],['장거리 운전 대신 자동차탁송','차량을 직접 장거리 운전하기 어려울 때는 차량 인수 시각과 목적지 인계 가능 시간을 함께 정해야 합니다.']],
 군:[['군 지역 탁송기사 안 잡힐 때','인근 도시에서 기사가 이동해야 하는 경우가 있어 출발시간과 복귀 교통편을 함께 고려해야 합니다.'],['외곽 차량 회수 예약','관광지·산행 출발지 등에 남겨둔 차량을 회수할 때는 정확한 주차 위치와 차량 열쇠 인계 방식을 미리 협의합니다.']],
 구:[['서비스센터 출고 마감 탁송','차량 출고 가능 시간과 인수 담당자, 센터의 차량 인계 절차를 먼저 확인하면 일정 조율에 도움이 됩니다.'],['중고차 매매단지 차량 인수','매매단지의 실제 인수 위치와 출고 가능 시각을 확인하고, 인수 후 도착지 인계 조건을 함께 정합니다.']],
 읍:[['읍내와 외곽마을 탁송요금 차이','같은 읍이라도 차량이 읍내에 있는지 외곽에 있는지에 따라 기사 접근 시간과 이동 조건이 달라질 수 있습니다.'],['새벽 차량 인수 예약','새벽에는 현장 접근과 기사 이동이 어려울 수 있어 정확한 인수 시각과 연락 가능한 담당자를 확인합니다.']],
 면:[['면 지역 탁송 배차가 늦어지는 이유','출발지 주변 기사 위치와 대중교통 복귀 가능 여부가 배차 조건에 영향을 줄 수 있습니다.'],['산행·캠핑 후 차량 회수','차량을 세워둔 주차장과 도착 예정 장소가 다르면 차량 인계 지점과 연락 방법을 사전에 정하는 것이 좋습니다.']],
 동:[['아파트·지하주차장 차량 인수','건물 주소만으로는 차량 위치를 찾기 어려울 수 있으므로 주차 층과 출입 방법을 함께 확인합니다.'],['당일 서비스센터 입출고 탁송','서비스센터 접수·출고 가능 시간과 차량 인계 담당자를 확인한 뒤 배차 일정을 조율합니다.']],
 리:[['마을 안쪽 차량탁송 기사 접근','리 단위 지역은 같은 주소권에서도 진입로가 여러 곳일 수 있어 정확한 주차 위치와 접근 가능한 도로를 확인합니다.'],['외진 곳에서 탁송기사 구하기','기사 이동과 운행 후 복귀에 시간이 필요할 수 있어 출발 날짜·시간을 여유 있게 상담하는 편이 좋습니다.']]
 };
 const scenarios=scenarioByLevel[r.level]||scenarioByLevel.시;
 const scenarioSection='<section><h2>'+full+' 탁송, 이런 상황이라면 어떻게 예약할까요?</h2>'+scenarios.map(([heading,detail])=>'<h3>'+full+' '+esc(heading)+'</h3><p>'+esc(detail)+'</p>').join('')+'<p>상황에 맞는 실제 배차 가능 여부와 요금은 출발지·도착지·차종·희망 시간 확인 후 안내합니다.</p></section>';
 const body=`${breadcrumb}${bookingSection}${remoteRegionGuidance(r)}${localGuide}${localAreaSection}${scenarioSection}<section><h2>${full} 자동차탁송·배차 상담</h2><p>${esc(intro)}</p><p>${context}의 실제 출발 위치에 따라 기사 접근 경로와 배차 조건이 달라질 수 있습니다. 해당 지역의 상주 기사 또는 즉시 배차를 보장하지 않습니다.</p><a class="cta" href="tel:18114294">전화 상담 ${PHONE}</a></section>
 <section><h2>${full} 대리운전 · ${esc(localDaeri)} · ${esc(qualifiedDaeri)}</h2><p>${esc(localDaeri)}는 다른 시·군·구에 같은 지명이 있을 수 있으므로 ${full} 지역을 확인해 상담합니다.</p><h3>${full} 장거리대리운전</h3><p>대리운전 상담 시 정확한 출발지, 목적지, 출발 예정 시각을 알려주세요. 야간·주말 또는 외곽 출발은 기사 이동과 복귀 교통편을 고려해야 합니다. 다른 시·군·구로 이동하는 장거리 운행은 편도 여부와 예상 출발 시간을 함께 확인합니다.</p></section>
 <section><h2>${full} 자동차탁송 · ${short}탁송요금</h2><p>${full} 탁송요금은 단순 직선거리가 아니라 실제 이동 거리, 출발지와 도착지의 접근성, 차량 종류와 운행 상태, 예약 날짜·시간, 통행료, 기사 이동 및 복귀 교통편에 따라 달라질 수 있습니다. 외곽 마을이나 야간 출발은 같은 거리라도 배차 조건이 다를 수 있습니다. 확인되지 않은 고정요금을 표시하지 않으며 출발지·도착지·차종·희망 시간을 확인한 뒤 실제 상담 요금을 안내합니다.</p><h3>${full} 탁송 배차시간·기사 수급</h3><p>배차는 요청 시점에 주변에서 이동할 수 있는 기사와 인수 장소까지의 접근 시간을 함께 확인해야 합니다. 특히 ${context}에서는 시간대와 대중교통·복귀 이동 여건에 따라 배차 소요 시간이 달라질 수 있습니다. 즉시 배차나 상주 기사를 보장하지 않으며, 일정이 정해진 차량 이동은 사전 예약을 권합니다.</p><h3>${full} 탁송 예약 및 차량 인수·인계</h3><p>차량 인수·인계 장소, 도로명주소, 차종, 수동변속기 여부, 운행 가능 상태, 경유지, 통행료 조건과 도착 희망 시간을 준비해 주세요. 서비스센터 입출고, 장거리 차량 이동, 일정이 정해진 차량 회수는 마감 시각도 함께 알려주시면 상담에 도움이 됩니다.</p></section>
 <section><h2>${full} 일일기사·골프장 이동</h2><p>일일기사 이용 시 출발·종료 시각, 대기 시간, 경유지와 왕복 여부를 알려주세요. 골프장 방문이나 지방출장 일정은 도착 희망 시각과 복귀 계획까지 함께 확인하면 좋습니다.</p></section>
 <section><h2>${short} 탁송·대리운전 예약 전 확인사항</h2><p>정확한 도로명주소 또는 인근 위치, 이용 날짜와 시간, 차량 종류, 출발지·도착지, 경유 및 대기 여부를 준비해 주세요. 실제 배차 가능 여부와 요금은 상담 후 확정됩니다.</p></section>
 <section><h2>${full} ${matches.length?'실제 공개 운행정보':'상황별 이용 안내'}</h2>${records}</section>
 ${nearby}
 ${parent?'<section><h2>상위 지역 안내</h2><p><a href="'+canonical(parent.slug)+'">'+esc(parent.full_name)+' 대리운전·탁송</a></p></section>':''}
 ${children.length?'<section><h2>인접 행정 단계의 하위 지역 찾기</h2><ul>'+children.map(x=>'<li><a href="'+canonical(x.slug)+'">'+esc(x.name)+' 지역 안내</a> · <a href="'+servicePath(x,'taksong')+'">'+esc(x.name)+'탁송</a> · <a href="'+servicePath(x,'daeri')+'">'+esc(x.name)+'대리운전</a></li>').join('')+'</ul></section>':''}`;
 const imageUrl="https://"+(process.env.PUBLIC_HOST||"jeongukdaeri.kr")+cardPngPath(r.slug);
 const imageData=JSON.stringify({"@context":"https://schema.org","@type":"ImageObject",contentUrl:imageUrl,url:imageUrl,name:fullName+" 대리운전·자동차탁송 지역 명함",description:fullName+" 스마트전국대리운전 스마트24탁송 상담 명함 1811-4294",width:1200,height:800,encodingFormat:"image/png",representativeOfPage:true}).replace(/</g,"\\u003c");
 return layout(title,intro,`<script type="application/ld+json">${imageData}</script><figure style="margin:15px 0"><a href="tel:18114294" aria-label="${full} 대리운전 탁송 1811-4294 전화 상담"><img src="${cardPngPath(r.slug)}" loading="lazy" decoding="async" alt="${full} 스마트전국대리운전 스마트24탁송 전화 상담 명함 1811-4294" width="1200" height="800" style="width:100%;height:auto;border-radius:12px"></a><figcaption style="text-align:center"><a class="cta" href="tel:18114294">☎ ${PHONE} 전화 상담</a>${dispatchNotice()}</figcaption></figure>`+serviceLinks+regionalIntentNav(r)+body,link(r.slug),'https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr')+cardPngPath(r.slug));
}
// Service-specific, human-readable category pages: no invented dispatch or completion claims.
// Category discovery pages describe service contexts; they do not invent individual Naver Place listings.
const placeCategories=[
 ['펜션','펜션·풀빌라·리조트','숙박시설의 정확한 출입구·주차 위치와 야간 배차 조건을 확인합니다.'],
 ['캠핑장','캠핑장·글램핑장','산간·외곽 진입로와 주차장, 기사 복귀 동선을 확인합니다.'],
 ['관광지','유원지·관광지·계곡','주차장 위치와 성수기 교통통제, 차량 인수 장소를 확인합니다.'],
 ['맛집','맛집·횟집·음식점','식사 장소의 실제 주소와 차량 주차 위치, 귀가 목적지를 확인합니다.'],
 ['골프장','골프장','라운딩 종료 예정 시간과 클럽하우스 픽업 위치를 확인합니다.'],
 ['항구','전국 항구·항만·포구','항구·항만·포구의 차량 인수 위치, 여객선 운항시간, 부두 출입 제한과 기사 접근 동선을 확인합니다. 항구 대리운전·항구 탁송, 항만 대리운전·항만 탁송 상담을 안내합니다.'],
 ['해수욕장','전국 해수욕장·해변','해수욕장·해변의 주차장, 성수기 차량 통제, 야간 귀가 및 장거리 차량 이동을 확인합니다. 해수욕장 대리운전·해수욕장 탁송 상담을 안내합니다.'],
 ['산행','산행 출발지·하산지','종주 출발지·하산지, 셔틀·통제·차키 인계 조건을 확인합니다.'],
 ['자전거','자전거 종주 인증센터','인증센터의 정확한 위치와 라이딩 종료 시각을 확인합니다.'],
 ['행사','지역 축제·주요 행사·행사장','행사 일정과 차량 진입 제한, 임시 주차장을 확인합니다.'],
 ['선거행사','선거 관련 행사장','행사장 접근·차량 이동 상담이며 정당·후보와의 제휴를 뜻하지 않습니다.']
];
function placeCategoryPage(category){
 const [slug,name,detail]=category,host=process.env.PUBLIC_HOST||'jeongukdaeri.kr';
 const body='<section><h2>'+esc(name)+' 대리운전·탁송</h2><p>'+esc(detail)+'</p><p>개별 장소의 네이버 플레이스 등록 여부나 실시간 영업 상태는 확인되지 않았습니다. 공식 제휴 또는 해당 장소 상주기사를 의미하지 않습니다.</p><p>정확한 장소명·주소, 출발지·도착지, 희망 시간을 알려주시면 배차 가능 여부와 요금을 상담합니다.</p><p><a href="/region/">전국 행정구역별 대리운전·탁송 찾기</a> · <a href="/fare/">참고요금 계산</a> · <a href="tel:18114294">상담 '+PHONE+'</a></p></section><section><h2>다른 장소 유형</h2><ul>'+placeCategories.filter(x=>x[0]!==slug).map(x=>'<li><a href="/places/'+encodeURIComponent(x[0])+'/">'+esc(x[1])+' 대리운전·탁송</a></li>').join('')+'</ul></section>';
 return layout(name+' 대리운전·탁송 | 장소별 예약 상담',name+' 대리운전·탁송 상담. '+detail,body,'https://'+host+'/places/'+encodeURIComponent(slug)+'/');
}
function placeCategoryHub(){
 const body='<section><h2>전국 주요 장소별 대리운전·탁송</h2><p>전국 행정구역 페이지와 장소 유형별 상담 안내를 연결합니다. 개별 업체나 행사와의 제휴를 의미하지 않습니다.</p><ul>'+placeCategories.map(x=>'<li><a href="/places/'+encodeURIComponent(x[0])+'/">'+esc(x[1])+' 대리운전·탁송</a></li>').join('')+'</ul><p><a href="/region/">전국 지역 찾기</a></p></section>';
 return layout('전국 장소별 대리운전·탁송','펜션·캠핑장·관광지·맛집·골프장·산행·자전거·행사장 대리운전·탁송',body,'https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr')+'/places/');
}
const vehicleTons=['1톤','1.2톤','2.5톤','3.5톤','4톤','5톤','8.5톤','11톤','25톤'];
const truckTypes=['카고','화물차','메가트럭','윙바디','추레라','추레라헤드','렉카','렉카차','견인차','암롤','암롤트럭','탑차','냉동탑차','덤프트럭','믹서트럭','집게차','크레인','특장차'];
const importBrands=['벤츠','BMW','포르쉐','아우디','폭스바겐','볼보','렉서스','토요타','도요타','테슬라','랜드로버','재규어','포드','링컨','혼다','닛산','미니','캐딜락','마세라티','벤틀리','롤스로이스'];
const domesticBrands=['현대','기아','제네시스','르노코리아','KG모빌리티','쉐보레'];
const vehicleTopics=[
 ...vehicleTons.map(n=>[n+'탁송','차량 톤급별 탁송']),
 ...vehicleTons.map(n=>[n+'윙바디탁송','윙바디 톤급별 탁송']),
 ...truckTypes.map(n=>[n+'탁송','화물차 형태별 탁송']),
 ['전기차탁송','전기차 탁송'],['화물차탁송','화물차 탁송'],
 ...importBrands.map(n=>[n+'탁송','수입차 브랜드 탁송']),
 ...domesticBrands.map(n=>[n+'탁송','국산차 브랜드 탁송']),
 ...importBrands.map(n=>[n+'서비스센터탁송','수입차 서비스센터 탁송']),
 ...domesticBrands.map(n=>[n+'서비스센터탁송','국산차 서비스센터 탁송']),
 ['블루핸즈탁송','현대 블루핸즈 탁송'],['기아오토큐탁송','기아 오토큐 탁송']
];
const vehicleTopicMap=new Map(vehicleTopics.map(([name,category])=>[name,{name,category,slug:Buffer.from(name,'utf8').toString('hex')}]));
function vehicleTopicPath(name){return '/taksong/type/'+vehicleTopicMap.get(name).slug+'/'}
function vehicleTopicPage(topic){
 const name=topic.name,heavy=/톤|카고|화물차|메가트럭|윙바디|추레라|렉카|견인차|암롤|탑차|덤프|믹서|집게차|크레인|특장차/.test(name),center=/서비스센터|블루핸즈|오토큐/.test(name);
 const detail=heavy?'차량의 정확한 톤급, 전장·전고, 적재함·윙바디 형태, 공차·적재 상태, 운행 가능 여부와 운전자 자격 요건을 확인합니다.':'차종과 차량 상태, 출발지·도착지, 보험 적용 범위 및 차량 인수·인계 방법을 확인합니다.';
 const extra=center?'서비스센터 입고·출고 예약 시간과 접수·인계 담당자, 차량 열쇠 및 서류 전달 방법을 확인해야 합니다. 해당 브랜드 또는 센터와 공식 제휴를 의미하지 않습니다.':heavy?'특수 차량은 면허·보험·차량 제원 및 실제 배차 가능 여부를 사전에 확인해야 합니다.':'전기차의 경우 배터리 잔량과 주행 가능 거리 등 차량 상태를 확인할 수 있습니다.';
 const desc=name+' 예약 상담. '+topic.category+' 관련 차량 조건과 출발지·도착지, 기사 배차 및 보험 적용 여부를 확인합니다. '+PHONE;
 const body='<section><h2>'+esc(name)+' 안내</h2><p>'+esc(detail)+'</p><p>'+esc(extra)+'</p><p>모든 차량에 대한 배차를 보장하지 않습니다. 실제 운행 가능 여부와 요금은 차량 및 운행 조건을 확인한 후 안내합니다.</p></section><section><h2>예약·요금 상담</h2><p>출발지, 도착지, 희망 날짜·시간, 정확한 차종과 차량 상태를 알려주세요.</p><p><a href="tel:18114294">대표 상담 '+PHONE+'</a> · <a href="/fare/">참고요금 확인</a></p></section><section><h2>관련 탁송 서비스</h2><p><a href="/taksong/">전국 자동차탁송</a> · <a href="/taksong/types/">차종·서비스센터 탁송 전체 보기</a></p></section>';
 return layout(name+' | '+topic.category+' 예약 상담',desc,body,'https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr')+vehicleTopicPath(name),null);
}
function vehicleTopicsHub(){
 const groups=[...new Set(vehicleTopics.map(x=>x[1]))];
 const editorial='<section id="vehicle-types-original-archive"><h2>승용차·화물차·서비스센터 차량탁송, 무엇이 다를까요?</h2><h3>승용차와 수입차·전기차</h3><p>차량 주행 가능 여부와 키 인수 담당자, 서비스센터 입고·출고 시간 등을 확인합니다. 전기차는 인계 당시 충전 상태와 출발지·도착지 충전 여건을 확인해 주세요. 특정 정비 업체 제휴나 제조사 공식 서비스라는 의미는 아닙니다.</p><h3>화물차와 특장차</h3><p>1톤·3.5톤·5톤 이상 화물차, 윙바디·덤프 등은 차량 크기와 운전 자격, 기사 수급 및 보험 적용 조건을 별도 상담해야 합니다. 운행할 수 없는 차량은 일반 로드탁송이 어려울 수 있습니다.</p><h3>서비스센터·차종별 공개 원문</h3><p><a href="https://blog.naver.com/wjdtnr4757/224431721391" target="_blank" rel="noopener noreferrer">국산차·수입차·화물·특수차량 탁송 공개 글</a> · <a href="https://blog.naver.com/wjdtnr4757/224419673150" target="_blank" rel="noopener noreferrer">기아 오토큐 정비 입고·출고 탁송 안내</a></p><p><a href="/blog/archive/vehicle-taksong/">차종·서비스센터·중고차탁송 블로그 자료실</a> · <a href="/business/used-car/">중고차 매매단지탁송</a> · <a href="/service/long-distance-taksong/">장거리 자동차탁송</a> · <a href="tel:18114294">전국탁송 상담 1811-4294</a></p></section>';
 const body='<section><h2>차종·톤급·서비스센터별 탁송 안내</h2><p>차량 유형별 조건과 기사 배차 가능 여부를 확인하는 상담 안내입니다. 실제 완료 운행이나 공식 서비스센터 제휴를 뜻하지 않습니다.</p></section>'+editorial+groups.map(g=>'<section><h2>'+esc(g)+'</h2><ul>'+vehicleTopics.filter(x=>x[1]===g).map(([name])=>'<li><a href="'+vehicleTopicPath(name)+'">'+esc(name)+'</a></li>').join('')+'</ul></section>').join('');
 return layout('전국 차종별 탁송 · 서비스센터탁송','전기차, 화물차, 윙바디, 수입차·국산차 서비스센터 탁송 안내. '+PHONE,body,'https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr')+'/taksong/types/',null);
}
const sitemapCache=new Map();
const majorRegionNames=['서울특별시','부산광역시','인천광역시','대구광역시','광주광역시','대전광역시','울산광역시','세종특별자치시','경기도','강원특별자치도','충청북도','충청남도','전북특별자치도','전라남도','경상북도','경상남도','제주특별자치도'];
const regionQuickNames=['서울특별시','부산광역시','인천광역시','대구광역시','광주광역시','대전광역시','울산광역시','세종특별자치시','수원시','성남시','고양시','용인시','화성시','평택시','안산시','부천시','김포시','의정부시','남양주시','파주시','강릉시','속초시','원주시','춘천시','태백시','청주시','충주시','천안시','아산시','당진시','서산시','공주시','전주시','군산시','익산시','남원시','목포시','여수시','순천시','광양시','포항시','경주시','구미시','안동시','경산시','창원시','김해시','양산시','진주시','거제시','통영시','제주시','서귀포시'];
const majorRegions=majorRegionNames.map(n=>regions.find(r=>r.full_name===n)).filter(Boolean);
const quickRegions=regionQuickNames.map(n=>regions.find(r=>r.name===n||r.full_name===n)).filter(Boolean);
function regionServiceLinks(items,kind){const label=kind==='taksong'?'탁송':'대리운전';return '<ul class="region-service-links">'+items.map(r=>'<li><a href="'+servicePath(r,kind)+'">'+esc(seoRegionLabel(r)+label)+'</a></li>').join('')+'</ul>'}
function hierarchyServiceLinks(r,kind){const label=kind==='taksong'?'탁송':'대리운전';const parent=r.parent_slug?bySlug.get(r.parent_slug):null;const children=childrenByParent.get(r.slug)||[];return '<section><h2>'+esc(r.name)+' 하위 행정구역 '+label+'</h2>'+(parent?'<p>상위 지역: <a href="'+servicePath(parent,kind)+'">'+esc(parent.full_name)+' '+label+'</a></p>':'')+(children.length?regionServiceLinks(children,kind):'<p>등록된 하위 법정 행정구역이 없습니다.</p>')+'</section>'}

function homepagePriorityLinks(){
 const selected=['부산광역시','대구광역시','인천광역시','강원특별자치도','서울특별시','경기도'];
 const groups=['taksong','daeri'].map(kind=>{
  const label=kind==='taksong'?'자동차탁송':'대리운전';
  const links=selected.map(n=>regions.find(r=>r.full_name===n)).filter(Boolean).map(r=>'<li><a href="'+servicePath(r,kind)+'">'+esc(seoRegionLabel(r)+label)+'</a></li>').join('');
  return '<div><h3>주요 지역 '+label+'</h3><ul>'+links+'</ul></div>';
 }).join('');
 return '<section id="home-priority-regions"><h2>지역별 주요 자동차탁송·대리운전</h2><p>각 지역의 실제 예약 준비 정보와 확인된 운행후기를 찾아보세요. 모든 지역에 상주 기사가 있다는 뜻은 아닙니다.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">'+groups+'</div></section>';
}
function nationwideLinks(){return '<section id="nationwide-service-links" aria-label="전국 지역별 서비스"><h2>전국 지역별 탁송·대리운전 바로가기</h2><p><a href="/fare/routes/">전국 1,000개 구간 예상요금·예약 안내</a></p><p>전국 주요 도시의 개별 안내 페이지로 이동합니다. 실제 기사 배정과 요금은 출발지·목적지·시간에 따라 상담 후 확인합니다.</p><h3>전국 대리운전 지역 안내</h3>'+regionServiceLinks(quickRegions,'daeri')+'<h3>전국 자동차탁송 지역 안내</h3>'+regionServiceLinks(quickRegions,'taksong')+'<p><a href="/taksong/types/">차종·톤급·서비스센터별 탁송 안내</a> · <a href="/region/">전국 읍·면·동 상세 지역 찾기</a></p><p><a href="/taksong/">전국 탁송 지역 전체 보기</a> · <a href="/daeri/">전국 대리운전 지역 전체 보기</a></p></section>'}
const featuredTaksongRoutes=[
 {slug:'busan-gijang-gyeongsan',from:'부산 기장',to:'경산시',keywords:['부산기장경산탁송','기장경산시탁송','부산에서경산탁송','기장군경산자동차탁송']},
 {slug:'daegu-daemyeong-busan',from:'대구 대명동',to:'부산',keywords:['대구대명동부산탁송','대명동부산탁송','대구에서부산탁송','남구대명동부산자동차탁송']}
];
const featuredDaeriRoutes=[
 {slug:'seoul-gangseo-incheon-gyeyang',from:'서울 강서구',to:'인천 계양구',date:'2026-10-19',keywords:['서울강서구인천계양구대리운전','강서구계양구대리운전','서울에서인천대리운전']},
 {slug:'incheon-samsan-goyang-juyeop',from:'인천 삼산동',to:'고양시 주엽동',date:'2026-10-19',keywords:['인천삼산동고양주엽동대리운전','삼산동주엽동대리운전','인천고양대리운전']},
 {slug:'changwon-woryeong-busan-busanjin',from:'창원시 월영동',to:'부산 부산진구',date:'2026-10-19',keywords:['창원월영동부산진구대리운전','창원부산대리운전','월영동부산대리운전']},
 {slug:'gwangju-chowol-gonjiam',from:'경기 광주시 초월읍',to:'경기 광주시 곤지암읍',date:'2026-10-18',keywords:['광주초월읍곤지암읍대리운전','초월곤지암대리운전','경기광주대리운전']}
];
function featuredDaeriRoutePage(route){
 const host=process.env.PUBLIC_HOST||'jeongukdaeri.kr';
 const title=route.from+'에서 '+route.to+' 대리운전 | '+route.keywords[0];
 const desc=route.from+'에서 '+route.to+'까지 실제 완료된 대리운전 구간 안내. 지역별 예약 상담과 예상요금 조회.';
 const related=featuredDaeriRoutes.filter(x=>x.slug!==route.slug).map(x=>'<li><a href="/daeri/route/'+x.slug+'/">'+esc(x.from+' → '+x.to+' 대리운전')+'</a></li>').join('');
 const body='<section><h2>'+esc(route.from+' → '+route.to+' 대리운전')+'</h2><p>'+esc(route.from)+'에서 '+esc(route.to)+'까지 대리운전 운행을 완료한 구간입니다. 고객 정보와 미제공 운행 조건은 공개하지 않습니다.</p><p><a href="/fare/?from='+encodeURIComponent(route.from)+'&to='+encodeURIComponent(route.to)+'&service=daeri">예상요금 조회</a> · <a href="tel:18114294">전화 상담 1811-4294</a></p></section><section><h2>출발지·도착지 대리운전 검색 안내</h2><p>'+esc(route.keywords.join(' · '))+'</p><p>대리운전은 고객 차량을 기사가 운전하는 서비스입니다. 기사 접근과 복귀 동선, 출발 시간, 운행 거리에 따라 상담 조건이 달라질 수 있습니다.</p></section><section><h2>다른 실제 대리운전 구간</h2><ul>'+related+'</ul><p><a href="/daeri/">전국 대리운전 안내</a></p></section>';
 return layout(title,desc,body,'https://'+host+'/daeri/route/'+route.slug+'/',null);
}
function featuredTaksongRoutePage(route){
 const host=process.env.PUBLIC_HOST||'jeongukdaeri.kr';
 const title=route.from+'에서 '+route.to+' 탁송 | '+route.keywords[0];
 const desc=route.from+' 출발 '+route.to+' 도착 차량탁송 안내. 실제 운행 구간을 바탕으로 출발·도착 지역과 차량 인수·인계 및 예상요금을 확인합니다.';
 const related=featuredTaksongRoutes.filter(x=>x.slug!==route.slug).map(x=>'<li><a href="/taksong/route/'+x.slug+'/">'+esc(x.from+' → '+x.to+' 탁송')+'</a></li>').join('');
 const body='<section><h2>'+esc(route.from+' → '+route.to+' 자동차탁송')+'</h2><p>실제 운행 구간으로 알려주신 '+esc(route.from+'에서 '+route.to)+'까지의 탁송 안내입니다. 운행 요금·차종·소요시간은 제공되지 않아 기재하지 않습니다.</p><p><a href="/fare/?from='+encodeURIComponent(route.from)+'&to='+encodeURIComponent(route.to)+'&service=taksong">이 구간 예상요금 조회</a> · <a href="tel:18114294">전화 상담 1811-4294</a></p></section><section><h2>구간별 검색 안내</h2><p>'+esc(route.keywords.join(' · '))+'</p><p>탁송은 차량을 출발지에서 인수하여 목적지에 인계하는 서비스입니다. 차량 종류와 인수·인계 위치, 운행 일정에 따라 상담 조건이 달라집니다.</p></section><section><h2>다른 실제 구간 안내</h2><ul>'+related+'</ul><p><a href="/taksong/">전국 탁송 지역 안내</a></p></section>';
 return layout(title,desc,body,'https://'+host+'/taksong/route/'+route.slug+'/',null);
}
function priorityRegionLinks(kind){
 const label=kind==='daeri'?'대리운전':'탁송';
 const items=priorityRegionalPages.filter(p=>p.kind===kind).map(p=>{
  const region=regions.find(r=>r.full_name===p.region);
  // Search-friendly locality labels belong on links to the existing canonical region pages.
  const anchor=kind==='daeri'?seoRegionLabel(region)+'대리운전':p.region+' '+label;
  return '<li><a href="'+servicePath(region,kind)+'" data-region="'+esc(p.region)+'">'+esc(anchor)+'</a> · '+esc(p.topic)+'</li>';
 }).join('');
 const intro=kind==='daeri'?'출발할 지역을 선택해 주차장 위치, 장거리·골프장 이용 조건과 예약 준비사항을 확인하세요. 실제 배차 가능 여부는 상담 시 확정합니다.':'지역별 차량 인수·인계 조건을 구분해 안내합니다. 실제 완료 운행은 확인된 기록만 게시하며 모든 지역에 기사가 상주하는 것은 아닙니다.';
 return '<section id="priority-regions"><h2>'+(kind==='daeri'?'전국 주요 지역 대리운전 예약 안내':'실제 지역 정보 중심 탁송 우선 안내')+'</h2><p>'+intro+'</p><ul>'+items+'</ul></section>';
}
function serviceHub(kind){
 const label=kind==='taksong'?'탁송':'대리운전',host=process.env.PUBLIC_HOST||'jeongukdaeri.kr';
 const isT=kind==='taksong';
 const featuredLinks='<section><h2>실제 운행 구간별 '+label+' 안내</h2><ul>'+(isT?featuredTaksongRoutes.map(x=>'<li><a href="/taksong/route/'+x.slug+'/">'+esc(x.from+' → '+x.to+' 탁송')+'</a></li>'):featuredDaeriRoutes.map(x=>'<li><a href="/daeri/route/'+x.slug+'/">'+esc(x.from+' → '+x.to+' 대리운전')+'</a></li>')).join('')+'</ul></section>';
 const intro=isT?'자동차탁송은 고객이 지정한 장소에서 차량을 인수하여 목적지로 이동시키는 서비스입니다. 장거리 차량 이동, 중고차 인도, 서비스센터 입출고 등 이용 목적에 따라 차량 인수·인계 조건을 먼저 확인합니다.':'대리운전은 고객의 차량을 기사가 운전하는 서비스입니다. 장거리 이동, 골프장 이동, 야간 운전 등 상황에 따라 출발 시간과 기사 배차·복귀 조건을 확인합니다.';
 const faq=isT?[
 ['탁송요금은 어떻게 결정되나요?','출발지와 도착지의 실제 도로거리, 차량 종류, 운행 시간대, 기사 접근·복귀 교통편, 통행료 및 인수·인계 조건을 종합하여 상담합니다. 홈페이지 계산 결과는 참고요금이며 확정 금액이 아닙니다.'],
 ['장거리탁송은 미리 예약해야 하나요?','장거리나 외곽 지역 출발은 기사 이동 및 복귀 조건에 따라 배차가 지연될 수 있습니다. 출발 희망 시각과 인계 가능 시간을 정해 미리 상담하는 것이 좋습니다.'],
 ['차량 인수할 때 무엇을 준비하나요?','차량 위치, 차종, 키 전달 방법, 인수 담당자 연락처, 목적지 인계 장소를 확인합니다. 주차장 출입이나 출고 마감 시간이 있다면 사전에 알려주세요.'],
 ['탁송과 대리운전은 어떻게 다른가요?','탁송은 차량을 지정된 목적지로 이동시키는 서비스이며, 대리운전은 고객 차량의 운전을 대신하는 서비스입니다. 고객 동승 여부와 운행 목적에 맞는 서비스로 상담하세요.']
 ]:[
 ['대리운전 요금은 어떻게 정해지나요?','출발지·도착지, 이용 시간, 도로거리, 기사 수급과 복귀 여건에 따라 달라집니다. 계산기의 금액은 참고용이며 실제 배차 가능 여부와 최종 요금은 상담으로 확인합니다.'],
 ['장거리대리운전도 가능한가요?','전국 장거리 이동을 상담할 수 있습니다. 장거리 운행은 기사 복귀 교통편과 출발 시각을 함께 확인해야 하므로 사전 예약을 권합니다.'],
 ['골프장 출발도 예약할 수 있나요?','골프장 위치와 라운딩 종료 예정 시각, 도착지, 차량 종류를 알려주시면 기사 배차 가능 여부를 확인합니다. 외곽 골프장은 사전 상담이 도움이 됩니다.'],
 ['야간에 바로 배차되나요?','시간대와 지역의 기사 수급에 따라 달라집니다. 24시 상담 안내가 즉시 배차 보장을 의미하지는 않습니다.']
 ];
 const faqHtml='<section><h2>전국 '+label+' 예약 전 자주 묻는 질문</h2>'+faq.map(([q,a])=>'<h3>'+esc(q)+'</h3><p>'+esc(a)+'</p>').join('')+'</section>';
 const customerJourney=isT?'':'<section aria-label="전국대리운전 빠른 안내"><h2>필요한 대리운전 서비스를 선택하세요</h2><p>장거리 귀가, 골프장 이동, 일일기사와 법인 이용 목적에 맞춰 안내합니다. 출발지와 도착지, 희망 시간을 알려주시면 요금과 배차 가능 여부를 확인합니다.</p><p><a href="/service/daeri/">일반·장거리 대리운전</a> · <a href="/service/golf/">골프장 대리운전</a> · <a href="/service/daily-driver/">일일기사</a> · <a href="/service/corporate/">법인 대리운전</a></p><p><a class="cta" href="/fare/?service=daeri">대리운전 예상요금 조회</a> · <a href="tel:18114294">예약 상담 1811-4294</a> · <a href="/reviews/">실제 운행기록 보기</a></p><p>예상요금은 참고용입니다. 날짜·시간, 기사 접근과 복귀 여건에 따라 실제 요금과 배차 가능 여부가 달라집니다.</p></section><section><h2>전국대리운전 예약 방법</h2><ol><li>출발지와 도착지, 이용 날짜와 시간을 정합니다.</li><li>예상요금을 조회하고 차종과 경유지 등 필요한 내용을 준비합니다.</li><li>1811-4294로 상담해 최종 요금과 기사 배차 가능 여부를 확인한 후 예약합니다.</li></ol><p>장거리나 외곽 골프장은 미리 예약하면 배차 조건을 확인하는 데 도움이 됩니다. 긴급 호출은 지역과 시간에 따라 요금이 높아지거나 배차가 늦어질 수 있습니다.</p></section>';
 const nationalDriverGuide=isT?'':'<section id="national-driver-guide"><h2>전국대리운전 이용 목적별 준비사항</h2><h3>일반·심야 대리운전</h3><p>식사나 모임 후 고객의 차량으로 이동할 때는 출발지 주차장 위치와 도착 주소, 출발 예정 시각을 알려주세요. 심야에는 지역별 기사 접근 여건이 달라 즉시 배차를 보장할 수 없습니다.</p><h3>장거리 대리운전</h3><p>서울·수도권과 지방을 오가는 이동은 도착지까지의 실제 주행 조건뿐 아니라 운행을 마친 기사의 복귀 교통편도 중요합니다. 날짜·시간·경유지를 확정하여 사전에 상담하는 것이 좋습니다.</p><h3>골프장 대리운전과 일일기사</h3><p>라운딩 종료 후 편도로 이동하는 대리운전과 출발부터 복귀까지 동행하는 일일기사는 다른 일정입니다. 왕복·대기 시간, 식대·통행료 등 추가 조건을 구분하여 예약 상담을 요청해주세요.</p><p>고객의 차량을 대신 운전하는 대리운전과 차량만 인수·인계하는 <a href="/taksong/">자동차탁송</a>은 이용 목적이 다릅니다. 최종 요금과 배차 가능 여부는 <a href="tel:18114294">1811-4294 상담</a>으로 확인합니다.</p></section>';
 const regionalStories=isT?'':'<section id="regional-driver-stories"><h2>전국대리운전 지역별 예약｜서울·경기·인천·부산·대구·강원·충청·전라</h2><p>지역명만 나열하지 않고 이용 목적에 따른 출발지 위치, 기사 접근 및 복귀 조건을 구분합니다. 모든 지역의 기사 상주나 즉시 배차, 완료 실적을 뜻하지 않습니다.</p><h3>서울·경기·인천대리운전｜강남·서초·송파·판교·용인·송도</h3><p>강남·서초 회식 후 귀가와 판교·용인 골프장 이동은 출발 건물, 주차장, 경유 및 왕복 대기를 구분합니다. 인천 송도와 계양에서 수도권으로 이동할 때는 목적지와 기사 복귀 교통편도 확인합니다. <a href="/daeri/seoul/">서울대리운전</a> · <a href="/daeri/incheon/">인천대리운전</a> · <a href="/daeri/gyeonggi/yongin-si/">용인대리운전</a></p><h3>강원도대리운전｜둔내·횡성·평창·진부·태백·영월·정선·속초·강릉</h3><p>둔내·횡성·평창·진부의 골프장·관광지 출발은 차량이 있는 장소와 희망 출발 시간을, 태백·영월·정선에서는 산간·심야 기사 수급과 복귀 여건을 확인합니다. 속초·강릉에서 수도권으로 향하는 장거리 운행도 같은 기준으로 상담합니다. <a href="/daeri/gangwon/">강원도대리운전</a></p><h3>부산·대구·경상대리운전｜해운대·기장·범어동·김해·창원</h3><p>부산 해운대·기장의 장거리 이동은 도착지와 복귀편을, 대구 범어동·수성구 골프장 왕복은 운행 시간과 현장 대기 시간을 각각 확인합니다. 김해·창원에서 다른 시·도로 이동할 때에도 정확한 주차 위치를 알려주세요. <a href="/daeri/busan/">부산대리운전</a> · <a href="/daeri/daegu/">대구대리운전</a></p><h3>충청·전라 대리운전｜세종·천안·아산·청주·광주·전주·여수</h3><p>충청권 업무·골프 일정과 전라권 시외 장거리 귀가는 출발 시간과 도착지, 경유지, 배차 가능 여부를 구분해 상담합니다. <a href="/region/?service=daeri">전국 지역 찾기</a></p><p><a href="/service/corporate/">법인대리운전</a> · <a href="/service/golf/">골프장대리운전</a> · <a href="/service/daily-driver/">일일기사</a> · <a href="tel:18114294">상담 1811-4294</a></p></section>';
 const longDistanceDaeriSourceCases=[
  {date:'2026-10-23',departure:'해운대중동',destination:'평택신장동'},
  {date:'2026-10-23',departure:'고흥군',destination:'종로숭인동'},
  {date:'2026-10-19',departure:'창원시 월영동',destination:'부산 부산진구'}
 ];
 const longDistanceDaeriExamples=isT?'':(()=>{
  const completed=longDistanceDaeriSourceCases.map(ref=>publicRides.find(x=>x.service==='daeri'&&x.verified===true&&x.status==='completed'&&x.date===ref.date&&x.departure===ref.departure&&x.destination===ref.destination&&x.fare));
  const items=completed.filter(Boolean).map(x=>'<li><a href="'+rideUrl(x)+'">'+esc(x.date+' '+x.departure+' → '+x.destination+' 장거리대리운전 운행완료')+'</a> · 당시 기록 요금 '+esc(x.fare)+'</li>').join('');
  return '<section id="long-distance-daeri-verified"><h2>장거리대리운전 실제 운행완료 사례</h2><p>고객이 확인한 완료 운행기록 중 지역 간 이동 사례입니다. 아래 요금은 해당 운행 날짜와 배차 조건에서 기록된 과거 금액이며 지금도 동일한 금액으로 배차된다는 의미가 아닙니다.</p><ul>'+items+'</ul><h3>장거리 운행 예약 전 확인사항</h3><ol><li>출발지의 정확한 주차 위치와 도착지 주소를 알려주세요.</li><li>희망 출발 날짜·시각, 경유지 및 도착 희망 시간을 확인하세요.</li><li>차량 종류와 대기·통행료 등 추가 조건을 미리 전달해주세요.</li><li>운행 후 기사 복귀 교통편과 지역별 기사 수급을 확인하고 최종 요금·배차 여부를 상담으로 확정해주세요.</li></ol><p><a href="/fare/?service=daeri">장거리대리운전 예상요금 조회</a> · <a href="tel:18114294">예약 상담 1811-4294</a></p></section>';
 })();
 const earlierDaeriPosts=isT?'':'<section id="national-driver-source-links"><h2>기존 장거리·법인대리운전 안내 자료</h2><p>번개탁송대리운전 네이버 블로그에 2026년 8월 25일 이전 게시된 자료입니다. 게시 당시 내용과 현재 상담 조건은 다를 수 있으며, 현재 스마트24 홈페이지 상담은 1811-4294입니다.</p><ul><li><a href="https://blog.naver.com/wjdtnr4757/224388328571" target="_blank" rel="noopener noreferrer">8월 24일 서울·부산·대구·광주·완도 장거리대리운전 예약 안내</a></li><li><a href="https://blog.naver.com/wjdtnr4757/224381997772" target="_blank" rel="noopener noreferrer">8월 18일 지방 장거리대리운전 요금·예약 시 확인사항</a></li><li><a href="https://blog.naver.com/wjdtnr4757/224371958009" target="_blank" rel="noopener noreferrer">8월 8일 법인대리운전 법인카드 등록 안내</a></li></ul></section>';
 const operationalNotice=isT?'<section id="taksong-24-hour-and-weather"><h2>24시탁송 · 전국 24시간 차량 이동 상담 안내</h2><p><strong>24시탁송</strong>은 야간·새벽을 포함해 전국 차량탁송을 상담하는 서비스입니다. 상담 접수와 실제 기사 배정·출발은 다르며, 모든 지역에 기사가 상주하거나 즉시 배차된다는 뜻은 아닙니다.</p><p><strong>월요일이나 악천후, 특히 지방·산간·해안 등 외곽에서</strong> 탁송기사 배정 및 도착이 지연되거나 안전상 운행이 어려울 수 있습니다. 폭우·폭설·강풍·도로 통제 시에는 출발 시간과 실제 배차 가능 여부를 먼저 확인해 주세요. 모든 월요일에 지연되는 것은 아닙니다.</p><p><a href="tel:18114294">24시탁송 상담 1811-4294</a> · <a href="/fare/?service=taksong">예상요금 확인</a></p></section>':'<section id="daeri-weather-notice"><h2>전국대리운전 예약 안내｜월요일·악천후 배차 지연 가능</h2><p>월요일 특정 시간대와 비·눈·강풍 등 악천후에는 특히 지방 외곽, 해안·산간·골프장 출발 대리운전의 기사 배정이나 도착이 지연될 수 있습니다. 월요일마다 지연되는 것은 아니며 실제 기사 수급·도로 상황에 따라 달라집니다.</p><p><a href="tel:18114294">대리운전 상담 1811-4294</a></p></section>';
 const curatedArchiveHub=isT?'<section id="national-taksong-blog-archive"><h2>전국 자동차탁송 지역별 공개 블로그 글 찾기</h2><p>지역·서비스별 네이버 블로그 원문을 확인할 수 있습니다. 서울·인천 도심 출고, 강원 산간·해안, 항만 선적, 서비스센터·중고차·렌트카 이동은 차량 인수 방법과 기사 복귀 조건이 다릅니다. 개별 운행완료 여부와 현재 요금은 공개 제목만으로 판단하지 않습니다.</p><p><a href="/blog/archive/capital-taksong/">서울·경기·인천탁송 원문</a> · <a href="/blog/archive/gangwon-taksong/">강원도탁송 원문</a> · <a href="/blog/archive/gyeongsang-taksong/">경상탁송 원문</a> · <a href="/blog/archive/jeolla-taksong/">전라탁송 원문</a> · <a href="/blog/archive/chungcheong-taksong/">충청탁송 원문</a> · <a href="/blog/archive/vehicle-taksong/">중고차·서비스센터탁송 원문</a> · <a href="/blog/archive/mountain-cycle/">종주 산행·자전거 차량회수</a></p><p>제주도 차량 선적과 항구 인계는 <a href="/blog/archive/jeju-taksong/">제주탁송 자료실</a>에서 별도로 확인하세요. 제주탁송 전용 상담은 <a href="tel:18775245">1877-5245</a>이며, 다른 전국 차량탁송 상담은 <a href="tel:18114294">1811-4294</a>입니다.</p></section>':'<section id="national-daeri-blog-archive"><h2>전국 대리운전 실제 원문·골프장 일일기사 비교</h2><p>일반 심야 귀가, 시·도 간 장거리 대리운전, 골프장 편도 대리운전과 왕복·대기 포함 일일기사는 예약 방식이 다릅니다. 공개 블로그 글은 당시 조건을 참고하는 자료이며 현재 배차·요금은 상담으로 확정합니다.</p><p><a href="/blog/archive/general-daeri/">전국·장거리대리운전 원문</a> · <a href="/blog/archive/golf-corporate-daily/">골프장·법인·일일기사 원문</a> · <a href="/service/golf/">골프장 편도 예약</a> · <a href="/service/daily-driver/">왕복 일일기사 예약</a> · <a href="/reviews/history/?kind=daeri">완료 운행기록</a></p></section>';
 const body=operationalNotice+curatedArchiveHub+(isT?'':daeriBlogEditorial.national(majorRegions,servicePath,esc))+nationalDriverGuide+regionalStories+priorityRegionLinks(kind)+'<section><h2>출발지·도착지별 '+label+' 찾기</h2><p><a href="/route-search/?service='+kind+'">전국 시·군·구·읍·면·동·리 구간 검색</a> · <a href="/route-search/?from=%EB%8C%80%EA%B5%AC&amp;service='+kind+'">대구에서 전국 지역 '+label+'</a></p></section>'+serviceJourneyLinks(kind)+customerJourney+'<section><h2>전국 '+label+' 예약·요금·지역별 안내</h2><p>'+esc(intro)+'</p><p>전국 지역별 기사 상주나 즉시 배차를 보장하지 않으며, 실제 가능 여부는 상담 시 확인합니다.</p><p><a class="cta" href="/fare/?service='+kind+'">'+label+' 예상요금 계산하기</a> · <a href="tel:18114294">대표 상담 '+PHONE+'</a></p></section>'+
 '<section id="reservation-guide"><h2>'+label+' 예약할 때 필요한 정보</h2><ol><li>차량이 있는 출발지의 정확한 주소와 주차 위치</li><li>도착지 주소와 희망 출발 날짜·시각</li><li>차종과 차량 인수·인계 조건</li><li>경유지, 통행료 및 기타 요청사항</li></ol><p>거리만으로 최종 요금을 확정하지 않으며, 기사 접근·복귀 여건을 확인합니다.</p></section>'+
 bookingGuide(kind)+faqHtml+longDistanceDaeriExamples+earlierDaeriPosts+featuredLinks+
 (isT?'<section><h2>차종·서비스별 자동차탁송</h2><p>국산차·수입차·전기차·화물차 및 서비스센터 입출고 등 차량 종류와 이용 목적에 따라 확인할 사항이 다릅니다.</p><p><a href="/taksong/types/">차종별 탁송과 서비스센터탁송 살펴보기</a></p></section>':'<section><h2>장거리·골프장 대리운전</h2><p>일반 시내 이동과 달리 장거리·골프장 출발은 운행 후 기사 복귀 여건이 배차에 영향을 줄 수 있습니다. 출발 예정 시각과 목적지를 함께 알려주세요.</p></section>')+
 '<section><h2>전국 시·도 '+label+'</h2>'+regionServiceLinks(majorRegions,kind)+'</section>'+
 '<section><h2>주요 지역 '+label+'</h2>'+regionServiceLinks(quickRegions,kind)+'</section>'+
 '<section><h2>전국 지역 검색</h2><form action="/region/" method="get"><input type="hidden" name="service" value="'+kind+'"><label>지역명 <input name="q" placeholder="예: 서울, 부산, 인천"></label><button>지역 찾기</button></form><p>지역 검색 후 '+label+' 전용 페이지를 선택할 수 있습니다.</p></section>';
 const hubImage='/assets/smart24-'+kind+'-brand.png';
 const hubCard=serviceVehicleGallery(kind);
 return layout(isT?'전국 '+label+' 예약·요금 | 스마트24':'전국대리운전 예약·예상요금 | 장거리·골프·일일기사',isT?'전국 '+label+' 예약과 예상요금, 장거리 운행 및 지역별 배차 조건 안내. '+PHONE:'전국대리운전 예상요금 조회와 예약 상담. 장거리·골프장·일일기사·법인 서비스와 실제 운행기록을 확인하세요. '+PHONE,body.replace('</section>','</section>'+hubCard),'https://'+host+'/'+kind+'/','https://'+host+hubImage);
}
function regionKeywordLabel(r,kind,short=false){
 const parts=r.full_name.split(' ');
 const location=short?r.name:parts.length>1?parts.slice(1).join(''):r.name;
 return location+(kind==='daeri'?'대리운전':'탁송');
}
function regionKeywordDirectory(kind,page=1){
 const host=process.env.PUBLIC_HOST||'jeongukdaeri.kr',label=kind==='daeri'?'대리운전':'탁송';
 const size=250,total=Math.ceil(regions.length/size),current=Math.min(total,Math.max(1,Number(page)||1));
 const items=regions.slice((current-1)*size,current*size);
 const links=items.map(r=>'<li><a href="'+servicePath(r,kind)+'">'+esc(regionKeywordLabel(r,kind))+'</a></li>').join('');
 const nav='<p>'+(current>1?'<a href="/keywords/'+kind+'/?page='+(current-1)+'">이전</a> · ':'')+'페이지 '+current+' / '+total+(current<total?' · <a href="/keywords/'+kind+'/?page='+(current+1)+'">다음</a>':'')+'</p>';
 const body='<section><h2>전국 행정구역 '+label+' 키워드</h2><p>지역명과 '+label+'을 조합한 목록입니다. 키워드를 클릭하면 스마트24 홈페이지로 이동합니다. 실제 서비스 가능 여부와 요금은 별도 확인이 필요합니다.</p><p><a href="/keywords/taksong/">탁송 키워드</a> · <a href="/keywords/daeri/">대리운전 키워드</a></p>'+nav+'<ul>'+links+'</ul>'+nav+'</section>';
 return layout('전국 '+label+' 키워드 목록','전국 지역별 '+label+' 키워드 목록',body,'https://'+host+'/keywords/'+kind+'/?page='+current,null);
}
function routeKeywords(from,to,kind){
 const a=String(from||'').trim(),b=String(to||'').trim(),service=kind==='daeri'?'대리운전':'탁송';
 if(!a||!b||a.length>80||b.length>80)return [];
 return [...new Set([a+'에서 '+b+' '+service,(a+b+service).replace(/\s+/g,''),a+' → '+b+' '+service+' 요금'])];
}
function routeKeywordSearchPage(from,to,kind,page=1){
 const host=process.env.PUBLIC_HOST||'jeongukdaeri.kr',service=kind==='daeri'?'대리운전':'탁송';
 from=String(from).trim().slice(0,80);to=String(to).trim().slice(0,80);
 const matches=regions.filter(r=>[r.full_name,r.name,...regionAliases(r)].some(n=>compact(n)===compact(from)));
 const origin=matches.length===1?matches[0]:(matches.length===0?routeKeywordPages.resolveOrigin(from):null);
 const originName=origin?(origin.address||origin.full_name):from,originLabel=origin?(origin.kind==='airport'?origin.name:seoRegionLabel(origin)):from;
 const destinations=from&&!to?regions.filter(r=>!origin||r.slug!==origin.slug):[];
 const total=Math.max(1,Math.ceil(destinations.length/100)),current=Math.min(total,Math.max(1,parseInt(page,10)||1));
 const items=to?[{full_name:to,name:to}]:destinations.slice((current-1)*100,current*100);
 const navUrl=n=>'/route-search/?'+new URLSearchParams({from:originName,service:kind,page:String(n)}).toString();
 const nav=destinations.length?'<p>'+destinations.length.toLocaleString('ko-KR')+'개 도착지 · '+current+' / '+total+'페이지 '+(current>1?'<a href="'+esc(navUrl(current-1))+'">이전</a> · ':'')+(current<total?'<a href="'+esc(navUrl(current+1))+'">다음</a>':'')+'</p>':'';
 const choices=matches.length>1?'<section><h2>출발 지역을 구분해 주세요</h2><ul>'+matches.map(r=>'<li><a href="'+esc('/route-search/?'+new URLSearchParams({from:r.full_name,to,service:kind}))+'">'+esc(r.full_name)+'</a></li>').join('')+'</ul></section>':'';
 const rows=matches.length>1?'':items.map(r=>{
  const label=r.slug?seoRegionLabel(r):r.name,terms=routeKeywords(originLabel,label,kind);
  const fare='/fare/?'+new URLSearchParams({from:originName,to:r.full_name,service:kind,auto:'1'}).toString();
  const destinationMatches=r.slug?[r]:regions.filter(x=>[x.full_name,x.name,...regionAliases(x)].some(alias=>compact(alias)===compact(r.name)));
  const dest=destinationMatches.length===1?destinationMatches[0]:(destinationMatches.length===0?routeKeywordPages.resolveOrigin(r.name):null);
  const target=origin&&dest&&origin.slug!==dest.slug?routeKeywordPages.path(origin,dest,kind):fare;
  return '<li><a href="'+esc(target)+'">'+esc(terms[0]||'')+'</a><p>'+esc(terms.slice(1).join(' · '))+'</p><p>출발: '+esc(originName)+' / 도착: '+esc(r.full_name)+'</p></li>';
 }).join('');
 const examples=[['부산','인천'],['기장군','대구'],['대구',''],['서울',''],['김해공항','서울'],['김해공항',''],['강릉','부산']];
 const body='<section><h2>출발지에서 전국 지역으로 '+service+'</h2><form action="/route-search/" method="get"><label>출발지 <input name="from" maxlength="80" required value="'+esc(from)+'" placeholder="예: 대구, 부산, 기장군"></label> <label>도착지 <input name="to" maxlength="80" value="'+esc(to)+'" placeholder="비우면 전국 지역 전체"></label> <label>서비스 <select name="service"><option value="taksong"'+(kind==='taksong'?' selected':'')+'>탁송</option><option value="daeri"'+(kind==='daeri'?' selected':'')+'>대리운전</option></select></label> <button type="submit">구간 찾기</button></form><p>시·도, 시·군·구, 읍·면·동·리 출발·도착 조합입니다. 구간을 선택하면 해당 구간의 예약 안내로 연결되고 요금계산기에서 주소를 확인할 수 있습니다. 실제 운행 사례나 확정 요금이 아니며 배차 가능 여부는 상담으로 확인합니다.</p><ul>'+examples.map(([a,b])=>'<li><a href="'+esc('/route-search/?'+new URLSearchParams({from:a,to:b,service:kind}))+'">'+esc(a+'에서 '+(b||'전국 지역')+' '+service)+'</a></li>').join('')+'</ul></section>'+choices+nav+(rows?'<section><h2>'+esc(originLabel)+' 출발 '+service+' 구간</h2><ul>'+rows+'</ul></section>':'')+nav;
 return layout('전국 '+service+' 출발·도착 구간 찾기','지역별 출발지와 도착지를 조합해 예상요금을 조회하세요.',body,'https://'+host+'/route-search/',null);
}
function recruitmentPage(kind,region){
 const isT=kind==='taksong',label=isT?'탁송기사':'대리운전기사',area=region?region.full_name:'전국',base='https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr');
 const url='/recruit/'+kind+'/'+(region?region.slug+'/':'');
 const title=region?area+' '+label+' 모집':isT?'전국 탁송기사 모집':'전국 대리기사 모집';
 const desc=region?area+' '+label+' 지원 상담. 운행지역·경력·등록 조건 확인. 1811-4294.':isT?'전국 탁송기사 모집 안내. 차량 인수·인계 및 운행지역·기사 등록 조건 상담. 1811-4294.':'전국 대리기사 모집 안내. 운행 시간·지역·경력과 기사 등록 조건 상담. 1811-4294.';
 const provinces=regions.filter(r=>r.level==='시도').slice(0,20);
 const regionLinks=!region?'<section><h2>지역별 기사 모집 안내</h2><ul>'+provinces.map(r=>'<li><a href="/recruit/'+kind+'/'+r.slug+'/">'+esc(r.full_name)+' '+label+' 모집</a></li>').join('')+'</ul></section>':'';
 const jobFocus=isT?'<section><h2>탁송기사 지원 시 안내할 사항</h2><p>차량을 인수하고 목적지에서 인계하는 로드탁송 업무를 희망하는 경우, 가능한 차종과 지역·거리, 이동 및 복귀 가능 시간, 차량 키와 인수·인계 확인 경험 등을 알려주세요. 현재 가능한 업무·등록 및 보험 적용 조건은 상담으로 확인하며 근무 조건이나 수입을 보장하지 않습니다.</p></section>':'<section><h2>대리운전기사 지원 시 안내할 사항</h2><p>대리운전 지원 상담 시 주 운행 지역, 야간·주말 등 가능한 시간, 운전 경력과 장거리 운행 가능 여부를 알려주세요. 배차 운영 방식, 등록 및 보험 적용 조건은 상담을 통해 확인합니다. 특정 시간의 일감이나 수입을 보장하지 않습니다.</p></section>';
 const pageSchema=JSON.stringify({'@context':'https://schema.org','@type':'WebPage',name:title,url:base+url,description:desc,isPartOf:{'@type':'WebSite',name:BRAND,url:base+'/'}}).replace(/</g,'\\u003c');
 const body='<script type="application/ld+json">'+pageSchema+'</script><h1>'+esc(area)+' '+label+' 모집</h1><figure><a href="tel:18114294"><img src="/assets/smart24-business-card-inline-v2.png" alt="스마트24탁송 전국 탁송 대리운전 기사 모집 상담 명함 1811-4294" width="1200" height="800" loading="eager" fetchpriority="high" style="width:100%;height:auto;max-width:720px"></a><figcaption>기사 모집 상담 1811-4294</figcaption></figure><p>'+esc(desc)+'</p><section><h2>지원 및 상담</h2><p>전국에서 '+label+' 지원 상담을 받고 있습니다. 실제 배차 가능 지역, 운행 시간, 기사 등록 절차 및 필요한 확인 사항은 전화로 안내합니다. 특정 지역의 상시 배차나 수입을 보장하지 않습니다.</p><p><a href="tel:18114294">기사 지원 상담 1811-4294</a></p></section><section><h2>지원 전 확인할 사항</h2><p>주로 운행할 지역, 운행 가능한 요일과 시간, 장거리 이동 가능 여부, 운전 경력 등을 상담 시 알려주세요. 보험·등록 및 업무 조건은 상담 과정에서 확인합니다.</p></section>'+jobFocus+regionLinks+'<section><h2>관련 안내</h2><p><a href="/recruit/taksong/">전국 탁송기사 모집</a> · <a href="/recruit/daeri/">전국 대리운전기사 모집</a> · <a href="/'+kind+'/">'+(isT?'탁송':'대리운전')+' 서비스 안내</a></p></section>';
 return layout(title,desc,body,base+url,base+'/assets/smart24-business-card-inline-v2.png');
}

// Central SEO overrides: edit data/seo-pages.json; changes apply on next deployment.
const seoRules=new Map(load('data/seo-pages.json').pages.map(p=>[p.path,p]));
function applySeo(html,route){
 const rule=seoRules.get(route);
 if(!rule||typeof html!=='string')return html;
 const replaceTag=(input,regex,value)=>input.replace(regex,()=>value);
 if(rule.title){
  html=replaceTag(html,/<title>[\s\S]*?<\/title>/i,'<title>'+esc(rule.title)+'</title>');
  html=replaceTag(html,/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,'<meta property="og:title" content="'+esc(rule.title)+'">');
 }
 if(rule.description){
  html=replaceTag(html,/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,'<meta name="description" content="'+esc(rule.description)+'">');
  html=replaceTag(html,/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,'<meta property="og:description" content="'+esc(rule.description)+'">');
 }
 if(['/daeri/','/taksong/','/reviews/'].includes(route)){
  const host='https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr');
  const name=route==='/daeri/'?'전국 대리운전':route==='/taksong/'?'전국 자동차탁송':'실제 완료 운행 기록';
  const schema={
   '@context':'https://schema.org','@type':'WebPage',
   name, url:host+route,
   description:rule.description||'스마트24 대리운전·자동차탁송 안내',
   isPartOf:{'@type':'WebSite',name:'스마트24 전국대리운전·24시탁송',url:host+'/'}
  };
  const safe=JSON.stringify(schema).replace(/</g,'\u005c\u0075'+'003c');
  html=html.replace('</head>','<script type="application/ld+json">'+safe+'</script></head>');
 }
 return html;
}

function respond(res,status,body,type='text/html; charset=utf-8'){
 // Public conversion tracking works on every Cloudtype HTML route, not just
 // the homepage. Force HTML revalidation when the production version changes.
 const isHtml=status===200&&type.startsWith('text/html;');
 if(isHtml){
  let html=Buffer.isBuffer(body)?body.toString('utf8'):String(body);
  if(html.includes('</body>')&&!/src=["']\/assets\/traffic-analytics\.js(?:\?[^"']*)?["']/.test(html)){
   html=html.replace('</body>','<script src="/assets/traffic-analytics.js?v=20261030-count-accuracy" defer></script></body>');
  }
  body=html;
 }
 const headers={'content-type':type,'x-content-type-options':'nosniff'};
 if(isHtml)headers['cache-control']='no-cache, max-age=0, must-revalidate';
 res.writeHead(status,headers);
 res.end(body);
}
let mainCardPngPromise, faviconPngPromise;
const keywordEngine=require('./lib/keyword-engine')({root:ROOT,regions,esc,layout,servicePath,canonical,landmarks});
const routeGuides=require('./lib/route-guides')({regions,byPath,pathBySlug,cachedRoadDistance,roadQuote:RoadFareServer.roadQuote,esc,layout,servicePath,phone:PHONE,host:process.env.PUBLIC_HOST||'jeongukdaeri.kr',matchingHistoricalRides});
const blogLatestPage=require('./lib/naver-blog-feed')({esc,layout,phone:PHONE,host:process.env.PUBLIC_HOST||'jeongukdaeri.kr'});
const blogArchive=require('./lib/blog-archive');
const routeKeywordPages=require('./lib/route-keyword-pages')({regions,esc,layout,servicePath,label:seoRegionLabel,host:process.env.PUBLIC_HOST||'jeongukdaeri.kr',historicalRides});
http.createServer((req,res)=>{observeCrawlerRequest(req,res);let u;try{u=new URL(req.url,'http://localhost')}catch{return respond(res,400,'잘못된 요청')};let pathname;try{pathname=decodeURIComponent(u.pathname)}catch{return respond(res,400,'잘못된 주소')}
// Publish the public IndexNow ownership key at the root on Cloudtype.
if(pathname==='/770f921af32e749f64c1d447c607ea42.txt')return respond(res,200,fs.readFileSync(path.join(ROOT,'770f921af32e749f64c1d447c607ea42.txt'),'utf8'),'text/plain; charset=utf-8');
// Consolidate default-document URLs without changing query parameters.
if(/\/index\.html$/.test(pathname)){const target=u.pathname.slice(0,-'index.html'.length);res.writeHead(301,{location:target+u.search});return res.end()}

const routeResult=routeKeywordPages.handle(pathname,u);if(routeResult){if(routeResult.location){res.writeHead(301,{location:routeResult.location});return res.end()}return respond(res,routeResult.status,routeResult.body,routeResult.type)}
if(pathname==='/fare/routes/'||pathname==='/fare/routes')return respond(res,200,routeGuides.index());
const fareRouteMatch=pathname.match(/^\/fare\/route\/([a-z0-9-]+(?:\/[a-z0-9-]+)*)\/(seoul|incheon|daejeon|daegu|busan)\/?$/);
if(fareRouteMatch){if(!pathname.endsWith('/')){res.writeHead(301,{location:pathname+'/'});return res.end()}return routeGuides.page(fareRouteMatch[1],fareRouteMatch[2]).then(html=>html?respond(res,200,html):respond(res,404,'구간을 찾을 수 없습니다.')).catch(err=>{console.error('fare route error',err);respond(res,500,'요금 안내를 불러올 수 없습니다.')})}
const historicalDetail=pathname.match(new RegExp('^/reviews/history/(excel-[0-9]{4})/?$'));if(historicalDetail){const x=historicalRides.find(v=>v.id===historicalDetail[1]);return x?respond(res,200,historyDetailPage(x)):respond(res,404,'운행기록을 찾을 수 없습니다.');}
const archivePage=blogArchive.handle(pathname,u,{layout,esc,host:process.env.PUBLIC_HOST||'jeongukdaeri.kr'});if(archivePage)return respond(res,archivePage.status,archivePage.html);
 if(pathname==='/blog/'||pathname==='/blog')return blogLatestPage().then(html=>respond(res,200,html)).catch(err=>{console.error('blog feed error',err);respond(res,503,'블로그 목록을 불러올 수 없습니다.');});
if(pathname==='/reviews/history/'||pathname==='/reviews/history'){const page=Math.max(1,Math.min(1000,Number(u.searchParams.get('page'))||1)),kind=['daeri','taksong'].includes(u.searchParams.get('kind'))?u.searchParams.get('kind'):'all';return respond(res,200,historyIndexPage(page,kind));}
if(pathname==='/reviews/'||pathname==='/reviews')return respond(res,200,applySeo(ridesIndex(),'/reviews/'));
const rideMatch=pathname.match(/^\/reviews\/([a-f0-9]{16})\/?$/);
if(rideMatch){const x=publicRideById.get(rideMatch[1]);return x?respond(res,200,ridePage(x)):respond(res,404,'확인된 운행 기록이 없습니다.')}
const recruitmentMatch=pathname.match(/^\/recruit\/(taksong|daeri)(?:\/([a-z0-9-]+))?\/?$/);
if(recruitmentMatch){const region=recruitmentMatch[2]?bySlug.get(recruitmentMatch[2]):null;if(recruitmentMatch[2]&&(!region||region.level!=='시도'))return respond(res,404,'모집 지역을 찾을 수 없습니다.');if(!pathname.endsWith('/')){res.writeHead(301,{location:pathname+'/'+u.search});return res.end()}return respond(res,200,recruitmentPage(recruitmentMatch[1],region))}
if(pathname==='/taksongdaeri/'||pathname==='/taksongdaeri'){const base='https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr');const guideSchema={'@context':'https://schema.org','@type':'WebPage',name:'전국 자동차탁송·대리운전 예약 안내',url:base+'/taksongdaeri/',description:'전국 자동차탁송·대리운전 예약과 예상요금, 산간·오지·항구의 사전 예약 안내',isPartOf:{'@type':'WebSite',name:'스마트24 전국대리운전·24시탁송',url:base+'/'}};const body='<script type="application/ld+json">'+JSON.stringify(guideSchema)+'</script><h1>전국 자동차탁송·대리운전 예약 안내</h1><p>스마트24는 전국 자동차탁송과 대리운전 예약 상담을 안내합니다. 출발지와 도착지에 따른 예상요금은 도로거리 확인 후 산출하며 실제 배차요금은 기사 수급과 운행 조건에 따라 달라집니다.</p><section><h2>서비스 선택</h2><p><a href="/taksong/">전국 자동차탁송 지역별 안내</a> · <a href="/daeri/">전국 대리운전 지역별 안내</a> · <a href="/fare/">출발지·도착지 예상요금 조회</a></p></section><section><h2>산간·오지·항구 사전 예약</h2><p>산간마을, 오지, 항구·여객선터미널, 관광지와 등산로 입구는 기사 접근·복귀가 어려울 수 있습니다. 당일 또는 심야 긴급 호출은 사전 예약보다 요금이 높아지거나 배차가 지연될 수 있습니다. 실제 추가비용과 배차 가능 여부는 상담 후 확정합니다.</p><p><a href="tel:18114294">예약 상담 1811-4294</a></p></section>';const bookingOriginalGuide=(fs.readFileSync(path.join(ROOT,'taksongdaeri','index.html'),'utf8').match(/<section id="booking-original-ref">[\s\S]*?<\/section>/)||[])[0]||'';return respond(res,200,layout('전국 자동차탁송·대리운전 예약 | 스마트24','전국 자동차탁송·대리운전 지역별 서비스, 예상요금 및 산간·오지·항구 사전 예약 안내',body+bookingOriginalGuide,base+'/taksongdaeri/',base+'/assets/smart24-business-card-inline-v2.png'))}
if(pathname==='/favicon.ico'){
 if(!faviconPngPromise){
  // Render from a bundled SVG, not from an expensive dynamically generated business card.
  faviconPngPromise=require('sharp')(fs.readFileSync(path.join(ROOT,'assets/smart24-business-card.svg'))).resize(64,64,{fit:'contain',background:'#ffffff'}).png().toBuffer().catch(()=>null);
 }
 return faviconPngPromise.then(buf=>{
  if(buf){res.writeHead(200,{'content-type':'image/png','cache-control':'public, max-age=86400','x-content-type-options':'nosniff'});return res.end(buf)}
  const fallback=fs.readFileSync(path.join(ROOT,'assets/smart24-business-card.svg'));
  res.writeHead(200,{'content-type':'image/svg+xml; charset=utf-8','cache-control':'public, max-age=3600','x-content-type-options':'nosniff'});res.end(fallback);
 });
}
const hubCardMatch=pathname.match(/^\/assets\/smart24-(daeri|taksong)-brand\.png$/);
if(hubCardMatch)return regionalCardPng({slug:'national-'+hubCardMatch[1],full_name:null},hubCardMatch[1]).then(buf=>{res.writeHead(200,{'content-type':'image/png','cache-control':'public, max-age=86400','x-content-type-options':'nosniff'});res.end(buf)}).catch(()=>respond(res,500,'이미지 생성 오류'));
if((pathname==='/assets/smart24-business-card.png'||pathname==='/assets/smart24-business-card-light.png'||pathname==='/assets/smart24-business-card-art.png'||pathname==='/assets/smart24-business-card-inline.png'||pathname==='/assets/smart24-business-card-inline-v2.png')){
 if(!mainCardPngPromise)mainCardPngPromise=renderCardArtwork(null).catch(err=>{mainCardPngPromise=undefined;throw err});
 return mainCardPngPromise.then(buf=>{res.writeHead(200,{'content-type':'image/png','cache-control':'public, max-age=86400','x-content-type-options':'nosniff'});res.end(buf)}).catch(()=>respond(res,500,'이미지 생성 오류'));
}
const coastalMatch=pathname.match(/^\/(daeri|taksong)\/coast\/([a-f0-9]{20})\/?$/);
if(coastalMatch){const [,kind,id]=coastalMatch,item=keywordEngine.coastal.byId.get(id);if(!item)return respond(res,404,'해변·항구 정보를 찾을 수 없습니다.');const target=keywordEngine.coastal.url(item,kind);if(pathname!==target){res.writeHead(301,{location:target});return res.end()}return respond(res,200,keywordEngine.coastal.page(item,kind))}
const coastDirectory=pathname.match(/^\/coast(?:\/([^/]+))?\/?$/);
if(coastDirectory){const page=keywordEngine.coastal.directory(coastDirectory[1]);return page?respond(res,200,page):respond(res,404,'해변·항구 지역을 찾을 수 없습니다.')}
if(pathname==='/api/keyword-status'){res.setHeader('X-Robots-Tag','noindex');return respond(res,200,JSON.stringify(keywordEngine.summary),'application/json; charset=utf-8')}
if(pathname==='/activities/'||pathname==='/activities')return respond(res,200,keywordEngine.activityHub());
const serviceActivity=pathname.match(/^\/(daeri|taksong)\/activities\/([a-z-]+)\/?$/);if(serviceActivity){const topic=keywordEngine.topicFromSlug(serviceActivity[2]);return topic?respond(res,200,keywordEngine.topicPage(topic,serviceActivity[1])):respond(res,404,'이용 안내를 찾을 수 없습니다.')}
const activityMatch=pathname.match(/^\/activities\/([a-z-]+)\/?$/);if(activityMatch){const topic=keywordEngine.topicFromSlug(activityMatch[1]);return topic?respond(res,200,keywordEngine.topicPage(topic)):respond(res,404,'이용 안내를 찾을 수 없습니다.')}
if(pathname==='/keyword-search/'||pathname==='/keyword-search'){const q=u.searchParams.get('q');const target=keywordEngine.topicUrl(u.searchParams.get('category'));if(target&&!q){res.writeHead(301,{location:target});return res.end()}res.setHeader('X-Robots-Tag','noindex, follow');return respond(res,200,keywordEngine.search(u.searchParams.get('q'),u.searchParams.get('page'),u.searchParams.get('category')))}
const serviceVisit=pathname.match(/^\/(daeri|taksong)\/visit\/([a-f0-9]{20})\/?$/);
if(serviceVisit){const [,kind,id]=serviceVisit,item=keywordEngine.byId.get(id);if(!item)return respond(res,404,'연결된 키워드를 찾을 수 없습니다.');const target=keywordEngine.url(item,kind);if(pathname!==target){res.writeHead(301,{location:target});return res.end()}return respond(res,200,keywordEngine.itemPage(item,kind))}
const visitKeyword=pathname.match(/^\/visit\/([a-f0-9]{20})\/?$/);if(visitKeyword){const item=keywordEngine.byId.get(visitKeyword[1]);if(!item)return respond(res,404,'연결된 키워드를 찾을 수 없습니다.');const target=keywordEngine.url(item);if(pathname!==target){res.writeHead(301,{location:target});return res.end()}return respond(res,200,keywordEngine.itemPage(item))}
if(pathname==='/'||pathname==='/index.html'){const home=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');const ticker=publicRides.slice(-18).reverse().map(x=>'<a class="trip-flow-card" href="'+rideUrl(x)+'"><span>'+esc(x.date)+'</span><strong>'+esc(x.departure)+' → '+esc(x.destination)+'</strong><span>'+esc(x.fare||'요금 문의')+'</span></a>').join('');const homepage=home.replace(/href="#ride-history"/g,'href="/reviews/"').replace('<span class="trip-flow-card">확인된 운행 기록을 불러오는 중입니다.</span>',ticker||'<a class="trip-flow-card" href="/reviews/">완료 운행 후기 보기</a>');return respond(res,200,applySeo(homepage.replace('<!-- DYNAMIC_REGION_LINKS -->',nationwideLinks()+homepagePriorityLinks()+'<section><h2>전국 기사 모집</h2><p><a href="/recruit/taksong/">전국 탁송기사 모집</a> · <a href="/recruit/daeri/">전국 대리운전기사 모집</a></p></section><section><h2>장소·활동으로 찾기</h2><p><a href="/activities/">맛집·여행지·산행·자전거·행사 후 귀가와 차량 이동 안내</a></p></section>'),'/'))}
const keywordMatch=pathname.match(/^\/keywords\/(taksong|daeri)\/?$/);if(keywordMatch){res.setHeader('X-Robots-Tag','noindex, follow');return respond(res,200,regionKeywordDirectory(keywordMatch[1],u.searchParams.get('page')))}
if(pathname==='/route-search/'||pathname==='/route-search'){res.setHeader('X-Robots-Tag','noindex, follow');const from=String(u.searchParams.get('from')||''),to=String(u.searchParams.get('to')||''),kind=u.searchParams.get('service')==='daeri'?'daeri':'taksong';return respond(res,200,routeKeywordSearchPage(from,to,kind,u.searchParams.get('page')))}
if(pathname==='/places/'||pathname==='/places')return respond(res,200,placeCategoryHub());
const placeCategoryMatch=pathname.match(/^\/places\/([^/]+)\/?$/);
if(placeCategoryMatch){const category=placeCategories.find(x=>x[0]===placeCategoryMatch[1]);return category?respond(res,200,placeCategoryPage(category)):respond(res,404,'장소 분류를 찾을 수 없습니다.')}
const featuredRouteMatch=pathname.match(/^\/taksong\/route\/([a-z-]+)\/?$/);if(featuredRouteMatch){const route=featuredTaksongRoutes.find(x=>x.slug===featuredRouteMatch[1]);return route?respond(res,200,featuredTaksongRoutePage(route)):respond(res,404,'해당 구간을 찾을 수 없습니다.')}
if(pathname==='/taksong'){res.writeHead(301,{location:'/taksong/'+u.search});return res.end()}
if(pathname==='/taksong/')return respond(res,200,applySeo(serviceHub('taksong'),'/taksong/'));
if(pathname==='/taksong/types/'||pathname==='/taksong/types')return respond(res,200,vehicleTopicsHub());
const vehicleMatch=pathname.match(/^\/taksong\/type\/([a-f0-9]+)\/?$/);if(vehicleMatch){const topic=[...vehicleTopicMap.values()].find(x=>x.slug===vehicleMatch[1]);return topic?respond(res,200,vehicleTopicPage(topic)):respond(res,404,'차종별 탁송 정보를 찾을 수 없습니다.')}
const daeriRouteMatch=pathname.match(/^\/daeri\/route\/([a-z-]+)\/?$/);if(daeriRouteMatch){const route=featuredDaeriRoutes.find(x=>x.slug===daeriRouteMatch[1]);return route?respond(res,200,featuredDaeriRoutePage(route)):respond(res,404,'해당 대리운전 구간을 찾을 수 없습니다.')}
if(pathname==='/travel/food-map'){res.writeHead(301,{location:'/travel/food-map/'+u.search});return res.end()}
if(pathname==='/travel/food-map/')return respond(res,200,foodTravelMap.page({layout,esc,host:process.env.PUBLIC_HOST||'jeongukdaeri.kr',regions,servicePath}));
const driverTravelMatch=pathname.match(/^\/daeri\/travel\/([a-z-]+)\/?$/);
if(driverTravelMatch){const canonical='/daeri/travel/'+driverTravelMatch[1]+'/';if(pathname!==canonical){res.writeHead(301,{location:canonical});return res.end()};const article=daeriTravelGuides.page(driverTravelMatch[1],{layout,esc,host:process.env.PUBLIC_HOST||'jeongukdaeri.kr'});return respond(res,article?200:404,article||'대리운전 지역 여행 안내를 찾을 수 없습니다.')}
if(pathname==='/daeri'){res.writeHead(301,{location:'/daeri/'+u.search});return res.end()}
if(pathname==='/daeri/')return respond(res,200,applySeo(serviceHub('daeri'),'/daeri/'));
if(pathname==='/region/'||pathname==='/region'){
 const q=clean(u.searchParams.get('q')||'');
 const requestedService=u.searchParams.get('service');
 const selectedService=requestedService==='daeri'||requestedService==='taksong'?requestedService:null;
 const matches=q?regions.filter(r=>regionMatches(r,q)).slice(0,100):regions.filter(r=>r.level==='시도');
 const matchedLandmarks=q?landmarks.filter(item=>compact(item[0]).includes(compact(q))).slice(0,20):[];
 const landmarkLinks=matchedLandmarks.length?'<section><h2>혁신도시·철도역 검색 결과</h2><ul>'+matchedLandmarks.map(item=>'<li><a href="/place/'+landmarkSlug(item[0])+'/">'+esc(item[0])+' 대리운전·탁송</a></li>').join('')+'</ul></section>':'';
 const links='<ul>'+matches.map(r=>'<li>'+(selectedService?'<a href="'+servicePath(r,selectedService)+'">'+esc(r.full_name)+' '+(selectedService==='daeri'?'대리운전':'탁송')+'</a>':'<a href="'+servicePath(r,'daeri')+'">'+esc(r.full_name)+' 대리운전</a> · <a href="'+servicePath(r,'taksong')+'">'+esc(r.full_name)+' 탁송</a>')+'</li>').join('')+'</ul>';
 const form='<form method="get" action="/region/">'+(selectedService?'<input type="hidden" name="service" value="'+selectedService+'">':'')+'<label for="q">전국 지역 검색</label> <input id="q" name="q" value="'+esc(q)+'" placeholder="속초·속초시·역삼·역삼동·충북혁신도시·광명역" style="padding:12px;max-width:80%;font-size:17px"> <button style="padding:12px">검색</button></form>';
 const regionOriginalGuide=(fs.readFileSync(path.join(ROOT,'region','index.html'),'utf8').match(/<section id="region-original-ref">[\s\S]*?<\/section>/)||[])[0]||'';
 return respond(res,200,layout('전국 대리운전·탁송 지역 검색','전국 '+regions.length+'개 지역 검색', '<section><h2>전국 지역 찾기</h2>'+form+'<p>전체 '+regions.length+'개 지역 중 '+(q?'검색 일치 최대 100개':'시·도 목록')+' 표시</p>' +links+'</section>'+regionOriginalGuide+landmarkLinks,'https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr')+'/region/'));
}
 const placeMatch=pathname.match(new RegExp('^/place/(place-[a-f0-9]+)/?$'));if(placeMatch){const item=landmarkBySlug.get(placeMatch[1]);return item?respond(res,200,landmarkPage(item)):respond(res,404,'장소 정보를 찾을 수 없습니다.')}
 const brandCardMatch=pathname.match(/^\/card\/(area-[0-9]+)-(daeri|taksong)-brand\.(png|svg)$/);
 if(brandCardMatch){const [,slug,kind,format]=brandCardMatch,r=bySlug.get(slug);if(!r)return respond(res,404,'명함을 찾을 수 없습니다.');if(format==='svg')return respond(res,200,cardSvg(r.full_name,kind),'image/svg+xml; charset=utf-8');return regionalCardPng(r,kind).then(buf=>{res.writeHead(200,{'content-type':'image/png','cache-control':'public, max-age=86400','x-content-type-options':'nosniff'});res.end(buf)}).catch(()=>respond(res,500,'이미지 생성 오류'))}
 const intentCardMatch=pathname.match(/^\/card\/(area-[0-9]+)-(daeri|taksong)-(fare|long-distance|handover)\.png$/);
 if(intentCardMatch){const [,slug,kind,topic]=intentCardMatch,r=bySlug.get(slug);if(!r||!regionalIntentSlugs.has(slug)||!regionalIntentTypes[kind].includes(topic))return respond(res,404,'명함을 찾을 수 없습니다.');return regionalCardPng(r,kind,topic).then(buf=>{res.writeHead(200,{'content-type':'image/png','cache-control':'public, max-age=86400','x-content-type-options':'nosniff'});res.end(buf)}).catch(()=>respond(res,500,'이미지 생성 오류'))}
 const cardPngMatch=pathname.match(/^\/card\/(area-[0-9]+)(?:-light|-art(?:-v2)?|-inline(?:-v2)?)?\.png$/);if(cardPngMatch){const r=bySlug.get(cardPngMatch[1]);if(!r)return respond(res,404,'명함을 찾을 수 없습니다');return regionalCardPng(r).then(buf=>{res.writeHead(200,{'content-type':'image/png','cache-control':'public, max-age=86400','x-content-type-options':'nosniff'});res.end(buf)}).catch(()=>respond(res,500,'이미지 생성 오류'))}
const cardMatch=pathname.match(/^\/card\/(area-[0-9]+)\.svg$/);if(cardMatch){const r=bySlug.get(cardMatch[1]);if(!r)return respond(res,404,'명함을 찾을 수 없습니다');res.writeHead(200,{'content-type':'image/svg+xml; charset=utf-8','cache-control':'public, max-age=86400','x-content-type-options':'nosniff'});return res.end(cardSvg(r.full_name));}
if(pathname==='/api/public-rides'){
 const rows=load('data/ride-history-upload-202610.json');
 const safe=Array.isArray(rows)?rows.filter(r=>r.status==='종료'&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&[r.departure,r.destination,r.fare].every(v=>typeof v==='string'&&v.length>0&&v.length<100)).map(r=>({date:r.date,departure:r.departure,destination:r.destination,fare:r.fare})):[];
 return respond(res,200,JSON.stringify(safe),'application/json; charset=utf-8');
}
if(pathname==='/health')return respond(res,200,JSON.stringify({ok:true,regions:regions.length,source:'public legal-dong hierarchy',release:'smart24-regional-guides-20261024',regionalGuideAreas:regionalIntentAreas.length,regionalGuides:regionalIntentAreas.length*4,keywordAutomation:{stored:keywordEngine.summary.stored,collected:keywordEngine.summary.collected,updatedAt:keywordEngine.summary.updatedAt},features:{keywordAutoLinking:true,pngBusinessCards:true,cardClickToCall:true,publicRideHistory:true,hideDepartureTime:true}}), 'application/json; charset=utf-8');
if(pathname==='/rss.xml'||pathname==='/feed.xml'){
 const base='https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr');
 const all=[...publicRideById.values()].sort((a,b)=>b.date.localeCompare(a.date)||a.publicId.localeCompare(b.publicId));
 const recent=all.slice(0,20),latest=all[0]?.date;
 const rss='<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>'+esc(BRAND+' 실제 완료 운행기록')+'</title><link>'+base+'/reviews/</link><description>'+esc('공개 운행기록 '+all.length+'건 중 최근 '+recent.length+'건'+(latest?' · 최신 운행일 '+latest:'')+'. 운행일 기준 정렬이며 게시·수정 시각을 뜻하지 않습니다.')+'</description><language>ko</language>'+recent.map(x=>{
  const url=base+rideUrl(x),label=x.service==='taksong'?'자동차탁송':'대리운전';
  const title=x.date+' '+x.departure+' → '+x.destination+' '+label+' 운행완료'+(x.fare?' · 당시 요금 '+x.fare:'');
  const full=ridePage(x).split('<main>')[1]?.split('</main>')[0]||'';
  // Publication timestamps are emitted only when explicitly recorded; trip dates are not publication dates.
  const published=typeof x.publishedAt==='string'?new Date(x.publishedAt):null;
  const pubDate=published&&Number.isFinite(published.getTime())?'<pubDate>'+published.toUTCString()+'</pubDate>':'';
  return '<item><title>'+esc(title)+'</title><link>'+esc(url)+'</link><guid isPermaLink="true">'+esc(url)+'</guid><description>'+esc(full)+'</description>'+pubDate+'</item>';
 }).join('')+'</channel></rss>';
 return respond(res,200,rss,'application/rss+xml; charset=utf-8');
}
if(pathname==='/robots.txt'){const base='https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr');const txt=['User-agent: *','Allow: /','Sitemap: '+base+'/sitemap-priority.xml','Sitemap: '+base+'/sitemap.xml','Sitemap: '+base+'/sitemap-reviewed-routes.xml',''].join('\n');return respond(res,200,txt,'text/plain; charset=utf-8')}
if(pathname==='/sitemap-priority.xml'){
 const base='https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr');
 const urls=['/','/daeri/','/taksong/','/travel/food-map/','/taksong/jeju/','/recruit/daeri/','/recruit/taksong/',...priorityRegionalPages.map(p=>{
  const region=regions.find(r=>r.full_name===p.region);
  return servicePath(region,p.kind);
 })];
 const xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+[...new Set(urls)].map(p=>'<url><loc>'+esc(base+p)+'</loc></url>').join('')+'</urlset>';
 return respond(res,200,xml,'application/xml; charset=utf-8');
}
if(pathname==='/sitemap-daeri.xml'||pathname==='/sitemap-taksong.xml'){const service=pathname==='/sitemap-daeri.xml'?'daeri':'taksong';const base='https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr');const cached=sitemapCache.get(pathname);if(cached)return respond(res,200,cached,'application/xml; charset=utf-8');// Keep existing 20,562 region URLs usable for route lookup, but prioritize the
 // 17 province hubs and 12 hand-curated driver regions for Naver crawl discovery.
 // The delivery sitemap retains its prior behavior; no route, fare, or ride is deleted.
 const discoveryRegions=service==='daeri'
  ?regions.filter(r=>r.level==='시도'||priorityByKey.has('daeri|'+r.full_name))
  :regions;
 const xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'+['/'+service+'/',...(service==='daeri'?daeriTravelGuides.destinations.map(daeriTravelGuides.pathFor):['/service/taksong/','/service/long-distance-taksong/']),].map(route=>'<url><loc>'+esc(base+route)+'</loc></url>').join('')+discoveryRegions.map(r=>'<url><loc>'+esc(base+servicePath(r,service))+'</loc><image:image><image:loc>'+esc(base+cardPngPath(r.slug,service))+'</image:loc></image:image></url>').join('')+'</urlset>';sitemapCache.set(pathname,xml);return respond(res,200,xml,'application/xml; charset=utf-8')}
if(pathname==='/sitemap.xml'){
 const base='https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr');
 const cached=sitemapCache.get(pathname);
 if(cached)return respond(res,200,cached,'application/xml; charset=utf-8');
 // A new site should first expose helpful national hubs, curated regions and
 // SOURCE-VERIFIED trips, not 20k near-identical directory pages or 500k routes.
 // All historic URLs remain reachable; this is a crawl-discovery change only.
 const provinceRegions=regions.filter(r=>r.level==='시도');
 const focused=[
  ...daeriTravelGuides.destinations.map(daeriTravelGuides.pathFor),
  '/','/taksongdaeri/','/daeri/','/taksong/','/travel/food-map/','/taksong/jeju/','/fare/','/fare/jeju/',
  '/reviews/','/reviews/history/','/routes/reviewed/','/blog/','/blog/archive/',
   ...blogArchive.groups.map(g=>'/blog/archive/'+g.id+'/'),'/region/',
  '/service/golf/','/service/taksong/','/recruit/daeri/','/recruit/taksong/',
  '/service/daily-driver/','/service/long-distance-taksong/',
  '/service/corporate/','/taksong/types/','/places/','/activities/',
  '/special/24-hour-service/',
  '/business/','/business/rental-car/','/business/used-car/',
  '/business/auction/','/business/scrapyard/','/business/export-port/',
  ...placeCategories.map(x=>'/places/'+encodeURIComponent(x[0])+'/'),
  ...vehicleTopics.map(([name])=>vehicleTopicPath(name)),
  ...provinceRegions.flatMap(r=>[canonical(r.slug),servicePath(r,'daeri'),servicePath(r,'taksong')]),
  ...priorityRegionalPages.map(p=>servicePath(regions.find(r=>r.full_name===p.region),p.kind)),
  ...publicRides.map(rideUrl),
  ...featuredTaksongRoutes.map(r=>'/taksong/route/'+r.slug+'/'),
  ...featuredDaeriRoutes.map(r=>'/daeri/route/'+r.slug+'/'),
  ...routeKeywordPages.reviewed.entries.slice(0,100).map(e=>routeKeywordPages.reviewed.routePath(e)),
  ...keywordEngine.activityUrls
 ];
 const urls=[...new Set(focused)];
 const xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(p=>'<url><loc>'+esc(base+p)+'</loc></url>').join('')+'</urlset>';
 sitemapCache.set(pathname,xml);
 return respond(res,200,xml,'application/xml; charset=utf-8');
}
const intentMatch=pathname.match(/^\/(daeri|taksong)\/([a-z0-9-]+(?:\/[a-z0-9-]+)*)\/(fare|long-distance|handover)\/?$/);
if(intentMatch){const [,kind,regionPath,topic]=intentMatch,r=byPath.get(regionPath);if(!r||!regionalIntentSlugs.has(r.slug)||!regionalIntentTypes[kind].includes(topic))return respond(res,404,'지역별 이용 안내를 찾을 수 없습니다.');const target=regionalIntentPath(r,kind,topic);if(pathname!==target){res.writeHead(301,{location:target});return res.end()}return respond(res,200,regionalIntentPage(r,kind,topic))}
const hierarchicalMatch=pathname.match(/^\/(daeri|taksong)\/([a-z0-9-]+(?:\/[a-z0-9-]+)*)\/?$/);
if(hierarchicalMatch){const r=byPath.get(hierarchicalMatch[2]);if(!r)return respond(res,404,'지역 정보를 찾을 수 없습니다.');const target=servicePath(r,hierarchicalMatch[1]);if(pathname!==target){res.writeHead(301,{location:target});return res.end()}return servicePage(r,hierarchicalMatch[1]).then(html=>respond(res,200,html)).catch(err=>{console.error('regional page error',err);respond(res,500,'페이지 생성 오류')})}
const serviceMatch=pathname.match(/^\/service\/(area-[0-9]+)\/(daeri|taksong)\/?$/);if(serviceMatch){const r=bySlug.get(serviceMatch[1]);if(!r)return respond(res,404,'지역 정보를 찾을 수 없습니다.');res.writeHead(301,{location:servicePath(r,serviceMatch[2])});return res.end()}
const curatedRegionFiles=new Set(['seoul-daeri-taksong','gyeonggi-daeri-taksong','incheon-daeri-taksong','busan-daeri-taksong','daegu-daeri-taksong','gangwon-daeri-taksong','gangneung-taksong','detail']);
const match=pathname.match(/^\/region\/([^/]+)\/?$/);
if(match){
 const r=bySlug.get(match[1]);
 if(r)return respond(res,200,regionPage(r));
 if(curatedRegionFiles.has(match[1])){
  try{return respond(res,200,fs.readFileSync(path.join(ROOT,'region',match[1],'index.html')),'text/html; charset=utf-8')}
  catch{return respond(res,404,'지역 안내를 찾을 수 없습니다.')}
 }
 return respond(res,404,'지역 정보를 찾을 수 없습니다.');
}
if(/^\/(?:data(?:\/|$)|server\.js|package(?:-lock)?\.json|HOSTING_SETUP\.md|tests\/|\.github\/|node_modules\/|\.env)/i.test(pathname))return respond(res,403,'접근 불가');
let p=path.resolve(ROOT,'.'+pathname);if(!p.startsWith(ROOT+path.sep)&&p!==ROOT)return respond(res,403,'접근 불가');try{if(fs.statSync(p).isDirectory())p=path.join(p,'index.html');const ext=path.extname(p).toLowerCase();const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.ico':'image/x-icon'};if(!types[ext])return respond(res,403,'허용되지 않는 형식');return respond(res,200,fs.readFileSync(p),types[ext])}catch{return respond(res,404,'페이지를 찾을 수 없습니다')}
}).listen(PORT,'0.0.0.0',()=>console.log('Dynamic website listening on '+PORT));
