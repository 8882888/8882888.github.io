'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
const robots=fs.readFileSync(path.join(root,'robots.txt'),'utf8');
const reviewed=JSON.parse(fs.readFileSync(path.join(root,'data/priority-regions.json'),'utf8')).pages;

test('every declared sitemap has an explicit server route',()=>{
 const routes=[...robots.matchAll(/^Sitemap:\s+https:\/\/jeongukdaeri\.kr(\/[^\s]+)$/gm)].map(m=>m[1]);
 assert.equal(routes.length,7,'keep seven published sitemap declarations');
 for(const route of routes){
  assert.ok(server.includes("pathname==='"+route+"'"),'missing sitemap handler: '+route);
 }
});
test('sitemap index includes reviewed routes and history inventory',()=>{
 for(const route of ['/sitemap-reviewed-routes.xml','/sitemap-history.xml','/sitemap-priority.xml']){
  assert.ok(server.includes("'"+route+"'"),'missing sitemap index reference: '+route);
 }
 assert.match(server,/sitemap-history-\([1-9]/,'history shards must remain reachable');
});
test('reviewed regional sitemap is backed by source-reviewed pages only',()=>{
 assert.ok(server.includes('priorityRegionalPages.flatMap(entry=>'),'reviewed sitemap must use curated records');
 assert.ok(server.includes('regionByFullName.get(entry.region)'),'region names must resolve to canonical regions');
 assert.ok(server.includes('servicePath(region,entry.kind)'),'sitemap must use canonical service routes');
 assert.ok(reviewed.length>0);
 const keys=new Set();
 for(const entry of reviewed){
  assert.ok(['daeri','taksong'].includes(entry.kind));
  assert.ok(entry.region&&entry.topic&&entry.detail);
  const key=entry.kind+'|'+entry.region;
  assert.ok(!keys.has(key),'duplicate reviewed route '+key);
  keys.add(key);
 }
});
