'use strict';
// Publish six pre-reviewed, source-backed customer preparation notes on
// EXISTING canonical regional pages. Source record dates, IDs, locations,
// service and locally mentioned tokens must agree with the original archives.
function createSourceBackedContext(items,archived,raw,regions){
 const archiveById=new Map(archived.map(x=>[String(x.id),x]));
 const index=new Map();
 if(!Array.isArray(items)||items.length!==6)throw Error('Expected six curated source contexts');
 const norm=x=>String(x||'').replace(/\s+/g,'');
 for(const item of items){
  const key=item.kind+'|'+item.region;
  if(index.has(key)||!regions.has(item.region))throw Error('Duplicate or unknown review region '+key);
  if(!['taksong','daeri'].includes(item.kind))throw Error('Invalid service '+key);
  if(!Array.isArray(item.evidenceIds)||item.evidenceIds.length<1||
      item.evidenceIds.length!==item.requiredTokens.length||
      item.evidenceIds.length!==item.evidenceDates.length)
   throw Error('Incomplete exact source crosswalk '+key);
  if(!item.heading||!item.context||!item.preparation)throw Error('Missing customer value '+key);
  for(let j=0;j<item.evidenceIds.length;j++){
   const id=item.evidenceIds[j],match=/^excel-(\d{4})$/.exec(id);
   if(!match||Number(match[1])>raw.length||Number(match[1])<1)throw Error('Bad ride id '+id);
   const ref=archiveById.get(id);
   if(!ref||ref.region!==item.region||ref.service!==item.kind||
      ref.source!=='ride-history.json'||ref.url!=='/reviews/history/'+id+'/')
    throw Error('Archive region or service provenance mismatch '+id);
   const original=raw[Number(match[1])-1];
   if(!original||ref.date!==original.date||ref.date!==item.evidenceDates[j])
    throw Error('Exact original date mismatch '+id);
   const probe=norm(String(original.departure||'')+' '+String(original.destination||''));
   if(!item.requiredTokens[j]||!probe.includes(norm(item.requiredTokens[j])))
    throw Error('Original source locality cue mismatch '+id);
  }
  index.set(key,Object.freeze(item));
 }
 const render=(r,kind,{esc})=>{
  const item=index.get(kind+'|'+r.full_name);
  if(!item)return '';
  const ids=item.evidenceIds.map((id,i)=>
   '<li><a href="/reviews/history/'+id+'/">'+esc(item.evidenceDates[i]+' · 보관 기록 '+id)+'</a></li>').join('');
  return '<section id="source-backed-local-journey-20261117" aria-label="'+esc(item.region+' 보관 기록과 차량 인계 준비')+'">'+
   '<h2>'+esc(item.heading)+'</h2>'+
   '<p>'+esc(item.context)+'</p><p>'+esc(item.preparation)+'</p>'+
   '<p>아래 링크는 기존 운행 메모에 기록된 지역·서비스·날짜를 대조한 자료입니다. 이 기록만으로 특정 절차가 완료됐거나, 현재 요금·기사 상주·즉시 배차가 보장되는 것은 아닙니다. 출발지·목적지와 실제 이용 조건을 다시 상담해 주세요.</p>'+
   '<ul>'+ids+'</ul><p><a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(r.full_name)+'">이 지역 현재 예상요금 조회</a> · <a href="tel:18114294">1811-4294 예약 상담</a></p></section>';
 };
 return {size:index.size,render,keys:[...index.keys()]};
}
module.exports={createSourceBackedContext};
