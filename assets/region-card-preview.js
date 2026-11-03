/* Smart24: progressive enhancement for exact-region service cards.
 * Forms still work with ordinary GET navigation when JavaScript is disabled.
 */
(function(){
 'use strict';
 const forms=document.querySelectorAll('form[data-card-preview-form]');
 if(!forms.length)return;
 function node(tag,cls,text){
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(text!==undefined)el.textContent=String(text);
  return el;
 }
 function safePath(value,prefix){
  return typeof value==='string'&&value.startsWith(prefix)&&!value.startsWith('//')?value:null;
 }
 function addLink(parent,url,text,cls){
  const a=node('a',cls,text);a.href=url;parent.appendChild(a);return a;
 }
 function createDialog(){
  if(typeof HTMLDialogElement==='undefined')return null;
  const d=node('dialog','smart24-card-dialog');
  const close=node('button','smart24-card-dialog-close','닫기 ×');
  close.type='button';close.addEventListener('click',()=>d.close());
  const image=node('img','smart24-card-dialog-image');
  image.alt='';image.width=1200;image.height=800;
  d.append(close,image);
  d.addEventListener('click',e=>{if(e.target===d)d.close()});
  document.body.appendChild(d);
  return {dialog:d,image};
 }
 const zoom=createDialog();
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
  function clear(reason){
   if(controller)controller.abort();
   controller=null;
   output.hidden=!reason;
   results.replaceChildren();
   message.textContent=reason||'';
   output.removeAttribute('aria-busy');
  }
  function renderCard(card){
   const imgPath=safePath(card.image,'/card/');
   const pagePath=safePath(card.url,'/daeri/')||safePath(card.url,'/taksong/');
   if(!imgPath||!pagePath)return null;
   const article=node('article','smart24-card-panel');
   const title=node('h3','smart24-card-heading',card.label||'지역별 상담 명함');
   const img=node('img','smart24-card-preview-image');
   img.src=imgPath;img.alt=(card.label||'지역')+' · '+(card.kind==='daeri'?'대리운전':'자동차탁송')+' 전용 명함';
   img.width=1200;img.height=800;img.loading='eager';img.decoding='async';
   img.addEventListener('error',()=>{
    const fallback=node('p','smart24-card-error','명함 이미지를 불러오지 못했습니다. 아래 지역 안내에서 확인해 주세요.');
    img.replaceWith(fallback);
   },{once:true});
   const desc=node('p','smart24-card-description',card.description||'지역별 운행 조건은 상담 후 확인합니다.');
   const actions=node('div','smart24-card-actions');
   const enlarge=addLink(actions,imgPath,'명함 원본 보기');
   enlarge.target='_blank';enlarge.rel='noopener noreferrer';
   if(zoom){
    const b=node('button','smart24-card-zoom','명함 화면에서 확대');
    b.type='button';b.addEventListener('click',()=>{
     zoom.image.src=imgPath;zoom.image.alt=img.alt;zoom.dialog.showModal();
    });actions.prepend(b);
   }
   addLink(actions,pagePath,'지역 상세 안내');
   const tel=String(card.phone||'1811-4294').replace(/[^0-9]/g,'');
   if(tel.length>=7)addLink(actions,'tel:'+tel,'전화 '+card.phone,'smart24-card-phone');
   article.append(title,img,desc,actions);
   return article;
  }
  function render(data){
   output.hidden=false;results.replaceChildren();
   if(data.status==='matched'&&Array.isArray(data.cards)&&data.cards.length){
    message.textContent=(data.region||'선택 지역')+'의 '+(data.cards.length===2?'대리운전·자동차탁송':'서비스 전용')+' 명함입니다. 이미지를 누르거나 확대 버튼을 이용하세요.';
    const grid=node('div','smart24-card-grid');
    data.cards.forEach(card=>{const el=renderCard(card);if(el)grid.append(el)});
    results.append(grid);
   }else if((data.status==='ambiguous'||data.status==='suggestions')&&Array.isArray(data.candidates)){
    message.textContent=data.status==='ambiguous'
      ?'동일한 이름의 지역이 있습니다. 정확한 지역을 선택하세요.'
      :'일치하는 지역을 찾지 못했습니다. 아래 지역 중 선택하세요.';
    const list=node('div','smart24-card-choices');
    data.candidates.forEach(c=>{
     const b=node('button','smart24-card-choice',c.name||'지역 선택');
     b.type='button';b.addEventListener('click',()=>{input.value=c.query||c.name;run(true)});
     list.append(b);
    });
    results.append(list);
   }else{
    message.textContent='일치하는 지역 명함이 없습니다. 시·군·구 이름을 확인해 주세요.';
   }
   const q=new URLSearchParams({q:input.value.trim()});
   if(select&&select.value)q.set('service',select.value);
   const p=node('p','smart24-card-full-search');
   addLink(p,'/region/?'+q.toString(),'전체 지역 검색 결과 보기');
   results.append(p);
  }
  async function run(immediate){
   if(pending){clearTimeout(pending);pending=null}
   if(controller)controller.abort();
   const query=input.value.trim();
   if(query.replace(/\s+/g,'').length<2){clear(query?'지역명을 두 글자 이상 입력해 주세요.':'');return}
   const seq=++sequence;
   async function lookup(){
    controller=new AbortController();
    output.hidden=false;output.setAttribute('aria-busy','true');
    results.replaceChildren();message.textContent='지역에 맞는 명함을 확인하고 있습니다.';
    const params=new URLSearchParams({q:query});
    if(select&&select.value)params.set('service',select.value);
    try{
     const response=await fetch('/api/region-card-preview?'+params.toString(),{signal:controller.signal,cache:'no-store',credentials:'same-origin'});
     if(!response.ok)throw new Error('Preview unavailable');
     const data=await response.json();
     if(seq!==sequence)return;
     render(data);
    }catch(err){
     if(err.name==='AbortError'||seq!==sequence)return;
     clear('명함 미리보기를 불러올 수 없습니다. 검색 버튼으로 전체 지역 안내를 이용해 주세요.');
     output.hidden=false;
     const p=new URLSearchParams({q:query});
     if(select&&select.value)p.set('service',select.value);
     addLink(results,'/region/?'+p.toString(),'지역 검색 페이지 열기');
    }finally{
     if(seq===sequence)output.removeAttribute('aria-busy');
    }
   }
   if(immediate)lookup();else pending=setTimeout(lookup,420);
  }
  input.addEventListener('input',()=>run(false));
  select?.addEventListener('change',()=>run(true));
  form.addEventListener('submit',e=>{e.preventDefault();run(true)});
  if(input.value.trim().length>=2)run(false);
 });
})();
