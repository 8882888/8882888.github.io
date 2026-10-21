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
const verifiedRides=Array.isArray(rides)?rides.filter(x=>x.status==='completed'&&x.verified===true):[];
const clean=s=>String(s||'').trim().slice(0,80);
const compact=s=>String(s||'').replace(/\s+/g,'').toLowerCase();
const shortPlace=s=>String(s||'').replace(/(특별자치시|특별시|광역시|특별자치도|자치시|시|군|구|읍|면|동|리)$/,'');
const regionAliases=r=>{
 const n=r.name,short=shortPlace(n),a=new Set([n,short]);
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
 ['부평역',['부평구']],['인천역',['중구','인천광역시']]
];
const landmarkSlug=name=>'place-'+Buffer.from(name,'utf8').toString('hex');
const landmarkBySlug=new Map(landmarks.map(item=>[landmarkSlug(item[0]),item]));
const landmarkRegions=item=>regions.filter(r=>item[1].some(area=>regionAncestors(r).some(x=>x.name===area))).filter(r=>item[1].includes(r.name)).slice(0,8);
function landmarkPage(item){
 const [name,areas]=item,slug=landmarkSlug(name),base='https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr'),url=base+'/place/'+slug+'/';
 const linked=landmarkRegions(item);
 const category=name.includes('혁신도시')?'혁신도시 생활권':name.endsWith('역')?'철도역 주변':'주요 생활권';
 const desc=name+' 대리운전·탁송 예약, 예상요금 및 빠른배차 상담 안내. 인근 행정구역과 연결되는 이동은 정확한 출발지·도착지와 시간에 따라 배차 조건이 달라집니다.';
 const body='<section><h2>'+esc(name)+' 대리운전·탁송 예약 안내</h2><p>'+esc(category)+'에서 대리운전과 차량탁송을 이용하려면 정확한 출발 위치, 목적지, 날짜와 희망 시간을 알려주세요. 철도역은 승하차 위치와 차량 주차 장소를 확인해야 합니다. 실제 배차 가능 여부는 상담 후 안내합니다.</p><h3>예상요금 확인</h3><p>도로거리·시간대·차량 종류·기사 이동 및 복귀 조건·통행료에 따라 참고요금이 달라질 수 있습니다. 최종 요금은 상담으로 확인합니다.</p><p><a href="/fare/">참고요금 계산기 →</a></p><h3>빠른배차 상담</h3><p>정확한 주소와 차량 위치를 전달하면 기사 배정 가능 여부를 신속히 확인하는 데 도움이 됩니다. 즉시 배차를 보장하지 않습니다.</p><p><a class="cta" href="tel:18114294">예약·요금·빠른배차 '+PHONE+'</a></p></section><section><h2>인근 지역 대리운전·탁송</h2><ul>'+linked.map(r=>'<li><a href="'+canonical(r.slug)+'">'+esc(r.full_name)+' 대리운전·탁송</a></li>').join('')+'</ul><p>인근 지역 연결은 서비스 상담을 위한 정보이며 기사 상주를 의미하지 않습니다.</p></section>';
 return layout(name+' 대리운전·탁송 | 예약·예상요금·빠른배차',desc,body,url);
}
const landmarkMatches=(r,query)=>landmarks.some(([name,areas])=>compact(name).includes(compact(query))&&areas.some(a=>regionAncestors(r).some(x=>x.name===a)));
const regionMatches=(r,q)=>placeNames(r).some(n=>compact(n).includes(compact(q)))||landmarkMatches(r,q);
const regionAncestors=r=>{const a=[];let cur=r;while(cur){a.unshift(cur);cur=cur.parent_slug?bySlug.get(cur.parent_slug):null}return a};
const regionContext=r=>({읍:'읍내·인접 마을',면:'면 소재지·인접 마을',리:'마을·인접 읍면',동:'주거지·상업시설',구:'구내 주요 생활권',군:'읍·면·리 지역',시:'시내·외곽 지역',시도:'시·군·구별 지역'})[r.level]||'해당 지역';
const cardSvg=(label)=>{const title=esc(String(label||'전국자동차탁송').slice(0,48));return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${title} 명함"><rect width="1200" height="630" rx="28" fill="#102544"/><rect x="22" y="22" width="1156" height="586" rx="25" fill="none" stroke="#ffd34e" stroke-width="9"/><text x="70" y="112" fill="#ffffff" font-family="sans-serif" font-weight="800" font-size="57">스마트전국대리운전</text><text x="70" y="179" fill="#ffd34e" font-family="sans-serif" font-weight="800" font-size="61">스마트24탁송</text><path d="M70 211H1130" stroke="#ffd34e" stroke-width="4"/><text x="600" y="344" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="${title.length>20?37:title.length>13?46:60}" text-anchor="middle" ${title.length>18?'textLength="1040" lengthAdjust="spacingAndGlyphs"':''}>${title} 대리운전 · 탁송</text><text x="600" y="410" fill="#cce7ff" font-family="sans-serif" font-size="32" text-anchor="middle">전국 대리운전 · 자동차탁송 · 장거리탁송</text><rect x="60" y="450" width="1080" height="123" rx="24" fill="#e02528"/><text x="600" y="539" fill="#ffffff" font-family="sans-serif" font-size="84" font-weight="900" text-anchor="middle">1811-4294</text></svg>`;};
const cardPath=(slug)=>'/card/'+encodeURIComponent(slug)+'.svg';
const canonical=(slug)=>'/region/'+encodeURIComponent(slug)+'/';
const link=(slug)=>'https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr')+canonical(slug);
const layout=(title,desc,body,canonicalUrl,cardUrl)=>`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="naver-site-verification" content="84fa95fd88543581b31253642e024bcd7afde755"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | ${BRAND}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(canonicalUrl)}">${cardUrl?`<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${esc(cardUrl)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(cardUrl)}">`:``}<style>*{box-sizing:border-box}body{margin:0;background:#f4f7fc;color:#15243a;font:17px/1.8 system-ui,'Malgun Gothic',sans-serif}header,footer{background:#102544;color:#fff;padding:20px 5%}header a,footer a{color:#ffdc50}main{max-width:940px;margin:auto;padding:14px}section{background:#fff;padding:20px;border-radius:12px;margin:15px 0;border:1px solid #d6e0ee}h1{font-size:clamp(25px,5vw,38px)}h2{font-size:23px}a{color:#07539c}.cta{display:inline-block;background:#ffe05d;color:#15243a;padding:12px 20px;border-radius:10px;font-weight:800;text-decoration:none}li{margin:7px 0}@media(max-width:600px){section{padding:15px}}</style></head><body><header><a href="/">홈</a> · <a href="/region/">전국 지역 검색</a><h1>${esc(title)}</h1><p>${BRAND}</p></header><main>${body}</main><footer>상담 <a href="tel:18114294" aria-label="1811-4294 전화 상담">${PHONE}</a> · 실제 배차·요금은 상담 후 확인</footer></body></html>`;
const localAreaGuides={
 '속초시':{nearby:['양양군','고성군','인제군'],places:['설악동','대포항','속초해수욕장','청호동','조양동'],description:'속초 시내와 관광·숙박 지역에서 출발하는 대리운전, 설악산 산행 후 차량 회수 탁송, 양양·고성·인제 방면 및 수도권 장거리 운행은 출발 장소와 기사 접근·복귀 동선을 함께 확인해야 합니다. 외곽이나 야간에는 예약 시간과 정확한 주차 위치를 미리 알려주세요.'}
};
function servicePage(r,kind){
 const service=kind==='taksong'?'탁송':'대리운전',name=r.full_name||r.name,host=process.env.PUBLIC_HOST||'jeongukdaeri.kr';
 const keyword=shortPlace(r.name)+service;
 const qualifiedKeyword=name+' '+service;
 const focusedTitle=keyword+' | '+name+' '+service+' · '+(kind==='taksong'?'자동차탁송·장거리탁송':'장거리대리운전·예약 상담');
 const focusedDesc=keyword+' 및 '+qualifiedKeyword+' 서비스 안내. '+(kind==='taksong'?'차량 인수·인계, 출발지와 도착지, 기사 접근 및 복귀 동선을 확인합니다.':'고객 차량 대리운전, 이용 시간과 출발지·도착지, 기사 배차 여건을 확인합니다.')+' 대표 상담 '+PHONE+'.';
 const aliasTerms=regionAliases(r).map(x=>x+service).filter(x=>x!==name+' '+service);const aliasSection=aliasTerms.length?'<section><h2>지역명별 '+service+' 검색 안내</h2><p>'+esc(aliasTerms.join(' · '))+'은(는) '+esc(name)+' 지역의 동일한 서비스 안내를 가리킵니다. 지역별 별도 업체나 기사 상주를 뜻하지 않습니다.</p></section>':'';
 const intro=kind==='taksong'?'자동차탁송은 고객이 지정한 출발지에서 차량을 인수해 목적지로 이동시키는 서비스입니다. 차량 인수·인계 장소와 차종, 도로거리, 시간대, 기사 접근·복귀 동선, 통행료에 따라 요금이 달라집니다.':'대리운전은 고객 차량을 기사에게 맡겨 목적지까지 이동하는 서비스입니다. 고객의 동승 여부와 이용 조건을 상담 시 확인하며, 출발지·도착지·시간대·장거리 여부·기사 복귀 여건에 따라 요금과 배차가 달라집니다.';
 const matches=verifiedRides.filter(x=>{const raw=String(x.departure||'')+' '+String(x.destination||'');const type=String(x.service||x.service_type||x.kind||'').toLowerCase();return (raw.includes(name)||raw.includes(r.name))&&(kind==='taksong'?/탁송|taksong/.test(type)||(!type&&/탁\//.test(raw)):/대리|daeri/.test(type)||(!type&&!/탁\//.test(raw)))}).slice(0,8);
 const history=matches.length?'<ul>'+matches.map(x=>'<li>'+esc([x.date,x.departure+' → '+x.destination,x.fare].filter(Boolean).join(' · '))+'</li>').join('')+'</ul>':'<p>현재 공개 가능한 이 지역의 검증된 완료 운행 기록이 없습니다. 임의 후기는 게시하지 않습니다.</p>';
 const near=(childrenByParent.get(r.parent_slug)||[]).filter(x=>x.slug!==r.slug).slice(0,8).map(x=>'<li><a href="'+servicePath(x,kind)+'">'+esc(x.full_name)+' '+service+'</a></li>').join('');
 const body='<section><nav><a href="/region/">전국 지역</a> / <a href="'+canonical(r.slug)+'">'+esc(name)+'</a> / '+service+'</nav><h2>'+esc(keyword)+'</h2><h3>'+esc(name)+' '+service+' 전문 안내</h3><p>'+intro+'</p><p>기사 상주를 보장하지 않으며 배차 가능 여부는 상담 시 확인합니다.</p></section>'+remoteRegionGuidance(r)+aliasSection+'<section><h2>'+esc(name)+' '+service+' 상담 명함</h2><p><strong>'+esc(BRAND)+'</strong></p><p><a href="tel:18114294">대표전화 '+PHONE+' 전화 상담</a></p></section><section><h2>예약·예상요금·빠른배차</h2><p>출발지·도착지·출발 시간·차종을 알려주시면 배차 가능 여부와 예상요금을 안내합니다. 추가 비용 여부는 상담 시 확인하세요.</p><p><a href="/fare/">출발지·도착지로 대리운전·탁송 예상요금 확인하기</a></p></section><section><h2>실제 완료 운행후기</h2>'+history+'</section><section><h2>주변 지역 '+service+'</h2><ul>'+near+'</ul></section>'+hierarchyServiceLinks(r,kind)+'<section><h2>관련 서비스</h2><a href="'+servicePath(r,kind==='taksong'?'daeri':'taksong')+'">'+esc(name)+' '+(kind==='taksong'?'대리운전':'탁송')+'</a></section>';
 return layout(focusedTitle,focusedDesc,body,'https://'+host+servicePath(r,kind),null);
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
 return '<section><h2>'+esc(full)+' 장거리탁송·대리운전 지역별 배차 안내</h2><p>'+esc(match[2])+'</p><p>이 지역은 요금계산기에서 기본 거리별 참고요금에 임시 지역 보정 20%를 적용할 수 있습니다. 장거리 대리운전은 탁송 참고요금 대비 약 30% 가산해 추정합니다. 이는 확정 요금이나 기사 상주를 뜻하지 않으며, 실제 출발지·도착지와 시간대에 따라 달라집니다.</p><p><a href="/fare/">대리운전·탁송 예상요금 조회 →</a></p></section>';
}
function regionPage(r){
 const fullName=r.full_name||[r.parent_name==='대한민국'?'':r.parent_name,r.name].filter(Boolean).join(' ');
 const full=esc(fullName),short=esc(r.name),context=esc(regionContext(r));
 const ancestors=regionAncestors(r);
 const breadcrumb='<nav aria-label="지역 경로"><a href="/region/">전국 지역</a> / '+ancestors.map((x,i)=>i===ancestors.length-1?'<strong>'+esc(x.name)+'</strong>':'<a href="'+canonical(x.slug)+'">'+esc(x.name)+'</a>').join(' / ')+'</nav>';
 const title=fullName+' 대리운전·탁송 | '+shortPlace(r.name)+' 대리운전·탁송 상담';
 const serviceLinks='<section><h2>지역별 서비스 상세 안내</h2><p><a href="'+servicePath(r,'daeri')+'">'+full+' 대리운전</a> · <a href="'+servicePath(r,'taksong')+'">'+full+' 탁송</a></p></section>';
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
 const bookingSection='<section><h2>'+full+' 대리운전·탁송 예약 · 예상요금 · 빠른배차 안내</h2><h3>'+full+' 예약 방법</h3><p>출발지와 도착지, 이용 날짜와 시간, 차량 종류를 알려주시면 대리운전 또는 탁송 예약 상담을 진행합니다. 인수·인계 장소와 경유지, 장거리·야간 여부도 함께 확인합니다.</p><h3>'+full+' 예상요금 확인</h3><p>예상요금은 실제 도로거리, 이동 시간, 기사 접근·복귀 조건, 차량 상태, 통행료 및 예약 시간에 따라 달라질 수 있습니다. 홈페이지 참고요금 계산기를 이용할 수 있으며, 최종 요금은 상담 후 안내합니다.</p><p><a href="/fare/">예상요금 계산기 열기 →</a></p><h3>'+full+' 빠른배차 문의</h3><p>정확한 출발 주소와 주차 위치, 희망 출발 시각을 알려주시면 배차 가능 여부를 신속히 확인하는 데 도움이 됩니다. 야간·외곽·장거리에서는 기사 수급에 따라 지연될 수 있으며 즉시 배차는 보장되지 않습니다.</p><p><a class="cta" href="tel:18114294">예약·요금·빠른배차 상담 '+PHONE+'</a></p></section>';
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
 <section><h2>${full} 실제 공개 운행정보</h2>${records}</section>
 ${nearby}
 ${parent?'<section><h2>상위 지역 안내</h2><p><a href="'+canonical(parent.slug)+'">'+esc(parent.full_name)+' 대리운전·탁송</a></p></section>':''}
 ${children.length?'<section><h2>인접 행정 단계의 하위 지역 찾기</h2><ul>'+children.map(x=>'<li><a href="'+canonical(x.slug)+'">'+esc(x.name)+' 지역 안내</a> · <a href="'+servicePath(x,'taksong')+'">'+esc(x.name)+'탁송</a> · <a href="'+servicePath(x,'daeri')+'">'+esc(x.name)+'대리운전</a></li>').join('')+'</ul></section>':''}`;
 const imageUrl="https://"+(process.env.PUBLIC_HOST||"8882888githubio-production.up.railway.app")+cardPath(r.slug);
 const imageData=JSON.stringify({"@context":"https://schema.org","@type":"ImageObject",contentUrl:imageUrl,url:imageUrl,name:fullName+" 대리운전·자동차탁송 지역 명함",description:fullName+" 스마트전국대리운전 스마트24탁송 상담 명함 1811-4294",width:1200,height:630,encodingFormat:"image/svg+xml",representativeOfPage:true}).replace(/</g,"\\u003c");
 return layout(title,intro,`<script type="application/ld+json">${imageData}</script><figure style="margin:15px 0"><img src="${cardPath(r.slug)}" loading="lazy" alt="${full} 스마트전국대리운전 스마트24탁송 지역 명함 1811-4294" width="1200" height="630" style="width:100%;height:auto;border-radius:12px"></figure>`+serviceLinks+body,link(r.slug),'https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr')+cardPath(r.slug));
}
const sitemapCache=new Map();
const majorRegionNames=['서울특별시','부산광역시','인천광역시','대구광역시','광주광역시','대전광역시','울산광역시','세종특별자치시','경기도','강원특별자치도','충청북도','충청남도','전북특별자치도','전라남도','경상북도','경상남도','제주특별자치도'];
const regionQuickNames=['부산광역시','인천광역시','울산광역시','태백시','속초시','강릉시','서울특별시','대구광역시','대전광역시','광주광역시','제주시','수원시','천안시','포항시','창원시','여수시'];
const majorRegions=majorRegionNames.map(n=>regions.find(r=>r.full_name===n)).filter(Boolean);
const quickRegions=regionQuickNames.map(n=>regions.find(r=>r.name===n||r.full_name===n)).filter(Boolean);
function regionServiceLinks(items,kind){const label=kind==='taksong'?'탁송':'대리운전';return '<ul class="region-service-links">'+items.map(r=>'<li><a href="'+servicePath(r,kind)+'">'+esc(r.name+label)+'</a></li>').join('')+'</ul>'}
function hierarchyServiceLinks(r,kind){const label=kind==='taksong'?'탁송':'대리운전';const parent=r.parent_slug?bySlug.get(r.parent_slug):null;const children=childrenByParent.get(r.slug)||[];return '<section><h2>'+esc(r.name)+' 하위 행정구역 '+label+'</h2>'+(parent?'<p>상위 지역: <a href="'+servicePath(parent,kind)+'">'+esc(parent.full_name)+' '+label+'</a></p>':'')+(children.length?regionServiceLinks(children,kind):'<p>등록된 하위 법정 행정구역이 없습니다.</p>')+'</section>'}
function nationwideLinks(){return '<section id="nationwide-service-links" aria-label="전국 지역별 서비스"><h2>전국 지역별 탁송·대리운전 바로가기</h2><p>서비스와 지역을 선택하면 해당 지역의 예약·배차 안내로 이동합니다.</p><h3>전국 탁송</h3>'+regionServiceLinks(quickRegions,'taksong')+'<h3>전국 대리운전</h3>'+regionServiceLinks(quickRegions,'daeri')+'<p><a href="/taksong/">전국 탁송 지역 전체 보기</a> · <a href="/daeri/">전국 대리운전 지역 전체 보기</a></p></section>'}
function serviceHub(kind){const label=kind==='taksong'?'탁송':'대리운전',host=process.env.PUBLIC_HOST||'jeongukdaeri.kr';const body='<section><h1>전국 '+label+' 지역별 안내</h1><p>'+(kind==='taksong'?'자동차탁송은 차량 인수 장소, 도착지, 차종, 기사 이동 및 복귀 조건을 확인하여 상담합니다.':'대리운전은 출발지, 도착지, 희망 시간, 기사 배차와 복귀 여건을 확인하여 상담합니다.')+' 실제 배차 가능 여부와 요금은 상담 시 확인합니다.</p><p><a href="tel:18114294">대표 상담 '+PHONE+'</a></p></section><section><h2>전국 시·도 '+label+'</h2>'+regionServiceLinks(majorRegions,kind)+'</section><section><h2>주요 지역 '+label+'</h2>'+regionServiceLinks(quickRegions,kind)+'</section><section><h2>전국 지역 검색</h2><form action="/region/" method="get"><input type="hidden" name="service" value="'+kind+'"><label>지역명 <input name="q" placeholder="예: 부산, 태백, 속초"></label><button>지역 찾기</button></form><p>지역 검색 후 '+label+' 전용 페이지를 선택할 수 있습니다.</p></section>';return layout('전국 '+label+' | 지역별 '+label+' 예약·상담','전국 시·도 및 주요 지역 '+label+' 서비스 안내. '+PHONE,body,'https://'+host+'/'+kind+'/',null)}
function respond(res,status,body,type='text/html; charset=utf-8'){res.writeHead(status,{'content-type':type,'x-content-type-options':'nosniff'});res.end(body)}
http.createServer((req,res)=>{let u;try{u=new URL(req.url,'http://localhost')}catch{return respond(res,400,'잘못된 요청')};let pathname;try{pathname=decodeURIComponent(u.pathname)}catch{return respond(res,400,'잘못된 주소')}
if(pathname==='/'||pathname==='/index.html'){const home=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');return respond(res,200,home.replace('<!-- DYNAMIC_REGION_LINKS -->',nationwideLinks()))}
if(pathname==='/taksong/'||pathname==='/taksong')return respond(res,200,serviceHub('taksong'));
if(pathname==='/daeri/'||pathname==='/daeri')return respond(res,200,serviceHub('daeri'));
if(pathname==='/region/'||pathname==='/region'){
 const q=clean(u.searchParams.get('q')||'');
 const requestedService=u.searchParams.get('service');
 const selectedService=requestedService==='daeri'||requestedService==='taksong'?requestedService:null;
 const matches=q?regions.filter(r=>regionMatches(r,q)).slice(0,100):regions.filter(r=>r.level==='시도');
 const matchedLandmarks=q?landmarks.filter(item=>compact(item[0]).includes(compact(q))).slice(0,20):[];
 const landmarkLinks=matchedLandmarks.length?'<section><h2>혁신도시·철도역 검색 결과</h2><ul>'+matchedLandmarks.map(item=>'<li><a href="/place/'+landmarkSlug(item[0])+'/">'+esc(item[0])+' 대리운전·탁송</a></li>').join('')+'</ul></section>':'';
 const links='<ul>'+matches.map(r=>'<li>'+(selectedService?'<a href="'+servicePath(r,selectedService)+'">'+esc(r.full_name)+' '+(selectedService==='daeri'?'대리운전':'탁송')+'</a>':'<a href="'+servicePath(r,'daeri')+'">'+esc(r.full_name)+' 대리운전</a> · <a href="'+servicePath(r,'taksong')+'">'+esc(r.full_name)+' 탁송</a>')+'</li>').join('')+'</ul>';
 const form='<form method="get" action="/region/">'+(selectedService?'<input type="hidden" name="service" value="'+selectedService+'">':'')+'<label for="q">전국 지역 검색</label> <input id="q" name="q" value="'+esc(q)+'" placeholder="속초·속초시·역삼·역삼동·충북혁신도시·광명역" style="padding:12px;max-width:80%;font-size:17px"> <button style="padding:12px">검색</button></form>';
 return respond(res,200,layout('전국 대리운전·탁송 지역 검색','전국 '+regions.length+'개 지역 검색', '<section><h2>전국 지역 찾기</h2>'+form+'<p>전체 '+regions.length+'개 지역 중 '+(q?'검색 일치 최대 100개':'시·도 목록')+' 표시</p>'+links+'</section>'+landmarkLinks,'https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr')+'/region/'));
}
 const placeMatch=pathname.match(new RegExp('^/place/(place-[a-f0-9]+)/?$'));if(placeMatch){const item=landmarkBySlug.get(placeMatch[1]);return item?respond(res,200,landmarkPage(item)):respond(res,404,'장소 정보를 찾을 수 없습니다.')}
 const cardMatch=pathname.match(new RegExp('^[/]card[/](area-[0-9]+)[.]svg$'));if(cardMatch){const r=bySlug.get(cardMatch[1]);if(!r)return respond(res,404,'명함을 찾을 수 없습니다');res.writeHead(200,{'content-type':'image/svg+xml; charset=utf-8','cache-control':'public, max-age=86400','x-content-type-options':'nosniff'});return res.end(cardSvg(r.full_name));}
if(pathname==='/health')return respond(res,200,JSON.stringify({ok:true,regions:regions.length,source:'public legal-dong hierarchy'}), 'application/json; charset=utf-8');
if(pathname==='/sitemap-daeri.xml'||pathname==='/sitemap-taksong.xml'){const service=pathname==='/sitemap-daeri.xml'?'daeri':'taksong';const base='https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr');const cached=sitemapCache.get(pathname);if(cached)return respond(res,200,cached,'application/xml; charset=utf-8');const xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+regions.map(r=>'<url><loc>'+esc(base+servicePath(r,service))+'</loc></url>').join('')+'</urlset>';sitemapCache.set(pathname,xml);return respond(res,200,xml,'application/xml; charset=utf-8')}
if(pathname==='/sitemap.xml'){const base='https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr');const urls=['/', '/taksong/', '/daeri/', '/region/', '/business/', '/business/rental-car/', '/business/used-car/', '/business/auction/', '/business/scrapyard/', '/business/export-port/'];const cached=sitemapCache.get(pathname);if(cached)return respond(res,200,cached,'application/xml; charset=utf-8');const xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'+urls.map(x=>'<url><loc>'+esc(base+x)+'</loc></url>').join('')+regions.map(r=>'<url><loc>'+esc(base+canonical(r.slug))+'</loc><image:image><image:loc>'+esc(base+cardPath(r.slug))+'</image:loc></image:image></url>').join('')+landmarks.map(item=>'<url><loc>'+esc(base+'/place/'+landmarkSlug(item[0])+'/')+'</loc></url>').join('')+'</urlset>';sitemapCache.set(pathname,xml);return respond(res,200,xml,'application/xml; charset=utf-8')}
const hierarchicalMatch=pathname.match(/^\/(daeri|taksong)\/([a-z0-9-]+(?:\/[a-z0-9-]+)*)\/?$/);
if(hierarchicalMatch){const r=byPath.get(hierarchicalMatch[2]);if(!r)return respond(res,404,'지역 정보를 찾을 수 없습니다.');const target=servicePath(r,hierarchicalMatch[1]);if(pathname!==target){res.writeHead(301,{location:target});return res.end()}return respond(res,200,servicePage(r,hierarchicalMatch[1]))}
const serviceMatch=pathname.match(/^\/service\/(area-[0-9]+)\/(daeri|taksong)\/?$/);if(serviceMatch){const r=bySlug.get(serviceMatch[1]);if(!r)return respond(res,404,'지역 정보를 찾을 수 없습니다.');res.writeHead(301,{location:servicePath(r,serviceMatch[2])});return res.end()}
const match=pathname.match(/^\/region\/([^/]+)\/?$/);if(match){const r=bySlug.get(match[1]);return r?respond(res,200,regionPage(r)):respond(res,404,'지역 정보를 찾을 수 없습니다.')}
if(/^\/(?:data(?:\/|$)|server\.js|package(?:-lock)?\.json|HOSTING_SETUP\.md|tests\/|\.github\/|node_modules\/|\.env)/i.test(pathname))return respond(res,403,'접근 불가');
let p=path.resolve(ROOT,'.'+pathname);if(!p.startsWith(ROOT+path.sep)&&p!==ROOT)return respond(res,403,'접근 불가');try{if(fs.statSync(p).isDirectory())p=path.join(p,'index.html');const ext=path.extname(p).toLowerCase();const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};if(!types[ext])return respond(res,403,'허용되지 않는 형식');return respond(res,200,fs.readFileSync(p),types[ext])}catch{return respond(res,404,'페이지를 찾을 수 없습니다')}
}).listen(PORT,'0.0.0.0',()=>console.log('Dynamic website listening on '+PORT));
