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
module.exports={catalog,groups,suffixes,parse,render};
