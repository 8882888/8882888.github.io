'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const ROOT=__dirname,PORT=Number(process.env.PORT||3000),BRAND='스마트전국대리운전 스마트24탁송',PHONE='1811-4294';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const load=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const regions=load('data/regions.json').regions||[];
const rides=load('data/ride-history.json');
const verifiedRides=Array.isArray(rides)?rides.filter(x=>x.status==='completed'&&x.verified===true):[];
const clean=s=>String(s||'').trim().slice(0,80);
const canonical=(slug)=>'/region/'+encodeURIComponent(slug)+'/';
const link=(slug)=>'https://'+(process.env.PUBLIC_HOST||'8882888.github.io')+canonical(slug);
const layout=(title,desc,body,canonicalUrl)=>`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | ${BRAND}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(canonicalUrl)}"><style>*{box-sizing:border-box}body{margin:0;background:#f4f7fc;color:#15243a;font:17px/1.8 system-ui,'Malgun Gothic',sans-serif}header,footer{background:#102544;color:#fff;padding:20px 5%}header a,footer a{color:#ffdc50}main{max-width:940px;margin:auto;padding:14px}section{background:#fff;padding:20px;border-radius:12px;margin:15px 0;border:1px solid #d6e0ee}h1{font-size:clamp(25px,5vw,38px)}h2{font-size:23px}a{color:#07539c}.cta{display:inline-block;background:#ffe05d;color:#15243a;padding:12px 20px;border-radius:10px;font-weight:800;text-decoration:none}li{margin:7px 0}@media(max-width:600px){section{padding:15px}}</style></head><body><header><a href="/">홈</a> · <a href="/region/">전국 지역 검색</a><h1>${esc(title)}</h1><p>${BRAND}</p></header><main>${body}</main><footer>상담 ${PHONE} · 실제 배차·요금은 상담 후 확인</footer></body></html>`;
function regionPage(r){const n=esc(r.name),parent=r.parent_name==='대한민국'?'':esc(r.parent_name)+' ',full=parent+n;
const intro=`${full} 지역에서 이용할 수 있는 대리운전, 자동차탁송, 장거리탁송, 일일기사 서비스와 예약 시 확인할 사항을 안내합니다.`;
const matches=verifiedRides.filter(x=>[x.departure,x.destination].some(v=>String(v||'').includes(r.name))).slice(0,12);
const records=matches.length?'<ul>'+matches.map(x=>'<li>'+esc([x.date,x.time,x.departure+' → '+x.destination,x.fare].filter(Boolean).join(' · '))+'</li>').join('')+'</ul>':'<p>현재 이 지역명과 일치하는 공개 운행정보가 없습니다. 운행후기가 없어도 서비스 이용 안내와 상담은 가능합니다.</p>';
const children=regions.filter(x=>x.parent_name===r.name).slice(0,100);
const body=`<section><h2>${full} 운전 서비스</h2><p>${intro}</p><p>지역 안내는 기사 상주나 배차 확정을 의미하지 않습니다.</p><a class="cta" href="tel:18114294">전화 상담 ${PHONE}</a></section>
<section><h2>${full} 대리운전 안내</h2><p>식당, 숙박시설, 주거지, 업무시설 등 실제 출발지의 상세 위치와 도착지, 출발 예정 시각을 확인합니다. 야간·주말·외곽 출발은 기사 이동 거리와 복귀 교통편에 따라 배차가 지연될 수 있으므로 미리 예약 조건을 확인하는 것이 좋습니다.</p><p>단거리뿐 아니라 다른 시·군·구로 이동하는 장거리 대리운전도 출발지, 목적지, 희망 시각을 기준으로 상담합니다.</p></section>
<section><h2>${full} 자동차탁송·장거리탁송 안내</h2><p>차량 인수 장소와 인계 장소가 다른 경우, 차량 이동이 필요한 경우에 탁송 상담을 이용할 수 있습니다. 차종, 수동변속기 여부, 운행 가능 상태, 인수·인계 시간, 경유지, 통행료 조건을 확인해야 정확한 운행 가능 여부를 안내할 수 있습니다.</p><p>심야·장거리·외곽 탁송은 이동 거리 외에도 기사 수급과 복귀 조건이 참고요금에 영향을 줄 수 있습니다. 확정 요금은 상담 후 안내합니다.</p></section>
<section><h2>${full} 일일기사·골프장·출장</h2><p>일일기사는 편도 이동과 달리 운행 시작·종료 시각, 대기 시간, 경유지와 복귀 일정을 확인합니다. 골프장 방문은 티오프 시각과 예상 라운딩 종료 시각, 지방출장은 일정과 목적지를 함께 전달하면 상담이 원활합니다.</p></section>
<section><h2>예약 전에 확인할 내용</h2><p>이용 날짜와 시간, 정확한 출발·도착 주소, 차량 종류, 경유·대기 여부, 인수·인계 조건을 알려주세요. 특정 지역의 기사 상주나 즉시 배차를 보장하지 않습니다.</p></section>
<section><h2>${full} 관련 공개 운행정보</h2><p>아래 기록은 완료 상태와 검증 여부가 모두 확인된 공개용 운행정보만 표시합니다. 검증되지 않은 기록은 표시하지 않습니다.</p>${records}</section>
${children.length?'<section><h2>하위 지역 살펴보기</h2><ul>'+children.map(x=>'<li><a href="'+canonical(x.slug)+'">'+esc(x.name)+' 대리운전·탁송</a></li>').join('')+'</ul></section>':''}`;
return layout(full+' 대리운전·탁송·일일기사',intro,body,link(r.slug));}
function respond(res,status,body,type='text/html; charset=utf-8'){res.writeHead(status,{'content-type':type,'x-content-type-options':'nosniff'});res.end(body)}
http.createServer((req,res)=>{let u;try{u=new URL(req.url,'http://localhost')}catch{return respond(res,400,'잘못된 요청')};let pathname;try{pathname=decodeURIComponent(u.pathname)}catch{return respond(res,400,'잘못된 주소')}
if(pathname==='/health')return respond(res,200,JSON.stringify({ok:true,regions:regions.length}), 'application/json; charset=utf-8');
if(pathname==='/sitemap.xml'){const base='https://'+(process.env.PUBLIC_HOST||'8882888.github.io');const urls=['/', '/region/',...regions.map(r=>canonical(r.slug))];return respond(res,200,'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(x=>'<url><loc>'+esc(base+x)+'</loc></url>').join('')+'</urlset>','application/xml; charset=utf-8')}
const match=pathname.match(/^\/region\/([^/]+)\/?$/);if(match){const r=regions.find(x=>x.slug===match[1]);return r?respond(res,200,regionPage(r)):respond(res,404,'지역 정보를 찾을 수 없습니다.')}
if(/^\/(?:server\.js|package(?:-lock)?\.json|HOSTING_SETUP\.md|tests\/|\.github\/|node_modules\/|\.env)/i.test(pathname))return respond(res,403,'접근 불가');
let p=path.resolve(ROOT,'.'+pathname);if(!p.startsWith(ROOT+path.sep)&&p!==ROOT)return respond(res,403,'접근 불가');try{if(fs.statSync(p).isDirectory())p=path.join(p,'index.html');const ext=path.extname(p).toLowerCase();const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};if(!types[ext])return respond(res,403,'허용되지 않는 형식');return respond(res,200,fs.readFileSync(p),types[ext])}catch{return respond(res,404,'페이지를 찾을 수 없습니다')}
}).listen(PORT,'0.0.0.0',()=>console.log('Dynamic website listening on '+PORT));
