'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../assets/traffic-analytics.js'),'utf8');
const pending={};
function el(id){
 if(pending[id])return pending[id];
 const callbacks={};
 pending[id]={
  id,textContent:'',hidden:true,children:[],attributes:{},
  addEventListener:(type,callback)=>{callbacks[type]=callback},
  setAttribute:(key,value)=>{pending[id].attributes[key]=value},
  replaceChildren(){this.children=[]},
  appendChild(item){this.children.push(item)},
  click(){if(callbacks.click)callbacks.click()}
 };
 return pending[id];
}
const requests=[];
const local=new Map();
const listeners={};
const loc={href:'https://jeongukdaeri.kr/',hostname:'jeongukdaeri.kr',pathname:'/'};
const doc={
 referrer:'https://search.naver.com/search.naver?query=%ED%83%81%EC%86%A1',
 visibilityState:'visible',
 getElementById:el,
 createElement:()=>({textContent:''}),
 addEventListener:(name,callback)=>{listeners[name]=callback}
};
const fake=(payload,status=200)=>({
 ok:true,status,text:async()=>status===204?'':JSON.stringify([payload])
});
const fetchMock=async(url,options)=>{
 const name=url.split('/').pop();
 const body=JSON.parse(options.body);
 requests.push({name,body});
 switch(name){
  case 'site_visit_stats': return fake({today_visits:5,total_visits:9});
  case 'site_traffic_dashboard':return fake({
    today_visits:5,total_visits:9,total_phone_clicks:4,
    phone_sources:[{source:'기존 클릭 · 유입 경로 미확인',page:'',day:'',clicks:4}]
  });
  case 'site_phone_event':return fake(null,204);
  case 'site_click_stats':return fake({total_clicks:4});
  default:throw Error('unexpected API '+name);
 }
};
const env={
 fetch:fetchMock,document:doc,window:{addEventListener:()=>{}},
 location:loc,sessionStorage:{
  getItem:k=>local.get(k)||null,
  setItem:(k,v)=>local.set(k,v)
 },Intl,Date,URL,URLSearchParams,console
};
vm.runInNewContext(script,env,{filename:'traffic-analytics.js',timeout:1500});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 await tick();await tick();
 assert.equal(el('today-visit-number').textContent,'5회');
 assert.equal(el('total-visit-number').textContent,'9회');
 assert.equal(el('phone-click-number').textContent,'4회');
 assert.equal(el('traffic-sources-detail').hidden,true);
 assert.equal(el('phone-source-list').children.length,1);
 assert.ok(el('phone-source-list').children[0].textContent.includes('유입 경로 미확인'),
   'old clicks must be visible without inventing source');
 el('traffic-call-trigger').click();
 assert.equal(el('traffic-sources-detail').hidden,false);
 assert.equal(el('traffic-call-trigger').attributes['aria-expanded'],'true');
 el('traffic-call-trigger').click();
 assert.equal(el('traffic-sources-detail').hidden,true);
 // The user navigates inside Smart24 before clicking. The first Naver
 // landing source must still be remembered, never overwritten as internal.
 doc.referrer='https://jeongukdaeri.kr/';
 loc.href='https://jeongukdaeri.kr/taksong/';
 loc.pathname='/taksong/';
 listeners.click({
   target:{closest:()=>({getAttribute:()=> 'tel:18114294'})}
 });
 await tick();await tick();
 const event=requests.find(r=>r.name==='site_phone_event');
 assert.ok(event,'click sends one attribution event');
 assert.equal(event.body.p_source,'네이버 검색');
 assert.equal(event.body.p_page,'/taksong/');
 assert.equal(requests.filter(r=>r.name==='site_click_stats').length,0,
   '204 No Content from successful source logging must not double-count');
 console.log('PASS: referral preserved, click counter and expander work, old clicks explicit, no duplicate write');
})().catch(error=>{console.error(error);process.exitCode=1});
