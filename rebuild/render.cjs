'use strict';
const pages=require('./core-pages.json');
const origin='https://jeongukdaeri.kr';
const byPath=new Map(pages.map(p=>[p.path,p]));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=(p,preview)=>preview&&!byPath.has(p.split('?')[0])?origin+p:p;
const anchor=(p,label,preview)=>'<a href="'+escape(url(p,preview))+'">'+escape(label)+'</a>';
function render(p,{preview=false}={}){
 if(!p)return null;
 const canonical=origin+p.path;
 const service=p.path==='/daeri/'||p.path.includes('daeri')||['/service/golf/','/service/daily-driver/','/service/corporate/'].includes(p.path)?'daeri':'taksong';
 const quote='/fare/?service='+service;
 const schema=JSON.stringify({'@context':'https://schema.org','@type':'WebPage',name:p.title,url:canonical,description:p.intro,inLanguage:'ko-KR',isPartOf:{'@type':'WebSite',name:'스마트24 전국대리운전·전국탁송',url:origin+'/'}}).replace(/</g,'\\u003c');
 const nav=[['/','홈'],['/daeri/','대리운전'],['/taksong/','자동차탁송'],['/special/truck-transport/','화물·특장차'],['/route-taksong/','산행·자전거'],['/fare/','요금조회'],['/reviews/verified/','실제 운행기록']].map(([a,b])=>anchor(a,b,preview)).join('');
 const list=p.related.map(a=>'<li>'+anchor(a,byPath.get(a).label,preview)+'</li>').join('');
 const css='*{box-sizing:border-box}body{margin:0;font:16px/1.65 system-ui,sans-serif;color:#162638;background:#f5f7fa}header,main,footer{max-width:920px;margin:auto;padding:20px}header{border-bottom:1px solid #d6dee7}nav{display:flex;flex-wrap:wrap;gap:12px}a{color:#164a82;text-underline-offset:3px}h1{font-size:clamp(26px,5vw,42px);line-height:1.25}h2{font-size:21px}section{background:white;border:1px solid #d6dee7;border-radius:10px;padding:20px;margin:16px 0}.actions{display:flex;flex-wrap:wrap;gap:10px}.actions a{display:inline-block;padding:12px 16px;background:#174575;color:white;border-radius:6px;text-decoration:none}.preview{border:2px solid #a36b0c;padding:10px}footer{font-size:14px}';
 return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape(p.title)+'</title><meta name="description" content="'+escape(p.intro)+'"><link rel="canonical" href="'+escape(canonical)+'"><meta name="robots" content="'+(preview?'noindex,nofollow':'index,follow')+'"><meta property="og:title" content="'+escape(p.title)+'"><meta property="og:description" content="'+escape(p.intro)+'"><meta property="og:url" content="'+escape(canonical)+'"><meta property="og:type" content="website"><script type="application/ld+json">'+schema+'</script><style>'+css+'</style></head><body><header><strong>스마트24 전국대리운전·전국탁송</strong><nav aria-label="서비스">'+nav+'</nav></header><main>'+(preview?'<p class="preview">독립 개발 미리보기 · 기존 운영 사이트는 변경되지 않았습니다.</p>':'')+'<h1>'+escape(p.title)+'</h1><p>'+escape(p.intro)+'</p><div class="actions"><a href="tel:18114294">전화 1811-4294</a>'+anchor(p.path==='/'?'/fare/':quote,'예상요금 조회',preview)+'</div>'+p.sections.map(s=>'<section><h2>'+escape(s.heading)+'</h2><p>'+escape(s.body)+'</p></section>').join('')+'<section><h2>관련 서비스</h2><ul>'+list+'</ul></section><section><h2>실제 완료 운행기록</h2><p>기존에 확인된 완료 기록은 별도 자료실에서 보존합니다. 과거 요금은 현재 확정 요금이 아닙니다.</p>'+anchor('/reviews/verified/','확인된 운행기록 보기',preview)+'</section></main><footer>스마트24 · <a href="tel:18114294">1811-4294</a> · '+anchor('/fare/','요금조회',preview)+'</footer></body></html>';
}
module.exports={pages,byPath,render,origin};
