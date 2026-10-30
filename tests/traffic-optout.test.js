'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const script=fs.readFileSync(require('node:path').join(__dirname,'../assets/traffic-analytics.js'),'utf8');
function mount(href,storage=new Map()){
 const calls=[],listeners={},elements=new Map(),session=new Map();
 function node(id){
  if(!elements.has(id))elements.set(id,{
   id,textContent:'',hidden:id==='traffic-sources-detail',checked:false,attributes:{},listeners:{},
   addEventListener(t,fn){this.listeners[t]=fn},
   setAttribute(k,v){this.attributes[k]=v},
   replaceChildren(){this.children=[]},
   appendChild(item){(this.children??=[]).push(item)}
  });
  return elements.get(id);
 }
 const document={
  referrer:'',visibilityState:'visible',
  getElementById:node,addEventListener(t,fn){listeners[t]=fn},
  createElement:()=>({textContent:''})
 };
 const storageAdapter=map=>({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v))});
 async function fetch(url,opts){
  calls.push({url,params:JSON.parse(opts.body||'{}')});
  return {ok:true,status:200,async text(){
   return JSON.stringify(url.includes('traffic_dashboard')?
    {total_phone_clicks:2,phone_sources:[]}:
    {today_visits:5,total_visits:14})}};
 }
 const ctx={document,fetch,URL,location:{href,hostname:'jeongukdaeri.kr',pathname:'/'},
  sessionStorage:storageAdapter(session),localStorage:storageAdapter(storage),
  window:{addEventListener(){}},Intl,Date,Number,String,JSON,console};
 vm.runInNewContext(script,ctx,{filename:'traffic-analytics.js',timeout:1000});
 return {calls,elements,listeners,storage};
}
function recordedVisits(m){return m.calls.filter(x=>x.url.endsWith('/site_visit_stats')&&x.params.p_record===true)}
function phoneEvents(m){return m.calls.filter(x=>x.url.endsWith('/site_phone_event'))}
function clickPhone(m){
 const link={getAttribute:()=> 'tel:18114294'};
 m.listeners.click({target:{closest:()=>link}});
}
const internal=mount('https://jeongukdaeri.kr/?internal=1');
assert.equal(recordedVisits(internal).length,0,'internal preview must not record visits');
assert.equal(internal.elements.get('exclude-my-visits').checked,true,'internal setting is reflected');
clickPhone(internal);
assert.equal(phoneEvents(internal).length,0,'internal preview phone testing must not count');
const shared=new Map();
const first=mount('https://jeongukdaeri.kr/',shared);
assert.equal(recordedVisits(first).length,1,'first browser session records a visit');
const second=mount('https://jeongukdaeri.kr/daeri/',shared);
assert.equal(recordedVisits(second).length,0,'a second tab in the same browser/day must not add visits');
clickPhone(second);
assert.equal(phoneEvents(second).length,1,'real phone button clicks remain recorded');
const box=second.elements.get('exclude-my-visits');
box.checked=true;
box.listeners.change();
clickPhone(second);
assert.equal(phoneEvents(second).length,1,'opted-out phone tests must not count');
const third=mount('https://jeongukdaeri.kr/taksong/',shared);
assert.equal(recordedVisits(third).length,0,'opt-out persists for subsequent internal visits');
assert.equal(third.elements.get('exclude-my-visits').checked,true);
console.log('PASS: explicit internal testing and phone clicks excluded; same-browser daily visits deduplicated');
