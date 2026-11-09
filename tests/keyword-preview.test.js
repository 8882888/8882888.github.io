'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {Script}=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const client=fs.readFileSync(path.join(root,'assets/region-card-preview.js'),'utf8');
new Script(client,{filename:'region-card-preview.js'});
assert.match(html,/<form\b[^>]*id="nationwide-live-locality-form-20261107"[^>]*data-card-preview-form/,'home keyword form must have preview binding');
assert.match(html,/class="region-card-live" data-card-preview-output hidden/,'home must include keyword image output');
assert.ok(!html.includes('#dynamic-service-card-search-20261103{display:none!important}'),'keyword preview must be visible');
assert.ok(client.includes('function localKeywordSvg(raw,kind)'),'typed keyword SVG builder must exist');
assert.ok(client.includes("showDraft(query,inferred||select?.value||'taksong')"),'keyword should show immediately');
assert.ok(client.includes('img.replaceWith(localKeywordSvg('),'image failure must retain keyword text');
assert.ok(client.includes("const href=picture.getAttribute('href');")&&client.includes('if(zoom&&href)'),
 'image errors must not open an empty zoom modal');
assert.ok(client.includes("showDraft(input.value.trim(),select?.value||'taksong',message.textContent)"),'ambiguous results should show a keyword card');
assert.ok(!/<img\b[^>]*src="\/assets\/photos\//i.test(html),'no removed vehicle/person photos on home');

class MockElement{
 constructor(tag){this.tag=tag;this.children=[];this.style={};this.events={};this.attrs={};this.textContent='';this.hidden=false;}
 append(...items){for(const item of items){if(item&&typeof item==='object')item._parent=this;this.children.push(item);}}
 replaceChildren(...items){this.children=[];this.append(...items);}
 replaceWith(item){
  assert.ok(this._parent,'replacement must have a parent element');
  const index=this._parent.children.indexOf(this);
  assert.ok(index>=0,'replacement must refer to an attached image');
  item._parent=this._parent;this._parent.children[index]=item;this._parent=null;
 }
 setAttribute(k,v){this.attrs[k]=String(v);}
 getAttribute(k){return this.attrs[k]??null;}
 removeAttribute(k){delete this.attrs[k];}
 addEventListener(k,fn){this.events[k]=fn;}
 get childElementCount(){return this.children.length;}
}
const input=new MockElement('input'),select=new MockElement('select'),output=new MockElement('output'),form=new MockElement('form');
input.value='부산대리운전';select.value='taksong';
form.querySelector=q=>q==='input[name="q"]'?input:q==='select[name="service"]'?select:null;
form.parentElement={querySelector:q=>q==='[data-card-preview-output]'?output:null};
const documentMock={
 querySelectorAll:q=>q==='form[data-card-preview-form]'?[form]:[],
 createElement:t=>new MockElement(t),
 createElementNS:(_ns,t)=>new MockElement(t),
 body:new MockElement('body')
};
const runner=new Function('document','location','HTMLDialogElement','URLSearchParams','setTimeout','clearTimeout','fetch','AbortController',client);
runner(documentMock,{hostname:'jeongukdaeri.kr'},undefined,URLSearchParams,()=>1,()=>{},()=>Promise.reject(Error('offline')),AbortController);
function findElement(el,test){
 if(test(el))return el;
 for(const child of el.children||[]){const found=findElement(child,test);if(found)return found;}
 return null;
}
const metro=findElement(output,x=>x.tag==='img'&&String(x.src||'').startsWith('/keyword-card/exact/'));
assert.ok(metro&&metro.src.includes('area-494-daeri.svg'),'typing 부산대리운전 should select a matching original SVG card');
assert.equal(select.value,'daeri','service intent in typed phrase overrides old select value');
assert.equal(typeof metro.events.error,'function','region image must register load-failure handler');
metro.events.error();
const recovered=findElement(output,x=>x.tag==='svg');
assert.ok(recovered,'a failed exact-region image must recover as in-browser SVG');
assert.ok(recovered.children.some(x=>x.tag==='text'&&x.textContent==='부산대리운전'),
 'in-browser fallback image must paint the exact typed region keyword');
assert.ok(!findElement(output,x=>x.tag==='img'&&String(x.src||'').startsWith('/keyword-card/exact/')),
 'failed remote preview must not remain as a broken image');

input.value='원주혁신도시대리운전';
assert.equal(typeof input.events.input,'function','input listener attached to homepage form');
input.events.input();
const svg=findElement(output,x=>x.tag==='svg');
assert.ok(svg&&!output.hidden,'unregistered or pending keyword still displays a local SVG immediately');
assert.ok(svg.children.some(x=>x.tag==='text'&&x.textContent==='원주혁신도시대리운전'),'local graphic must contain exact typed keyword');
assert.ok(!svg.children.some(x=>x.tag==='image'),'local SVG contains no photos of cars or people');

// Cover representative metro, port, and innovation-city searches.
for(const [keyword,kind,expectedArea] of [
 ['부산대리운전','daeri','area-494-daeri.svg'],
 ['대구탁송','taksong','area-765-taksong.svg'],
 ['세종탁송','taksong','area-2063-taksong.svg'],
 ['대전대리운전','daeri','area-1672-daeri.svg'],
 ['인천탁송','taksong','area-1174-taksong.svg'],
 ['강원도탁송','taksong','area-4433-taksong.svg'],
 ['광주광역시탁송','taksong','area-1464-taksong.svg'],
 ['제주도탁송','taksong','area-20348-taksong.svg'],
 ['원주혁신도시대리운전','daeri',null],
 ['삼길포항대리운전','daeri',null]
]){
 input.value=keyword;
 input.events.input();
 assert.equal(output.hidden,false,'input keyword must open visible graphic: '+keyword);
 assert.equal(select.value,kind,'keyword must select its correct service: '+keyword);
 const exact=findElement(output,x=>x.tag==='img'&&String(x.src||'').includes('/keyword-card/exact/'));
 const inline=findElement(output,x=>x.tag==='svg');
 if(expectedArea){
  assert.ok(exact&&exact.src.includes(expectedArea),'exact regional SVG URL missing for '+keyword);
 }else{
  assert.ok(inline,'local SVG fallback missing for '+keyword);
  assert.ok(inline.children.some(x=>x.tag==='text'&&x.textContent===keyword),'fallback text must match '+keyword);
  assert.ok(!inline.children.some(x=>x.tag==='image'),'fallback must not contain car or person photos: '+keyword);
 }
}
console.log('PASS keyword image preview bindings, fallback and JavaScript syntax');
