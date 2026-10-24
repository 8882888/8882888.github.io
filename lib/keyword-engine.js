'use strict';
const fs=require('node:fs'),path=require('node:path');
module.exports=function createKeywordEngine({root,regions,esc,layout,servicePath,canonical,landmarks}){
 const coastal=require('./coastal-keywords')({root,regions,esc,layout,servicePath});
 const folder=path.join(root,'data/keywords');
 const catalog=JSON.parse(fs.readFileSync(path.join(folder,'catalog.json'),'utf8'));
 const taxonomy=JSON.parse(fs.readFileSync(path.join(folder,'taxonomy.json'),'utf8'));
 const summary=JSON.parse(fs.readFileSync(path.join(folder,'summary.json'),'utf8'));
 const compact=s=>String(s).normalize('NFKC').replace(/\s+/g,'').toLowerCase();
 const bySlug=new Map(regions.map(r=>[r.slug,r]));
 const existing=new Map(landmarks.map(([name])=>[compact(name),'/place/place-'+Buffer.from(name).toString('hex')+'/']));
 const live=catalog.items.filter(x=>x.state==='linked'&&x.regions.some(s=>bySlug.has(s)));
 const byId=new Map(live.map(x=>[x.id,x]));
 const byTerm=new Map(live.map(x=>[compact(x.term),x]));
 const perRegion=new Map();
 for(const item of live)for(const slug of item.regions){const a=perRegion.get(slug)||[];a.push(item);perRegion.set(slug,a)}
 const serviceLabel=k=>k==='daeri'?'대리운전':'탁송';
 function url(item,kind){if(kind)return '/'+kind+'/visit/'+item.id+'/';return existing.get(compact(item.term))||'/visit/'+item.id+'/'}
 const categoryGuidance={
  '산행':['출발지와 하산지가 다른 산행','산행 시작 주차장과 하산 후 차량을 받을 장소를 각각 정하세요. 코스명만 전달하기보다 차량 위치와 주차 구역을 구체적으로 알려주면 인계 지점을 확인하기 쉽습니다.','통신·차키·하산 시간','연락이 어려운 구간에 들어가기 전에 차키 전달 방법과 하산 예상 시각을 협의하세요. 산행 통제·셔틀·주차 운영은 탐방 당일 공식 안내를 별도로 확인합니다.'],
  '자전거길':['라이딩 종료 후 차량 회수','차량을 세워둔 인증센터·주차장과 라이딩 종료 후 받을 장소를 구분해 전달하세요. 자전거 운반이 필요한 경우에는 차량 적재 가능 여부도 함께 확인합니다.','인증센터 이름과 차량 위치','종주길 전체 이름만으로는 차량 위치를 알 수 없습니다. 실제 시작·종료 지점, 주차 사진이나 상세 주소, 종료 예상 시각과 차키 인계 방법을 상담하세요.'],
  '골프장':['라운딩 종료 후 출발','클럽하우스 픽업인지 주차장 차량 인수인지 구분하고, 종료 예상 시각과 고객 동승 여부를 알려주세요. 편도·왕복·현장 대기는 서로 다른 상담 조건입니다.','대기·경유·복귀 일정','식사나 추가 경유가 있다면 전체 일정으로 상담하세요. 골프장 운영시간과 차량 출입 위치는 해당 시설에 확인합니다.'],
  '축제':['행사 종료 후 만날 장소','행사장 이름과 차량을 실제로 세워둔 주차장을 함께 알려주세요. 행사장 출입구와 주차장 출구가 다르면 기사와 만날 위치를 별도로 정하는 편이 좋습니다.','임시 통제와 종료 시간','행사 개최 여부·일정·통제는 주최 측 공식 안내에서 확인하세요. 이 페이지는 행사 운영 안내가 아닌 방문 후 차량 이동 상담 안내입니다.'],
  '해수욕장':['해변 주차장에서 출발','해수욕장 이름 외에 주차장 명칭·구역·차량 위치를 전달하세요. 숙소에 들르거나 다른 해변을 경유한다면 순서를 함께 알려주세요.','성수기 진입과 야간 귀가','주차장 폐쇄 시각과 차량 출입 가능 여부는 현장에서 확인하세요. 야간·성수기에는 주변 교통과 기사 이동 여건에 따라 배차 시간이 달라질 수 있습니다.'],
  '계곡':['진입로와 주차 위치','계곡 입구와 실제 차량 위치가 멀 수 있습니다. 차량이 있는 도로명주소, 주차 구역과 진입로를 알려주세요.','외곽 출발과 연락 방법','통신이 불안정한 곳은 연락 가능한 지점에서 미리 상담하세요. 도로·기상 통제 여부와 차량 출입 가능 상태를 확인해야 합니다.'],
  '캠핑장':['퇴실과 차량 인수 시간','캠핑장 이름·사이트 또는 주차 구역, 차량 출입구를 알려주세요. 퇴실 마감 시각과 장비 정리 시간을 고려해 출발 시각을 상담합니다.','차량과 적재물 확인','짐이나 캠핑 장비는 차량에 안전하게 고정하고 키 인계 방법을 정하세요. 운행 가능한 차량의 이동 상담이며 견인·구난을 대신하지 않습니다.'],
  '펜션':['숙소에서 귀가할 때','펜션·풀빌라의 실제 상호, 도로명주소와 주차 위치를 알려주세요. 같은 이름의 숙소가 있을 수 있어 예약한 시설 주소로 확인합니다.','퇴실 시간과 여러 대 이동','퇴실 마감 시각, 차량 대수, 편도·경유 여부를 미리 전달하세요. 동행인의 별도 이동과 차량 인계 담당자도 정해주세요.'],
  '맛집':['식사 후 귀가 준비','식당 이름과 실제 지점 주소, 차량 주차 위치, 귀가 목적지를 알려주세요. 식사 종료 예상 시각이 바뀌면 상담한 출발 시각도 다시 확인합니다.','발렛과 주차장 차량 인수','발렛 이용 여부와 차량 키 보관 위치, 주차비 정산·출차 절차를 확인하세요. 식당 추천·평점이나 영업 여부를 제공하는 페이지는 아닙니다.'],
  '항구':['부두와 일반 주차장 구분','항구 이름뿐 아니라 실제 인수 장소와 출입 가능한 주차 구역을 알려주세요. 여객선 이용 일정이 있다면 차량 출차 가능 시각도 함께 확인합니다.','선적·출입 조건 확인','항만 통제 구역의 출입이나 선박 선적은 별도 허가·운영 조건이 있을 수 있습니다. 일반 도로에서 운행 가능한 차량의 인계 지점으로 상담합니다.']
 };
 function guide(category){return categoryGuidance[category]||categoryGuidance[category==='포구'?'항구':category==='해변'?'해수욕장':category==='리조트'?'펜션':'']||['방문 후 귀가·차량 이동','정확한 방문 장소와 차량 주차 위치, 목적지, 출발 희망 시각을 알려주세요. 고객 동승 대리운전과 차량만 이동하는 탁송 중 필요한 방식을 선택합니다.','출발 전에 준비할 정보','차종, 키 전달 방법, 경유 여부, 주차비·통행료 조건을 확인하세요. 해당 장소의 영업·운영·출입 정보는 공식 안내를 따릅니다.']}
 function itemPage(item,requestedKind){
  const local=item.regions.map(s=>bySlug.get(s)).filter(Boolean),g=guide(item.category),base='https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr');
  const title=requestedKind?item.term+serviceLabel(requestedKind)+' | '+(requestedKind==='daeri'?'스마트전국대리운전':'스마트24시전국탁송'):item.term+' 방문·귀가·차량 회수 안내';
  const first=local[0],kind=requestedKind||(['맛집','카페','골프장','축제','펜션'].includes(item.category)?'daeri':'taksong'),brand=kind==='daeri'?'스마트전국대리운전':'스마트24시전국탁송',image=base+'/card/'+first.slug+'-'+kind+'-brand.png';
  const visibleCard='<section class="activity-card-intro"><a href="tel:18114294"><img src="'+image+'" alt="'+esc(first.full_name+' '+brand+' 1811-4294 상담 명함')+'" width="1200" height="800" style="width:100%;height:auto;border-radius:12px"></a><div><h2>'+esc(item.term)+' 귀가·차량 이동 상담</h2><p>'+esc(g[1])+'</p><p><a class="cta" href="tel:18114294">1811-4294 전화 상담</a> <a href="/fare/?service='+kind+'">예상요금 조회 →</a></p></div></section>';
  const cardStyle='<style>.activity-card-intro{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:22px;align-items:center}@media(max-width:650px){.activity-card-intro{grid-template-columns:1fr}}</style>';
  const serviceLinks='<section><h2>'+esc(item.term)+' 서비스 선택</h2><p><a href="'+url(item,'daeri')+'">'+esc(item.term)+' 대리·대리운전</a> · <a href="'+url(item,'taksong')+'">'+esc(item.term)+' 탁송</a></p></section>';
  const body=cardStyle+visibleCard+serviceLinks+'<nav><a href="/">홈</a> / <a href="/activities/">방문 장소별 안내</a></nav><section><h2>'+esc(item.term)+' 이동 준비</h2><p>상담 전에 출발지와 도착지를 각각 확인해주세요. '+esc(item.term)+'은 이동 장소를 찾기 위한 검색어이며 해당 시설·행사의 공식 홈페이지나 제휴 안내가 아닙니다.</p><h3>'+esc(g[2])+'</h3><p>'+esc(g[3])+'</p></section><section id="destination-guide"><h2>대리운전과 차량탁송 선택</h2><p>고객이 차량에 동승해 귀가할 때는 대리운전, 차량을 별도 장소로 보내거나 활동 종료 지점에서 회수할 때는 탁송으로 상담하세요. 동승·차량 인계 조건은 예약 시 확인합니다.</p><a class="cta" href="tel:18114294">1811-4294 전화 상담</a></section><section><h2>출발지·도착지로 예상요금 조회</h2><form action="/fare/" method="get"><label>실제 출발 주소 <input name="from" required maxlength="120" placeholder="주차장·시설의 정확한 주소"></label> <label>도착 주소 <input name="to" required maxlength="120"></label> <label>서비스 <select name="service"><option value="taksong"'+(kind==='taksong'?' selected':'')+'>탁송</option><option value="daeri"'+(kind==='daeri'?' selected':'')+'>대리운전</option></select></label><input type="hidden" name="auto" value="1"><button type="submit">도로거리·예상요금 조회</button></form><p>도로거리와 시간에 따른 참고요금입니다. 실제 기사 접근·복귀, 주차비·통행료·경유·시간대 조건을 확인한 뒤 최종 요금을 상담합니다.</p></section><section><h2>연결 지역 안내</h2><ul>'+local.map(r=>'<li>'+esc(r.full_name)+' · <a href="'+servicePath(r,'daeri')+'">대리운전</a> · <a href="'+servicePath(r,'taksong')+'">탁송</a></li>').join('')+'</ul><p>출발 지역을 먼저 확인한 후 실제 차량 주소로 예약하세요. 기사 상주 또는 즉시 배차를 보장하지 않습니다.</p></section>';
  return layout(title,item.term+' 방문 후 귀가·차량 회수 방법, 출발·도착 주소별 예상요금과 지역별 상담. 1811-4294.',body,base+url(item,requestedKind),image);
 }
 function regionSection(r,kind){
  let local=perRegion.get(r.slug)||[];
  if(!local.length&&r.parent_slug)local=perRegion.get(r.parent_slug)||[];
  const shown=local.slice(0,6),name=esc(r.full_name),g=guide('맛집');
  return coastal.regionLinks(r,kind)+'<section id="destination-guide"><h2>'+name+' 방문 후 귀가·차량 회수</h2><p>'+(kind==='daeri'?'식사·숙박·골프·행사 후 고객 차량으로 귀가할 때 출발 장소와 주차 위치를 확인하세요.':'산행·라이딩·캠핑 후 차량을 회수하거나 다른 지역으로 보낼 때 차량 위치와 인계할 장소를 구분해 알려주세요.')+'</p>'+(shown.length?'<ul>'+shown.map(x=>'<li><a href="'+url(x,kind)+'">'+esc(x.term)+' '+serviceLabel(kind)+' 안내</a></li>').join('')+'</ul>':'')+'<h3>맛집·숙박시설·행사장에서 출발할 때</h3><p>'+esc(g[3])+' 숙박시설·캠핑장에서는 퇴실 시각과 진입로, 행사장에서는 임시 주차장과 출구 위치를 함께 확인하세요.</p><p><a href="/keyword-search/?q='+encodeURIComponent(r.name)+'">'+name+' 장소·활동 검색</a></p></section>';
 }

 const topicSlugs={'맛집':'food','카페':'cafe','유원지':'leisure','펜션':'stay','캠핑장':'camping','계곡':'valley','해수욕장':'beach','포구':'port','항구':'harbor','골프장':'golf','자전거길':'cycling','산행':'hiking','축제':'festival'};
 const topicTitles={'맛집':'맛집·식당 방문 후 대리운전','카페':'카페·모임 후 귀가와 차량 이동','유원지':'유원지·관광지 방문 후 차량 이동','펜션':'펜션·숙소 출발 대리운전·탁송','캠핑장':'캠핑장·글램핑장 귀가·차량 회수','계곡':'계곡 방문 후 귀가·차량 회수','해수욕장':'해수욕장·해변 귀가·차량 이동','포구':'포구 방문 후 대리운전·탁송','항구':'항구·항만 차량 인수·인계','골프장':'골프장 대리운전·왕복 일정','자전거길':'자전거 종주 후 차량 회수','산행':'산행 종주·하산 후 차량 회수','축제':'축제·행사 종료 후 대리운전'};
 const topicUrl=topic=>topicSlugs[topic]?'/activities/'+topicSlugs[topic]+'/':null;
 const topicFromSlug=slug=>Object.keys(topicSlugs).find(t=>topicSlugs[t]===slug);
 const categoryOf=x=>({'해변':'해수욕장','리조트':'펜션','호수':'유원지','공원':'유원지','관광지':'유원지'}[x.category]||x.category);
 function topicCards(){return taxonomy.groups.map(g=>'<section><h2>'+esc(g.name)+'</h2><div class="activity-grid">'+g.topics.map(t=>'<a class="activity-link" href="'+topicUrl(t.name)+'"><strong>'+esc(t.name)+'</strong><span>'+esc(catalog.themes[t.name]||'방문 후 이동')+' 안내 →</span></a>').join('')+'</div></section>').join('')}
 const activityStyle='<style>.activity-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}.activity-link{display:flex;flex-direction:column;gap:8px;padding:20px;border:1px solid #c6ddea;border-radius:14px;text-decoration:none;background:#f2faff}.activity-link strong{font-size:22px}.activity-link span{font-size:15px;color:#415873}.activity-hero{background:linear-gradient(130deg,#effaff,#fff);padding:26px}.activity-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}.activity-cards img{width:100%;height:auto;border-radius:12px}.activity-cards figure{margin:0}.activity-cards figcaption{padding:10px 0}.activity-feature{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:22px;align-items:center}.activity-feature img{width:100%;height:auto;border-radius:12px}@media(max-width:650px){.activity-feature{grid-template-columns:1fr}}.activity-search input{padding:12px;font:inherit;max-width:100%;width:330px}.activity-search button{padding:12px;font:inherit}form input,form select{max-width:100%}</style>';
 function serviceCards(){return '<section><h2>필요한 이동 방식을 선택하세요</h2><div class="activity-cards"><figure><a href="/daeri/"><img src="/assets/smart24-daeri-brand.png" alt="스마트전국대리운전 1811-4294 상담 명함" width="1200" height="800" loading="lazy"></a><figcaption><h3>고객 차량으로 함께 귀가</h3><p>식사·모임·골프 후 대리운전을 상담하세요.</p><a href="/daeri/">대리운전 이용 안내 →</a></figcaption></figure><figure><a href="/taksong/"><img src="/assets/smart24-taksong-brand.png" alt="스마트24시전국탁송 1811-4294 상담 명함" width="1200" height="800" loading="lazy"></a><figcaption><h3>차량만 이동하거나 회수</h3><p>산행·라이딩 후 차량 회수와 장거리 이동을 상담하세요.</p><a href="/taksong/">자동차탁송 이용 안내 →</a></figcaption></figure></div></section>'}
 function searchForm(){return '<form class="activity-search" action="/keyword-search/" method="get"><label for="destination-search">방문 장소 또는 출발 지역</label><p><input id="destination-search" name="q" maxlength="80" placeholder="설악산·영덕해맞이공원·강릉"><button>이동 안내 찾기</button></p></form>'}
 function activityHub(){const base='https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr');return layout('방문 장소별 대리운전·탁송 안내','맛집·숙소·골프·행사 후 귀가, 산행·자전거 종주 후 차량 회수. 예상요금 조회와 상담 1811-4294.',activityStyle+'<section class="activity-hero"><h2>방문은 편하게, 귀가와 차량 이동은 미리 준비하세요</h2><p>어디에서 출발하시나요? 이용 목적에 맞는 안내를 선택하고 출발지·도착지로 예상요금을 확인하세요.</p><p><a class="cta" href="tel:18114294">전화 상담 1811-4294</a> <a href="/fare/">예상요금 조회 →</a></p>'+searchForm()+'</section>'+serviceCards()+topicCards(),base+'/activities/','https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr')+'/assets/smart24-daeri-brand.png')}
 function topicPage(topic,requestedKind){
  const g=guide(topic),base='https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr'),isDriver=requestedKind?requestedKind==='daeri':['맛집','카페','골프장','축제','펜션'].includes(topic),kind=isDriver?'daeri':'taksong';
  const examples=live.filter(x=>categoryOf(x)===topic).slice(0,24),provinces=regions.filter(r=>r.level==='시도');
  const feature='<section class="activity-feature"><a href="tel:18114294"><img src="/assets/smart24-'+kind+'-brand.png" alt="'+(isDriver?'스마트전국대리운전':'스마트24시전국탁송')+' 1811-4294 상담 명함" width="1200" height="800"></a><div><h2>'+esc(catalog.themes[topic])+'</h2><p>'+esc(g[1])+'</p><p><a class="cta" href="tel:18114294">예약·요금 상담 1811-4294</a></p><p><a href="/fare/?service='+kind+'">출발·도착지로 예상요금 조회 →</a></p></div></section>';
  const details='<section><h2>'+esc(g[2])+'</h2><p>'+esc(g[3])+'</p></section>';
  const form='<section><h2>실제 출발지·도착지로 예상요금 확인</h2><form action="/fare/" method="get"><label>출발 주소 <input name="from" required maxlength="120" placeholder="차량이 있는 주차장·시설 주소"></label> <label>도착 주소 <input name="to" required maxlength="120"></label> <label>서비스 <select name="service"><option value="daeri"'+(isDriver?' selected':'')+'>대리운전</option><option value="taksong"'+(!isDriver?' selected':'')+'>탁송</option></select></label><input name="auto" type="hidden" value="1"><button class="cta">도로거리·예상요금 조회</button></form><p>조회 금액은 참고요금입니다. 경유·대기·주차비·통행료와 기사 이동 조건을 확인해 최종 금액을 상담합니다.</p></section>';
  const known=examples.length?'<section><h2>장소·코스별 이동 안내</h2><div class="activity-grid">'+examples.map(x=>'<a class="activity-link" href="'+url(x)+'"><strong>'+esc(x.term)+'</strong><span>출발·인계 준비와 지역 안내 →</span></a>').join('')+'</div></section>':'';
  const local='<section><h2>출발 지역에서 서비스 찾기</h2><p>시·도에서 시·군·구, 읍·면·동으로 이동해 출발 지역을 선택하세요.</p><ul>'+provinces.map(r=>'<li>'+esc(r.name)+' · <a href="'+servicePath(r,'daeri')+'">대리운전</a> · <a href="'+servicePath(r,'taksong')+'">탁송</a></li>').join('')+'</ul></section>';
  return layout(topicTitles[topic]+(requestedKind?' | '+serviceLabel(kind):''),topicTitles[topic]+'. '+g[1]+' 예상요금 조회·전화 상담 1811-4294.',activityStyle+'<nav><a href="/activities/">방문 장소별 안내</a> / '+esc(topic)+'</nav>'+'<p><a href="/daeri/activities/'+topicSlugs[topic]+'/">'+esc(topic)+' 대리·대리운전</a> · <a href="/taksong/activities/'+topicSlugs[topic]+'/">'+esc(topic)+' 탁송</a></p>'+feature+details+form+known+(['해수욕장','포구','항구'].includes(topic)?'<section><h2>전국 해변·항구에서 찾기</h2><p><a href="/coast/">시·도별 해수욕장·해변·포구·항구 대리운전·탁송</a></p></section>':'')+local+'<section><h2>다른 서비스 안내</h2><p><a href="/daeri/">대리운전</a> · <a href="/taksong/">자동차탁송</a></p></section>',base+(requestedKind?'/'+kind+topicUrl(topic):topicUrl(topic)),base+'/assets/smart24-'+kind+'-brand.png');
 }
 function search(q,page,category){
  const selected=Object.hasOwn(catalog.themes,category)?category:'';
  const categoryOf=x=>({'해변':'해수욕장','리조트':'펜션','호수':'유원지','공원':'유원지','관광지':'유원지'}[x.category]||x.category);
  const categories=activityStyle+topicCards();
  const query=String(q||'').normalize('NFKC').trim().slice(0,80),serviceMatch=compact(query).match(/(대리운전|대리|탁송)$/),requestedKind=serviceMatch?(serviceMatch[1]==='탁송'?'taksong':'daeri'):null,needle=compact(query).replace(/(?:대리운전|대리|탁송)$/,'').replace(/강화도/g,'강화').replace(/제주도/g,'제주'),size=30;
  const p=Math.max(1,Math.min(10000,Math.floor(Number(page)||1)));
  const candidates=[],seen=new Set();let matchedCount=0;const offset=(p-1)*size;const take=row=>{if(seen.has(row.url))return;seen.add(row.url);if(matchedCount>=offset&&candidates.length<size)candidates.push(row);matchedCount++};
  if(needle)for(const row of coastal.search(query))take(row);
  if(requestedKind)for(const topic of Object.keys(topicSlugs))if(compact(topic)===needle)take({term:topic+' '+serviceLabel(requestedKind),url:'/'+requestedKind+topicUrl(topic)});
  for(const x of live)if((!selected||categoryOf(x)===selected)&&(!needle||compact(x.term).includes(needle)||x.regions.some(s=>compact(bySlug.get(s)?.full_name||'').includes(needle)))){if(requestedKind)take({term:x.term+' '+serviceLabel(requestedKind),url:url(x,requestedKind)});else take({term:x.term,url:url(x)});}
  if(needle)for(const r of regions){const aliases=[r.full_name,r.name,r.name.replace(/(?:특별자치시|특별시|광역시|특별자치도|도|시|군|구|읍|면|동|리)$/,'')];if(r.full_name==='강원특별자치도')aliases.push('강원도');if(r.full_name==='전북특별자치도')aliases.push('전라북도');if(aliases.some(a=>compact(a)===needle))for(const kind of requestedKind?[requestedKind]:['daeri','taksong'])take({term:r.full_name+' '+serviceLabel(kind),url:servicePath(r,kind)});}
  // Generated expressions link to substantive existing pages, never make a thin page per term.
  if(needle)for(const r of regions){
   const variants=topic=>[r.full_name+topic,r.name+topic,r.name.replace(/(특별자치시|특별시|광역시|특별자치도|도|시|군|구|읍|면|동|리)$/,'')+topic];
   if(needle&&!compact(r.full_name).includes(needle)&&!Object.keys(catalog.themes).some(t=>variants(t).some(v=>compact(v).includes(needle))))continue;
   for(const topic of Object.keys(catalog.themes)){
    if(selected&&selected!==topic)continue;
    const term=r.full_name+' '+topic+(requestedKind?' '+serviceLabel(requestedKind):'');
    if(!needle||variants(topic).some(v=>compact(v).includes(needle)))take({term,url:servicePath(r,requestedKind||(['맛집','카페','골프장','축제'].includes(topic)?'daeri':'taksong'))+'#destination-guide'});
   }
  }
  const total=matchedCount,last=Math.max(1,Math.ceil(total/size));if(p>last)return search(query,last,selected);const actual=p,rows=candidates;
  const nav=n=>'/keyword-search/?q='+encodeURIComponent(query)+'&category='+encodeURIComponent(selected)+'&page='+n;
  const body='<section><h2>'+esc(selected||'방문 장소')+' · 귀가·차량 이동 안내 찾기</h2><form action="/keyword-search/" method="get"><input type="hidden" name="category" value="'+esc(selected)+'"><label for="keyword-q">키워드</label> <input id="keyword-q" name="q" value="'+esc(query)+'" maxlength="80" placeholder="강화 맛집·산정호수·설악산·자전거"><button>검색</button></form><p>방문 장소와 출발 지역에 맞는 귀가·차량 이동 안내를 선택하세요.</p><p>일치 '+total.toLocaleString('ko-KR')+'개 · '+actual+'/'+last+'페이지</p><ul>'+rows.map(x=>'<li><a href="'+esc(x.url)+'">'+esc(x.term)+'</a></li>').join('')+'</ul><nav>'+(actual>1?'<a href="'+esc(nav(actual-1))+'">이전</a> · ':'')+(actual<last?'<a href="'+esc(nav(actual+1))+'">다음</a>':'')+'</nav></section>'+categories;
  return layout('방문 장소·출발 지역 검색','전국 지역·목적지·활동 키워드로 귀가·차량 이동 안내 찾기',body,'https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr')+'/keyword-search/').replace('<meta name="robots" content="index,follow,max-image-preview:large">','<meta name="robots" content="noindex,follow">');
 }
 return {coastal,summary,search,activityHub,topicPage,topicUrl,topicFromSlug,activityUrls:['/activities/',...Object.keys(topicSlugs).map(topicUrl),...Object.keys(topicSlugs).flatMap(t=>['daeri','taksong'].map(k=>'/'+k+topicUrl(t)))],regionSection,itemPage,byId,byTerm,url,newUrls:[...live.filter(x=>!existing.has(compact(x.term))).map(url),...live.flatMap(x=>['daeri','taksong'].map(k=>url(x,k))),...coastal.urls],compact};
};
