/* Regional route phrase recognition. This does not create indexable pages or claim search rankings. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const suffix=/((?:자동차|장거리|차량|일반|전국)?탁송|대리운전|차량이동|차량탁송|운전기사|운행)$/g;
const canonical={
'부산기장군':'부산 기장군','부산시기장군':'부산 기장군','기장':'기장군',
'대구시':'대구광역시','대구':'대구광역시',
'부산시':'부산광역시','부산':'부산광역시',
'울산시':'울산광역시','울산':'울산광역시',
'광주시':'광주광역시','광주광역시':'광주광역시',
'대전시':'대전광역시','대전':'대전광역시',
'서울시':'서울특별시','서울':'서울특별시',
'세종시':'세종특별자치시','세종':'세종특별자치시',
'경남':'경상남도','경북':'경상북도','전남':'전라남도','전북':'전북특별자치도',
'충남':'충청남도','충북':'충청북도','강원도':'강원특별자치도'
};
const samples=[
['기장군','대구광역시'],['정관읍','울산광역시'],['해운대','창원시'],
['부산광역시','서울특별시'],['기장군','경산시'],['오색','소공원'],
['성삼재','중산리']
];
function clean(s){
 let n=String(s||'').trim().replace(/\\s+/g,' ');
 n=n.replace(suffix,'').replace(/(?:으로|까지|방향|행|도착|출발)$/g,'').trim();
 return canonical[n]||n;
}
function parse(input){
 let s=String(input||'').trim().replace(/[→➜➡＞]/g,' → ').replace(/\\s+/g,' ');
 if(!s||s.length>130)return null;
 const service=/대리운전/.test(s)?'daeri':'taksong';
 s=s.replace(/(자동차탁송|장거리탁송|차량탁송|탁송|대리운전|차량이동|운전기사)/g,' ').replace(/\\s+/g,' ').trim();
 let match=s.match(/^(.+?)\\s*(?:에서|부터|출발|→|에서부터)\\s*(.+?)(?:\\s*(?:까지|도착))?$/);
 if(!match)match=s.match(/^(.+?)\\s+(?:에서|부터|출발|→)\\s+(.+)$/);
 // Unambiguous whitespace-separated two-place route, such as "기장군 대구".
 if(!match){
   const tokens=s.split(' ').filter(Boolean);
   if(tokens.length===2)match=[s,tokens[0],tokens[1]];
 }
 if(!match)return null;
 let from=clean(match[1]),to=clean(match[2]);
 if(!from||!to||from===to||from.length>60||to.length>60)return null;
 return {from,to,service};
}
function routeUrl(from,to,service){
 return '/fare/?'+new URLSearchParams({from,to,service}).toString();
}
function show(inputId,outputId){
 const input=$(inputId),output=$(outputId);
 if(!input||!output)return;
 const route=parse(input.value);
 output.replaceChildren();
 if(!route){
  output.textContent='예: 기장군에서 대구탁송 또는 정관읍 → 울산탁송처럼 입력하세요.';
  return;
 }
 const heading=document.createElement('strong');
 heading.textContent=route.from+' → '+route.to+' · '+(route.service==='daeri'?'대리운전':'자동차탁송');
 const link=document.createElement('a');
 link.href=routeUrl(route.from,route.to,route.service);
 link.textContent='이 구간 예상요금 조회';
 link.style.marginLeft='12px';
 const note=document.createElement('p');
 note.textContent='이 검색어는 홈페이지에서 경로로 인식됩니다. 실제 운행완료 후기 또는 확정요금을 뜻하지 않습니다.';
 output.append(heading,document.createTextNode(' '),link,note);
}
document.addEventListener('DOMContentLoaded',()=>{
 const form=$('regional-route-keyword-form');
 if(form)form.addEventListener('submit',e=>{e.preventDefault();show('regional-route-keyword-input','regional-route-keyword-result')});
 document.querySelectorAll('[data-regional-route-example]').forEach(el=>{
  el.addEventListener('click',()=>{
    const input=$('regional-route-keyword-input');
    if(!input)return;
    input.value=el.getAttribute('data-regional-route-example')||'';
    show('regional-route-keyword-input','regional-route-keyword-result');
  });
 });
});
window.Smart24RegionalRoute={parse,routeUrl,samples};
})();