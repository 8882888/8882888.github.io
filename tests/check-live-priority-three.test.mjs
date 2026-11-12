import assert from 'node:assert/strict';
import {test} from 'node:test';
import {TARGETS,readPageSignals,sitemapContains} from '../tools/check-live-priority-three.mjs';

const base='https://jeongukdaeri.kr';
const example=path=>'<html><head><title>세종대리운전</title>'+
 '<meta name="description" content="세종 지역 요금 및 예약 안내">'+
 '<meta name="robots" content="index,follow">'+
 '<link rel="canonical" href="'+base+path+'"></head><body>'+
 '<h1>세종대리운전</h1><section id="priority-region-guide"><p>예약 안내</p></section>'+
 '<a href="tel:18114294">상담</a><script type="application/ld+json">{"@context":"https://schema.org"}</script>'+
 '</body></html>';
test('the actual 3 SEO priority regions have distinct canonical URLs',()=>{
 assert.equal(TARGETS.length,3);
 assert.equal(new Set(TARGETS.map(x=>x.path)).size,3);
 for(const t of TARGETS)assert.deepEqual(readPageSignals(example(t.path),t.path,base).issues,[],t.label);
});
test('detect noindex, broken mobile phone, duplicate route and missing local guide',()=>{
 const path='/daeri/sejong/';
 const bad=example(path).replace('index,follow','noindex,follow')
  .replace('tel:18114294','tel:000').replace('id="priority-region-guide"','id="other"');
 const errors=readPageSignals(bad,path,base).issues.join('; ');
 assert.match(errors,/noindex/);
 assert.match(errors,/call link missing/);
 assert.match(errors,/guide missing/);
 assert.match(readPageSignals(example(path),'/daeri/other/',base).issues.join('; '),/canonical mismatch/);
});
test('sitemap membership matches only exact canonical URL, never keyword-query URLs',()=>{
 const xml='<urlset><url><loc>'+base+'/daeri/sejong/</loc></url></urlset>';
 assert(sitemapContains(xml,base+'/daeri/sejong/'));
 assert(!sitemapContains(xml,base+'/daeri/sejong/?q=세종대리운전'));
 assert(!sitemapContains(xml,base+'/taksong/busan/'));
});
