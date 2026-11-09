'use strict';
// National quality gate: repeated content, mobile paint, quote reliability,
// phone click attribution and Naver technical SEO. No ranking claim.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const server=read('server.js'),fare=read('fare/index.html'),home=read('index.html');
const traffic=read('assets/traffic-analytics.js'),quote=read('assets/quote-outcome.js');
assert.doesNotThrow(()=>new Function(server),'Server syntax must stay valid');
assert.doesNotThrow(()=>new Function(traffic),'All-page phone statistics syntax must stay valid');
assert.doesNotThrow(()=>new Function(quote),'Anonymous quote outcome script syntax must stay valid');
const fareScripts=[...fare.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
 .map(match=>match[1]).filter(Boolean);
assert(fareScripts.length>=1,'Fare calculator must include inline logic');
for(const script of fareScripts)assert.doesNotThrow(()=>new Function(script),'Fare calculator inline syntax invalid');
// 1: Source-empty villages should not repeat long promotional keyword templates
// or become indexable just because they have an administrative address.
for(const marker of [
 'id="source-empty-village-20261107"',
 'if(!actualPublic&&!actualHistory){',
 'r.level===\'리\'',
 '<meta name="robots" content="noindex,follow">',
 "const compactLocalTemplate=['읍','면','동','리'].includes(r.level)",
 "(compactLocalTemplate?'':companySection+blogKeywordGuide)"
])assert(server.includes(marker),'Sparse locality duplicate suppression missing: '+marker);
assert(server.includes("regionAncestors(r)")&&server.includes('regionHistoryAllLink'),
 'Preserve actual region navigation and evidence links');
// 2: Defer expensive offscreen mobile painting and nonpriority brand artwork.
assert(server.includes('id="regional-mobile-paint-budget-20261107"')&&
 server.includes('content-visibility:auto;contain-intrinsic-size:auto 360px'),
 'Long mobile region guides should defer offscreen painting');
assert(server.includes("(priorityMeta||r.level==='시도')?")&&server.includes('loading="lazy" decoding="async"'),
 'Nonpriority district artwork must not compete with first-view calls');
// 3: Rate based on real road-distance responses, no invented fallback prices.
assert(fare.includes('minlength="2" maxlength="150"')&&
 fare.includes("result.dataset.quoteState='invalid'"),
 'Reject unhelpful or identical route endpoints');
assert(fare.includes('controller.abort(),12000')&&
 fare.includes("result.dataset.quoteState=timedOut?'timeout':'error'"),
 'Timeout/error must be distinguished');
assert(fare.includes("result.dataset.quoteState='success'")&&
 fare.includes("window.smart24QuoteOutcome(service,'success')")&&
 fare.includes("window.smart24QuoteOutcome(service,timedOut?'timeout':'error')"),
 'Only verified road quote outcomes can be counted');
assert(fare.includes('확인되지 않은 거리나 요금은 표시하지 않습니다.'),
 'Missing real road distance must never generate a fake fare');
assert(fare.includes('같은 구간 다시 조회')&&fare.includes('form.requestSubmit()'),
 'Users can retry explicitly or call after failure');
// Exercise privacy-minimal emitted data without any address or user ID.
const requests=[],browser={};
vm.runInNewContext(quote,{
 window:browser,
 fetch:(uri,options)=>{requests.push({uri,options});return Promise.resolve({ok:true})},
 localStorage:{getItem:()=>null},
 location:{href:'https://jeongukdaeri.kr/fare/?from=서울역&to=부산역'},
 URL,JSON,console
},{timeout:1000});
browser.smart24QuoteOutcome('taksong','success');
browser.smart24QuoteOutcome('daeri','timeout');
browser.smart24QuoteOutcome('daeri','invalid');
assert.equal(requests.length,2,'Only valid road result types can be counted');
for(const request of requests){
 const body=JSON.parse(request.options.body);
 assert.deepEqual(Object.keys(body).sort(),['p_outcome','p_service'],
  'Operational metrics must never include addresses, phones, visitor IDs or page queries');
 assert.equal(request.options.keepalive,true,'Telemetry must never delay leaving the page');
}
// 4: Phone click event reports only phone-button clicks, not completed calls.
assert(traffic.includes("const normalizedPage=location.pathname.replace(/\\/index\\.html$/,'/')")&&
 traffic.includes("if(normalizedPage==='/fare/')")&&
 traffic.includes("metricPage='/fare/quote-'+state"),
 'Phone conversion must distinguish quote success/error/timeout without route payload');
assert(traffic.includes("rpc('site_quote_summary')")&&
 home.includes('id="quote-success-summary-20261107"'),
 'Measured route quote success denominator must be displayed separately');
assert(home.includes('실제 배차·예약 성공률이나 네이버 유입률이 아닙니다.'),
 'Operational quote metrics must never be described as search traffic or bookings');
// 5: Canonical/sitemap/robots are technical diagnostics, not verified indexing.
assert(server.includes("if(pathname==='/robots.txt')")&&
 server.includes("if(pathname==='/sitemap.xml')")&&
 server.includes("const urls=[...new Set(focused)].slice(0,499)"),
 'Canonical discovery should deduplicate and bound the primary sitemap');
assert(server.includes("const sparseVillage=r.level==='리'")&&
 server.includes("'<meta name=\"robots\" content=\"noindex,follow\">'"),
 'Source-empty region pages should remain reachable without indexing thin content');
assert(server.includes('<link rel="canonical" href=')&&
 home.includes('<link rel="canonical" href="https://jeongukdaeri.kr/">'),
 'Retain original canonical URL metadata');
assert.equal(JSON.parse(read('data/ride-history.json')).length,2591,'Never fabricate or alter original 2591 archived rides');
console.log('PASS nationwide repetition, mobile offscreen paint, real quote outcomes, click attribution, technical index guards');
