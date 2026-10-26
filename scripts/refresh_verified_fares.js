#!/usr/bin/env node
/* Save reference fare quotes only after the existing route service returns a valid road distance.
   Uses public civic landmarks, never visitor-submitted addresses. */
const fs=require('fs');
const path=require('path');
const {roadQuote}=require('../assets/road-fare.js');
const file=path.join(__dirname,'../data/verified_fare_quotes.json');
const routes=[
 ['인천','인천시청','서울 강남역'],['인천','인천시청','부산역'],
 ['서울','서울시청','인천시청'],['서울','서울시청','수원시청'],
 ['경기','수원시청','서울 강남역'],['경기','수원시청','인천시청'],
 ['부산','부산시청','대구역'],['부산','부산시청','서울역'],
 ['대구','대구시청','부산역'],['대구','대구시청','서울역'],
 ['강원','강릉시청','서울 강남역'],['강원','강릉시청','속초시청']
];
const endpoint=process.env.SMART24_ROUTE_ENDPOINT || 'https://white-voice-6eab.k337711.workers.dev/route';
async function main(){
 const prior=JSON.parse(fs.readFileSync(file,'utf8'));
 if(!Array.isArray(prior))throw Error('invalid existing quote store');
 const results=[];
 for(const [region,origin,destination] of routes){
  const u=new URL(endpoint);u.searchParams.set('from',origin);u.searchParams.set('to',destination);
  try{
   const response=await fetch(u,{signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json(),km=Number(data.distanceKm);
   if(!Number.isFinite(km)||km<=0||km>=3000)throw Error('invalid road distance');
   for(const service of ['daeri','taksong']){
    const band=roadQuote(km,service,origin,destination).band;
    if(!band.length||band.some(n=>!Number.isSafeInteger(n)||n<=0))throw Error('invalid fare');
    results.push({source:'road-fare-calculator-verified',region,origin,destination,service,
      distance_km:Math.round(km*10)/10,amount_krw:band[0],amount_max_krw:band[band.length-1],
      verified_at:new Date().toISOString().slice(0,10)});
   }
  }catch(error){console.warn('Skipped route:',region,origin,destination,error.message)}
 }
 if(!results.length){console.warn('No verified route responses; keeping previous data');return}
 const keys=new Set(results.map(q=>[q.region,q.origin,q.destination,q.service].join('|')));
 const merged=[...results,...prior.filter(q=>!keys.has([q.region,q.origin,q.destination,q.service].join('|')))];
 fs.writeFileSync(file,JSON.stringify(merged,null,2)+'\n','utf8');
 console.log('Verified records updated:',results.length,'total:',merged.length);
}
main().catch(e=>{console.error(e);process.exitCode=1});
