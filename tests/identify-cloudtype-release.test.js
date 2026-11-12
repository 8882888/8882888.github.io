'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {identify}=require('../tools/identify-cloudtype-release');
test('identify newest matching server and HTML file source without guessing release event',()=>{
 const c=[
 {sha:'new',serverHash:'bb',homeHash:'cc'},
 {sha:'old-content',serverHash:'aa',homeHash:'bb'},
 {sha:'older-content',serverHash:'aa',homeHash:'bb'}
 ];
 const d=identify({'server.js':'aa','index.html':'bb'},c);
 assert.equal(d.firstMatchingBoth,'old-content');
 assert.equal(d.firstMatchingServer,'old-content');
 assert.equal(d.firstMatchingHome,'old-content');
 assert.equal(d.inspectedCommits,3);
});
test('report independent server and homepage lineage after partial manual update',()=>{
 const d=identify({'server.js':'aa','index.html':'cc'},[
 {sha:'1',serverHash:'dd',homeHash:'cc'},
 {sha:'2',serverHash:'aa',homeHash:'bb'}]);
 assert.equal(d.firstMatchingBoth,null);
 assert.equal(d.firstMatchingServer,'2');
 assert.equal(d.firstMatchingHome,'1');
});
test('missing health hashes cannot be treated as deployment match',()=>{
 const d=identify({},[{sha:'unknown',serverHash:'aa',homeHash:'bb'}]);
 assert.equal(d.firstMatchingBoth,null);
 assert.equal(d.firstMatchingServer,null);
 assert.equal(d.firstMatchingHome,null);
});
