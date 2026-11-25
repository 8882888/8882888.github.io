'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {canonicalHostDecision,OFFICIAL,DIRECT}=require('../lib/canonical-host.cjs');
const check=(host,xfh,route='/',method='GET',extra={})=>{
 const url=new URL(route,'http://localhost');
 return canonicalHostDecision({method,url:route,headers:{host,'x-forwarded-host':xfh,...extra}},url,decodeURIComponent(url.pathname));
};
test('only confirmed Cloudtype alias permanently redirects to fixed official path and query',()=>{
 for(const route of ['/','/daeri/','/taksong/','/robots.txt','/sitemap-all.xml','/fare/?from=%EC%84%9C%EC%9A%B8&to=busan']){
  for(const method of ['GET','HEAD'])assert.equal(check(DIRECT,DIRECT,route,method).location,'https://'+OFFICIAL+route);
 }
 assert.equal(check(DIRECT.toUpperCase()+':443',DIRECT,'/taksong/').mode,'confirmed-alias');
});
test('official domain remains accessible even when proxies supply conflicting headers',()=>{
 for(const [host,xfh] of [[OFFICIAL,DIRECT],[DIRECT,OFFICIAL],[OFFICIAL,undefined],['www.'+OFFICIAL,DIRECT],[DIRECT,'www.'+OFFICIAL],['localhost:3000',DIRECT]])
  assert.equal(check(host,xfh).location,undefined);
});
test('ambiguous host, proxy lists and forged alternate destinations fail closed',()=>{
 for(const xfh of [undefined,'',DIRECT+', '+OFFICIAL,'attacker.invalid',DIRECT+'.attacker.invalid'])
  assert.equal(check(DIRECT,xfh).location,undefined);
 assert.equal(check(DIRECT,undefined).mode,'alias-host-only');
 assert.equal(check(DIRECT,DIRECT,'/', 'GET',{forwarded:'for=192.0.2.1;host='+OFFICIAL}).location,undefined);
 assert.equal(check(DIRECT,DIRECT,'//attacker.invalid/x').location,undefined);
 assert.equal(check(DIRECT,DIRECT,'https://attacker.invalid/x').location,undefined);
});
test('health, health SEO diagnostics, API and non-GET calls remain available',()=>{
 for(const route of ['/health','/health/seo.json','/health/seo-report/','/api','/api/region-card-preview'])
  assert.equal(check(DIRECT,DIRECT,route).location,undefined);
 assert.equal(check(DIRECT,DIRECT,'/','POST').location,undefined);
});
