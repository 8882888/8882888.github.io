'use strict';
// Link a completed dispatch to a route only when both travel directions are
// evidenced by explicit locality names in the source record.
// Unqualified neighbourhoods and ambiguous same-name cities are not guessed.
module.exports=({regions,historicalRides})=>{
 const provinceAlias={
  '서울특별시':'서울','부산광역시':'부산','대구광역시':'대구','인천광역시':'인천',
  '광주광역시':'광주','대전광역시':'대전','울산광역시':'울산','세종특별자치시':'세종',
  '경기도':'경기','강원특별자치도':'강원','충청북도':'충북','충청남도':'충남',
  '전북특별자치도':'전북','전라남도':'전남','경상북도':'경북',
  '경상남도':'경남','제주특별자치도':'제주'
 };
 const clean=s=>String(s||'').replace(/\s+/g,'');
 const cityRegions=regions.filter(r=>['시도','시','군'].includes(r.level));
 const shortOf=r=>r.level==='시도'?provinceAlias[r.name]||null:r.name.replace(/(시|군)$/,'');
 const shortCounts=new Map();
 for(const r of cityRegions){const short=shortOf(r);if(short)shortCounts.set(short,(shortCounts.get(short)||0)+1);}
 const candidates=cityRegions.map(r=>({...r,fullClean:clean(r.full_name),short:shortOf(r)}));
 const airport={slug:'airport-gimhae',name:'김해공항',full_name:'부산광역시 강서구 김해국제공항',level:'공항'};
 const startsAtBoundary=(value,needle)=>{
  let from=0;
  while(true){
   const index=value.indexOf(needle,from);
   if(index<0)return false;
   if(index===0||!/[가-힣]/.test(value[index-1]))return true;
   from=index+1;
  }
 };
 const resolve=raw=>{
  // The airport belongs to Busan Gangseo-gu, not Gimhae-si.
  const value=clean(raw);
  if(/김해(?:국제)?공항/.test(value))return airport;
  let best=null,score=0,ambiguous=false;
  for(const r of candidates){
   let n=0;
   if(value.includes(r.fullClean))n=100;
   else if(value.includes(r.name))n=r.level==='시도'?80:90;
   else if(r.short&&r.short.length>=2&&shortCounts.get(r.short)===1&&startsAtBoundary(value,r.short))n=r.level==='시도'?45:60;
   if(!n)continue;
   if(n>score){best=r;score=n;ambiguous=false}
   else if(n===score && best&&best.slug!==r.slug){ambiguous=true}
  }
  return ambiguous?null:best;
 };
 const byKey=new Map(),byRideId=new Map();
 for(const x of historicalRides){
  // A source field with multiple arrow-separated stops is not a verified direct route.
  if(String(x.rawDeparture||'').includes('→')||String(x.rawDestination||'').includes('→'))continue;
  const a=resolve(x.rawDeparture),b=resolve(x.rawDestination);
  if(!a||!b||a.slug===b.slug)continue;
  const k=x.service==='taksong'?'taksong':'daeri';
  const key=k+'/'+a.slug+'/'+b.slug;
  if(!byKey.has(key))byKey.set(key,{key,k,from:a,to:b,rides:[],firstDate:x.date});
  const entry=byKey.get(key);
  if(entry.rides.some(r=>r.date===x.date&&r.fare===x.fare&&r.rawDeparture===x.rawDeparture&&r.rawDestination===x.rawDestination))continue;
  entry.rides.push(x);
  byRideId.set(x.id,entry);
 }
 const entries=[...byKey.values()].sort((a,b)=>b.rides.length-a.rides.length||b.firstDate.localeCompare(a.firstDate)||a.key.localeCompare(b.key));
 const path=x=>'/routes/'+x.k+'/'+x.from.slug+'/'+x.to.slug+'/';
 return {
  entries,
  forRoute:(a,b,k)=>byKey.get(k+'/'+a.slug+'/'+b.slug)||null,
  forRide:x=>byRideId.get(x.id)||null,
  routePath:path,
  summary:{sourceRecords:historicalRides.length,directionalRoutes:entries.length,matchedRecords:entries.reduce((n,e)=>n+e.rides.length,0)}
 };
};
