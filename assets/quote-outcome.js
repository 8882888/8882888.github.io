/* Anonymous operational quote diagnostics: no addresses, names, phone numbers,
 * routes, source query or per-user identifiers are collected. */
(function(){
 'use strict';
 const api='https://xgdijyiotsemfnsuwwoi.supabase.co/rest/v1/rpc/site_quote_event';
 const publicKey='sb_publishable_QjNQmNLe9NWRQtBjTu1QqQ_w-cmKGui';
 window.smart24QuoteOutcome=function(service,outcome){
  if(!['daeri','taksong'].includes(service)||!['success','error','timeout'].includes(outcome))return;
  try{
   if(localStorage.getItem('smart24_exclude_own_visits_v1')==='1'||new URL(location.href).searchParams.get('internal')==='1')return;
  }catch(_){}
  // This is best-effort page telemetry and must never delay a quote or a call.
  try{fetch(api,{method:'POST',headers:{'apikey':publicKey,'Authorization':'Bearer '+publicKey,'Content-Type':'application/json'},body:JSON.stringify({p_service:service,p_outcome:outcome}),keepalive:true,cache:'no-store'}).catch(()=>{});}catch(_){}
 };
})();