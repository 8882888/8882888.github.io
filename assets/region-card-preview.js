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
  if(/^\/card\/area-\d+/.test(p)||/^\/keyword-card\//.test(p)||p==='/api/nationwide-locality-card.svg')return value;
  if(/^\/assets\/service-(?:taksong|daeri|golf)-visual\.svg$/.test(p)||/^\/assets\/(?:seoraksan|jirisan)-taksong-fares\.svg$/.test(p)||/^\/assets\/cycling-routes\/(?:nationwide|eastcoast|yeongsan|seomjin|geumgang|ocheon)-taksong\.svg$/.test(p))return value;
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
 // Images verified on the live jeongukdaeri.kr /region/ page (2026-11-05).
 // They are served by the production site, not necessarily the GitHub Pages mirror.
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
   kind,displayKeyword:/대리운전$|탁송$/.test(compact)?compact:city.name+(kind==='daeri'?'대리운전':'탁송'),
   keywordImage:'/keyword-card/exact/area-'+city.id+'-'+kind+'.svg?q='+encodeURIComponent(/대리운전$|탁송$/.test(compact)?compact:city.name+(kind==='daeri'?'대리운전':'탁송')),
   image:'/card/area-'+city.id+'-'+kind+'-brand-v6.png',
   url:'/'+kind+'/'+city.slug+'/',
   description:city.name+' '+(kind==='daeri'?'대리운전':'자동차탁송')+' 지역 상담 안내입니다. 실제 배차와 요금은 별도 확인합니다.',
   phone:kind==='taksong'&&city.slug==='jeju'?'1877-5245':'1811-4294'
  }))};
 }
 // Existing SVGs verified in the repository; these are route guides, not trip photos.
 const verifiedRouteVisuals=[
  {name:'영산강길종주탁송',aliases:['영산강길종주탁송','영산강종주탁송'],image:'/assets/cycling-routes/yeongsan-taksong.svg',url:'/special/cycling-trail-transport/',description:'영산강 자전거길 종주 차량 회수 안내. 출발·도착 주차장과 배차 조건은 상담으로 확인합니다.'},
  {name:'섬진강종주탁송',aliases:['섬진강종주탁송'],image:'/assets/cycling-routes/seomjin-taksong.svg',url:'/special/cycling-trail-transport/',description:'섬진강 자전거길 종주 차량 회수 안내. 차량 인수·인계 장소는 상담으로 확인합니다.'},
  {name:'동해안종주탁송',aliases:['동해안종주탁송'],image:'/assets/cycling-routes/eastcoast-taksong.svg',url:'/special/cycling-trail-transport/',description:'동해안 자전거길 종주 차량 회수 안내. 코스와 날짜에 따른 배차 조건은 상담으로 확인합니다.'},
  {name:'설악산탁송',aliases:['설악산','설악산탁송','오색탁송','한계령탁송','백담사탁송'],image:'/assets/seoraksan-taksong-fares.svg',url:'/설악산탁송/',description:'설악산 차량탁송 기존 구간별 참고요금 안내. 현재 예약요금은 상담으로 확인합니다.'},
  {name:'지리산탁송',aliases:['지리산','지리산탁송','성삼재탁송','중산리탁송','대원사탁송'],image:'/assets/jirisan-taksong-fares.svg',url:'/지리산탁송/',description:'지리산 차량탁송 기존 구간별 참고요금 안내. 현재 예약요금은 상담으로 확인합니다.'},
  {name:'자전거길종주탁송',aliases:['자전거종주','자전거종주탁송','자전거길종주탁송','영산강길종주탁송','영산강종주탁송','섬진강종주탁송','동해안종주탁송'],image:'/assets/cycling-routes/nationwide-taksong.svg',url:'/special/cycling-trail-transport/',description:'자전거길 종주 차량 회수 안내 이미지. 세부 코스별 요금과 배차는 별도 확인합니다.'}
 ];
 function routeVisualMatch(query,service){
  if(service==='daeri')return null;
  const term=String(query||'').replace(/\s+/g,'');
  const route=verifiedRouteVisuals.find(r=>r.aliases.includes(term));
  if(!route)return null;
  return {status:'matched',region:route.name,cards:[{
   kind:'taksong',displayKeyword:route.name+' · 기존 안내 이미지',
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
  const phone=kind==='taksong'&&keyword.includes('제주')?'1877-5245':'1811-4294';
  const svg=document.createElementNS(SVG_NS,'svg');
  svg.setAttribute('viewBox','0 0 1200 700');
  svg.setAttribute('role','img');
  svg.setAttribute('aria-label',keyword+' 입력 키워드 안내 명함');
  svg.style.cssText='display:block;width:100%;height:auto;border-radius:9px;background:#f2f8ff';
  const draw=(tag,attrs,value)=>{
   const el=document.createElementNS(SVG_NS,tag);
   Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));
   if(value!==undefined)el.textContent=value;
   svg.append(el);
  };
  draw('rect',{x:0,y:0,width:1200,height:700,fill:'#f1f7fe'});
  draw('rect',{x:0,y:0,width:1200,height:110,fill:'#0a4c85'});
  draw('text',{x:54,y:75,fill:'#ffffff','font-family':'sans-serif','font-size':42,'font-weight':800},'스마트24 · '+service);
  draw('text',{x:54,y:175,fill:'#286387','font-family':'sans-serif','font-size':29},'입력 키워드 상담 명함');
  const chars=Array.from(keyword),step=chars.length>44?Math.ceil(chars.length/3):chars.length>23?Math.ceil(chars.length/2):Math.max(1,chars.length);
  const lines=[];for(let i=0;i<chars.length;i+=step)lines.push(chars.slice(i,i+step).join(''));
  const font=Math.max(32,Math.min(72,Math.floor(1050/Math.max(1,...lines.map(line=>Array.from(line).length)))));
  lines.forEach((line,i)=>draw('text',{x:55,y:275+i*95,fill:'#053c75','font-family':'sans-serif','font-size':font,'font-weight':900},line));
  draw('rect',{x:38,y:535,width:1124,height:123,rx:16,fill:'#d7eaff'});
  draw('text',{x:600,y:607,'text-anchor':'middle',fill:'#064379','font-family':'sans-serif','font-size':66,'font-weight':900},phone);
  draw('text',{x:600,y:645,'text-anchor':'middle',fill:'#345a77','font-family':'sans-serif','font-size':22},'지역 일치·운행·현재 요금·기사 배정은 확인 후 안내');
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
   const phone=service==='taksong'&&keyword.includes('제주')?'1877-5245':'1811-4294';
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
   const legacy=imagePath(card.image);
   const page=guidePath(card.url);
   if(!page||!['daeri','taksong'].includes(card.kind))return null;
   const article=node('article','smart24-card-panel');
   const title=node('h3','smart24-card-heading',card.displayKeyword||card.label||'지역별 상담 명함');
   const img=node('img','smart24-card-preview-image');
   img.src=preview||original||serviceFallback;
   img.alt=(card.displayKeyword||card.label||'지역')+' · '+(card.kind==='daeri'?'대리운전':'자동차탁송')+(original?' 전용 명함':' 공통 서비스 안내 이미지 (지역별 실제 사진 아님)');
   img.width=1200;img.height=800;img.loading='eager';img.decoding='async';
   let pngFallback=false;
   let zoomButton=null,fullLink=null;
   img.addEventListener('error',()=>{
    // Never replace a requested exact-region image with a different region's generic art.
    if(!exact&&!pngFallback&&legacy&&img.src!==new URL(legacy,location.href).href){pngFallback=true;img.src=legacy;return}
    // Preserve the exact typed keyword even if the image host is stale or unreachable.
    picture.removeAttribute('href');
    picture.removeAttribute('target');
    picture.style.cursor='default';
    img.replaceWith(localKeywordSvg(card.displayKeyword||card.label||input.value.trim(),card.kind));
    if(zoomButton)zoomButton.remove();
    if(fullLink)fullLink.remove();
   });
   const picture=node('a','smart24-card-picture-link');
   picture.href=original||serviceFallback;picture.target='_blank';picture.rel='noopener noreferrer';
   picture.setAttribute('aria-label',img.alt+' 크게 보기');
   picture.append(img);
   picture.addEventListener('click',event=>{
    // A generated in-browser SVG remains visible after an image 404, but no longer has an original URL.
    // Do not open a blank image dialog or prevent navigation to a missing href.
    const href=picture.getAttribute('href');
    if(zoom&&href){event.preventDefault();openZoom(href,img.alt,picture)}
   });
   const description=node('p','smart24-card-description',card.description||'지역별 운행 조건은 상담 후 확인합니다.');
   const actions=node('div','smart24-card-actions');
   if(zoom){
    const button=node('button','smart24-card-zoom','명함 화면에서 확대');
    zoomButton=button;
    button.type='button';button.addEventListener('click',()=>openZoom(picture.getAttribute('href'),img.alt,button));
    actions.append(button);
   }
   const full=addLink(actions,original||serviceFallback,'명함 원본 보기');
   fullLink=full;
   full.target='_blank';full.rel='noopener noreferrer';
   addLink(actions,page,'지역 상세 안내');
   const tel=String(card.phone||'1811-4294').replace(/[^0-9]/g,'');
   if(tel.length>=7)addLink(actions,'tel:'+tel,'전화 '+card.phone,'smart24-card-phone');
   article.append(title,picture,description,actions);
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
   addLink(p,'/region/?'+params.toString(),'전체 지역 검색 결과 보기');
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
   // Confirmed production images resolve immediately without relying on API availability.
   // A GitHub Pages backup must not assume these Cloudtype-generated assets exist there.
   // Show lightweight exact-keyword SVGs immediately for verified city routes.
   if(location.hostname==='jeongukdaeri.kr'||location.hostname==='www.jeongukdaeri.kr'){
    const city=liveCityMatch(query,select?.value||'');
    if(city){show(city);return;}
   }
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
     showDraft(query,inferred||select?.value||'taksong','조회 서버에 연결되지 않아 입력한 키워드 텍스트 명함을 표시합니다.');
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
  form.addEventListener('submit',event=>{event.preventDefault();run(true)});
  if(input.value.trim().length>=2)run(false);
 });
})();
