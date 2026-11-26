import test from 'node:test';
import assert from 'node:assert/strict';
import {classify,collectSitemapPages} from '../scripts/audit-domain-migration-20261126.mjs';
const url='https://8882888.github.io/daeri/';
const target='https://jeongukdaeri.kr/daeri/';
test('old site duplicate 200 is an unresolved migration defect even if canonical is correct',()=>{
 assert.equal(classify({kind:'legacy',url,status:200,canonical:target}),'DUPLICATE_200_CANONICAL_ONLY');
 assert.equal(classify({kind:'legacy',url,status:200,canonical:url}),'DUPLICATE_200_WRONG_OR_MISSING_CANONICAL');
});
test('migration requires matching permanent path redirect, not temporary or homepage collapse',()=>{
 assert.equal(classify({kind:'legacy',url,status:301,location:target}),'PERMANENT_REDIRECT');
 assert.equal(classify({kind:'legacy',url,status:302,location:target}),'TEMPORARY_REDIRECT_REVIEW');
 assert.equal(classify({kind:'legacy',url,status:301,location:'https://jeongukdaeri.kr/'}),'WRONG_REDIRECT_REVIEW');
 assert.equal(classify({kind:'legacy',url,status:404}),'RETIRED_NO_CONTENT');
});
test('official canonical must remain indexable and self-referencing',()=>{
 const base={kind:'official',url:target,status:200,canonical:target,contentType:'text/html'};
 assert.equal(classify(base),'OFFICIAL_SELF_CANONICAL');
 assert.equal(classify({...base,robots:'noindex,follow'}),'OFFICIAL_INDEX_SIGNAL_REVIEW');
 assert.equal(classify({...base,blockedHeader:true}),'OFFICIAL_INDEX_SIGNAL_REVIEW');
 assert.equal(classify({...base,canonical:url}),'OFFICIAL_INDEX_SIGNAL_REVIEW');
});

test('traverses sitemap index children once without following external hosts',async()=>{
 const origin='https://jeongukdaeri.kr';
 const seen=[];
 const result=await collectSitemapPages(origin,async url=>{
  seen.push(url);
  if(url.endsWith('/sitemap.xml'))return '<sitemapindex><sitemap><loc>'+origin+'/a.xml</loc></sitemap><sitemap><loc>'+origin+'/a.xml</loc></sitemap><sitemap><loc>https://example.com/b.xml</loc></sitemap></sitemapindex>';
  return '<urlset><url><loc>'+origin+'/daeri/</loc></url><url><loc>'+origin+'/orders/private</loc></url></urlset>';
 });
 assert.equal(result.mapsVisited,2);
 assert.deepEqual(result.pages,['/daeri/']);
 assert.equal(result.issues.length,1);
 assert.deepEqual(seen,[origin+'/sitemap.xml',origin+'/a.xml']);
});
