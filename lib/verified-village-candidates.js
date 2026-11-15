'use strict';
// Candidate narrowing only. matchingHistoryRegion remains the authoritative
// original completed-trip evidence test, including disambiguation between
// identically named villages in different counties/provinces.
function buildVillagePrefixIndex(villages){
 const index=new Map();
 for(const region of villages){
  const name=String(region?.name||'');
  if(!name)continue;
  const prefix=name.slice(0,2);
  if(!index.has(prefix))index.set(prefix,[]);
  index.get(prefix).push(region);
 }
 return index;
}
function villageCandidatesForFields(fields,index){
 const matches=new Set();
 for(const part of fields){
  const field=String(part||'');
  // Every full name occurrence necessarily includes its first two characters.
  // A one-character name is covered by the single-character fallback below.
  for(let i=0;i<field.length;i++){
   const prefix=field.slice(i,i+2);
   for(const region of index.get(prefix)||[]){
    if(field.includes(region.name))matches.add(region);
   }
   const first=field[i];
   if(first!==prefix){
    for(const region of index.get(first)||[]){
     if(field.includes(region.name))matches.add(region);
    }
   }
  }
 }
 return matches;
}
module.exports={buildVillagePrefixIndex,villageCandidatesForFields};
