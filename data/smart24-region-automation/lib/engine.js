'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {localPath,dateOK} = require('./enhance');
const ROOT = '/local-service/';
const services = {daeri:'대리운전',taksong:'탁송'};
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s).normalize('NFKC').replace(/\s+/g,'').toLowerCase();
function validate(d){
 if(!d || !Array.isArray(d.regions)) throw Error('regions 배열 필요');
 const u=new URL(d.origin); if(d.origin!==u.origin||u.protocol!=='https:'||u.pathname!=='/'||u.search||u.hash||u.username||u.password) throw Error('origin은 HTTPS 도메인만 허용');
 if(!/^(?:\d{4}-\d{4}|\d{2,3}-\d{3,4}-\d{4})$/.test(d.phone)) throw Error('전화번호 형식 오류');
 if(typeof d.brand!=='string'||!d.brand.trim()) throw Error('brand 필요');
 const ids=new Set(),names=new Set(),bodies=new Set(),paths=new Set();
 for(const r of d.regions){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.id)||ids.has(r.id)) throw Error('지역 id 중복/오류'); ids.add(r.id);
  if(typeof r.name!=='string'||!r.name.trim()||names.has(norm(r.name))) throw Error('지역명 중복/오류'); names.add(norm(r.name));
  if(!Array.isArray(r.aliases)||r.aliases.some(a=>typeof a!=='string')) throw Error('aliases 오류');
  for(const k of Object.keys(services)){
   const p=r.services?.[k]; if(!p||typeof p.text!=='string'||typeof p.approved!=='boolean') throw Error('서비스 내용/승인 필요');
   if(p.existingPath){
    if(!localPath(p.existingPath)||p.existingPath.startsWith(ROOT)||paths.has(p.existingPath))throw Error('기존 대표 경로 오류/중복');
    paths.add(p.existingPath);
   }
   if(p.details && (!Array.isArray(p.details)||p.details.some(x=>!x||typeof x.place!=='string'||typeof x.guidance!=='string')))throw Error('지역별 준비 안내 형식 오류');
   if(p.approved){
    if(p.text.trim().length<120||!p.reviewedBy?.trim()||!dateOK(p.updatedAt)) throw Error('승인 페이지: 120자 이상 고유 본문, 검토자, 유효한 수정일 필요');
    const key=norm(p.text).split(norm(r.name)).join('지역');
    if(bodies.has(key)) throw Error('지역명만 치환한 중복 본문'); bodies.add(key);
   }
  }
 }
 return d;
}
const route=(r,k)=>ROOT+r.id+'/'+k+'/';
function layout(d,title,description,url,body,indexable,json){
 return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="${indexable?'index,follow':'noindex,follow'}"><link rel="canonical" href="${esc(url)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(url)}"><meta property="og:type" content="website"><style>body{font:17px/1.8 system-ui,sans-serif;margin:0;color:#17324d;background:#f4f8fc}header,main,footer{max-width:940px;margin:auto;padding:24px}a{color:#075eb4}h1{line-height:1.4}article,nav{background:white;padding:24px;border-radius:16px;margin:18px 0}nav a{display:inline-block;margin:8px;padding:8px}label{display:block}input,select,button{font:inherit;padding:10px;max-width:90%}.call{display:block;text-align:center;background:#075eb4;color:white;padding:16px;border-radius:12px}.fixed{position:sticky;bottom:0;background:#fff;padding:12px}p{white-space:pre-line;overflow-wrap:anywhere}</style>${json?'<script type="application/ld+json">'+JSON.stringify(json).replace(/</g,'\\u003c')+'</script>':''}</head><body><header><a href="${ROOT}">${esc(d.brand)}</a><p>24시 대리운전·자동차탁송 상담</p><a class="call" href="tel:${d.phone.replace(/-/g,'')}">요금·배차 상담 ${esc(d.phone)}</a></header><main>${body}</main><footer>요금은 출발지·도착지·차종·이용 시간 확인 후 안내합니다. 배차 가능 여부는 상담 시 확인해 주세요.</footer><div class="fixed"><a class="call" href="tel:${d.phone.replace(/-/g,'')}">전화상담 ${esc(d.phone)}</a></div></body></html>`;
}
function pages(d){
 const out=new Map();
 for(const r of d.regions) for(const [k,label] of Object.entries(services)){
  const p=r.services[k],loc=route(r,k),title=`${r.name}${label} 예약·요금 안내 | ${d.brand}`;
  const related=d.regions.filter(x=>x.id!==r.id&&x.services[k].approved).slice(0,8);
  const body=`<a href="${ROOT}">지역별 서비스</a><h1>${esc(r.name+label)} 예약 안내</h1>${p.approved?'':'<p>검토 중인 안내 초안입니다.</p>'}<article><h2>${esc(r.name)} 이용 안내</h2><p>${esc(p.text)}</p></article><article><h2>${label} 예약 시 알려주실 내용</h2><p>${k==='daeri'?'출발 주차장과 목적지, 출발 시간, 경유지, 장거리 이동 여부를 알려주세요.':'차량 인수·인계 장소, 차종, 키 전달 방법과 인수 가능 시간을 알려주세요.'}</p></article><nav aria-label="관련 서비스"><a href="${route(r,k==='daeri'?'taksong':'daeri')}">${esc(r.name+services[k==='daeri'?'taksong':'daeri'])}</a>${related.map(x=>`<a href="${route(x,k)}">${esc(x.name+label)}</a>`).join('')}</nav>`;
  out.set(loc,{html:layout(d,title,`${r.name} ${label} 출발지·도착지 확인 및 예약 상담. ${p.text.slice(0,90)}`,d.origin+(p.existingPath||loc),body,p.approved&&!p.existingPath,{'@context':'https://schema.org','@type':'Service',name:r.name+label,serviceType:label,areaServed:r.name,url:d.origin+(p.existingPath||loc),provider:{'@type':'Organization',name:d.brand,telephone:d.phone,url:d.origin}}),indexable:p.approved&&!p.existingPath,redirectTo:p.existingPath?d.origin+p.existingPath:null,updatedAt:p.updatedAt});
 }
 const links=[...out].filter(([,p])=>p.indexable||p.redirectTo).map(([url,p])=>{const parts=url.split('/'); const r=d.regions.find(x=>x.id===parts[2]);return `<a href="${p.redirectTo||url}">${esc(r.name+services[parts[3]])}</a>`;}).join('');
 out.set(ROOT,{html:layout(d,'지역별 대리운전·탁송 | '+d.brand,'지역별 예약·차량 인계 안내와 상담',d.origin+ROOT,`<h1>지역별 대리운전·탁송</h1><form action="${ROOT}search" method="get"><label for="q">지역명 또는 지역+서비스 검색</label><input id="q" name="q" required maxlength="100" placeholder="예: 세종탁송"><button>찾기</button></form><nav>${links||'검토가 완료된 지역 안내를 준비하고 있습니다.'}</nav>`,!!links),indexable:!!links});
 return out;
}
function sitemap(d,all){return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+[...all].filter(([,p])=>p.indexable).map(([loc,p])=>`<url><loc>${esc(d.origin+loc)}</loc>${p.updatedAt?'<lastmod>'+p.updatedAt+'</lastmod>':''}</url>`).join('')+'</urlset>';}
function createEngine(file){
 let signature='',snapshot;
 function refresh(){const raw=fs.readFileSync(file,'utf8');const next=crypto.createHash('sha256').update(raw).digest('hex');if(next!==signature){const d=validate(JSON.parse(raw)),all=pages(d);snapshot={d,all};signature=next;}return snapshot;}
 refresh();
 return function handler(req,res){
  const u=new URL(req.url,'http://localhost');
  if(!u.pathname.startsWith(ROOT)&&u.pathname!==ROOT.slice(0,-1))return false;
  let state; try{state=refresh();}catch(e){res.writeHead(503,{'Content-Type':'text/plain; charset=utf-8','X-Robots-Tag':'noindex','Retry-After':'60'});res.end('지역 데이터 검증 실패. 운영자 확인이 필요합니다.');return true;}
  const {d,all}=state;
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return true;}
  const send=(status,text,type='text/html; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?'':text);return true;};
  const redirect=to=>{res.writeHead(301,{Location:to});res.end();return true;};
  if(u.pathname===ROOT+'search'){
   const q=norm(u.searchParams.get('q')||'');const k=q.includes('탁송')?'taksong':'daeri';
   const term=q.replace(/자동차탁송|장거리대리운전|대리운전|탁송/g,'');
   const matches=d.regions.filter(x=>[x.name,...x.aliases].some(a=>norm(a)===term));
   if(matches.length===1){const r=matches[0];return redirect(r.services[k].existingPath?d.origin+r.services[k].existingPath:route(r,k));}
   if(matches.length>1){res.setHeader('X-Robots-Tag','noindex');return send(200,'<h1>지역을 구분해 선택하세요</h1>'+matches.map(r=>'<p><a href="'+esc(r.services[k].existingPath?d.origin+r.services[k].existingPath:route(r,k))+'">'+esc(r.name)+'</a></p>').join(''));}
   res.setHeader('X-Robots-Tag','noindex');return send(404,'지역을 찾을 수 없습니다. <a href="'+ROOT+'">지역 검색으로 돌아가기</a>');
  }
  if(u.pathname===ROOT+'sitemap.xml')return send(200,sitemap(d,all),'application/xml; charset=utf-8');
  const loc=u.pathname.endsWith('/')?u.pathname:u.pathname+'/';
  const p=all.get(loc); if(!p){res.setHeader('X-Robots-Tag','noindex');return send(404,'페이지를 찾을 수 없습니다.');}
  if(p.redirectTo)return redirect(p.redirectTo);
  if(loc!==u.pathname||u.search)return redirect(loc);
  if(!p.indexable)res.setHeader('X-Robots-Tag','noindex, follow');
  return send(200,p.html);
 };
}
module.exports={validate,pages,sitemap,createEngine,ROOT,route};
