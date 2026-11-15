import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pages,resources,agents,blocked,inspectHead,issuesForSample} from '../scripts/audit-naver-fetch-parity.mjs';

test('only seven canonical business landing pages and actual static resources are probed',()=>{
 assert.deepEqual(pages,['/','/business/','/business/used-car/','/business/rental-car/',
  '/business/export-port/','/business/scrapyard/','/business/auction/']);
 assert.equal(new Set(resources.map(r=>r.route)).size,resources.length);
 assert.ok(resources.some(r=>r.route.endsWith('.svg')));
 assert.ok(resources.some(r=>r.route.includes('.js?')));
 assert.ok(resources.some(r=>r.route.includes('.css?')));
 assert.match(agents.simulatedYeti,/Yeti/);
 const src=fs.readFileSync(new URL('../scripts/audit-naver-fetch-parity.mjs',import.meta.url),'utf8');
 assert.ok(src.includes("'x-smart24-monitor':'github-health-probe'"),'synthetic Yeti cannot pollute genuine crawler logs');
 assert.ok(src.includes('officialNaverIndexed:null'),'no fabrication of official Naver index numbers');
});
test('canonical and robots parser handles the page head and actual robots directives',()=>{
 const route='https://jeongukdaeri.kr/business/used-car/';
 const page='<!doctype html><html><head><title>중고차탁송 | 스마트24</title>'+
  '<link rel="canonical" href="'+route+'">'+
  '<meta name="robots" content="index,follow"></head><body><main><h1>중고차탁송 안내</h1></main></body></html>';
 const info=inspectHead(page,route,'');
 assert.equal(info.canonical,route);
 assert.equal(info.canonicalCount,1);
 assert.equal(info.h1Count,1);
 assert.equal(info.titlePresent,true);
 assert.equal(info.noindex,false);
 assert.deepEqual(issuesForSample({route:'/business/used-car/',status:200,contentType:'text/html; charset=utf-8',
  xRobotsTag:'',html:info},'page',''),[]);
 assert.equal(blocked('noindex, nofollow'),true);
 assert.equal(blocked('index,follow'),false);
 assert.equal(inspectHead(page.replace('index,follow','noindex'),route,'').noindex,true);
 assert.equal(inspectHead(page.replace('name="robots"','name="Yeti"').replace('index,follow','noindex'),route,'').noindex,true);
});
test('HTTP, canonical, MIME, status and user-agent differences are reportable',()=>{
 const base={route:'/business/used-car/',status:302,contentType:'text/html',location:'/other/',xRobotsTag:'noindex'};
 const result=issuesForSample({...base,html:{canonical:'https://jeongukdaeri.kr/other/',canonicalCount:1,
  noindex:true,titlePresent:false,h1Count:0}},'page','');
 assert.ok(result.includes('http_302'));
 assert.ok(result.includes('redirect'));
 assert.ok(result.includes('x_robots_noindex'));
 assert.ok(result.includes('canonical_mismatch'));
 assert.ok(result.includes('missing_or_duplicate_title_h1'));
 assert.deepEqual(issuesForSample({route:'/assets/test.js',status:200,
  contentType:'application/javascript; charset=utf-8',location:'',xRobotsTag:'noindex'},'resource','javascript'),[],
  'noindex on a static resource does not prevent fetching');
 assert.ok(issuesForSample({status:200,contentType:'text/html',location:'',xRobotsTag:''},
  'robots','').includes('robots_not_text_plain'));
});
