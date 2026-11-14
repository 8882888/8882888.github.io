'use strict';
// Source-controlled, actually published ride cases only. Never synthesize a
// publication timestamp from a past ride date or create a speculative URL.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ID=/^[a-f0-9]{16}$/;
function identifier(x){
 return crypto.createHash('sha256').update(['date','service','departure','destination','fare']
  .map(key=>String(x[key]??'')).join('|')).digest('hex').slice(0,16);
}
function complete(x){
 return x&&x.verified===true&&x.status==='completed'&&['daeri','taksong'].includes(x.service)
  &&['date','departure','destination','fare'].every(key=>Boolean(x[key]));
}
function loadPublishedCases(root){
 const readJson=file=>{try{return JSON.parse(fs.readFileSync(path.join(root,file),'utf8'))}catch{return null}};
 const records=readJson('data/public-reviewed-rides-202610.json');
 const state=readJson('data/published-ride-case-ids.json');
 if(!Array.isArray(records)||!Array.isArray(state))return [];
 const byId=new Map(records.filter(complete).map(x=>[identifier(x),x]));
 const cases=[],seen=new Set();
 for(const published of state){
  const id=published?.id,ride=byId.get(id);
  if(!ID.test(String(id||''))||!ride||seen.has(id)||published.service!==ride.service)continue;
  const publishedAt=String(published.published_at||'');
  if(!Number.isFinite(Date.parse(publishedAt)))continue;
  const route='/reviews/verified/'+id+'/',file=path.join(root,'reviews','verified',id,'index.html');
  let html;
  try{html=fs.readFileSync(file,'utf8')}catch{continue}
  const expectedCanonical='https://jeongukdaeri.kr'+route;
  // Do not advertise a missing, noindexed, or noncanonical prebuilt page.
  if(!html.includes('<link rel="canonical" href="'+expectedCanonical+'">')||
   /<meta\b[^>]*\bname=["']robots["'][^>]*\bnoindex/i.test(html)||
   !/<article\b/i.test(html))continue;
  const article=html.match(/<article\b[^>]*>[\s\S]*?<\/article>/i)?.[0]||'';
  if(!article)continue;
  seen.add(id);
  const serviceLabel=ride.service==='taksong'?'자동차탁송':'대리운전';
  cases.push({id,path:route,publishedAt,rideDate:ride.date,service:ride.service,
   title:ride.date+' '+ride.departure+' → '+ride.destination+' '+serviceLabel+' 실제 운행기록',
   description:article});
 }
 return cases.sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||a.id.localeCompare(b.id));
}
module.exports={identifier,complete,loadPublishedCases};
