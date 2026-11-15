'use strict';
// Preserve authoritative completed-ride location matching while avoiding
// O(all cities/counties/districts × all archived rides) on a cold sitemap fetch.
const LEVELS=new Set(['시도','시','군','구']);
function candidateTokens(region,provinceAliases){
 const tokens=new Set([region.full_name,region.name]);
 if(region.level==='시도'){
  for(const alias of provinceAliases[region.name]||[])tokens.add(alias);
 }
 if(region.level==='시'||region.level==='군'){
  const short=region.name.replace(/(시|군)$/,'');
  if(short.length>1&&short!=='광주')tokens.add(short);
 }
 return [...tokens].filter(Boolean);
}
function buildBroadRegionCandidateIndex(regions,provinceAliases={}){
 const byPrefix=new Map();
 const supportedRegions=regions.filter(region=>LEVELS.has(region.level));
 for(const region of supportedRegions){
  for(const token of candidateTokens(region,provinceAliases)){
   const prefix=token.slice(0,2);
   if(!byPrefix.has(prefix))byPrefix.set(prefix,[]);
   byPrefix.get(prefix).push({token,region});
  }
 }
 return {byPrefix,supportedRegions};
}
function candidateBroadRegionsForFields(fields,index){
 const found=new Set();
 for(const raw of fields){
  const field=String(raw||'');
  for(let i=0;i<field.length;i++){
   for(const entry of index.byPrefix.get(field.slice(i,i+2))||[]){
    if(field.startsWith(entry.token,i))found.add(entry.region);
   }
   // Supports one-character locality names without assuming they exist.
   for(const entry of index.byPrefix.get(field[i])||[]){
    if(field.startsWith(entry.token,i))found.add(entry.region);
   }
  }
 }
 return found;
}
function verifiedBroadRegionServiceKeys(regions,rides,match,provinceAliases={}){
 const index=buildBroadRegionCandidateIndex(regions,provinceAliases);
 const found=new Set();
 for(const ride of rides){
  const kind=ride.service;
  if(kind!=='taksong'&&kind!=='daeri')continue;
  if(!ride.departure||!ride.destination||ride.departure==='지역 비공개'||ride.destination==='지역 비공개')continue;
  const fields=[String(ride.rawDeparture||''),String(ride.rawDestination||'')];
  for(const region of candidateBroadRegionsForFields(fields,index)){
   const key=kind+'|'+region.full_name;
   // The exact same parent/alias/locationTerm matcher remains the final gate.
   if(!found.has(key)&&match(ride,region,regions))found.add(key);
  }
 }
 return found;
}
module.exports={candidateTokens,buildBroadRegionCandidateIndex,candidateBroadRegionsForFields,verifiedBroadRegionServiceKeys};
