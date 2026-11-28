'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
for(const slug of ['yeongsan','seomjin','eastcoast','geumgang','ocheon','nakdonggang']){
 const html=fs.readFileSync(path.join(root,'route-taksong/courses',slug,'index.html'),'utf8');
 assert.match(html,/<meta name="viewport" content="width=device-width,initial-scale=1">/,'mobile viewport: '+slug);
 assert.match(html,/\.cycle-course-mobile-call\{display:none\}/,'hide on desktop: '+slug);
 assert.ok(html.includes('body{padding-bottom:calc(84px + env(safe-area-inset-bottom))}'),'reserve mobile bottom space: '+slug);
 assert.ok(html.includes('.cycle-course-mobile-call{position:fixed;display:flex;left:0;right:0;bottom:0;z-index:11000;min-height:56px'),'fixed 56px touch target: '+slug);
 assert.match(html,/<a class="cycle-course-mobile-call" href="tel:18114294" aria-label="[^"]+">☎ [^<]+<\/a><\/body>/,'native telephone call: '+slug);
 assert.equal((html.match(/class="cycle-course-mobile-call"/g)||[]).length,1,'one CTA per page: '+slug);
}
console.log('PASS mobile direct-call CTA on all six cycling courses');

const priorityOwners=JSON.parse(fs.readFileSync(path.join(root,'data/sitemap-url-owners.json'),'utf8'));
const priorityGroups=[["/route-taksong/courses/eastcoast/","eastcoast",[["yeongdeok","영덕 해맞이공원 인증센터","gyeongbuk/yeongdeok-gun"],["uljin","울진 은어다리 인증센터","gyeongbuk/uljin-gun"],["gyeongpo","경포대·경포해변 인증센터","gangwon/gangreung-si"],["tongil","고성 통일전망대 인증센터","gangwon/goseong-gun"]]],["/route-taksong/courses/nakdonggang/","nakdong",[["andong","안동댐","gyeongbuk/andong-si"],["sangpung","상주 상풍교","gyeongbuk/sangju-si"],["sangjubo","상주보","gyeongbuk/sangju-si"],["nakdan","낙단보",null],["gumi","구미보","gyeongbuk/gumi-si"],["chilgok","칠곡보","gyeongbuk/chilgok-gun"],["gangjeong","강정고령보","daegu/dalseong-gun"],["dalseong","달성보","daegu/dalseong-gun"],["hapcheon","합천창녕보","gyeongnam/changnyeong-gun"],["haman","창녕함안보","gyeongnam/haman-gun"],["yangsan","양산 물문화관","gyeongnam/yangsan-si"],["estuary","낙동강하굿둑","busan/saha-gu"]]],["/special/national-cycling-tour/","national",[["ara","인천 아라서해갑문",null],["hangang","한강·남한강",null],["chungju","충주 탄금대","chungbuk/chungju-si"],["ihwa","새재·이화령휴게소",null],["sangpung","상주 상풍교","gyeongbuk/sangju-si"],["busan","부산 낙동강하굿둑","busan/saha-gu"]]]];
for(const [url,prefix,rows] of priorityGroups){const html=fs.readFileSync(path.join(root,url,'index.html'),'utf8');assert.ok(priorityOwners[url],url);assert.ok(html.includes('https://jeongukdaeri.kr'+url));for(const [id,name,region] of rows){assert.ok(html.includes('id="'+prefix+'-'+id+'"'),name);assert.ok(html.includes(name));if(region){assert.ok(priorityOwners['/taksong/'+region+'/'],region);assert.ok(html.includes('href="/taksong/'+region+'/"'));}for(const hub of ['route-taksong/index.html','route-taksong/centers/index.html'])assert.ok(fs.readFileSync(path.join(root,hub),'utf8').includes('href="'+url+'#'+prefix+'-'+id+'"'),hub+' '+name);}}
const baekUrl='/special/cycling-trail-transport/';const baek=fs.readFileSync(path.join(root,baekUrl,'index.html'),'utf8');assert.ok(priorityOwners[baekUrl]);for(const v of ['id="baekdu-cycling-priority-20261128"','상주 화북','추풍령','공식 국토종주 인증코스와 동일한 의미가 아니며','예약 상담 예시'])assert.ok(baek.includes(v),v);for(const hub of ['route-taksong/index.html','route-taksong/centers/index.html'])assert.ok(fs.readFileSync(path.join(root,hub),'utf8').includes('href="'+baekUrl+'#baekdu-cycling-priority-20261128"'));console.log('PASS 4 priority cycling canonicals and 22 local handover anchors plus Baekdu consultation');
