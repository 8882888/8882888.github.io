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
const regionAncestors=r=>{const a=[];let cur=r;while(cur){a.unshift(cur);cur=cur.parent_slug?bySlug.get(cur.parent_slug):null}return a};
const regionContext=r=>({읍:'읍내·인접 마을',면:'면 소재지·인접 마을',리:'마을·인접 읍면',동:'주거지·상업시설',구:'구내 주요 생활권',군:'읍·면·리 지역',시:'시내·외곽 지역',시도:'시·군·구별 지역'})[r.level]||'해당 지역';
const cardSvg=(label)=>{const title=esc(String(label||'전국자동차탁송').slice(0,34));return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${title} 명함"><rect width="1200" height="630" rx="28" fill="#102544"/><rect x="22" y="22" width="1156" height="586" rx="25" fill="none" stroke="#ffd34e" stroke-width="9"/><text x="70" y="112" fill="#ffffff" font-family="sans-serif" font-weight="800" font-size="57">스마트전국대리운전</text><text x="70" y="179" fill="#ffd34e" font-family="sans-serif" font-weight="800" font-size="61">스마트24탁송</text><path d="M70 211H1130" stroke="#ffd34e" stroke-width="4"/><text x="600" y="344" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="${title.length>15?54:78}" text-anchor="middle" ${title.length>18?'textLength="1040" lengthAdjust="spacingAndGlyphs"':''}>${title}</text><text x="600" y="410" fill="#cce7ff" font-family="sans-serif" font-size="32" text-anchor="middle">전국 대리운전 · 자동차탁송 · 장거리탁송</text><rect x="60" y="450" width="1080" height="123" rx="24" fill="#e02528"/><text x="600" y="539" fill="#ffffff" font-family="sans-serif" font-size="84" font-weight="900" text-anchor="middle">1811-4294</text></svg>`;};
const cardPath=(slug)=>'/card/'+encodeURIComponent(slug)+'.svg';
const canonical=(slug)=>'/region/'+encodeURIComponent(slug)+'/';
const link=(slug)=>'https://'+(process.env.PUBLIC_HOST||'8882888githubio-production.up.railway.app')+canonical(slug);
const layout=(title,desc,body,canonicalUrl,cardUrl)=>`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="naver-site-verification" content="8446ba47770e9410dd00b9382acf43e8287320cb"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | ${BRAND}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(canonicalUrl)}">${cardUrl?`<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${esc(cardUrl)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(cardUrl)}">`:``}<style>*{box-sizing:border-box}body{margin:0;background:#f4f7fc;color:#15243a;font:17px/1.8 system-ui,'Malgun Gothic',sans-serif}header,footer{background:#102544;color:#fff;padding:20px 5%}header a,footer a{color:#ffdc50}main{max-width:940px;margin:auto;padding:14px}section{background:#fff;padding:20px;border-radius:12px;margin:15px 0;border:1px solid #d6e0ee}h1{font-size:clamp(25px,5vw,38px)}h2{font-size:23px}a{color:#07539c}.cta{display:inline-block;background:#ffe05d;color:#15243a;padding:12px 20px;border-radius:10px;font-weight:800;text-decoration:none}li{margin:7px 0}@media(max-width:600px){section{padding:15px}}</style></head><body><header><a href="/">홈</a> · <a href="/region/">전국 지역 검색</a><h1>${esc(title)}</h1><p>${BRAND}</p></header><main>${body}</main><footer>상담 <a href="tel:18114294" aria-label="1811-4294 전화 상담">${PHONE}</a> · 실제 배차·요금은 상담 후 확인</footer></body></html>`;
function regionPage(r){
 const fullName=r.full_name||[r.parent_name==='대한민국'?'':r.parent_name,r.name].filter(Boolean).join(' ');
 const full=esc(fullName),short=esc(r.name),context=esc(regionContext(r));
 const ancestors=regionAncestors(r);
 const breadcrumb='<nav aria-label="지역 경로"><a href="/region/">전국 지역</a> / '+ancestors.map((x,i)=>i===ancestors.length-1?'<strong>'+esc(x.name)+'</strong>':'<a href="'+canonical(x.slug)+'">'+esc(x.name)+'</a>').join(' / ')+'</nav>';
 const title=fullName+' 대리운전·자동차탁송 안내';
 const shortDaeri=r.name.replace(/(특별자치시|특별시|광역시|특별자치도|자치시|시|군|구)$/,'')+'대리';
 const localDaeri=r.name+'대리';
 const qualifiedDaeri=fullName+' 대리';
 const intro=fullName+' 대리운전, '+fullName+' 탁송 상담 안내. '+localDaeri+'·'+r.name+'대리운전·'+r.name+'탁송 검색 시 상위 행정구역과 출발·도착 위치를 함께 확인합니다. '+qualifiedDaeri+' 상담은 장거리 운행과 일일기사 이용 조건도 안내합니다.';
 const matches=verifiedRides.filter(x=>[x.departure,x.destination].some(v=>String(v||'').includes(fullName))).slice(0,12);
 const records=matches.length?'<ul>'+matches.map(x=>'<li>'+esc([x.date,x.time,x.departure+' → '+x.destination,x.fare].filter(Boolean).join(' · '))+'</li>').join('')+'</ul>':'<p>이 지역의 검증된 공개 운행 사례는 아직 등록되지 않았습니다. 실제 운행 실적이나 기사 상주 여부를 추정하여 표시하지 않습니다.</p>';
 const children=childrenByParent.get(r.slug)||[];
 const parent=r.parent_slug?bySlug.get(r.parent_slug):null;
 const body=`${breadcrumb}<section><h2>${full} 대리운전·탁송 상담</h2><p>${esc(intro)}</p><p>${context}의 실제 출발 위치에 따라 기사 접근 경로와 배차 조건이 달라질 수 있습니다. 해당 지역의 상주 기사 또는 즉시 배차를 보장하지 않습니다.</p><a class="cta" href="tel:18114294">전화 상담 ${PHONE}</a></section>
 <section><h2>${esc(localDaeri)} · ${esc(qualifiedDaeri)} · ${short}대리운전</h2><p>${esc(localDaeri)}는 다른 시·군·구에 같은 지명이 있을 수 있으므로 ${full} 지역을 확인해 상담합니다.</p><h3>${full} 장거리대리운전</h3><p>대리운전 상담 시 정확한 출발지, 목적지, 출발 예정 시각을 알려주세요. 야간·주말 또는 외곽 출발은 기사 이동과 복귀 교통편을 고려해야 합니다. 다른 시·군·구로 이동하는 장거리 운행은 편도 여부와 예상 출발 시간을 함께 확인합니다.</p></section>
 <section><h2>${short}탁송 · ${full} 자동차탁송</h2><p>차량 인수·인계 장소, 차종, 수동변속기 여부, 차량 운행 가능 상태, 희망 시간, 경유지와 통행료 조건을 확인합니다. 서비스센터 입출고나 장거리 차량 이동 등 구체적인 목적에 따라 상담 조건이 달라집니다. 확정 요금은 상담 후 안내합니다.</p></section>
 <section><h2>${full} 일일기사·골프장 이동</h2><p>일일기사 이용 시 출발·종료 시각, 대기 시간, 경유지와 왕복 여부를 알려주세요. 골프장 방문이나 지방출장 일정은 도착 희망 시각과 복귀 계획까지 함께 확인하면 좋습니다.</p></section>
 <section><h2>${short} 지역 예약 전 확인사항</h2><p>정확한 도로명주소 또는 인근 위치, 이용 날짜와 시간, 차량 종류, 출발지·도착지, 경유 및 대기 여부를 준비해 주세요. 실제 배차 가능 여부와 요금은 상담 후 확정됩니다.</p></section>
 <section><h2>${full} 실제 공개 운행정보</h2>${records}</section>
 ${parent?'<section><h2>상위 지역 안내</h2><p><a href="'+canonical(parent.slug)+'">'+esc(parent.full_name)+' 대리운전·탁송</a></p></section>':''}
 ${children.length?'<section><h2>인접 행정 단계의 하위 지역 찾기</h2><ul>'+children.map(x=>'<li><a href="'+canonical(x.slug)+'">'+esc(x.name)+' 대리운전·탁송</a></li>').join('')+'</ul></section>':''}`;
 return layout(title,intro,`<figure style="margin:15px 0"><img src="${cardPath(r.slug)}" alt="${full} 대리운전 탁송 상담 명함 1811-4294" width="1200" height="630" style="width:100%;height:auto;border-radius:12px"></figure>`+body,link(r.slug),'https://'+(process.env.PUBLIC_HOST||'8882888githubio-production.up.railway.app')+cardPath(r.slug));
}
function respond(res,status,body,type='text/html; charset=utf-8'){res.writeHead(status,{'content-type':type,'x-content-type-options':'nosniff'});res.end(body)}
http.createServer((req,res)=>{let u;try{u=new URL(req.url,'http://localhost')}catch{return respond(res,400,'잘못된 요청')};let pathname;try{pathname=decodeURIComponent(u.pathname)}catch{return respond(res,400,'잘못된 주소')}
if(pathname==='/region/'||pathname==='/region'){
 const q=clean(u.searchParams.get('q')||'');
 const matches=q?regions.filter(r=>compact(r.full_name).includes(compact(q))).slice(0,100):regions.filter(r=>r.level==='시도');
 const links='<ul>'+matches.map(r=>'<li><a href="'+canonical(r.slug)+'">'+esc(r.full_name)+' 대리운전·탁송</a></li>').join('')+'</ul>';
 const form='<form method="get" action="/region/"><label for="q">전국 지역 검색</label> <input id="q" name="q" value="'+esc(q)+'" placeholder="시·군·구·읍·면·동·리" style="padding:12px;max-width:80%;font-size:17px"> <button style="padding:12px">검색</button></form>';
 return respond(res,200,layout('전국 대리운전·탁송 지역 검색','전국 '+regions.length+'개 지역 검색', '<section><h2>전국 지역 찾기</h2>'+form+'<p>전체 '+regions.length+'개 지역 중 '+(q?'검색 일치 최대 100개':'시·도 목록')+' 표시</p>'+links+'</section>','https://'+(process.env.PUBLIC_HOST||'8882888githubio-production.up.railway.app')+'/region/'));
}
 const cardMatch=pathname.match(new RegExp('^[/]card[/](area-[0-9]+)[.]svg$'));if(cardMatch){const r=bySlug.get(cardMatch[1]);if(!r)return respond(res,404,'명함을 찾을 수 없습니다');res.writeHead(200,{'content-type':'image/svg+xml; charset=utf-8','cache-control':'public, max-age=86400','x-content-type-options':'nosniff'});return res.end(cardSvg(r.name+'탁송'));}
if(pathname==='/health')return respond(res,200,JSON.stringify({ok:true,regions:regions.length,source:'public legal-dong hierarchy'}), 'application/json; charset=utf-8');
if(pathname==='/sitemap.xml'){const base='https://'+(process.env.PUBLIC_HOST||'8882888githubio-production.up.railway.app');const urls=['/', '/region/',...regions.map(r=>canonical(r.slug))];return respond(res,200,'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(x=>'<url><loc>'+esc(base+x)+'</loc></url>').join('')+'</urlset>','application/xml; charset=utf-8')}
const match=pathname.match(/^\/region\/([^/]+)\/?$/);if(match){const r=bySlug.get(match[1]);return r?respond(res,200,regionPage(r)):respond(res,404,'지역 정보를 찾을 수 없습니다.')}
if(/^\/(?:server\.js|package(?:-lock)?\.json|HOSTING_SETUP\.md|tests\/|\.github\/|node_modules\/|\.env)/i.test(pathname))return respond(res,403,'접근 불가');
let p=path.resolve(ROOT,'.'+pathname);if(!p.startsWith(ROOT+path.sep)&&p!==ROOT)return respond(res,403,'접근 불가');try{if(fs.statSync(p).isDirectory())p=path.join(p,'index.html');const ext=path.extname(p).toLowerCase();const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};if(!types[ext])return respond(res,403,'허용되지 않는 형식');return respond(res,200,fs.readFileSync(p),types[ext])}catch{return respond(res,404,'페이지를 찾을 수 없습니다')}
}).listen(PORT,'0.0.0.0',()=>console.log('Dynamic website listening on '+PORT));
