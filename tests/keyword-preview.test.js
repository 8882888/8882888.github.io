'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {Script}=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const client=fs.readFileSync(path.join(root,'assets/region-card-preview.js'),'utf8');
// Prevent a future data reorder from silently showing the wrong province image.
// The IDs are dataset offsets, not arbitrary marketing artwork identifiers.
const legalDir=path.join(root,'data/legal-regions');
let regionNumber=0;
const provinceIds=new Map();
for(const name of fs.readdirSync(legalDir).filter(x=>/^\d{2}\.json$/.test(x)).sort()){
 const data=JSON.parse(fs.readFileSync(path.join(legalDir,name),'utf8'));
 for(const fullName of data.full_names){
  regionNumber++;
  if(fullName.indexOf(' ')===-1)provinceIds.set(fullName,String(regionNumber));
 }
}
assert.equal(regionNumber,20562,'full administrative dataset must be loaded before province ID checks');
const provinceImageMappings=[
 ['서울특별시','seoul'],['부산광역시','busan'],['대구광역시','daegu'],
 ['인천광역시','incheon'],['광주광역시','gwangju'],['대전광역시','daejeon'],
 ['울산광역시','ulsan'],['세종특별자치시','sejong'],['경기도','gyeonggi'],
 ['강원특별자치도','gangwon'],['충청북도','chungbuk'],['충청남도','chungnam'],
 ['전북특별자치도','jeonbuk'],['전라남도','jeonnam'],['경상북도','gyeongbuk'],
 ['경상남도','gyeongnam'],['제주특별자치도','jeju']
];
assert.equal(provinceImageMappings.length,17);
for(const [province,slug] of provinceImageMappings){
 const id=provinceIds.get(province);
 assert.ok(id,'official province missing in legal region dataset: '+province);
 assert.ok(client.includes("id:'"+id+"',slug:'"+slug+"'"),
   'client image ID mismatches authoritative legal-region order for '+province+' ('+id+')');
}

new Script(client,{filename:'region-card-preview.js'});
assert.match(html,/<form\b[^>]*id="nationwide-live-locality-form-20261107"[^>]*data-card-preview-form/,'home keyword form must have preview binding');
assert.match(html,/class="region-card-live" data-card-preview-output hidden/,'home must include keyword image output');
assert.ok(!html.includes('#dynamic-service-card-search-20261103{display:none!important}'),'keyword preview must be visible');
assert.ok(client.includes('function localKeywordSvg(raw,kind)'),'typed keyword SVG builder must exist');
assert.ok(client.includes('-brand-v7.png')&&!client.includes('-brand-v6.png'),
 'instant region previews should use the cache-busting photo-free v7 image');
assert.ok(html.includes('region-card-preview.js?v=20261109-mobile-v11'),
 'homepage must load the current mobile-v11 image preview client instead of an old cached script');
assert.ok(client.includes("showDraft(query,inferred||select?.value||'taksong')"),'keyword should show immediately');
assert.ok(client.includes('picture.append(fallback)')&&client.includes('if(!fallback.isConnected)return;')&&client.includes('tryNext();'),'image failures must preserve the immediately visible exact-keyword SVG until a verified image loads');
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
 remove(){
  if(!this._parent)return;
  const index=this._parent.children.indexOf(this);
  if(index>=0)this._parent.children.splice(index,1);
  this._parent=null;
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
const metro=findElement(output,x=>x.tag==='svg');
assert.ok(metro,'typing 부산대리운전 must immediately render an exact-keyword SVG');
assert.equal(select.value,'daeri','service intent in typed phrase overrides old select value');
assert.ok(metro.children.some(x=>x.tag==='text'&&x.textContent==='부산대리운전'),
 'the local fallback must show the exact typed keyword while a remote image loads');
assert.ok(!findElement(output,x=>x.tag==='img'&&x._parent),
 'a pending or failed remote image must not be attached before load success');

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
 const inline=findElement(output,x=>x.tag==='svg');
 assert.ok(inline,'a safe local SVG must be visible immediately for '+keyword);
 assert.ok(inline.children.some(x=>x.tag==='text'&&x.textContent===keyword),
  'visible SVG keyword must match the exact input: '+keyword);
 assert.ok(!inline.children.some(x=>x.tag==='image'),
  'fallback must not contain car or person photos: '+keyword);
 if(expectedArea){
  const id=expectedArea.match(/area-(\\d+)-/)[1];
  assert.ok(client.includes("id:'"+id+"'"),'province ID must be present for '+keyword);
 }

}
console.log('PASS keyword image preview bindings, fallback and JavaScript syntax');
