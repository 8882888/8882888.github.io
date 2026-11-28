'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const info=read('route-taksong/index.html');
const booking=read('special/cycling-trail-transport/index.html');
const national=read('special/national-cycling-tour/index.html');
const centers=read('route-taksong/centers/index.html');
const server=read('server.js');
const courseSlugs=['eastcoast','seomjin','yeongsan','geumgang','ocheon','nakdonggang'];
const page=(s)=>read('route-taksong/courses/'+s+'/index.html');
const get=(s,re)=>s.match(re)?.[1];
const title=(s)=>get(s,/<title>([^<]*)<\/title>/);
const description=(s)=>get(s,/<meta name="description" content="([^"]*)"/);
const structured=s=>JSON.parse(get(s,/<script type="application\/ld\+json">([\s\S]*?)<\/script>/));
test('National cycling information and booking represent different intent with stable original canonicals and concise SEO metadata',()=>{
 const pages=[
  [info,'/route-taksong/'],[booking,'/special/cycling-trail-transport/'],
  [national,'/special/national-cycling-tour/'],
  ...courseSlugs.map(x=>[page(x),'/route-taksong/courses/'+x+'/'])
 ];
 for(const [html,route] of pages){
  assert.ok(title(html).includes('자전거')||title(html).includes('국토종주'),route);
  assert.ok([...description(html)].length<=80,'80-char national SEO summary: '+route);
  assert.ok(html.includes('<link rel="canonical" href="https://jeongukdaeri.kr'+route+'"'),route);
  assert.equal((html.match(/<h1\b/g)||[]).length,1,'one H1 per canonical '+route);
  assert.equal(get(html,/<meta property="og:title" content="([^"]*)"/),title(html),'OG title '+route);
  assert.equal(get(html,/<meta property="og:description" content="([^"]*)"/),description(html),'OG description '+route);
  const ld=structured(html);
  const webpage=(ld['@graph']||[ld]).find(x=>x['@type']==='WebPage');
  assert.equal(webpage.name,title(html),'WebPage name '+route);
  assert.equal(webpage.description,description(html),'WebPage description '+route);
  assert.equal(webpage.url,'https://jeongukdaeri.kr'+route,'WebPage url '+route);
 }
 assert.equal((booking.match(/<meta property="og:title"/g)||[]).length,1);
 assert.equal((booking.match(/<meta property="og:description"/g)||[]).length,1);
 assert.ok(info.includes('id="cycling-info-intent-guide-20261106"'));
 assert.ok(booking.includes('id="national-cycle-tour"'));
 assert.ok(national.includes('224450163134'),'original published source');
 assert.ok(booking.includes('과거 8만~9만원'),'historical rate, not current guarantee');
});
test('Original official country cross plus 12 section courses cover distinct forward/reverse without fake official continuous east coast',()=>{
 const section=get(info,/<section id="national-cycling-bidirectional-20261124"[\s\S]*?>([\s\S]*?)<\/section>/)||'';
 assert.ok(section.length>6100);
 assert.equal((section.match(/<li id="national-cycle-bidirectional-\d+">/g)||[]).length,13);
 for(const term of ['국토종주 자전거길','남한강 자전거길','북한강 자전거길','새재 자전거길',
  '금강 자전거길','오천 자전거길','영산강 자전거길','섬진강 자전거길',
  '동해안 자전거길(강원)','동해안 자전거길(경북)','제주환상 자전거길']){
  assert.ok(section.includes(term),term);
 }
 for(const term of ['아라서해갑문','낙동강하굿둑','고성 통일전망대','삼척 고포마을','울진 은어다리','영덕 해맞이공원'])
  assert.ok(section.includes(term),term);
 assert.ok(section.includes('종주 방향')||section.includes('자전거 라이딩 이동 방향'));
 assert.ok(section.includes('자동차탁송의 화살표'));
 assert.ok(section.includes('실제 완료 운행이나 확정 요금이 아닙니다')||section.includes('역방향도 동일 요금'));
 assert.ok(section.includes('bike.go.kr/content.do?key=2008068854028'));
 assert.ok(section.includes('bike.go.kr/content.do?key=2006176999024'));
});
test('Exactly 30 topic-matched, user-copyable national blog hashtags; six course-specific variants avoid keyword stuffing in head',()=>{
 const block=get(info,/<details id="national-cycling-hashtags-20261124">[\s\S]*?<p>(#[^<]*)<\/p>/)||'';
 const tags=block.split(/\s+/).filter(Boolean);
 assert.equal(tags.length,30);
 assert.equal(new Set(tags).size,30);
 assert.ok(tags.every(t=>/^#[^\s#]+$/u.test(t)),'all tags single token');
 for(const x of ['#국토종주자전거길','#국토종주역코스','#동해안자전거길탁송','#영산강자전거길','#섬진강자전거길','#오천자전거길'])
  assert.ok(tags.includes(x),x);
 for(const slug of courseSlugs){
  const html=page(slug);
  const m=html.match(/<details><summary>[^<]*네이버 블로그 공유용 해시태그 8개<\/summary><p>([^<]+)<\/p>/);
  assert.ok(m,'course-specific tags '+slug);
  const own=m[1].split(/\s+/);
  assert.equal(own.length,8);
  assert.equal(new Set(own).size,8);
 }
});
test('Every detailed cycling course explains distinct reverse itinerary, vehicle pickup and two fare directions with official source',()=>{
 for(const slug of courseSlugs){
  const html=page(slug);
  const sec=get(html,new RegExp('<section id="cycling-'+slug+'-reverse-seo-20261124">([\\s\\S]*?)<\\/section>'))||'';
  assert.ok(sec.length>1500,'unique guide '+slug);
  assert.ok(sec.includes('정방향:')&&sec.includes('역방향:'),'directions '+slug);
  assert.ok(sec.includes('자전거를 타는 방향과 자동차탁송이 이동할 방향은 별개'));
  assert.ok(sec.includes('bike.go.kr'),'official source '+slug);
  assert.ok(sec.includes('https://open.kakao.com/o/sGV88r7h'),'real consultation '+slug);
  assert.ok(sec.includes('href="tel:18114294"'),'phone '+slug);
  const fareLinks=[...sec.matchAll(/href="(\/fare\/\?service=taksong&amp;from=[^"]+)"/g)].map(m=>m[1]);
  assert.ok(fareLinks.length>=2&&fareLinks.length%2===0,'both quote directions '+slug);
  for(const href of fareLinks)assert.ok(href.includes('&amp;to='),'fare has destination '+slug);
  assert.ok(sec.includes('/route-taksong/#national-cycling-bidirectional-20261124'));
  assert.ok(sec.includes('확정 금액이나 배차 가능을 보장하지 않습니다')||sec.includes('별도 상담'),'no guaranteed reverse fare '+slug);
  assert.ok(html.includes('<meta name="robots" content="index,follow,max-image-preview:large">'));
 }
 assert.ok(page('eastcoast').includes('강원 공식 코스'));
 assert.ok(page('eastcoast').includes('경북 공식 코스'));
 assert.ok(page('seomjin').includes('이전 생활체육공원→배알도 10만원 안내'));
 assert.ok(page('yeongsan').includes('기존 담양댐→영산강하굿둑 10만원'));
});
test('Existing national-cycle dedicated booking, existing original links and exact search redirects keep clear intent',()=>{
 assert.ok(national.includes('id="national-grand-cross-bidirectional-20261124"'));
 assert.ok(national.includes('인천 아라서해갑문'));
 assert.ok(national.includes('부산 낙동강하굿둑'));
 assert.ok(national.includes('국토종주자전거길 역방향 키워드'));
 assert.ok(national.includes('https://open.kakao.com/o/sGV88r7h'));
 assert.ok(booking.includes('id="cycling-all-course-reverse-booking-20261124"'));
 assert.equal((booking.match(/<tr><th scope="row">/g)||[]).length,8);
 assert.ok(centers.includes('id="cycling-center-reverse-quick-nav-20261124"'));
 assert.ok(centers.includes('href="/route-taksong/#national-cycling-bidirectional-20261124"'));
 const aliases=[
 ["전국자전거길종주","/route-taksong/"],
 ["국토종주역코스","/special/national-cycling-tour/"],
 ["국토종주자전거길종주","/special/national-cycling-tour/"],
 ["전국자전거길역코스탁송","/special/cycling-trail-transport/"],
 ["경포대통일전망대탁송","/route-taksong/courses/eastcoast/"],
 ["통일전망대경포대탁송","/route-taksong/courses/eastcoast/"],
 ["배알도생활체육공원탁송","/route-taksong/courses/seomjin/"],
 ["영산강하굿둑담양댐탁송","/route-taksong/courses/yeongsan/"],
 ["금강하굿둑대청댐탁송","/route-taksong/courses/geumgang/"],
 ["합강공원행촌교차로탁송","/route-taksong/courses/ocheon/"],
 ["낙동강하굿둑상주상풍교탁송","/route-taksong/courses/nakdonggang/"]
 ];
 for(const [q,dst] of aliases)assert.ok(server.includes("'"+q+"':'"+dst+"'"),q);
 assert.ok(!server.includes("'자전거':'/route-taksong/'"),'no hijacking general bicycle shopping');
 assert.equal((read('robots.txt').match(/^Sitemap:/gm)||[]).length,8);
 assert.ok(read('package.json').includes('tests/national-cycling-bidirectional-seo-20261124.test.cjs'));
});
test('Actual HTTP: national cycling info, booking, reverse search and 8 course pages remain reachable without misrouting',async()=>{
 const port=39878,base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ok=false;
  for(let i=0;i<110;i++){
   if(child.exitCode!==null)throw Error('server exited before HTTP checks');
   try{const r=await fetch(base+'/health',{signal:AbortSignal.timeout(1200)});if(r.ok){ok=true;break}}catch{}
   await new Promise(r=>setTimeout(r,180));
  }
  assert.ok(ok,'local HTTP running');
  for(const url of ['/route-taksong/','/special/national-cycling-tour/','/special/cycling-trail-transport/','/route-taksong/courses/eastcoast/','/route-taksong/courses/yeongsan/']){
   const r=await fetch(base+url,{signal:AbortSignal.timeout(20000)});
   assert.equal(r.status,200,url);
   const body=await r.text();
   assert.ok(body.includes('rel="canonical" href="https://jeongukdaeri.kr'+url+'"'),url);
   assert.ok(body.includes('역코스')||body.includes('역방향'),url);
   assert.equal((body.match(/<h1\b/g)||[]).length,1,url);
  }
  const inputs=[
   ['전국자전거길종주','/route-taksong/'],
   ['전국자전거길종주탁송요금','/route-taksong/'],
   ['동해안자전거길풀코스탁송요금','/route-taksong/courses/eastcoast/'],
   ['낙동강자전거길풀코스탁송요금','/route-taksong/courses/nakdonggang/'],
   ['영산강자전거길탁송요금','/route-taksong/courses/yeongsan/'],
   ['섬진강자전거길탁송요금','/route-taksong/courses/seomjin/'],
   ['국토종주역코스','/special/national-cycling-tour/'],
   ['국토종주자전거길종주','/special/national-cycling-tour/'],
   ['영산강하굿둑담양댐탁송','/route-taksong/courses/yeongsan/'],
   ['통일전망대경포대탁송','/route-taksong/courses/eastcoast/'],
   ['합강공원행촌교차로탁송','/route-taksong/courses/ocheon/'],
   ['낙동강하굿둑상주상풍교탁송','/route-taksong/courses/nakdonggang/']
  ];
  for(const [q,to] of inputs){
   const r=await fetch(base+'/keyword-search/?q='+encodeURIComponent(q),{redirect:'manual',signal:AbortSignal.timeout(20000)});
   assert.equal(r.status,302,q);
   assert.equal(r.headers.get('location'),to,q);
   await r.body?.cancel();
  }
 }finally{child.kill('SIGTERM');}
});

test('Direct cycling quotes use original 12 visible endpoints in both directions; Jeju stays customer-selected',()=>{
 const section=info.match(/<section id="national-cycling-bidirectional-20261124"[\s\S]*?<\/section>/)?.[0]||'';
 const pairs=[["인천 아라서해갑문","부산 낙동강하굿둑"],["아라한강갑문","팔당대교"],["팔당대교","충주 탄금대"],["충주 탄금대","상주 상풍교"],["상주 상풍교","부산 낙동강하굿둑"],["남양주 밝은광장","춘천 신매대교"],["대청댐","금강하굿둑"],["행촌교차로","합강공원"],["담양댐","영산강하굿둑"],["임실 섬진강생활체육공원","광양 배알도수변공원"],["고성 통일전망대","삼척 고포마을"],["울진 은어다리","영덕 해맞이공원"]];
 const rows=[...section.matchAll(/<li id="national-cycle-bidirectional-(\d+)">([\s\S]*?)<\/li>/g)];
 assert.equal(rows.length,13);
 for(const [i,[a,b]] of pairs.entries()){
  const row=rows[i][2];
  assert.ok(row.includes(a)&&row.includes(b));
  const quotes=[...row.matchAll(/href="(\/fare\/\?service=taksong&amp;from=[^"]+)"/g)].map(m=>new URL(m[1].replaceAll('&amp;','&'),'https://jeongukdaeri.kr'));
  assert.equal(quotes.length,2);
  for(const [j,[from,to]] of [[a,b],[b,a]].entries()){
   assert.equal(quotes[j].searchParams.get('service'),'taksong');
   assert.equal(quotes[j].searchParams.get('from'),from);
   assert.equal(quotes[j].searchParams.get('to'),to);
  }
 }
 assert.ok(rows[12][2].includes('href="/fare/?service=taksong"'));
 assert.ok(!rows[12][2].includes('/fare/?service=taksong&amp;from='));
 assert.ok(section.includes('양방향 견적 안내는 실제 완료 운행이 아닙니다'));
 assert.ok(!info.includes('안내.">><meta property="og:url"'));
});
test('Jirisan all six original fare rows keep historic prices and distinct forward/reverse quote links',()=>{
 const html=read('지리산탁송/index.html');
 const section=html.match(/<section id="mountain-route-fare-table-202611"[\s\S]*?<\/section>/)?.[0]||'';
 const pairs=[["성삼재","중산리","12만원"],["성삼재","대원사","12만원"],["화엄사","중산리","12만원"],["화엄사","대원사","10만원"],["백무동","중산리","10만원"],["백무동","대원사","10만원"]];
 const rows=[...section.matchAll(/<tr><td[^>]*>([\s\S]*?)<\/tr>/g)].map(m=>m[1]);
 assert.equal(rows.length,6);
 for(const [i,[a,b,price]] of pairs.entries()){
  const row=rows[i];
  assert.ok(row.includes(a+' → '+b)&&row.includes('<strong>'+price+'</strong>'));
  const quotes=[...row.matchAll(/href="(\/fare\/\?service=taksong&amp;from=[^"]+)"/g)].map(m=>new URL(m[1].replaceAll('&amp;','&'),'https://jeongukdaeri.kr'));
  assert.equal(quotes.length,2);
  for(const [j,[from,to]] of [[a,b],[b,a]].entries()){
   assert.equal(quotes[j].searchParams.get('service'),'taksong');
   assert.equal(quotes[j].searchParams.get('from'),from);
   assert.equal(quotes[j].searchParams.get('to'),to);
  }
 }
 assert.ok(section.includes('현재 확정 견적은 아닙니다'));
 assert.ok(section.includes('역방향은 별도 견적'));
 assert.ok(html.includes('href="https://jeongukdaeri.kr/지리산탁송/"'));
 assert.ok(section.includes('224453077687'));
});

test('Four original outdoor fare pages crosslink their existing fee anchors; Seorak six prices and reverse estimates preserved',()=>{
 const pages=[
  ['설악산탁송/index.html','/설악산탁송/#mountain-route-fare-table-202611'],
  ['지리산탁송/index.html','/지리산탁송/#mountain-route-fare-table-202611'],
  ['route-taksong/index.html','/route-taksong/#cycling-visible-fare-table-20261103'],
  ['special/cycling-trail-transport/index.html','/special/cycling-trail-transport/#cycling-owner-fares-20261128']
 ];
 for(const [p,self] of pages){
  const html=read(p),nav=html.match(/<nav id="outdoor-fare-discovery-20261128"[\s\S]*?<\/nav>/)?.[0]||'';
  assert.ok(nav,p);
  for(const [,link] of pages)if(link!==self)assert.ok(nav.includes('href="'+link+'"'),p+' '+link);
  assert.equal((html.match(/<h1\b/g)||[]).length,1,p);
  assert.ok(html.includes('name="robots" content="index,follow'),p);
 }
 const seorak=read(pages[0][0]).match(/<section id="mountain-route-fare-table-202611"[\s\S]*?<\/section>/)?.[0]||'';
 const pairs=[['오색','소공원','7만원'],['한계령','소공원','8만원'],['백담사','소공원','8만원'],['남교리','소공원','8만원'],['한계령','백담사','8만원'],['오색','백담사','8만원']];
 const rows=[...seorak.matchAll(/<tr><td[^>]*>([\s\S]*?)<\/tr>/g)].map(m=>m[1]);
 assert.equal(rows.length,6);
 for(const [i,[a,b,fee]] of pairs.entries()){
  assert.ok(rows[i].includes(a+' → '+b)&&rows[i].includes('<strong>'+fee+'</strong>'));
  const urls=[...rows[i].matchAll(/href="(\/fare\/\?service=taksong&amp;from=[^"]+)"/g)].map(m=>new URL(m[1].replaceAll('&amp;','&'),'https://jeongukdaeri.kr').searchParams);
  assert.equal(urls.length,2);
  assert.equal(urls[0].get('from'),a);assert.equal(urls[0].get('to'),b);
  assert.equal(urls[1].get('from'),b);assert.equal(urls[1].get('to'),a);
  assert.ok(rows[i].includes('역방향 별도 견적'));
 }
});
