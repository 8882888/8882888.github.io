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
 const imagePath=value=>['/card/','/assets/','/keyword-card/'].map(prefix=>safePath(value,prefix)).find(Boolean)||null;
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
 const liveCityCards=[
  {name:'서울',aliases:['서울','서울특별시'],id:'1',slug:'seoul'},
  {name:'부산',aliases:['부산','부산광역시'],id:'494',slug:'busan'},
  {name:'대구',aliases:['대구','대구광역시'],id:'765',slug:'daegu'},
  {name:'울산',aliases:['울산','울산광역시'],id:'1855',slug:'ulsan'}
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
   kind,displayKeyword:city.name+(kind==='daeri'?'대리운전':'탁송'),
   image:'/card/area-'+city.id+'-'+kind+'-brand-v5.png',
   url:'/'+kind+'/'+city.slug+'/',
   description:city.name+' '+(kind==='daeri'?'대리운전':'자동차탁송')+' 지역 상담 안내입니다. 실제 배차와 요금은 별도 확인합니다.',
   phone:'1811-4294'
  }))};
 }
 const guidePath=value=>['/daeri/','/taksong/','/service/','/special/','/business/','/설악산탁송/','/지리산탁송/'].map(prefix=>safePath(value,prefix)).find(Boolean)||null;
 const addLink=(parent,href,text,cls)=>{
  const a=node('a',cls,text);a.href=href;parent.append(a);return a;
 };
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
  if(!zoom)return false;
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
   const legacy=imagePath(card.image);
   const page=guidePath(card.url);
   if(!original||!page)return null;
   const article=node('article','smart24-card-panel');
   const title=node('h3','smart24-card-heading',card.displayKeyword||card.label||'지역별 상담 명함');
   const img=node('img','smart24-card-preview-image');
   img.src=preview||original;
   img.alt=(card.displayKeyword||card.label||'지역')+' · '+(card.kind==='daeri'?'대리운전':'자동차탁송')+' 전용 명함';
   img.width=1200;img.height=800;img.loading='eager';img.decoding='async';
   let pngFallback=false;
   img.addEventListener('error',()=>{
    // Never replace a requested exact-region image with a different region's generic art.
    if(!exact&&!pngFallback&&legacy&&img.src!==new URL(legacy,location.href).href){pngFallback=true;img.src=legacy;return}
    img.replaceWith(node('p','smart24-card-error','명함 이미지를 불러오지 못했습니다. 아래 지역 안내에서 확인해 주세요.'));
   });
   const picture=node('a','smart24-card-picture-link');
   picture.href=original;picture.target='_blank';picture.rel='noopener noreferrer';
   picture.setAttribute('aria-label',img.alt+' 크게 보기');
   picture.append(img);
   picture.addEventListener('click',event=>{
    if(zoom){event.preventDefault();openZoom(original,img.alt,picture)}
   });
   const description=node('p','smart24-card-description',card.description||'지역별 운행 조건은 상담 후 확인합니다.');
   const actions=node('div','smart24-card-actions');
   if(zoom){
    const button=node('button','smart24-card-zoom','명함 화면에서 확대');
    button.type='button';button.addEventListener('click',()=>openZoom(original,img.alt,button));
    actions.append(button);
   }
   const full=addLink(actions,original,'명함 원본 보기');
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
    message.textContent=(data.region||'선택 키워드')+'에 맞는 '+(data.cards.length===2?'대리운전·자동차탁송':'서비스 전용')+' 이미지입니다. 이미지를 누르면 크게 볼 수 있습니다.';
    const grid=node('div','smart24-card-grid');
    data.cards.forEach(card=>{const el=renderCard(card);if(el)grid.append(el)});
    if(grid.childElementCount){results.append(grid)}
    else message.textContent='검색 결과는 있지만 연결된 명함 이미지 또는 지역 상세 주소를 확인할 수 없습니다. 아래 지역 검색 결과를 이용해 주세요.';
   }else if((data.status==='ambiguous'||data.status==='suggestions')&&Array.isArray(data.candidates)){
    message.textContent=data.status==='ambiguous'?'동일한 이름의 지역이 있습니다. 정확한 지역을 선택하세요.':'지역명을 확인하고 아래 후보 중 선택하세요.';
    const list=node('div','smart24-card-choices');
    data.candidates.forEach(candidate=>{
     const b=node('button','smart24-card-choice',candidate.name||'지역 선택');
     b.type='button';b.addEventListener('click',()=>{input.value=candidate.query||candidate.name;run(true)});
     list.append(b);
    });
    results.append(list);
   }else message.textContent='일치하는 지역 명함이 없습니다. 시·군·구 이름을 확인해 주세요.';
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
   if(query.replace(/\s+/g,'').length<2){
    reset(query?'지역명을 두 글자 이상 입력해 주세요.':'');return;
   }
   const seq=++sequence;
   // Confirmed production images resolve immediately without relying on API availability.
   // A GitHub Pages backup must not assume these Cloudtype-generated assets exist there.
   if(location.hostname==='jeongukdaeri.kr'||location.hostname==='www.jeongukdaeri.kr'){
    const city=liveCityMatch(query,select?.value||'');
    if(city){show(city);return;}
   }
   async function lookup(){
    controller=new AbortController();
    let timedOut=false;
    timeoutId=setTimeout(()=>{timedOut=true;controller.abort()},6500);
    output.hidden=false;output.setAttribute('aria-busy','true');
    results.replaceChildren();message.textContent='지역에 맞는 명함을 확인하고 있습니다.';
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
     reset('이미지 자동보기 서버에 연결할 수 없습니다. 지역별 검색과 상담은 계속 이용할 수 있습니다.');
     output.hidden=false;
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
  select?.addEventListener('change',()=>run(true));
  form.addEventListener('submit',event=>{event.preventDefault();run(true)});
  if(input.value.trim().length>=2)run(false);
 });
})();
