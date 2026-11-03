'use strict';
// User-requested 63 locality combinations. These are search intents, not
// completed trip claims, verified prices, local offices or 63 SEO doorway pages.
const catalog=require('../data/blog-regional-keywords.json');
const groups=catalog.groups;
const compact=s=>String(s||'').normalize('NFKC').replace(/[\s·_\-.,()/]+/g,'');
const suffixes=groups.flatMap(group=>group.keywords.map(keyword=>({
 suffix:keyword,key:compact(keyword),kind:group.kind,group:group.id
}))).sort((a,b)=>b.key.length-a.key.length);
function parse(query){
 const key=compact(query);
 for(const entry of suffixes){
  if(key.endsWith(entry.key)&&key.length-entry.key.length>=2){
   return {region:key.slice(0,-entry.key.length),kind:entry.kind,
    suffix:entry.suffix,group:entry.group};
  }
 }
 return null;
}
const serviceLink={
 "장거리탁송":"/service/long-distance-taksong/",
 "렌트카탁송":"/business/rental-car/","렌터카탁송":"/business/rental-car/",
 "사고대차탁송":"/business/rental-car/",
 "서비스센터탁송":"/service/taksong/",
 "중고차탁송":"/business/used-car/","중고차매매탁송":"/business/used-car/",
 "중고차경매장탁송":"/business/auction/",
 "수출차량탁송":"/business/export-port/",
 "화물차탁송":"/service/heavy-truck-taksong/",
 "1톤탁송":"/service/heavy-truck-taksong/","2.5톤탁송":"/service/heavy-truck-taksong/",
 "5톤탁송":"/service/heavy-truck-taksong/","윙바디탁송":"/service/heavy-truck-taksong/",
 "덤프탁송":"/service/heavy-truck-taksong/","특장차탁송":"/service/heavy-truck-taksong/",
 "골프장대리운전":"/service/golf/","골프대리운전":"/service/golf/",
 "골프장왕복기사":"/service/daily-driver/","골프장일일기사":"/service/daily-driver/",
 "일일기사":"/service/daily-driver/","일일기사업체":"/service/daily-driver/",
 "일일기사예약":"/service/daily-driver/","수행기사":"/service/daily-driver/",
 "법인대리운전":"/service/corporate/","법인카드대리운전":"/service/corporate/",
 "법인대리운전업체":"/service/corporate/","법인대리운전회사":"/service/corporate/",
 "산행탁송":"/route-taksong/","종주탁송":"/route-taksong/",
 "자전거종주탁송":"/special/cycling-trail-transport/"
};
const picks={
 taksong:{province:[[0,1,3,5,7,10,12,14,16],[0,1,2,3,6,7,9,10,15,18,20]],
 district:[[0,1,2,5,12,14],[0,1,3,6,9,16]],town:[[0,1,14],[0,3,9]],neighborhood:[]},
 daeri:{province:[[0,1,3,6,8,9,12,13,14,15],[0,1,2,3,4,5,6,7]],
 district:[[0,1,6,9,13,14],[0,1,3,4,6]],town:[[0,7,9],[2,4,6]],neighborhood:[]}
};
function render({name,kind,scope,esc}){
 const selections=picks[kind]?.[scope]||[];
 if(!selections.length)return '';
 const related=groups.filter(g=>g.kind===kind);
 const sections=related.map((group,index)=>{
  const selected=(selections[index]||[]).map(i=>group.keywords[i]).filter(Boolean);
  if(!selected.length)return '';
  const links=selected.map(s=>'<a href="'+(serviceLink[s]||'/'+kind+'/')+'">'+esc(name+s)+'</a>');
  return '<section><h3>'+esc(name+' '+group.title)+'</h3><p>'+esc(group.description)+'</p><p>'+links.join(' · ')+'</p></section>';
 }).join('');
 if(!sections)return '';
 return '<section id="regional-blog-keyword-guide" aria-label="'+esc(name)+' 지역 서비스별 블로그형 안내">'+
  '<h2>'+esc(name)+' 지역 서비스별 예약·이용 안내</h2>'+
  '<p>검색어마다 별도의 지점이나 실제 운행완료 후기가 존재한다는 뜻은 아닙니다. 출발·도착지와 요청하시는 서비스를 확인해 상담합니다.</p>'+
  sections+'<p><a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(name)+'">지역별 예상요금 조회</a> · <a href="/reviews/history/?kind='+kind+'">검증된 실제 운행기록 확인</a> · <a href="tel:18114294">상담 1811-4294</a></p></section>';
}
// High-priority explicit locality+intent combinations. Keep SEO anchored on
// the existing regional service URLs; no new thin or duplicate landing pages.
const priority=require('../data/blog-priority-regional-keywords.json');
const work100=require('../data/blog-regional-work-100.json');
const targeted=new Map();
for(const row of priority.keywords){
 const key=row.region+'|'+row.kind;
 if(!targeted.has(key))targeted.set(key,[]);
 targeted.get(key).push(row.keyword);
}
const guideText=new Map(priority.regionalGuides.map(x=>[x.region+'|'+x.kind,x.description]));
const workByKey=new Map();
for(const group of work100.groups){
 const key=group.region+'|'+group.kind;
 if(workByKey.has(key))throw Error('Duplicate 100-work area '+key);
 workByKey.set(key,group);
 const old=targeted.get(key)||[];
 targeted.set(key,[...new Set([...old,...group.keywords])]);
 if(!guideText.has(key))guideText.set(key,group.guide);
}
function focused({region,kind,label,esc}){
 const key=region+'|'+kind;
 const words=targeted.get(key)||[];
 if(!words.length)return '';
 const note=guideText.get(key);
 if(!note)throw Error('Missing service-specific context for '+key);
 const tags=words.map(word=>'<strong>'+esc(word)+'</strong>').join(' · ');
 const topics=groups.filter(g=>g.kind===kind).map(g=>g.title).join(' · ');
 const extra=kind==='taksong'?'차량 인수·인계 및 기사 접근·복귀':'출발 위치·예약 시간과 기사 접근·복귀';
 return '<section id="regional-priority-search-guide" aria-label="'+esc(label)+' 우선 지역 검색어 안내">'+
  '<h2>'+esc(label)+' '+(kind==='taksong'?'차량탁송':'대리운전')+' 지역별 이용 가이드</h2>'+
  '<p>'+tags+'</p><h3>예약 전에 확인할 사항</h3>'+
  '<p>'+esc(note)+'</p>'+(workByKey.has(key)&&workByKey.get(key).guide!==note?'<p>'+esc(workByKey.get(key).guide)+'</p>':'')+'<p>'+esc(extra)+' 여건을 실제 주소 기준으로 확인합니다. 검색어는 업체 지점·기사 상주 또는 실제 운행 완료를 뜻하지 않습니다.</p>'+
  '<p>관련 이용 유형: '+esc(topics)+'. <a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(region)+'">예상요금 확인</a> · <a href="/reviews/history/?kind='+kind+'">실제 운행기록</a> · <a href="tel:18114294">상담 1811-4294</a></p></section>';
}
const focusedLinks=[...targeted].map(([key,words])=>{
 const pos=key.lastIndexOf('|');
 return {region:key.slice(0,pos),kind:key.slice(pos+1),title:words.slice(0,2).join(' · ')+(words.length>2?' 외 '+(words.length-2)+'개':'')};
});
module.exports={catalog,groups,suffixes,parse,render,priority,work100,focused,focusedLinks};
