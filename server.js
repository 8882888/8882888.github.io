'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const ROOT=__dirname,PORT=Number(process.env.PORT||3000),BRAND='스마트전국대리운전 스마트24탁송',PHONE='1811-4294';
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
const bySlug=new Map(regions.map(r=>[r.slug,r]));
const childrenByParent=new Map();
for(const r of regions){if(!r.parent_slug)continue;const a=childrenByParent.get(r.parent_slug)||[];a.push(r);childrenByParent.set(r.parent_slug,a)}

const rides=load('data/ride-history.json');
const verifiedRides=Array.isArray(rides)?rides.filter(x=>x.status==='completed'&&x.verified===true):[];
const clean=s=>String(s||'').trim().slice(0,80);
const compact=s=>String(s||'').replace(/\s+/g,'').toLowerCase();
const shortPlace=s=>String(s||'').replace(/(특별자치시|특별시|광역시|특별자치도|자치시|시|군|구|읍|면|동|리)$/,'');
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
 ['부평역',['부평구']],['인천역',['중구','인천광역시']]
];
const landmarkMatches=(r,query)=>landmarks.some(([name,areas])=>compact(name).includes(compact(query))&&areas.some(a=>regionAncestors(r).some(x=>x.name===a)));
const regionMatches=(r,q)=>placeNames(r).some(n=>compact(n).includes(compact(q)))||landmarkMatches(r,q);
const regionAncestors=r=>{const a=[];let cur=r;while(cur){a.unshift(cur);cur=cur.parent_slug?bySlug.get(cur.parent_slug):null}return a};
const regionContext=r=>({읍:'읍내·인접 마을',면:'면 소재지·인접 마을',리:'마을·인접 읍면',동:'주거지·상업시설',구:'구내 주요 생활권',군:'읍·면·리 지역',시:'시내·외곽 지역',시도:'시·군·구별 지역'})[r.level]||'해당 지역';
const cardSvg=(label)=>{const title=esc(String(label||'전국자동차탁송').slice(0,48));return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${title} 명함"><rect width="1200" height="630" rx="28" fill="#102544"/><rect x="22" y="22" width="1156" height="586" rx="25" fill="none" stroke="#ffd34e" stroke-width="9"/><text x="70" y="112" fill="#ffffff" font-family="sans-serif" font-weight="800" font-size="57">스마트전국대리운전</text><text x="70" y="179" fill="#ffd34e" font-family="sans-serif" font-weight="800" font-size="61">스마트24탁송</text><path d="M70 211H1130" stroke="#ffd34e" stroke-width="4"/><text x="600" y="344" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="${title.length>20?37:title.length>13?46:60}" text-anchor="middle" ${title.length>18?'textLength="1040" lengthAdjust="spacingAndGlyphs"':''}>${title} 대리운전 · 탁송</text><text x="600" y="410" fill="#cce7ff" font-family="sans-serif" font-size="32" text-anchor="middle">전국 대리운전 · 자동차탁송 · 장거리탁송</text><rect x="60" y="450" width="1080" height="123" rx="24" fill="#e02528"/><text x="600" y="539" fill="#ffffff" font-family="sans-serif" font-size="84" font-weight="900" text-anchor="middle">1811-4294</text></svg>`;};
const cardPath=(slug)=>'/card/'+encodeURIComponent(slug)+'.svg';
const canonical=(slug)=>'/region/'+encodeURIComponent(slug)+'/';
const link=(slug)=>'https://'+(process.env.PUBLIC_HOST||'8882888githubio-production.up.railway.app')+canonical(slug);
const layout=(title,desc,body,canonicalUrl,cardUrl)=>`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="naver-site-verification" content="8446ba47770e9410dd00b9382acf43e8287320cb"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | ${BRAND}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(canonicalUrl)}">${cardUrl?`<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${esc(cardUrl)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(cardUrl)}">`:``}<style>*{box-sizing:border-box}body{margin:0;background:#f4f7fc;color:#15243a;font:17px/1.8 system-ui,'Malgun Gothic',sans-serif}header,footer{background:#102544;color:#fff;padding:20px 5%}header a,footer a{color:#ffdc50}main{max-width:940px;margin:auto;padding:14px}section{background:#fff;padding:20px;border-radius:12px;margin:15px 0;border:1px solid #d6e0ee}h1{font-size:clamp(25px,5vw,38px)}h2{font-size:23px}a{color:#07539c}.cta{display:inline-block;background:#ffe05d;color:#15243a;padding:12px 20px;border-radius:10px;font-weight:800;text-decoration:none}li{margin:7px 0}@media(max-width:600px){section{padding:15px}}</style></head><body><header><a href="/">홈</a> · <a href="/region/">전국 지역 검색</a><h1>${esc(title)}</h1><p>${BRAND}</p></header><main>${body}</main><footer>상담 <a href="tel:18114294" aria-label="1811-4294 전화 상담">${PHONE}</a> · 실제 배차·요금은 상담 후 확인</footer></body></html>`;
const localAreaGuides={
 '속초시':{nearby:['양양군','고성군','인제군'],places:['설악동','대포항','속초해수욕장','청호동','조양동'],description:'속초 시내와 관광·숙박 지역에서 출발하는 대리운전, 설악산 산행 후 차량 회수 탁송, 양양·고성·인제 방면 및 수도권 장거리 운행은 출발 장소와 기사 접근·복귀 동선을 함께 확인해야 합니다. 외곽이나 야간에는 예약 시간과 정확한 주차 위치를 미리 알려주세요.'}
};
function regionPage(r){
 const fullName=r.full_name||[r.parent_name==='대한민국'?'':r.parent_name,r.name].filter(Boolean).join(' ');
 const full=esc(fullName),short=esc(r.name),context=esc(regionContext(r));
 const ancestors=regionAncestors(r);
 const breadcrumb='<nav aria-label="지역 경로"><a href="/region/">전국 지역</a> / '+ancestors.map((x,i)=>i===ancestors.length-1?'<strong>'+esc(x.name)+'</strong>':'<a href="'+canonical(x.slug)+'">'+esc(x.name)+'</a>').join(' / ')+'</nav>';
 const title=fullName+' 대리운전·탁송 | '+shortPlace(r.name)+' 대리운전·탁송 상담';
 const shortDaeri=r.name.replace(/(특별자치시|특별시|광역시|특별자치도|자치시|시|군|구)$/,'')+'대리';
 const localDaeri=r.name+'대리';
 const qualifiedDaeri=fullName+' 대리';
 const intro=fullName+' 대리운전·탁송, '+shortPlace(r.name)+' 대리운전·탁송 상담 안내. 정식 행정구역명과 간략 지역명을 함께 안내합니다. 출발지와 도착지, 차종, 예약 시간에 따라 기사 배차 가능 여부와 요금이 달라집니다. 전국대리운전·24시탁송·장거리 서비스도 상담합니다.';
 const matches=verifiedRides.filter(x=>[x.departure,x.destination].some(v=>String(v||'').includes(fullName))).slice(0,12);
 const records=matches.length?'<ul>'+matches.map(x=>'<li>'+esc([x.date,x.time,x.departure+' → '+x.destination,x.fare].filter(Boolean).join(' · '))+'</li>').join('')+'</ul>':'<p>이 지역의 검증된 공개 운행 사례는 아직 등록되지 않았습니다. 실제 운행 실적이나 기사 상주 여부를 추정하여 표시하지 않습니다.</p>';
 const children=childrenByParent.get(r.slug)||[];
 const parent=r.parent_slug?bySlug.get(r.parent_slug):null;
 const serviceTip=({시도:'광역권 이동은 출발 시·군·구와 도착 시·군·구를 함께 알려주시면 상담에 도움이 됩니다.',시:'시내와 외곽의 기사 이동 거리가 다를 수 있어 출발 지점을 구체적으로 알려주세요.',군:'읍·면 지역은 기사 복귀 교통편이 제한될 수 있으므로 희망 출발 시간을 미리 알려주세요.',구:'같은 구 안에서도 번화가와 주거지의 출발 여건이 다를 수 있어 상세 주소가 필요합니다.',읍:'읍 소재지와 외곽 마을의 출발 조건이 다를 수 있으므로 도로명주소 또는 인근 건물을 알려주세요.',면:'면 지역은 야간에 기사 접근 및 복귀 이동이 어려울 수 있으므로 사전 상담을 권합니다.',동:'같은 동에서도 건물 출입구나 주차장 위치에 따라 인수 장소가 달라질 수 있습니다.',리:'리 단위 마을은 주소만으로 위치가 모호할 수 있으므로 진입로·주차 위치와 가까운 지점을 알려주세요.'})[r.level]||'출발 위치를 자세히 알려주세요.';
 const siblingList=parent?(childrenByParent.get(parent.slug)||[]).filter(x=>x.slug!==r.slug).slice(0,8):[];
 const localGuide='<section><h2>'+full+' 출발지 확인 안내</h2><p>'+esc(serviceTip)+'</p><p>지역 구분: '+esc(ancestors.map(x=>x.name).join(' → '))+'</p><p>상담 시 출발 주소와 목적지, 희망 시간, 차량 종류를 알려주시면 조건을 확인할 수 있습니다. 실제 배차 가능 여부는 확인 후 안내합니다.</p></section>';
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
 const body=`${breadcrumb}${localGuide}${localAreaSection}${scenarioSection}<section><h2>${full} 자동차탁송·배차 상담</h2><p>${esc(intro)}</p><p>${context}의 실제 출발 위치에 따라 기사 접근 경로와 배차 조건이 달라질 수 있습니다. 해당 지역의 상주 기사 또는 즉시 배차를 보장하지 않습니다.</p><a class="cta" href="tel:18114294">전화 상담 ${PHONE}</a></section>
 <section><h2>${full} 대리운전 · ${esc(localDaeri)} · ${esc(qualifiedDaeri)}</h2><p>${esc(localDaeri)}는 다른 시·군·구에 같은 지명이 있을 수 있으므로 ${full} 지역을 확인해 상담합니다.</p><h3>${full} 장거리대리운전</h3><p>대리운전 상담 시 정확한 출발지, 목적지, 출발 예정 시각을 알려주세요. 야간·주말 또는 외곽 출발은 기사 이동과 복귀 교통편을 고려해야 합니다. 다른 시·군·구로 이동하는 장거리 운행은 편도 여부와 예상 출발 시간을 함께 확인합니다.</p></section>
 <section><h2>${full} 자동차탁송 · ${short}탁송요금</h2><p>${full} 탁송요금은 단순 직선거리가 아니라 실제 이동 거리, 출발지와 도착지의 접근성, 차량 종류와 운행 상태, 예약 날짜·시간, 통행료, 기사 이동 및 복귀 교통편에 따라 달라질 수 있습니다. 외곽 마을이나 야간 출발은 같은 거리라도 배차 조건이 다를 수 있습니다. 확인되지 않은 고정요금을 표시하지 않으며 출발지·도착지·차종·희망 시간을 확인한 뒤 실제 상담 요금을 안내합니다.</p><h3>${full} 탁송 배차시간·기사 수급</h3><p>배차는 요청 시점에 주변에서 이동할 수 있는 기사와 인수 장소까지의 접근 시간을 함께 확인해야 합니다. 특히 ${context}에서는 시간대와 대중교통·복귀 이동 여건에 따라 배차 소요 시간이 달라질 수 있습니다. 즉시 배차나 상주 기사를 보장하지 않으며, 일정이 정해진 차량 이동은 사전 예약을 권합니다.</p><h3>${full} 탁송 예약 및 차량 인수·인계</h3><p>차량 인수·인계 장소, 도로명주소, 차종, 수동변속기 여부, 운행 가능 상태, 경유지, 통행료 조건과 도착 희망 시간을 준비해 주세요. 서비스센터 입출고, 장거리 차량 이동, 일정이 정해진 차량 회수는 마감 시각도 함께 알려주시면 상담에 도움이 됩니다.</p></section>
 <section><h2>${full} 일일기사·골프장 이동</h2><p>일일기사 이용 시 출발·종료 시각, 대기 시간, 경유지와 왕복 여부를 알려주세요. 골프장 방문이나 지방출장 일정은 도착 희망 시각과 복귀 계획까지 함께 확인하면 좋습니다.</p></section>
 <section><h2>${short} 탁송·대리운전 예약 전 확인사항</h2><p>정확한 도로명주소 또는 인근 위치, 이용 날짜와 시간, 차량 종류, 출발지·도착지, 경유 및 대기 여부를 준비해 주세요. 실제 배차 가능 여부와 요금은 상담 후 확정됩니다.</p></section>
 <section><h2>${full} 실제 공개 운행정보</h2>${records}</section>
 ${nearby}
 ${parent?'<section><h2>상위 지역 안내</h2><p><a href="'+canonical(parent.slug)+'">'+esc(parent.full_name)+' 대리운전·탁송</a></p></section>':''}
 ${children.length?'<section><h2>인접 행정 단계의 하위 지역 찾기</h2><ul>'+children.map(x=>'<li><a href="'+canonical(x.slug)+'">'+esc(x.name)+' 대리운전·탁송</a></li>').join('')+'</ul></section>':''}`;
 const imageUrl="https://"+(process.env.PUBLIC_HOST||"8882888githubio-production.up.railway.app")+cardPath(r.slug);
 const imageData=JSON.stringify({"@context":"https://schema.org","@type":"ImageObject",contentUrl:imageUrl,url:imageUrl,name:fullName+" 대리운전·자동차탁송 지역 명함",description:fullName+" 스마트전국대리운전 스마트24탁송 상담 명함 1811-4294",width:1200,height:630,encodingFormat:"image/svg+xml",representativeOfPage:true}).replace(/</g,"\\u003c");
 return layout(title,intro,`<script type="application/ld+json">${imageData}</script><figure style="margin:15px 0"><img src="${cardPath(r.slug)}" loading="lazy" alt="${full} 스마트전국대리운전 스마트24탁송 지역 명함 1811-4294" width="1200" height="630" style="width:100%;height:auto;border-radius:12px"></figure>`+body,link(r.slug),'https://'+(process.env.PUBLIC_HOST||'8882888githubio-production.up.railway.app')+cardPath(r.slug));
}
function respond(res,status,body,type='text/html; charset=utf-8'){res.writeHead(status,{'content-type':type,'x-content-type-options':'nosniff'});res.end(body)}
http.createServer((req,res)=>{let u;try{u=new URL(req.url,'http://localhost')}catch{return respond(res,400,'잘못된 요청')};let pathname;try{pathname=decodeURIComponent(u.pathname)}catch{return respond(res,400,'잘못된 주소')}
if(pathname==='/region/'||pathname==='/region'){
 const q=clean(u.searchParams.get('q')||'');
 const matches=q?regions.filter(r=>regionMatches(r,q)).slice(0,100):regions.filter(r=>r.level==='시도');
 const links='<ul>'+matches.map(r=>'<li><a href="'+canonical(r.slug)+'">'+esc(r.full_name)+' 대리운전·탁송</a></li>').join('')+'</ul>';
 const form='<form method="get" action="/region/"><label for="q">전국 지역 검색</label> <input id="q" name="q" value="'+esc(q)+'" placeholder="속초·속초시·역삼·역삼동·충북혁신도시·광명역" style="padding:12px;max-width:80%;font-size:17px"> <button style="padding:12px">검색</button></form>';
 return respond(res,200,layout('전국 대리운전·탁송 지역 검색','전국 '+regions.length+'개 지역 검색', '<section><h2>전국 지역 찾기</h2>'+form+'<p>전체 '+regions.length+'개 지역 중 '+(q?'검색 일치 최대 100개':'시·도 목록')+' 표시</p>'+links+'</section>','https://'+(process.env.PUBLIC_HOST||'8882888githubio-production.up.railway.app')+'/region/'));
}
 const cardMatch=pathname.match(new RegExp('^[/]card[/](area-[0-9]+)[.]svg$'));if(cardMatch){const r=bySlug.get(cardMatch[1]);if(!r)return respond(res,404,'명함을 찾을 수 없습니다');res.writeHead(200,{'content-type':'image/svg+xml; charset=utf-8','cache-control':'public, max-age=86400','x-content-type-options':'nosniff'});return res.end(cardSvg(r.full_name));}
if(pathname==='/health')return respond(res,200,JSON.stringify({ok:true,regions:regions.length,source:'public legal-dong hierarchy'}), 'application/json; charset=utf-8');
if(pathname==='/sitemap.xml'){const base='https://'+(process.env.PUBLIC_HOST||'8882888githubio-production.up.railway.app');const urls=['/', '/region/'];const xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'+urls.map(x=>'<url><loc>'+esc(base+x)+'</loc></url>').join('')+regions.map(r=>'<url><loc>'+esc(base+canonical(r.slug))+'</loc><image:image><image:loc>'+esc(base+cardPath(r.slug))+'</image:loc></image:image></url>').join('')+'</urlset>';return respond(res,200,xml,'application/xml; charset=utf-8')}
const match=pathname.match(/^\/region\/([^/]+)\/?$/);if(match){const r=bySlug.get(match[1]);return r?respond(res,200,regionPage(r)):respond(res,404,'지역 정보를 찾을 수 없습니다.')}
if(/^\/(?:server\.js|package(?:-lock)?\.json|HOSTING_SETUP\.md|tests\/|\.github\/|node_modules\/|\.env)/i.test(pathname))return respond(res,403,'접근 불가');
let p=path.resolve(ROOT,'.'+pathname);if(!p.startsWith(ROOT+path.sep)&&p!==ROOT)return respond(res,403,'접근 불가');try{if(fs.statSync(p).isDirectory())p=path.join(p,'index.html');const ext=path.extname(p).toLowerCase();const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};if(!types[ext])return respond(res,403,'허용되지 않는 형식');return respond(res,200,fs.readFileSync(p),types[ext])}catch{return respond(res,404,'페이지를 찾을 수 없습니다')}
}).listen(PORT,'0.0.0.0',()=>console.log('Dynamic website listening on '+PORT));
