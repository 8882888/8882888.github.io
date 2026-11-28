/* Smart24: live locality-aware service cards.
 * Forms retain their normal GET action when JavaScript is unavailable.
 */
(function(){
 'use strict';
 const forms=document.querySelectorAll('form[data-card-preview-form]');
 if(!forms.length)return;
 const node=(tag,cls,content)=>{
  const el=document.createElement(tag);if(cls)el.className=cls;
  if(content!==undefined)el.textContent=String(content);
  return el;
 };
 const safePath=(value,prefix)=>typeof value==='string'&&value.startsWith(prefix)&&!value.startsWith('//')&&!value.includes('..')?value:null;
 // Only preview source-controlled text-only cards and fare diagrams. Never load vehicle/person photos from API data.
 const imagePath=value=>{
  if(typeof value!=='string'||value.startsWith('//')||value.includes('..'))return null;
  const p=value.split('?')[0];
  // Reject legacy PNG/WebP/JPEG vehicle or person imagery even when the API returns it.
  if(!p.endsWith('.svg'))return null;
  if(/^\/card\/area-\d+/.test(p)||/^\/keyword-card\//.test(p)||p==='/api/nationwide-locality-card.svg')return value;
  if(/^\/assets\/service-(?:taksong|daeri|golf)-visual\.svg$/.test(p)||/^\/assets\/(?:seoraksan|jirisan)-taksong-fares\.svg$/.test(p)||/^\/assets\/cycling-routes\/(?:nationwide|eastcoast|yeongsan|seomjin|geumgang|ocheon|nakdonggang)-taksong\.svg$/.test(p))return value;
  return null;
 };
 // Verified representative routes already linked in the homepage markup.
 // Provide a useful result immediately while the image API is checked.
 const representativeRoutes=[
  {name:'서울',words:['서울','서울특별시'],slug:'seoul'},
  {name:'부산',words:['부산','부산광역시'],slug:'busan'},
  {name:'대구',words:['대구','대구광역시'],slug:'daegu'},
  {name:'울산',words:['울산','울산광역시'],slug:'ulsan'},
  {name:'제주도',words:['제주도','제주특별자치도','제주'],slug:'jeju'}
 ];
 function nearbyRoute(query,service){
  const normalized=String(query||'').split(' ').join('');
  const found=representativeRoutes.filter(r=>r.words.some(w=>normalized===w||normalized.startsWith(w+'탁송')||normalized.startsWith(w+'자동차탁송')||normalized.startsWith(w+'대리운전')));
  if(found.length!==1)return null;
  const r=found[0],kind=service==='daeri'||(service!=='taksong'&&normalized.includes('대리운전'))?'daeri':'taksong';
  // Only the static taksong routes are verified in the homepage; other services use region search.
  return kind==='taksong'?{url:'/taksong/'+r.slug+'/',label:r.name+'탁송 지역 안내 바로 보기'}:null;
 }
 // Province IDs checked against the repository's 17 legal-region datasets.
 // Source-code availability is not proof these URLs are deployed; local SVG fallback remains available.
 // Exact province IDs originate from data/legal-regions/01.json ... 17.json.
 // "광주" and "제주" alone can name other legal localities; use nonambiguous aliases.
 const liveCityCards=[
  {name:'서울',aliases:['서울','서울시','서울특별시'],id:'1',slug:'seoul'},
  {name:'부산',aliases:['부산','부산시','부산광역시'],id:'494',slug:'busan'},
  {name:'대구',aliases:['대구','대구시','대구광역시'],id:'765',slug:'daegu'},
  {name:'인천',aliases:['인천','인천시','인천광역시'],id:'1174',slug:'incheon'},
  {name:'광주광역시',aliases:['광주광역시'],id:'1464',slug:'gwangju'},
  {name:'대전',aliases:['대전','대전시','대전광역시'],id:'1672',slug:'daejeon'},
  {name:'울산',aliases:['울산','울산시','울산광역시'],id:'1855',slug:'ulsan'},
  {name:'세종',aliases:['세종','세종시','세종특별자치시'],id:'2063',slug:'sejong'},
  {name:'경기',aliases:['경기','경기도'],id:'2215',slug:'gyeonggi'},
  {name:'강원도',aliases:['강원','강원도','강원특별자치도'],id:'4433',slug:'gangwon'},
  {name:'충북',aliases:['충북','충청북도'],id:'5906',slug:'chungbuk'},
  {name:'충남',aliases:['충남','충청남도'],id:'7541',slug:'chungnam'},
  {name:'전북',aliases:['전북','전라북도','전북특별자치도'],id:'9816',slug:'jeonbuk'},
  {name:'전남',aliases:['전남','전라남도'],id:'11707',slug:'jeonnam'},
  {name:'경북',aliases:['경북','경상북도'],id:'14704',slug:'gyeongbuk'},
  {name:'경남',aliases:['경남','경상남도'],id:'17946',slug:'gyeongnam'},
  {name:'제주도',aliases:['제주도','제주특별자치도'],id:'20348',slug:'jeju'}
 ];
 function liveCityMatch(query,service){
  // Never imply that a different ward or town has its own confirmed image.
  const compact=String(query||'').replace(/\s+/g,'');
  const city=liveCityCards.find(c=>c.aliases.some(a=>
   [a,a+'탁송',a+'자동차탁송',a+'대리운전'].includes(compact)
  ));
  if(!city)return null;
  const kinds=service==='daeri'?['daeri']:service==='taksong'?['taksong']:
   compact.includes('대리운전')?['daeri']:compact.includes('탁송')?['taksong']:['daeri','taksong'];
  return {status:'matched',region:city.name,cards:kinds.map(kind=>({
   kind,regionName:city.aliases.at(-1),displayKeyword:/대리운전$|탁송$/.test(compact)?compact:city.name+(kind==='daeri'?'대리운전':'탁송'),
   keywordImage:'/keyword-card/exact/area-'+city.id+'-'+kind+'.svg?q='+encodeURIComponent(/대리운전$|탁송$/.test(compact)?compact:city.name+(kind==='daeri'?'대리운전':'탁송')),
   image:'/card/area-'+city.id+'-'+kind+'-brand-v7.png',
   url:'/'+kind+'/'+city.slug+'/',
   description:city.name+' '+(kind==='daeri'?'대리운전':'자동차탁송')+' 지역 상담 안내입니다. 실제 배차와 요금은 별도 확인합니다.',
   phone:'1811-4294'
  }))};
 }
 // Existing SVGs verified in the repository; these are route guides, not trip photos.
 const verifiedRouteVisuals=[
  {"name":"섬진강자전거길","aliases":["섬진강종주탁송","섬진강길종주탁송","섬진강자전거길","섬진강자전거길종주","섬진강자전거길탁송","섬진강자전거길종주탁송","섬진강자전거길종주탁송요금","섬진강자전거길탁송요금","섬진강자전거길코스","섬진강자전거길역코스","섬진강자전거길역코스탁송","섬진강자전거길차량회수"],"image":"/assets/cycling-routes/seomjin-taksong.svg","url":"/route-taksong/courses/seomjin/","description":"자전거 배송이 아닌 고객 자동차를 출발지 주차장에서 종주 종료지로 이동하는 차량탁송입니다.","course":{"route":"임실 생활체육공원 ↔ 광양 배알도","fee":"양방향 각 10만원","note":"공식 자전거길 149km. 섬진강댐 인수는 별도 상담.","stops":"섬진강댐 · 장군목 · 향가유원지 · 횡탄정 · 사성암 · 남도대교 · 매화마을 · 배알도","anchor":"seomjin-owner-fares-20261128"}},
  {"name":"영산강자전거길","aliases":["영산강길종주탁송","영산강종주탁송","영산강자전거길","영산강자전거길종주","영산강자전거길탁송","영산강자전거길종주탁송","영산강자전거길종주탁송요금","영산강자전거길탁송요금","영산강자전거길코스","영산강자전거길역코스","영산강자전거길역코스탁송","영산강자전거길차량회수"],"image":"/assets/cycling-routes/yeongsan-taksong.svg","url":"/route-taksong/courses/yeongsan/","description":"자전거 배송이 아닌 고객 자동차를 출발지 주차장에서 종주 종료지로 이동하는 차량탁송입니다.","course":{"route":"담양댐 ↔ 영산강하굿둑","fee":"양방향 각 10만원","note":"공식 자전거길 133km. 실제 자동차 주행거리와 구분.","stops":"담양댐 · 메타세쿼이아길 · 담양대나무숲 · 승촌보 · 죽산보 · 느러지 · 영산강하굿둑","anchor":"yeongsan-owner-fares-20261128"}},
  {"name":"동해안자전거길","aliases":["동해안종주탁송","경포대통일전망대탁송","통일전망대경포대탁송","동해안자전거길","동해안자전거길종주","동해안자전거길탁송","동해안자전거길종주탁송","동해안자전거길종주탁송요금","동해안자전거길탁송요금","동해안자전거길코스","동해안자전거길역코스","동해안자전거길역코스탁송","동해안자전거길차량회수"],"image":"/assets/cycling-routes/eastcoast-taksong.svg","url":"/route-taksong/courses/eastcoast/","description":"자전거 배송이 아닌 고객 자동차를 출발지 주차장에서 종주 종료지로 이동하는 차량탁송입니다.","course":{"route":"통일전망대 ↔ 영덕 해맞이공원","fee":"풀코스 약 17만원","note":"경포대 ↔ 통일전망대 각 8만원, 지정 부분 구간 각 10만원.","stops":"통일전망대 · 경포해변 · 임원 · 울진 은어다리 · 영덕 해맞이공원","anchor":"eastcoast-owner-fares-20261128"}},
  {"name":"낙동강자전거길","aliases":["낙동강길종주탁송","낙동강종주탁송","낙동강자전거길","낙동강자전거길종주","낙동강자전거길탁송","낙동강자전거길종주탁송","낙동강자전거길종주탁송요금","낙동강자전거길탁송요금","낙동강자전거길코스","낙동강자전거길역코스","낙동강자전거길역코스탁송","낙동강자전거길차량회수"],"image":"/assets/cycling-routes/nakdonggang-taksong.svg","url":"/route-taksong/courses/nakdonggang/","description":"자전거 배송이 아닌 고객 자동차를 출발지 주차장에서 종주 종료지로 이동하는 차량탁송입니다.","course":{"route":"안동댐 ↔ 낙동강하굿둑","fee":"풀코스 별도 견적","note":"지정 부분 종주 구간 각 10만원.","stops":"안동댐 · 상주보 · 구미보 · 강정고령보 · 합천창녕보 · 양산 물문화관 · 낙동강하굿둑","anchor":"nakdong-owner-fares-20261128"}},
  {"name":"금강자전거길","aliases":["금강길종주탁송","금강종주탁송","금강자전거길","금강자전거길종주","금강자전거길탁송","금강자전거길종주탁송","금강자전거길종주탁송요금","금강자전거길탁송요금","금강자전거길코스","금강자전거길역코스","금강자전거길역코스탁송","금강자전거길차량회수"],"image":"/assets/cycling-routes/geumgang-taksong.svg","url":"/route-taksong/courses/geumgang/","description":"자전거 배송이 아닌 고객 자동차를 출발지 주차장에서 종주 종료지로 이동하는 차량탁송입니다.","course":{"route":"대청댐 ↔ 금강하굿둑","fee":"개별 견적","note":"실제 차량 인수·인계 주소로 요금 확인.","stops":"대청댐 · 세종보 · 공주보 · 백제보 · 익산 성당포구 · 금강하굿둑","anchor":""}},
  {"name":"오천자전거길","aliases":["오천길종주탁송","오천종주탁송","오천자전거길","오천자전거길종주","오천자전거길탁송","오천자전거길종주탁송","오천자전거길종주탁송요금","오천자전거길탁송요금","오천자전거길코스","오천자전거길역코스","오천자전거길역코스탁송","오천자전거길차량회수"],"image":"/assets/cycling-routes/ocheon-taksong.svg","url":"/route-taksong/courses/ocheon/","description":"자전거 배송이 아닌 고객 자동차를 출발지 주차장에서 종주 종료지로 이동하는 차량탁송입니다.","course":{"route":"행촌교차로 ↔ 합강공원","fee":"개별 견적","note":"실제 차량 인수·인계 주소로 요금 확인.","stops":"행촌교차로 · 괴강교 · 백로공원 · 무심천교 · 합강공원","anchor":""}},
  {"name":"설악산탁송","aliases":["설악산","설악산탁송","설악산종주","설악산종주탁송","설악산탁송요금","설악산차량탁송","설악산코스별탁송","설악산차량회수","오색탁송","한계령탁송","백담사탁송","소공원탁송","남교리탁송"],"image":"/assets/seoraksan-taksong-fares.svg","url":"/설악산탁송/","description":"산행 출발 주차장에 맡긴 자동차를 하산지로 옮기는 차량회수 탁송입니다.","mountain":{"fares":[["오색 → 소공원","7만원"],["한계령 → 소공원","8만원"],["백담사 → 소공원","8만원"],["남교리 → 소공원","8만원"],["한계령 → 백담사","8만원"],["오색 → 백담사","8만원"]],"places":"오색공영주차장·한계령휴게소·백담사 입구·남교리·소공원 주차장","routes":"대청봉·공룡능선·천불동계곡 종주","advice":"출발 주차장과 하산 예정시간을 확인하세요. 백담사 입구와 사찰 내부는 구분하며, 새벽·주말·연휴는 사전 예약이 중요합니다."}},
  {"name":"지리산탁송","aliases":["지리산","지리산탁송","지리산종주","지리산종주탁송","지리산탁송요금","지리산차량탁송","지리산코스별탁송","지리산차량회수","성삼재탁송","중산리탁송","대원사탁송","화엄사탁송","백무동탁송","성중종주탁송","성대종주탁송","화대종주탁송"],"image":"/assets/jirisan-taksong-fares.svg","url":"/지리산탁송/","description":"지리산 종주 출발지에 주차한 자동차를 지정한 하산지로 이동합니다.","mountain":{"fares":[["성삼재 → 중산리","12만원"],["성삼재 → 대원사","12만원"],["화엄사 → 중산리","12만원"],["화엄사 → 대원사","10만원"],["백무동 → 중산리","10만원"],["백무동 → 대원사","10만원"]],"places":"성삼재·화엄사·백무동·중산리·대원사 실제 차량 주차장","routes":"성중종주·성대종주·화대종주·화중종주·백중종주","advice":"산행 거리와 차량 이동 도로거리는 다릅니다. 하산 시간과 도착 주차장, 기사 이동 조건을 사전 협의하세요."}},
  {name:'자전거길종주탁송',aliases:['자전거종주','자전거종주탁송','자전거길종주탁송','영산강길종주탁송','영산강종주탁송','섬진강종주탁송','동해안종주탁송'],image:'/assets/cycling-routes/nationwide-taksong.svg',url:'/special/cycling-trail-transport/',description:'자전거길 종주 차량 회수 안내 이미지. 세부 코스별 요금과 배차는 별도 확인합니다.'}
 ];
 function routeVisualMatch(query,service){
  const term=String(query||'').replace(/\s+/g,'');
  if(/대리운전|대리$/.test(term))return null;
  const route=verifiedRouteVisuals.find(r=>r.aliases.includes(term));
  if(!route)return null;
  return {status:'matched',region:route.name,cards:[{
   kind:'taksong',displayKeyword:route.course?route.name+' 종주탁송':route.mountain?route.name+' 코스별 요금·차량회수':route.name+' · 기존 안내 이미지',
   course:route.course||null,
   mountain:route.mountain||null,
   image:route.image,url:route.url,description:route.description,phone:'1811-4294'
  }]};
 }
 const guidePath=value=>['/route-taksong/','/daeri/','/taksong/','/service/','/special/','/business/','/설악산탁송/','/지리산탁송/'].map(prefix=>safePath(value,prefix)).find(Boolean)||null;
 const addLink=(parent,href,text,cls)=>{
  const a=node('a',cls,text);a.href=href;parent.append(a);return a;
 };
 // Always show an exact, human-readable keyword graphic without relying on a server image.
 // The graphic contains no cars, people, or unlicensed photographs.
 const SVG_NS='http://www.w3.org/2000/svg';
 function localKeywordSvg(raw,kind){
  const keyword=String(raw||'').trim().slice(0,75);
  const service=kind==='daeri'?'대리운전':'자동차탁송';
  const phone='1811-4294';
  const svg=document.createElementNS(SVG_NS,'svg');
  // A 900-unit viewBox keeps important text readable when the mobile card is 320px wide.
  svg.setAttribute('viewBox','0 0 900 730');
  svg.setAttribute('role','img');
  svg.setAttribute('aria-label',keyword+' '+service+' 상담 명함 · '+phone);
  svg.style.cssText='display:block;width:100%;height:auto;max-width:100%;border-radius:9px;background:#f2f8ff';
  const draw=(tag,attrs,value)=>{
   const el=document.createElementNS(SVG_NS,tag);
   Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));
   if(value!==undefined)el.textContent=value;
   svg.append(el);
  };
  draw('rect',{x:0,y:0,width:900,height:730,fill:'#f1f7fe'});
  draw('rect',{x:0,y:0,width:900,height:110,fill:'#0a4c85'});
  draw('text',{x:36,y:73,fill:'#ffffff','font-family':'sans-serif','font-size':43,'font-weight':800},'스마트24 · '+service);
  draw('text',{x:38,y:167,fill:'#286387','font-family':'sans-serif','font-size':34},'검색 키워드 맞춤 상담 명함');
  const chars=Array.from(keyword);
  const step=chars.length>54?Math.ceil(chars.length/4):chars.length>36?Math.ceil(chars.length/3):chars.length>18?Math.ceil(chars.length/2):Math.max(1,chars.length);
  const lines=[];for(let i=0;i<chars.length;i+=step)lines.push(chars.slice(i,i+step).join(''));
  const longest=Math.max(1,...lines.map(line=>Array.from(line).length));
  const font=Math.max(34,Math.min(74,Math.floor(805/longest)));
  const startY=lines.length===1?365:lines.length===2?315:lines.length===3?290:265;
  lines.forEach((line,i)=>draw('text',{x:42,y:startY+i*76,fill:'#053c75','font-family':'sans-serif','font-size':font,'font-weight':900},line));
  draw('rect',{x:30,y:558,width:840,height:125,rx:16,fill:'#d7eaff'});
  draw('text',{x:450,y:636,'text-anchor':'middle',fill:'#064379','font-family':'sans-serif','font-size':67,'font-weight':900},phone);
  draw('text',{x:450,y:672,'text-anchor':'middle',fill:'#345a77','font-family':'sans-serif','font-size':26},'배차 가능 여부와 현재 요금은 상담 후 확인');
  return svg;
 }
 let zoom=null,lastActivator=null;
 if(typeof HTMLDialogElement!=='undefined'){
  const dialog=node('dialog','smart24-card-dialog');
  const close=node('button','smart24-card-dialog-close','닫기 ×');close.type='button';
  close.addEventListener('click',()=>dialog.close());
  const img=node('img','smart24-card-dialog-image');
  img.alt='';img.width=1200;img.height=800;
  dialog.append(close,img);
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
  dialog.addEventListener('close',()=>{
   img.removeAttribute('src');
   if(lastActivator?.isConnected)lastActivator.focus();
   lastActivator=null;
  });
  document.body.append(dialog);zoom={dialog,img};
 }
 function openZoom(src,alt,trigger){
  if(!zoom||!src)return false;
  lastActivator=trigger;zoom.img.src=src;zoom.img.alt=alt;
  zoom.dialog.showModal();return true;
 }
 forms.forEach(form=>{
  const input=form.querySelector('input[name="q"]');
  const select=form.querySelector('select[name="service"]');
  const output=form.parentElement?.querySelector('[data-card-preview-output]');
  if(!input||!output)return;
  const message=node('p','smart24-card-status');
  message.setAttribute('role','status');message.setAttribute('aria-live','polite');
  const results=node('div','smart24-card-results');
  output.replaceChildren(message,results);
  let pending=null,controller=null,sequence=0;
  function showDraft(raw,kind,notice){
   const keyword=String(raw||'').trim();
   if(!keyword)return;
   const service=/대리운전(?:업체|회사)?$|대리$/.test(keyword.replace(/\s/g,''))?'daeri':/탁송(?:업체|회사)?$/.test(keyword.replace(/\s/g,''))?'taksong':kind;
   const phone='1811-4294';
   const article=node('article','smart24-card-panel');
   article.append(node('h3','smart24-card-heading',keyword+' · 텍스트 명함'),localKeywordSvg(keyword,service));
   article.append(node('p','smart24-card-description','입력하신 글자를 표시한 안내 이미지이며 실제 지점·운행완료·배차 확정을 뜻하지 않습니다.'));
   const actions=node('div','smart24-card-actions'),params=new URLSearchParams({q:keyword});
   if(service)params.set('service',service);
   addLink(actions,'/region/?'+params.toString(),'해당 지역 검색 결과');
   addLink(actions,'tel:'+phone.replace(/-/g,''),'상담 '+phone,'smart24-card-phone');
   article.append(actions);
   output.hidden=false;message.textContent=notice||'입력한 키워드의 텍스트 명함을 표시했습니다. 지역 일치를 확인합니다.';
   results.replaceChildren(article);
  }
  function reset(reason){
   ++sequence;
   if(controller)controller.abort();controller=null;
   results.replaceChildren();message.textContent=reason||'';
   output.hidden=!reason;output.removeAttribute('aria-busy');
  }
  function renderCard(card){
   const exact=imagePath(card.keywordImage);
   const original=exact||imagePath(card.image);
   const preview=exact||imagePath(card.previewImage);
   const serviceFallback=card.kind==='daeri'?'/assets/service-daeri-visual.svg':'/assets/service-taksong-visual.svg';
   const page=guidePath(card.url);
   if(!page||!['daeri','taksong'].includes(card.kind))return null;
   const article=node('article','smart24-card-panel');
   const title=node('h3','smart24-card-heading',card.displayKeyword||card.label||'지역별 상담 명함');
   // Paint an exact-keyword card immediately, before any remote image request.
   // Only swap to a downloaded graphic after a successful image load.
   const keyword=card.displayKeyword||card.label||input.value.trim();
   const fallback=localKeywordSvg(keyword,card.kind);
   const picture=node('a','smart24-card-picture-link');
   picture.style.cursor='default';picture.append(fallback);
   const img=node('img','smart24-card-preview-image');
   img.alt=keyword+' · '+(card.kind==='daeri'?'대리운전':'자동차탁송')+' 안내 명함';
   img.width=1200;img.height=800;img.loading='eager';img.decoding='async';
   let zoomButton=null,fullLink=null;
   const sources=exact?[exact]:[...new Set([preview,original].filter(Boolean))];
   let sourceIndex=0;
   const tryNext=()=>{if(sourceIndex<sources.length)img.src=sources[sourceIndex++];};
   img.addEventListener('load',()=>{
    if(!fallback.isConnected)return;
    fallback.replaceWith(img);
    picture.href=img.src;picture.target='_blank';picture.rel='noopener noreferrer';
    picture.style.cursor='zoom-in';picture.setAttribute('aria-label',img.alt+' 크게 보기');
    if(fullLink){fullLink.href=img.src;fullLink.hidden=false;}
    if(zoomButton){zoomButton.hidden=false;zoomButton.disabled=false;}
   });
   img.addEventListener('error',()=>{
    // Keep the locally rendered keyword card on screen if the endpoint fails.
    // Do not briefly display a broken image or an unrelated locality's photo.
    tryNext();
   });
   picture.addEventListener('click',event=>{
    const href=picture.getAttribute('href');
    if(zoom&&href){event.preventDefault();openZoom(href,img.alt,picture)}
   });
   const description=node('p','smart24-card-description',card.description||'지역별 운행 조건은 상담 후 확인합니다.');
   const actions=node('div','smart24-card-actions');
   if(zoom){
    const button=node('button','smart24-card-zoom','명함 화면에서 확대');
    zoomButton=button;
    button.type='button';button.hidden=true;button.disabled=true;button.addEventListener('click',()=>{const href=picture.getAttribute('href');if(href)openZoom(href,img.alt,button)});
    actions.append(button);
   }
   const full=addLink(actions,original||serviceFallback,'명함 원본 보기');
   fullLink=full;
   full.hidden=true;full.target='_blank';full.rel='noopener noreferrer';
   addLink(actions,page,(card.course||card.mountain)?'코스별 전체 안내':'지역 상세 안내');
   // The site-wide consultation line is fixed; never trust an API card's alternate phone.
   addLink(actions,'tel:18114294','전화 1811-4294','smart24-card-phone');
   // Keep the verified mountain fare table visible independently of image or API loading.
   if(card.mountain){
    const m=card.mountain;
    const heading=node('h4','smart24-card-fare-heading',card.url==='/설악산탁송/'?'설악산 코스별 기존 탁송요금':'지리산 코스별 기존 탁송요금');
    const table=node('table','smart24-card-fare-table');
    table.append(node('caption','','기존 안내요금이며 현재 확정요금은 상담 후 확인합니다.'));
    const tbody=document.createElement('tbody');
    m.fares.forEach(([route,fare])=>{const tr=document.createElement('tr');tr.append(node('th','',route),node('td','',fare));tbody.append(tr)});
    table.append(tbody);
    const info=node('div','smart24-card-course-info');
    info.append(node('h4','','산행 코스 안내'),node('p','',m.routes),node('h4','','차량 인수·인계 장소'),node('p','',m.places),node('h4','','예약 전 확인사항'),node('p','',m.advice),node('p','','차종·주차 위치·열쇠 전달 방법을 확인합니다. 역방향은 별도 견적입니다.'));
    addLink(actions,page+'#mountain-route-fare-table-202611','구간별 요금표·역방향 견적');
    addLink(actions,'https://open.kakao.com/o/sGV88r7h','카카오 상담');
    article.append(title,picture,heading,table,info,description,actions);
   }else if(card.course){
    const c=card.course;
    const summary=node('div','smart24-card-course-info');
    summary.append(node('h4','smart24-card-fare-heading','정코스·역코스 탁송요금'));
    const table=node('table','smart24-card-fare-table'),tbody=node('tbody');
    const tr=node('tr');tr.append(node('th','',c.route),node('td','',c.fee));tbody.append(tr);table.append(tbody);summary.append(table,node('p','',c.note));
    summary.append(node('h4','','인증센터별 차량 인수·인계'),node('p','',c.stops),node('h4','','예약 전 안내사항'),node('p','','이용일, 차량 주차 위치, 도착지, 인계 시간, 차종 및 열쇠 전달 방법을 확인합니다.'));
    addLink(actions,page+(c.anchor?'#'+c.anchor:''),'구간별 요금표');
    addLink(actions,page+'#smart24-course-centers-20261128','인증센터 선택');
    addLink(actions,page+'#smart24-course-handover-20261128','차량 인수·인계 안내');
    addLink(actions,'https://open.kakao.com/o/sGV88r7h','카카오 상담');
    article.append(title,picture,summary,description,actions);
   }else if(card.regionName){
    const info=node('div','smart24-card-course-info');
    info.append(node('h4','smart24-card-fare-heading',card.regionName+' 안내사항·대리요금·탁송요금'),node('p','','실제 차량 위치, 도착지, 이용 시간, 차종을 확인합니다. 현재 요금과 배차는 상담 후 확정됩니다.'));
    const choices=node('div','smart24-dual-fare-grid');
    for(const [kind,label,notice] of [['daeri','대리요금','고객 동승·심야·장거리·경유 및 대기'],['taksong','탁송요금','차량 단독 이동·인수 및 인계·키 전달']]){
     const box=node('div','smart24-dual-fare-option');
     box.append(node('h4','',label),node('p','',notice));
     addLink(box,'/fare/?'+new URLSearchParams({service:kind,from:card.regionName}).toString(),label+' 예상요금 조회');
     choices.append(box);
    }
    info.append(choices,node('p','','정확한 출발·도착 주소를 입력하면 도로거리 기반 예상요금을 확인할 수 있습니다.'));
    addLink(actions,'https://open.kakao.com/o/sGV88r7h','카카오 상담');
    article.append(title,picture,info,description,actions);
   }else article.append(title,picture,description,actions);
   tryNext();
   return article;
  }
  function show(data){
   output.hidden=false;results.replaceChildren();
   if(data.status==='matched'&&Array.isArray(data.cards)&&data.cards.length){
    if(select&&data.cards.length===1&&['daeri','taksong'].includes(data.cards[0].kind))select.value=data.cards[0].kind;
    message.textContent=(data.region||'선택 키워드')+'에 맞는 '+(data.cards.length===2?'대리운전·자동차탁송':'서비스 전용')+' 이미지입니다. 이미지를 누르면 크게 볼 수 있습니다.';
    const grid=node('div','smart24-card-grid');
    data.cards.forEach(card=>{const el=renderCard(card);if(el)grid.append(el)});
    if(grid.childElementCount){results.append(grid)}
    else showDraft(input.value.trim(),select?.value||'taksong','검색 결과의 이미지 연결을 확인하지 못해 입력한 키워드 텍스트 명함을 표시합니다.');
   }else if((data.status==='ambiguous'||data.status==='suggestions')&&Array.isArray(data.candidates)){
    message.textContent=data.status==='ambiguous'?'동일한 이름의 지역이 있습니다. 정확한 지역을 선택하세요.':'지역명을 확인하고 아래 후보 중 선택하세요.';
    showDraft(input.value.trim(),select?.value||'taksong',message.textContent);
    const list=node('div','smart24-card-choices');
    data.candidates.forEach(candidate=>{
     const b=node('button','smart24-card-choice',candidate.name||'지역 선택');
     b.type='button';b.addEventListener('click',()=>{input.value=candidate.query||candidate.name;run(true)});
     list.append(b);
    });
    results.append(list);
   }else showDraft(input.value.trim(),select?.value||'taksong','검색어에 해당하는 지역을 확인하지 못했습니다. 텍스트 명함과 지역 검색 링크를 제공합니다.');
   const params=new URLSearchParams({q:input.value.trim()});
   if(select?.value)params.set('service',select.value);
   const p=node('p','smart24-card-full-search');
   const courseCard=data.cards?.find(c=>c.course||c.mountain);
   addLink(p,courseCard?courseCard.url:'/region/?'+params.toString(),courseCard?'코스 전용 홈페이지 보기':'전체 지역 검색 결과 보기');
   results.append(p);
  }
  let timeoutId=null;
  function run(immediate){
   if(timeoutId){clearTimeout(timeoutId);timeoutId=null}
   if(pending){clearTimeout(pending);pending=null}
   if(controller)controller.abort();
   const query=input.value.trim();
   // An explicit region+service phrase determines the service, even after an earlier selection.
   const inferred=/대리운전(?:업체|회사)?$|대리$/.test(query.replace(/\s+/g,''))?'daeri':/탁송(?:업체|회사)?$/.test(query.replace(/\s+/g,''))?'taksong':null;
   if(inferred&&select)select.value=inferred;
   if(query.replace(/\s+/g,'').length<2){
    reset(query?'지역명을 두 글자 이상 입력해 주세요.':'');return;
   }
   const seq=++sequence;
   // Route illustrations in the repository work on both Cloudtype and GitHub Pages.
   const route=routeVisualMatch(query,select?.value||'');
   if(route){show(route);return;}
   // Use a legally mapped locality image URL immediately on the official host.
   // If Cloudtype has not deployed the endpoint, the img error handler renders an in-browser text SVG.
   // Never claim live deployment simply because a generated URL was selected.
   // Use source-verified metropolitan cards even on a static hosting fallback.
   const city=liveCityMatch(query,select?.value||'');
   if(city){show(city);return;}
   showDraft(query,inferred||select?.value||'taksong');
   async function lookup(){
    controller=new AbortController();
    let timedOut=false;
    timeoutId=setTimeout(()=>{timedOut=true;controller.abort()},6500);
    output.hidden=false;output.setAttribute('aria-busy','true');
    message.textContent='키워드 명함 표시 중 · 등록 지역 일치를 확인하고 있습니다.';
    const direct=new URLSearchParams({q:query});
    if(select?.value)direct.set('service',select.value);
    addLink(results,'/region/?'+direct.toString(),'지역 검색 결과 바로 보기','smart24-card-choice');
    const known=nearbyRoute(query,select?.value||'');
    if(known)addLink(results,known.url,known.label,'smart24-card-choice');
    const params=new URLSearchParams({q:query});
    if(select?.value)params.set('service',select.value);
    try{
     const response=await fetch('/api/region-card-preview?'+params.toString(),{
      signal:controller.signal,cache:'no-store',credentials:'same-origin'});
     if(!response.ok)throw Error('Preview unavailable');
     const data=await response.json();if(seq!==sequence)return;
     show(data);
    }catch(error){
     if(seq!==sequence||(error.name==='AbortError'&&!timedOut))return;
     // A missing/slow Cloudtype preview API must not leave the search looking broken.
     // The existing /region/ page runs from static region data independently.
     // Keep the already displayed local card in place; do not make it blink or disappear on API failure.
     output.hidden=false;
     message.textContent='서버 연결 오류: 표시 중인 키워드 명함은 유지합니다. 정확한 지역은 전체 지역 검색에서 확인할 수 있습니다.';
     const p=new URLSearchParams({q:query});
     if(select?.value)p.set('service',select.value);
     const known=nearbyRoute(query,select?.value||'');
     if(known)addLink(results,known.url,known.label,'smart24-card-choice');
     const fallback=node('p','smart24-card-full-search');
     addLink(fallback,'/region/?'+p.toString(),query+' 지역 검색 결과 확인');
     results.append(fallback);
     const note=node('p','smart24-card-description','명함 이미지 연결에 문제가 있어도 기존 지역 안내와 운행기록은 삭제되지 않습니다.');
     results.append(note);
    }finally{
     if(seq===sequence){clearTimeout(timeoutId);timeoutId=null;output.removeAttribute('aria-busy');}
    }
   }
   if(immediate)lookup();else pending=setTimeout(lookup,420);
  }
  input.addEventListener('input',()=>run(false));
  select?.addEventListener('change',()=>{
   if(select.value&&/(?:대리운전|탁송)(?:업체|회사)?$/.test(input.value.trim())){
    input.value=input.value.trim().replace(/(?:대리운전|(?:자동차|차량)?탁송)(업체|회사)?$/,(_,suffix)=>(select.value==='daeri'?'대리운전':'탁송')+(suffix||''));
   }
   run(true);
  });
  form.addEventListener('submit',event=>{
   event.preventDefault();run(true);
   // Only deliberate mobile submissions scroll to results; typing never jumps the screen.
   if(typeof window!=='undefined'&&window.innerWidth<=600&&typeof output.scrollIntoView==='function'){
    output.scrollIntoView({block:'start',behavior:'smooth'});
   }
  });
  // Support direct inbound links such as /?q=설악산탁송 and /?q=기장군탁송.
  // Keep form selection and the original typed keyword; never infer a different locality.
  const incoming=new URLSearchParams(location.search);
  const incomingKeyword=(incoming.get('q')||'').trim();
  if(!input.value.trim()&&incomingKeyword.length>=2&&incomingKeyword.length<=75)input.value=incomingKeyword;
  if(select&&['daeri','taksong'].includes(incoming.get('service')))select.value=incoming.get('service');
  if(input.value.trim().length>=2)run(false);
 });
})();
