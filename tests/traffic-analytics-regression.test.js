'use strict';
// Read-only regression checks. Run: node --test tests/traffic-analytics-regression.test.js
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const analytics=fs.readFileSync(path.join(root,'assets/traffic-analytics.js'),'utf8');
const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
const region=fs.readFileSync(path.join(root,'region/index.html'),'utf8');
const fare=fs.readFileSync(path.join(root,'fare/index.html'),'utf8');

test('analytics is present on region and fare pages',()=>{
  assert.match(region,/assets\/traffic-analytics\.js/);
  assert.match(fare,/assets\/traffic-analytics\.js/);
});
test('both canonical and index.html pages use the same funnel route',()=>{
  assert.ok(analytics.includes("location.pathname.replace(/\\/index\\.html$/,'/')"));
  assert.match(analytics,/if\(normalizedPage==='\/region\/'\)/);
  assert.match(analytics,/if\(normalizedPage==='\/fare\/'\)/);
  assert.doesNotMatch(analytics,/if\(location\.pathname==='\/fare\/'\)/);
});
test('fare submit only counts the real form with distinct populated endpoints',()=>{
  assert.match(fare,/<form id="quote-form">/);
  assert.match(analytics,/form\.id!=='quote-form'/);
  assert.match(analytics,/start\.length>=2&&end\.length>=2&&start!==end/);
  assert.ok(analytics.includes("replace(/\\s/g,'')"));
});
test('call metrics count button taps, not connected calls',()=>{
  assert.match(analytics,/a\[href\^="tel:"\]/);
  assert.match(analytics,/18114294/);
  assert.match(analytics,/site_phone_event/);
});
test('health diagnostics are resilient to an absent optional analytics file',()=>{
  assert.match(server,/trafficAnalytics:TRAFFIC_ANALYTICS_SHA256/);
  assert.match(server,/catch\(_\)\{return 'unavailable'\}/);
});

const dynamicRegion=fs.readFileSync(path.join(root,'go/region-service/index.html'),'utf8');
test('dynamic region landing requires a unique matching region and service',()=>{
  assert.ok(dynamicRegion.includes('matches.length!==1'));
  assert.ok(dynamicRegion.includes('card.kind===kind'));
  assert.ok(dynamicRegion.includes('exactCards.length===1'));
});
test('dynamic region images have a fallback and cannot be mislabeled as real trips',()=>{
  assert.ok(dynamicRegion.includes("image.addEventListener('error'"));
  assert.ok(dynamicRegion.includes('실제 운행 사진이 아닙니다'));
  assert.ok(dynamicRegion.includes("image.alt=full+' '+service"));
});
test('dynamic region landing preserves fare and consultation paths',()=>{
  assert.ok(dynamicRegion.includes("fare.href='/fare/?service='"));
  assert.ok(dynamicRegion.includes('tel:18114294'));
  assert.ok(dynamicRegion.includes('noindex,follow'));
});
