'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {identifier,loadPublishedCases}=require('../lib/published-case-feed');
function withCase(fn){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'smart24-published-'));
 const ride={date:'2026-10-24',service:'taksong',departure:'서울',destination:'부산',fare:'150,000원',status:'completed',verified:true};
 const id=identifier(ride),route='/reviews/verified/'+id+'/';
 try{
  fs.mkdirSync(path.join(root,'data'),{recursive:true});
  fs.mkdirSync(path.join(root,'reviews','verified',id),{recursive:true});
  fs.writeFileSync(path.join(root,'data','public-reviewed-rides-202610.json'),JSON.stringify([ride]));
  fs.writeFileSync(path.join(root,'data','published-ride-case-ids.json'),JSON.stringify([{id,service:'taksong',published_at:'2026-11-13T00:12:00Z'}]));
  fs.writeFileSync(path.join(root,'reviews','verified',id,'index.html'),
   '<html><head><link rel="canonical" href="https://jeongukdaeri.kr'+route+'"><meta name="robots" content="index,follow"></head><body><article><h1>실제 운행</h1></article></body></html>');
  fn({root,id,route,ride});
 }finally{fs.rmSync(root,{recursive:true,force:true})}
}
test('only genuine completed saved cases with a canonical published file enter the feed',()=>{
 withCase(({root,id,route})=>{
  const found=loadPublishedCases(root);
  assert.equal(found.length,1);assert.equal(found[0].id,id);assert.equal(found[0].path,route);
  assert.equal(found[0].publishedAt,'2026-11-13T00:12:00Z');
  assert.match(found[0].description,/<article>/);
 });
});
test('an unverified ride is never turned into a feed URL',()=>{
 withCase(({root})=>{
  let rows=JSON.parse(fs.readFileSync(path.join(root,'data','public-reviewed-rides-202610.json')));
  rows[0].verified=false;
  fs.writeFileSync(path.join(root,'data','public-reviewed-rides-202610.json'),JSON.stringify(rows));
  assert.equal(loadPublishedCases(root).length,0);
 });
});
test('case file must have its own public canonical and must not be noindex',()=>{
 withCase(({root,id,route})=>{
  const f=path.join(root,'reviews','verified',id,'index.html');
  fs.writeFileSync(f,'<html><head><link rel="canonical" href="https://jeongukdaeri.kr/reviews/verified/other/"></head><body><article>x</article></body></html>');
  assert.equal(loadPublishedCases(root).length,0);
  fs.writeFileSync(f,'<html><head><link rel="canonical" href="https://jeongukdaeri.kr'+route+'"><meta name="robots" content="noindex,follow"></head><body><article>x</article></body></html>');
  assert.equal(loadPublishedCases(root).length,0);
 });
});
test('missing saved page is never announced even if manifest says published',()=>{
 withCase(({root,id})=>{
  fs.rmSync(path.join(root,'reviews','verified',id,'index.html'));
  assert.equal(loadPublishedCases(root).length,0);
 });
});
test('published timestamp is independent from ride date, duplicate ids appear only once',()=>{
 withCase(({root,id})=>{
  const file=path.join(root,'data','published-ride-case-ids.json');
  const state=JSON.parse(fs.readFileSync(file));
  state.push({...state[0],published_at:'2026-11-13T01:22:00Z'});
  fs.writeFileSync(file,JSON.stringify(state));
  const rows=loadPublishedCases(root);
  assert.equal(rows.length,1);assert.equal(rows[0].rideDate,'2026-10-24');
  assert.equal(rows[0].publishedAt,'2026-11-13T00:12:00Z');
 });
});
test('repository publisher state references actual saved verified cases',()=>{
 const found=loadPublishedCases(path.resolve(__dirname,'..'));
 assert.ok(found.length>0,'Existing published cases must be available');
 assert.ok(found.every(x=>x.path==='/reviews/verified/'+x.id+'/'));
});
