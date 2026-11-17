import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('existing cycling hub presents real decision links before long table, no new thin URL',()=>{
 const html=read('route-taksong/index.html');
 const head=html.split('</head>')[0],main=html.split('<main>')[1]||html;
 const start=main.indexOf('id="cycling-course-user-shortcuts-20261117"');
 assert(start>=0,'user-facing decision navigation visible');
 assert(start<main.indexOf('<table'),'real cycling help must precede long fare table');
 const nav=main.slice(start,main.indexOf('</nav>',start));
 for(const url of ['/route-taksong/courses/eastcoast/','/route-taksong/courses/yeongsan/','/route-taksong/courses/seomjin/','/route-taksong/centers/','/reviews/history/?kind=taksong','/fare/?service=taksong'])
  assert(nav.includes('href="'+url+'"'),'explicit useful link '+url);
 assert(nav.includes('과거 요금은 현재 확정 견적이 아니며'),'separate historical tariff and live quote');
 assert(nav.includes('차량이 주차된 장소'),'not a bicycle cargo transport claim');
 assert(head.includes('rel="canonical" href="https://jeongukdaeri.kr/route-taksong/"'),'preserve canonical');
 assert(head.includes('전국자전거종주완벽정리'),'do not change high-intent existing title without new official query data');
 assert(!/name="robots" content="noindex/.test(head),'keep indexable');
 assert(html.includes('tel:18114294'),'business contact preserved');
});
test('new scorecard is offline read-only; does not imply Naver login or index growth',()=>{
 const script=read('scripts/compare-naver-web-performance-20261117.mjs');
 assert(!/fetch\s*\(|https\.request\s*\(/.test(script),'local JSON only, no web scraping');
 assert(script.includes('performanceGainVerified:false'),'no unsupported causal ranking claim');
 assert(script.includes('indexedPages:null'),'14 top URLs must not be indexed count');
 assert(script.includes('sourceType'),'owner authenticated source required');
 const meta=JSON.parse(read('data/naver-web-ctr-focused-cohort-20261117.json'));
 assert.equal(meta.report.urlTableDisplayedRows,14);
 assert.equal(meta.report.keywordTableTopLimit,30);
});
