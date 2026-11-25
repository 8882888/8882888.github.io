'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../fare/index.html'),'utf8');
const start=html.indexOf("const worker='https://white-voice-6eab.k337711.workers.dev/route';");
const end=html.indexOf("const preset=new URLSearchParams(location.search);",start);
assert(start>=0&&end>start,'expect calculator route helper before preset initialization');
const source=html.slice(start,end)+'\n globalThis.lookupRoad=lookupRoad;';
function getLookup(responses){
 let calls=0;
 const ctx={URLSearchParams,Map,Date,Number,Error,String,Promise,setTimeout,
  fetch:async()=>{const step=responses[Math.min(calls++,responses.length-1)];
   if(step instanceof Error)throw step;
   return {status:step.status||200,ok:(step.status||200)>=200&&(step.status||200)<300,
    json:async()=>step.body};}};
 vm.createContext(ctx);
 vm.runInContext(source,ctx);
 return {lookup:ctx.lookupRoad,calls:()=>calls};
}
const signal=new AbortController().signal;
test('successful actual road distance caches same source/destination',async()=>{
 const x=getLookup([{body:{distanceKm:411,durationMinutes:285}}]);
 const data=await x.lookup('서울역','부산역',signal);
 assert.equal(data.distanceKm,411);
 assert.equal((await x.lookup('서울역','부산역',signal)).distanceKm,411);
 assert.equal(x.calls(),1);
});
test('provider permission or quota response never fabricates quote or retries',async()=>{
 const x=getLookup([{status:502,body:{error:'길찾기 API를 사용할 수 없습니다. API 권한과 할당량을 확인해 주세요.'}}]);
 await assert.rejects(x.lookup('서울역','부산역',signal),e=>e.kind==='provider-config'&&e.status===502);
 assert.equal(x.calls(),1);
 assert(html.includes('도로거리 제공 서비스의 연결 설정 또는 이용 한도 문제'),'show an accurate consultation fallback');
 assert(html.includes('확인되지 않은 거리나 요금은 표시하지 않습니다.'));
});
test('single transient 503 is retried, but a genuine 404 is not',async()=>{
 const transient=getLookup([{status:503,body:{error:'temporarily unavailable'}},{body:{distanceKm:202,durationMinutes:192}}]);
 assert.equal((await transient.lookup('청주','대전',signal)).distanceKm,202);
 assert.equal(transient.calls(),2);
 const missing=getLookup([{status:404,body:{error:'invalid route'}}]);
 await assert.rejects(missing.lookup('청주','대전',signal),e=>e.status===404);
 assert.equal(missing.calls(),1);
});
test('invalid provider distance cannot turn into a successful quote',async()=>{
 const x=getLookup([{body:{distanceKm:0,durationMinutes:20}}]);
 await assert.rejects(x.lookup('서울','부산',signal),/invalid distance/);
});

function consultationPanel(clipboard){
 const nodes=[];
 const element=tag=>({tag,style:{},children:[],handlers:{},append(...items){this.children.push(...items)},setAttribute(){},addEventListener(name,fn){this.handlers[name]=fn},focus(){this.focused=true},select(){this.selected=true}});
 const result=element('div');
 const ctx={document:{createElement:element},navigator:{clipboard},result};
 vm.createContext(ctx);
 const start=html.indexOf('function appendUnavailableQuoteConsultation('),end=html.indexOf('function appendConsultationDetails(',start);
 assert(start>=0&&end>start);
 vm.runInContext(html.slice(start,end)+'\nglobalThis.render=appendUnavailableQuoteConsultation;',ctx);
 ctx.render('서울역','부산역','taksong');
 const panel=result.children[0];
 assert.equal(panel.id,'unavailable-quote-consultation');
 return panel.children;
}
test('outage preserves route for explicit copy and Kakao consultation without automatic transmission',async()=>{
 const writes=[];
 const [label,request,copy,feedback,chat,note]=consultationPanel({writeText:async value=>writes.push(value)});
 assert.equal(request.readOnly,true);
 assert.match(request.value,/자동차탁송 요금 상담/);
 assert.match(request.value,/출발지: 서울역/);
 assert.match(request.value,/도착지: 부산역/);
 assert.equal(writes.length,0);
 assert.equal(copy.type,'button');
 await copy.handlers.click();
 assert.deepEqual(writes,[request.value]);
 assert.match(feedback.textContent,/복사했습니다/);
 assert.equal(chat.href,'https://open.kakao.com/o/sGV88r7h');
 assert.match(note.textContent,/자동 전송되지 않습니다/);
 assert(html.includes('result.append(contact);appendUnavailableQuoteConsultation(from,to,service)}finally'));
});
test('unavailable clipboard selects customer request for manual copying',async()=>{
 const [,request,copy,feedback]=consultationPanel(undefined);
 await copy.handlers.click();
 assert.equal(request.focused,true);
 assert.equal(request.selected,true);
 assert.match(feedback.textContent,/직접 복사/);
});
