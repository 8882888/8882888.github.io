'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {canonicalForKeywordRecord,resolveRegionalKeywordVariant,variants}=require('../lib/keyword-canonical-bridge');
const fs=require('node:fs'),path=require('node:path');
const r=new Map([['부산광역시',{slug:'busan'}],['강원특별자치도 강릉시 강동면 안인리',{slug:'gangwon/gangneung-si/gangdong-myeon/anin-ri'}]]);
const url=(region,kind)=>'/'+kind+'/'+region.slug+'/';
test('DB query URL never overrides the validated regional canonical',()=>{
 const row={region:'부산광역시',service:'taksong',keyword:'부산탁송회사',path:'/keyword-search/?q=%EB%B6%80%EC%82%B0%ED%83%81%EC%86%A1'};
 assert.equal(canonicalForKeywordRecord(row,r,url),'/taksong/busan/');
 assert.equal(canonicalForKeywordRecord({...row,path:'https://external.invalid/evil'},r,url),'/taksong/busan/');
 assert.equal(canonicalForKeywordRecord({...row,service:'daeri'},r,url),'/daeri/busan/');
});
test('unknown locality and malformed service never create counterfeit canonical pages',()=>{
 assert.equal(canonicalForKeywordRecord({region:'알 수 없는 시',service:'daeri'},r,url),null);
 assert.equal(canonicalForKeywordRecord({region:'부산광역시',service:'daeri&x'},r,url),null);
 assert.equal(canonicalForKeywordRecord({region:'부산광역시',service:'daeri'},r,()=>'/keyword-search/?q=x'),null);
});
test('all 40 verified 2026 regional keyword variants map to one canonical per service',()=>{
 for(const [kind,words] of Object.entries(variants)){
  assert.equal(words.length,20,kind+' has 20 DB-intent patterns');
  for(const word of words){
   const query='강원특별자치도 강릉시 강동면 안인리'+word;
   const lookup=q=>{
    const service=q.endsWith('대리운전')?'daeri':q.endsWith('탁송')?'taksong':null;
    if(!service||!q.startsWith('강원특별자치도강릉시강동면안인리'))return null;
    return {kind:service,canonical:'/'+service+'/gangwon/gangneung-si/gangdong-myeon/anin-ri/'};
   };
   // Model a normalized legal-region resolver without DB network dependency.
   const normalizeQuery=q=>lookup(q.replace(/\s+/g,''));
   assert.equal(resolveRegionalKeywordVariant(query,normalizeQuery),'/'+kind+'/gangwon/gangneung-si/gangdong-myeon/anin-ri/',query);
  }
 }
});
test('short generic, unsupported or ambiguous queries remain unresolved',()=>{
 const resolver=()=>null;
 assert.equal(resolveRegionalKeywordVariant('탁송',resolver),null);
 assert.equal(resolveRegionalKeywordVariant('광주대리운전업체',resolver),null);
 assert.equal(resolveRegionalKeywordVariant('<script>alert(1)</script>',resolver),null);
});
test('main server connects DB result rows and alias queries to canonical pages',()=>{
 const server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
 assert(server.includes('canonicalForKeywordRecord(x,regionByFullName,servicePath)'));
 assert(server.includes('resolveRegionalKeywordVariant(searchIntent,nationwideExplorer.resolve)'));
 assert(server.includes('id="home-reviewed-regional-guides"'));
 assert(!server.includes("filter(x=>typeof x.path==='string'&&/^\\/(?:taksong|daeri)"),'old DB raw-path filter must be removed');
});
