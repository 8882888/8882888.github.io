'use strict';
// Separate classified archival dispatch records from evidence of a specific
// completed customer journey, current driver availability, or Naver indexing.
// A blank or unrecognized region is NEVER guessed from the trip text.
const SOURCE='ride-history.json';
const KINDS=new Set(['daeri','taksong']);
function archiveEvidenceIndex(items,regionByFullName){
 if(!Array.isArray(items))throw Error('Expected archived ride references');
 const keys=new Set(),groups=new Map();
 let regionUnresolved=0,invalidReference=0,unmappedRegion=0,classified=0;
 for(const item of items){
  if(!item||!/^excel-\d{4}$/.test(String(item.id||''))||keys.has(item.id))
   throw Error('Duplicate or invalid archive ride id: '+String(item?.id));
  keys.add(item.id);
  const region=typeof item.region==='string'?item.region.trim():'';
  if(!region){regionUnresolved++;continue}
  if(!KINDS.has(item.service)||item.source!==SOURCE||
     item.url!=='/reviews/history/'+item.id+'/'){invalidReference++;continue}
  const legal=regionByFullName.get(region);
  if(!legal){unmappedRegion++;continue}
  classified++;
  const key=item.service+'|'+region,prior=groups.get(key)||{
   kind:item.service,region,regionNode:legal,archiveIds:[],urls:[]
  };
  prior.archiveIds.push(item.id);
  prior.urls.push(item.url);
  groups.set(key,prior);
 }
 const sections={};
 for(const kind of KINDS){
  sections[kind]=[...groups.values()].filter(g=>g.kind===kind&&g.archiveIds.length>=2)
   .sort((a,b)=>b.archiveIds.length-a.archiveIds.length||
     a.region.localeCompare(b.region,'ko'))
   .slice(0,20);
 }
 return {
  overview:{total:items.length,regionUnresolved,invalidReference,unmappedRegion,
   classified,uniqueRegionService:groups.size},
  groups:[...groups.values()],sections
 };
}
function renderEvidenceDirectory(kind,index,{servicePath,esc}){
 const records=index.sections[kind]||[];
 if(!records.length)return '';
 const service=kind==='taksong'?'자동차탁송':'대리운전';
 const html=records.map(group=>{
  const url=servicePath(group.regionNode,kind),archive=group.urls[0];
  const count=group.archiveIds.length;
  return '<li><a href="'+esc(url)+'">'+esc(group.region+' '+service)+'</a>'+
   ' <span>(기존 기록 중 지역 분류 '+count+'건)</span>'+
   ' · <a href="'+esc(archive)+'">지역 분류된 기록 확인</a></li>';
 }).join('');
 return '<section id="classified-archive-locality-links" aria-label="보관 기록에 지역 분류가 있는 '+service+' 안내">'+
  '<h2>보관 운행기록의 지역 분류로 찾아보는 '+service+' 안내</h2>'+
  '<p>기존 출발·도착 메모에서 지역이 분류된 보관 자료 중, 같은 지역과 서비스로 분류된 기록이 2건 이상 있는 곳을 우선 연결했습니다. 건수는 과거 기록의 지역 분류 건수이며, 현지 기사 상주·현재 배차·새로운 운행완료 건수·확정 요금의 증빙이 아닙니다. 원본의 출발·도착지 및 해당 서비스 여부는 개별 기록에서 확인해 주세요.</p>'+
  '<ul>'+html+'</ul><p><a href="/reviews/history/?kind='+kind+'">모든 과거 운행기록 확인</a> · '+
  '<a href="/fare/?service='+kind+'">현재 예상요금 확인</a> · '+
  '<a href="tel:18114294">상담 1811-4294</a></p></section>';
}
module.exports={archiveEvidenceIndex,renderEvidenceDirectory};
