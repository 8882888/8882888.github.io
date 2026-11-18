'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const rides=JSON.parse(fs.readFileSync(path.join(root,'data/public-reviewed-rides-202610.json'),'utf8'));
const published=JSON.parse(fs.readFileSync(path.join(root,'data/published-ride-case-ids.json'),'utf8'));
const complete=x=>x&&x.verified===true&&x.status==='completed'&&['daeri','taksong'].includes(x.service)&&['date','departure','destination','fare'].every(k=>Boolean(x[k]));
const id=x=>crypto.createHash('sha256').update(['date','service','departure','destination','fare'].map(k=>String(x[k]??'')).join('|')).digest('hex').slice(0,16);
const byId=new Map(rides.filter(complete).map(x=>[id(x),x]));
const placeGroups=[
 ['부산','부산'],['해운대','부산'],['인천','인천'],['연수구','인천'],['검단','인천'],['강화','인천'],
 ['김포','김포'],['세종시','세종'],['부강면','세종'],['광산구','광주'],['고흥군','고흥'],['평택','평택'],
 ['오산시','오산'],['의정부','의정부'],['종로','서울'],['동해시','동해'],['원주시','원주'],['고양시','고양'],
 ['안동시','안동'],['시흥시','시흥'],['구미시','구미'],['김천시','김천'],['용인시','용인'],['강릉시','강릉'],
 ['화성시','화성'],['유성구','대전'],['마산합포구','창원'],['지리산','지리산'],['설악산','설악산']
];
const groups=x=>new Set(placeGroups.filter(([token])=>(x.departure+' '+x.destination).includes(token)).map(x=>x[1]));
const publishedIds=new Set(published.map(x=>x.id));
function visibleWords(html){
 return html.replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
  .replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ')
  .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#x27;/gi,"'")
  .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/\s+/g,' ').trim().split(/\s+/).filter(Boolean).length;
}
test('every published verified case is source-backed, indexable and substantively enriched',()=>{
 assert.equal(published.length,29,'the current audited cohort is exactly 29 published cases');
 const descriptions=new Set();
 for(const entry of published){
  const ride=byId.get(entry.id);
  assert.ok(ride,'published case must map to a complete verified source record: '+entry.id);
  const file=path.join(root,'reviews','verified',entry.id,'index.html');
  assert.ok(fs.existsSync(file),'published static page exists: '+entry.id);
  const html=fs.readFileSync(file,'utf8');
  const service=ride.service==='taksong'?'자동차탁송':'대리운전';
  const servicePath=ride.service==='taksong'?'/taksong/':'/daeri/';
  assert.ok(html.includes('<link rel="canonical" href="https://jeongukdaeri.kr/reviews/verified/'+entry.id+'/">'));
  assert.match(html,/<meta name="robots" content="index,follow/);
  assert.ok(html.includes(ride.departure)&&html.includes(ride.destination)&&html.includes(ride.date)&&html.includes(ride.fare));
  for(const section of ['record-facts','route-scope','handover-checklist','fare-context','related-cases','related-service'])
   assert.ok(html.includes('id="'+section+'"'),'missing section '+section+' on '+entry.id);
  assert.ok(html.includes('href="'+servicePath+'"'));
  const illustrationId=ride.service==='taksong'?'verified-taksong-illustration':'verified-daeri-illustration';
  assert.ok(html.includes('id="'+illustrationId+'"'),'legacy required service illustration ID is preserved: '+entry.id);
  assert.ok(html.includes('href="/region/"')&&html.includes('href="/coverage/"')&&html.includes('href="/fare/"'));
  assert.ok(html.includes('href="tel:18114294"'));
  assert.ok(html.includes('현재 요금표나 다른 구간의 고정요금으로 사용할 수 없습니다.'));
  assert.ok(visibleWords(html)>=130,'case needs meaningful source scope and service-specific guidance: '+entry.id);
  const description=html.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
  assert.ok(description.length>=70&&description.length<=160,'description length 70–160: '+entry.id);
  assert.ok(description.includes(ride.date)&&description.includes(ride.fare));
  assert.ok(!descriptions.has(description),'case descriptions must be unique');
  descriptions.add(description);
  const relatedIds=[...html.matchAll(/href="\/reviews\/verified\/([a-f0-9]{16})\/"/g)].map(m=>m[1]).filter(x=>x!==entry.id);
  for(const otherId of relatedIds){
   assert.ok(publishedIds.has(otherId),'related link must target a published case only');
   const other=byId.get(otherId);
   assert.ok(other&&other.service===ride.service,'related case must be the same service type');
   assert.ok([...groups(ride)].some(tag=>groups(other).has(tag)),'related case must share an explicit place token');
  }
  const text=html.replace(/<[^>]*>/g,' ');
  assert.doesNotMatch(text,/010-\d{4}-\d{4}|고객명|기사명|즉시\s*배차\s*보장|100%\s*배차/);
  if(ride.service==='taksong')assert.ok(html.includes('차량이 주차된 정확한 위치와 출차 승인 가능 여부'));
  else assert.ok(html.includes('차량이 있는 건물명, 주차장 층과 실제 출입구'));
 }
});
test('published source facts and timestamps are not rewritten by the enrichment',()=>{
 assert.ok(published.every(x=>byId.has(x.id)&&Number.isFinite(Date.parse(x.published_at))));
 assert.equal(new Set(published.map(x=>x.id)).size,published.length);
});
