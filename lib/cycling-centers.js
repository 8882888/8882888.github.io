'use strict';
const data=require('../data/cycling-certification-centers.json');
const centers=data.centers;
const originalHtml=require('node:fs').readFileSync(require('node:path').join(__dirname,'../route-taksong/centers/index.html'),'utf8');
const originalGuides=(originalHtml.match(/<section id="(?:cycling-centers-original-guide|nationwide-cycle-term-crosslinks-20261102)"[\s\S]*?<\/section>/g)||[]).join('');
const compact=s=>String(s||'').replace(/인증센터|[\s·_(),→↔-]/g,'');
const byId=new Map(centers.map(c=>[c.id,c]));
function find(value){return byId.get(value)||centers.find(c=>[c.name,...c.aliases].some(a=>compact(a)===compact(value)))}
function pair(query){
 const key=compact(query).replace(/(?:차량|자동차)?탁송$/,'');
 for(const from of centers){
  for(const a of [from.name,...from.aliases]){
   const first=compact(a);if(!key.startsWith(first))continue;
   const rest=key.slice(first.length).replace(/^(?:에서|출발)/,'').replace(/(?:까지|도착)$/,'');
   const to=find(rest);if(to&&to.id!==from.id)return {from,to};
  }
 }
 return null;
}
const routeUrl=(from,to)=>'/route-taksong/centers/?'+new URLSearchParams({from:from.id,to:to.id});
function topic(query){const p=pair(query);if(!p)return null;return {slug:'cycling-route',label:p.from.name+' → '+p.to.name+' 인증센터탁송',kind:'taksong',url:routeUrl(p.from,p.to),image:'/keyword-card/cycling-route.svg?'+new URLSearchParams({from:p.from.id,to:p.to.id}),terms:[query],description:'고객 자동차의 인수·인계 구간 상담입니다. 인증센터와 실제 차량 주차 위치는 다를 수 있으며 운행완료·확정요금을 뜻하지 않습니다.'}}
function svg(from,to,esc){return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img"><title>'+esc(from.name+'에서 '+to.name+'까지 인증센터탁송')+'</title><rect width="1200" height="800" rx="24" fill="#103c63"/><text x="65" y="100" fill="#fff" font-size="38">스마트24 · 자전거 종주 후 자동차 회수</text><text x="65" y="235" fill="#b9e9ff" font-size="30">차량 인수 출발지</text><text x="65" y="315" fill="#ffe474" font-size="'+(from.name.length>14?40:55)+'">'+esc(from.name)+' 인증센터</text><text x="65" y="405" fill="#b9e9ff" font-size="30">↓ 차량 인계 도착지</text><text x="65" y="490" fill="#ffe474" font-size="'+(to.name.length>14?40:55)+'">'+esc(to.name)+' 인증센터</text><text x="65" y="610" fill="#fff" font-size="30">양방향·부분 구간 상담 · 실제 주차장 위치 확인</text><text x="65" y="710" fill="#fff" font-size="58">1811-4294</text></svg>'}
function page(params,{layout,esc,host}){
 const query=params.get('q')||'';
 const from=find(params.get('from'))||find(query.replace(/탁송$/,'')),to=find(params.get('to'));
 const selected=from&&to&&from.id!==to.id?{from,to}:pair(query);
 const option=(c,id)=>'<option value="'+c.id+'"'+(c.id===id?' selected':'')+'>'+esc(c.course+' · '+c.name)+'</option>';
 const form='<section><h2>전국 인증센터 출발지·도착지 선택</h2><form method="get" action="/route-taksong/centers/" style="display:grid;gap:12px"><label>차량 인수 출발지<select name="from" required style="display:block;max-width:100%;min-height:48px;font:inherit"><option value="">출발 인증센터 선택</option>'+centers.map(c=>option(c,selected?.from.id||from?.id)).join('')+'</select></label><label>차량 인계 도착지<select name="to" required style="display:block;max-width:100%;min-height:48px;font:inherit"><option value="">도착 인증센터 선택</option>'+centers.map(c=>option(c,selected?.to.id||to?.id)).join('')+'</select></label><button style="min-height:48px;font:inherit" type="submit">인증센터 구간탁송 확인</button></form></section>';
 let result='';
 if(selected){const {from,to}=selected;const keyword=from.name+'인증센터'+to.name+'인증센터탁송';const reverse=to.name+'인증센터'+from.name+'인증센터탁송';
 const fare='/fare/?'+new URLSearchParams({service:'taksong',from:from.name+' 인증센터',to:to.name+' 인증센터',auto:'1'});
 result='<section id="cycling-direction-result"><h2>'+esc(from.name+' → '+to.name+' 인증센터탁송')+'</h2><p>차량 인수: '+esc(from.name)+' 인증센터 주변 주차장 · 차량 인계: '+esc(to.name)+' 인증센터 주변에서 협의한 장소</p><p><strong>'+esc(keyword)+'</strong></p><p><a class="cta" href="'+esc(fare)+'">이 방향 자동차탁송 예상요금 조회</a></p><p><a class="cta" href="'+esc(routeUrl(to,from))+'">출발·도착 바꾸기: '+esc(reverse)+'</a></p><img src="'+esc('/keyword-card/cycling-route.svg?'+new URLSearchParams({from:from.id,to:to.id}))+'" alt="'+esc(keyword)+' 안내 명함" width="1200" height="800" style="width:100%;height:auto"><p>정방향과 역방향은 차량 이동 방향입니다. 자전거길의 자동차 진입 가능 여부·도로거리·기사 접근과 복귀·주차장 위치를 별도로 확인합니다. 실제 운행완료나 고정요금으로 표시한 구간이 아닙니다.</p></section>';
 }
 const groups=[...new Set(centers.map(c=>c.course))];
 const directory=groups.map(course=>'<section><h2>'+esc(course)+' 인증센터탁송</h2><ul>'+centers.filter(c=>c.course===course).map(c=>'<li><strong>'+esc(c.name)+'인증센터탁송</strong> · <a href="'+esc('/route-taksong/centers/?'+new URLSearchParams({from:c.id}))+'">출발지로 선택</a> · <a href="'+esc('/route-taksong/centers/?'+new URLSearchParams({to:c.id}))+'">도착지로 선택</a></li>').join('')+'</ul></section>').join('');
 const body='<section><h1>전국 자전거 인증센터 출발·도착 양방향 탁송</h1><p>공식 안내에 열거된 '+centers.length+'개 장소에서 고객 자동차의 인수·인계 장소를 선택하세요. 차량탁송과 자전거 자체 운송은 구분해 상담합니다.</p><p><a href="'+data.source+'">자전거행복나눔 공식 인증센터 안내</a> · 목록 확인 '+data.checkedOn+' · <a href="tel:18114294">1811-4294</a></p></section>'+form+result+'<section><h2>센터 이름을 붙인 구간 키워드 검색</h2><form method="get"><label>출발→도착 탁송 키워드<input name="q" value="'+esc(query)+'" placeholder="안동댐인증센터 낙동강하구둑인증센터 탁송" style="display:block;width:100%;box-sizing:border-box;font:inherit;min-height:48px"></label><button>구간 키워드 확인</button></form><p>홈페이지 명함 검색에도 두 센터 이름과 탁송을 입력할 수 있습니다. 순서를 바꾸면 반대 방향으로 연결합니다.</p></section>'+directory+originalGuides;
 // Query combinations stay navigable without publishing thousands of templated index pages.
 const html=layout('전국 자전거 인증센터 양방향 차량탁송','국토종주·낙동강 등 인증센터 출발·도착 선택과 반대 방향 차량탁송 상담.',body,'https://'+host+'/route-taksong/centers/');
 return params.size?html.replace('content="index,follow,max-image-preview:large"','content="noindex,follow"'):html;
}
module.exports={centers,find,pair,topic,page,svg,routeUrl};
