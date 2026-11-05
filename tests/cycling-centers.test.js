'use strict';
const assert=require('node:assert/strict');
const c=require('../lib/cycling-centers'),k=require('../lib/keyword-card-expansion');
const terms=['낙동강길종주','낙동강자전거길종주','낙동강길종주탁송','낙동강자전거길종주탁송','국토종주자전거길','국토종주자전거길탁송','백두대간종주','백두대간자전거길종주','백두대간종주탁송','백두대간자전거길종주탁송'];
for(const q of terms)assert.equal(k.resolve(q)?.kind,'taksong',q);
assert.notEqual(k.resolve('백두대간종주').slug,k.resolve('백두대간자전거길종주').slug);
assert.equal(c.centers.length,87);assert.equal(new Set(c.centers.map(x=>x.id)).size,87);
let count=0;
for(const from of c.centers)for(const to of c.centers){if(from.id===to.id)continue;const p=c.pair(from.name+'인증센터'+to.name+'인증센터탁송');assert(p,from.name+' → '+to.name);assert.equal(p.from.id,from.id);assert.equal(p.to.id,to.id);count++}
const forward=c.pair('안동댐인증센터에서 낙동강하구둑인증센터까지 탁송');
const reverse=c.pair('낙동강하구둑인증센터 안동댐인증센터 탁송');
assert(forward&&reverse);assert.equal(forward.from.id,reverse.to.id);assert.equal(forward.to.id,reverse.from.id);
assert.equal(c.pair('없는인증센터에서 가짜인증센터탁송'),null);
console.log('PASS 10 keywords, separate mountain/bicycle intents, 87 official-list locations and '+count+' directed center pairs');

const html=c.page(new URLSearchParams(),{layout:(a,b,body)=>body,esc:s=>String(s),host:'example.com'});
assert(html.includes('cycling-centers-original-guide'));
for(const id of ['224445317658','224430900352','224452067282'])assert(html.includes(id),'preserve published original '+id);

const infoTerms=['동해안자전거길종주','자전거길종주','자전거길완벽정리','국토종주자전거길종주','설악산종주','설악산종주완벽정리','지리산종주','지리산종주완벽정리','설악산코스별탁송','지리산코스별탁송','성대종주','성중종주','화대종주','화중종주','백중종주','백대종주','중삼종주'];
for(const q of infoTerms)assert(k.resolve(q),'informational keyword '+q);
for(const course of ['동해안','낙동강','영산강','섬진강','금강','오천'])for(const suffix of ['자전거길종주','자전거길종주완벽정리','길종주탁송'])assert(k.resolve(course+suffix),'course intent '+course+suffix);
for(const suffix of ['자전거길종주','자전거길종주 및 탁송']){const p=c.pair('고성통일전망대인증센터에서 영덕해맞이공원인증센터 '+suffix);assert.equal(p?.from.name,'통일전망대');assert.equal(p?.to.name,'해맞이공원');}
console.log('PASS informational traverse terms, six cycling courses and Goseong-to-Yeongdeok phrases without taksong');
