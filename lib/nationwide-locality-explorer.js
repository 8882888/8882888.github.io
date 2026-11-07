'use strict';
// Reuse the existing seventeen legal-region source files loaded by server.js.
// This is a regional navigation and estimate intent resolver, not a price,
// dispatch, branch-location or ride-completion database.
const compact=value=>String(value||'').normalize('NFKC').replace(/[\s·_.,()\-/]+/g,'').trim();
const provinceNames={
 '서울특별시':['서울','서울시'],'부산광역시':['부산','부산시'],
 '대구광역시':['대구','대구시'],'인천광역시':['인천','인천시'],
 '광주광역시':['광주','광주시'],'대전광역시':['대전','대전시'],
 '울산광역시':['울산','울산시'],'세종특별자치시':['세종','세종시'],
 '경기도':['경기'],'강원특별자치도':['강원','강원도'],
 '충청북도':['충북'],'충청남도':['충남'],
 '전북특별자치도':['전북','전라북도'],'전라남도':['전남'],
 '경상북도':['경북'],'경상남도':['경남'],
 '제주특별자치도':['제주','제주도']
};
const suffixes=[
 ['대리비견적','daeri',true],['탁송비견적','taksong',true],
 ['대리운전견적','daeri',true],['탁송견적','taksong',true],
 ['대리비','daeri',true],['탁송비','taksong',true],
 ['자동차탁송','taksong',false],['차량탁송','taksong',false],
 ['대리운전','daeri',false],['탁송','taksong',false],['대리','daeri',false]
];
const isPlaceholder=r=>!r||/^\(직할\)$/.test(r.name||'');
function createNationwideLocalityExplorer({regions,childrenByParent,bySlug,servicePath,escapeHtml}){
 if(!Array.isArray(regions)||!regions.length)throw Error('Nationwide legal regions are unavailable');
 const escaped=escapeHtml||((x)=>String(x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])));
 const aliases=new Map(),ambiguous=new Set();
 function register(value,region){
  const key=compact(value);
  if(key.length<2||isPlaceholder(region)||ambiguous.has(key))return;
  const existing=aliases.get(key);
  if(existing&&existing.full_name!==region.full_name){aliases.delete(key);ambiguous.add(key)}
  else if(!existing)aliases.set(key,region);
 }
 const allByFull=new Map(regions.map(x=>[x.full_name,x]));
 for(const r of regions){
  if(isPlaceholder(r))continue;
  const full=String(r.full_name||r.name),parts=full.split(' ');
  const province=parts[0],names=provinceNames[province]||[];
  // Full address always wins; abbreviated names can only win if globally unique.
  register(full,r);
  register(full.replace(/\s*\(직할\)\s*/g,' '),r);
  register(r.name,r);
  if(parts.length>1){
   const tail=parts.slice(1).join(' ');
   register(tail,r);
   register(tail.replace(/\s*\(직할\)\s*/g,' '),r);
   register(parts.slice(-2).join(' '),r);
   for(const short of names){
    register(short+' '+tail,r);
    register(short+' '+tail.replace(/\s*\(직할\)\s*/g,' '),r);
   }
  } else {
   for(const short of names)register(short,r);
  }
 }
 const childMap=childrenByParent||new Map();
 const slugMap=bySlug||new Map(regions.map(r=>[r.slug,r]));
 function childrenFor(r){
  const kids=childMap.get(r.slug)||[];
  const expanded=kids.flatMap(child=>isPlaceholder(child)?(childMap.get(child.slug)||[]):[child]);
  return [...new Map(expanded.filter(x=>x&&x.full_name&&!isPlaceholder(x)).map(x=>[x.full_name,x])).values()];
 }
 function forDisplay(r){
  const children=childrenFor(r);
  if(children.length)return {items:children,relationship:'하위'};
  if(!r.parent_slug)return {items:[],relationship:'하위'};
  const parent=slugMap.get(r.parent_slug);
  if(!parent)return {items:[],relationship:'인근'};
  const siblings=childrenFor(parent).filter(x=>x.slug!==r.slug);
  return {items:siblings,relationship:'같은 상위 지역의 다른'};
 }
 function estimateUrl(r,kind){
  return '/fare/?service='+kind+'&from='+encodeURIComponent(r.full_name);
 }
 function resolve(query){
  const key=compact(query);
  if(!key||key.length>100)return null;
  const matched=suffixes.find(([term])=>key.endsWith(term));
  if(!matched)return null;
  const [term,kind,quote]=matched,place=key.slice(0,-compact(term).length);
  if(!place||ambiguous.has(place))return null;
  const region=aliases.get(place);
  if(!region)return null;
  const canonical=servicePath(region,kind);
  return {region,kind,term,quote,canonical,url:quote?estimateUrl(region,kind):canonical};
 }
 function chooser(r,kind){
  if(!r||!['daeri','taksong'].includes(kind))return '';
  const {items,relationship}=forDisplay(r);
  if(!items.length)return '';
  const label=kind==='daeri'?'대리운전':'탁송';
  const rows=items.map(child=>{
   const detail=servicePath(child,kind),estimate=estimateUrl(child,kind);
   return '<div class="nationwide-child-region" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;min-height:48px;padding:6px 0;border-bottom:1px solid #e0eaf5">'+
    '<a href="'+escaped(detail)+'" style="display:inline-flex;align-items:center;min-height:44px;flex:1 1 120px;color:#114677;font-weight:800;text-decoration:underline">'+escaped(child.name+label)+'</a>'+
    '<a href="'+escaped(estimate)+'" style="display:inline-flex;align-items:center;justify-content:center;min-height:44px;border-radius:8px;border:1px solid #bad1e8;background:#fff;padding:8px 12px;color:#104a80;font-weight:800;text-decoration:none">'+(kind==='daeri'?'대리비견적':'탁송비견적')+'</a></div>';
  }).join('');
  // A collapsed native details control prevents long lists from covering the
  // first mobile viewport; each region still has a direct quote action.
  return '<details id="nationwide-subareas-20261107" class="nationwide-subareas-20261107" style="margin:12px 0;border:1px solid #bbd2e8;border-radius:11px;background:#f8fbff;padding:10px">'+
   '<summary style="font-weight:900;cursor:pointer;min-height:48px;display:list-item;padding:10px 4px;line-height:1.45">'+
   escaped(r.name+' '+relationship+' 지역 '+items.length+'곳 · '+label+' 선택')+'</summary>'+
   '<p style="font-size:14px;line-height:1.6;margin:6px 0 10px">기존 전국 행정구역 데이터에 등록된 서로 다른 지역을 표시합니다. 지역명을 누르면 상세 안내, 견적을 누르면 해당 출발지가 입력됩니다. 실제 기사 상주·배차·요금 확정은 의미하지 않습니다.</p>'+
   '<nav aria-label="'+escaped(r.full_name+' '+label+' 세부 지역')+'">'+rows+'</nav>'+
   '<p style="font-size:13px;margin:9px 0 0">행정구역 데이터는 시·도별 수록 기준일이 다를 수 있습니다. 현재 요금과 배차 가능 여부는 1811-4294로 확인합니다.</p></details>';
 }
 function imageUrl(query,kind){return '/api/nationwide-locality-card.svg?service='+kind+'&q='+encodeURIComponent(query)}
 return {resolve,chooser,childrenFor,forDisplay,estimateUrl,imageUrl,ambiguousCount:ambiguous.size,indexedAliases:aliases.size,regionCount:regions.length};
}
module.exports={compact,createNationwideLocalityExplorer};
