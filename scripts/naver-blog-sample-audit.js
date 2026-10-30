'use strict';
const fs=require('node:fs'),posts=require('../blog/posts.json');
const tests=[["224388328571","서울 부산 대구 광주 완도 장거리대리운전"],["224389482040","용인골프장대리운전 법인카드"],["224401675130","전국 골프장 대리운전 단체배차 픽업"],["224404614274","대구 감삼동 구미 도량동 애니카랜드 탁송"],["224409241128","전국 골프장 대리운전 1877-3015"],["224413433868","안성탁송 안성 경매장"],["224414727983","골프장대리운전 100명도가능합니다"],["224417611971","대구 용인 화산CC 14시간 일일기사"],["224417587273","경상도 골프장 대리운전 1877-3015"],["224420736659","강원랜드대리운전 사북대리운전 새벽 아침"],["224426824562","통영 거제 고성군탁송 삼성중공업 한화오션"],["224431732696","전국대리운전1877-3015 지역별 장거리대리운전"],["224433939509","부산 신평동 KC오토월드 광주송정역 13만원"],["224441297602","대구 달서구 인천 송도 수출단지 자동차탁송"],["224445462278","서울 도곡동 부산 기장군 골프장 장거리 대리운전"],["224446554098","세종시 일일기사 1877-3015"],["224448767093","나주 화순 담양 장성 함평 영광 곡성 강진 자동차탁송"],["224451280349","대구 범어동 고양 뉴코리아CC 일일기사 25만원"],["224452970245","부산대리운전 해운대 기장군 서울 18만원 강원도 20만원"]];
const target='wjdtnr4757';
const id=process.env.NAVER_SEARCH_CLIENT_ID,secret=process.env.NAVER_SEARCH_CLIENT_SECRET;
if(!id||!secret)throw Error('Missing Naver Search API HUB credentials');
const byId=new Map(posts.map(p=>[String(p.id),p]));
const qUrl=q=>'https://naverapihub.apigw.ntruss.com/search/v1/blog?'+new URLSearchParams({query:q,display:'100',start:'1',sort:'sim',format:'json'}).toString();
const clean=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&(?:quot|amp|lt|gt|nbsp);/g,' ').trim();
const isOurPost=(x,id)=>[x.link,x.bloggerlink].some(y=>typeof y==='string'&&y.includes(target))&&[x.link].some(y=>typeof y==='string'&&y.includes(id));
async function run(){
 const results=[];
 for(const [postId,query] of tests){
  const post=byId.get(postId);
  if(!post)throw Error('Sample not in archived blog: '+postId);
  try{
   const res=await fetch(qUrl(query),{headers:{'X-NCP-APIGW-API-KEY-ID':id,'X-NCP-APIGW-API-KEY':secret},signal:AbortSignal.timeout(18000)});
   if(!res.ok)throw Error('Naver Blog Search HTTP '+res.status);
   const body=await res.json();
   if(!Array.isArray(body.items))throw Error('Missing blog search items');
   const match=body.items.find(x=>isOurPost(x,postId));
   results.push({postId,date:post.date.slice(0,11),title:post.title,query,returned:body.items.length,total:body.total,status:match?'observed-in-blog-api-results':'not-observed-in-first-100-blog-api-results',matchedUrl:match?.link||null,matchedTitle:match?clean(match.title):null});
  }catch(e){results.push({postId,date:post.date.slice(0,11),title:post.title,query,status:'query-error',error:e.message});}
 }
 const total=results.length,observed=results.filter(r=>r.status==='observed-in-blog-api-results').length,errors=results.filter(r=>r.status==='query-error').length;
 const report={checkedAt:new Date().toISOString(),source:'NAVER Search API HUB blog results /search/v1/blog',scope:'19 selective samples, not a full 374-post audit',total,observed,errors,limitation:'A post missing from the top 100 blog API results for this exact query is NOT proof of deindexing. Search API is not the integrated Naver UI and title matching varies.',results};
 fs.writeFileSync('naver-blog-sample-results.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
 if(process.env.GITHUB_STEP_SUMMARY){
  const rows=results.map(r=>'| '+r.date+' | '+r.postId+' | '+(r.status==='observed-in-blog-api-results'?'발견':r.status==='query-error'?'오류':'상위100건 미발견')+' | '+r.query.replace(/\|/g,' ')+' |').join('\n');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## NAVER Blog search API sample status\n\nSearch API results, not integrated search rankings or Search Advisor index status.\n\n| Date | Post ID | Status | Query |\n|---|---|---|---|\n'+rows+'\n');
 }
 if(errors)process.exitCode=1;
}
run().catch(e=>{console.error(e.message);process.exitCode=1});
