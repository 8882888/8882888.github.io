'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {setTimeout:delay}=require('node:timers/promises');
const fs=require('node:fs');
const path=require('node:path');
const files=fs.readdirSync(path.join(__dirname,'../data/legal-regions')).filter(x=>/^\d{2}\.json$/.test(x)).sort();
assert.equal(files.length,17,'all 17 regional datasets must exist');
const regions=[];
for(const file of files){const doc=require('../data/legal-regions/'+file);for(const full_name of doc.full_names){const parts=full_name.split(' ');regions.push({full_name,name:parts.at(-1),slug:'area-'+(regions.length+1),level:parts.length===1?'시도':'other'});}}
const port=30000+Math.floor(Math.random()*10000);
const child=spawn(process.execPath,['server.js'],{cwd:require('node:path').resolve(__dirname,'..'),env:{...process.env,PORT:String(port),PUBLIC_HOST:'example.com'},stdio:['ignore','pipe','pipe']});
let stderr='';child.stderr.on('data',d=>stderr+=d);
async function get(p){return fetch('http://127.0.0.1:'+port+p)}
(async()=>{
 try{
  for(let i=0;i<50;i++){try{const r=await get('/health');if(r.ok)break}catch{}await delay(100)}
  const h=await get('/health');assert.equal(h.status,200);assert.equal((await h.json()).regions,regions.length);
  const slugs=new Set(regions.map(r=>r.slug));assert.equal(slugs.size,regions.length,'duplicate slugs');
  assert.equal(regions.filter(r=>r.level==='시도').length,17,'17 provinces expected');
  const fullNames=new Set(regions.map(r=>r.full_name));assert.equal(fullNames.size,regions.length,'duplicate full region paths');
  for(const r of regions){const parent=r.full_name.split(' ').slice(0,-1).join(' ');if(parent)assert.ok(fullNames.has(parent),'missing parent: '+r.full_name)}
  const samples=[regions[0],regions.find(r=>r.full_name==='서울특별시 강남구'),regions.at(-1)].filter(Boolean);
  for(const r of samples){const res=await get('/region/'+r.slug+'/');assert.equal(res.status,200,r.slug);const html=await res.text();assert.ok(html.includes(r.name));assert.ok(html.includes('대리운전 안내'));assert.ok(html.includes('자동차탁송'));assert.ok(html.includes('1811-4294'));assert.ok(html.includes('일일기사'))}
  const missing=await get('/region/not-a-real-region/');assert.equal(missing.status,404);
  const sm=await get('/sitemap.xml');assert.equal(sm.status,200);const xml=await sm.text();assert.ok((xml.match(/<loc>/g)||[]).length>=regions.length+2,'main sitemap includes all regions and category URLs');assert.ok(xml.includes('example.com'));assert.ok(xml.includes('/places/'),'place category hub appears in sitemap');assert.ok(xml.includes('/places/'+encodeURIComponent('캠핑장')+'/'),'camping category appears in sitemap');assert.ok(xml.includes('/taksong/type/'+Buffer.from('렉카탁송','utf8').toString('hex')+'/'),'tow truck delivery category appears in sitemap');
  const secret=await get('/server.js');assert.equal(secret.status,403,'server source must not be exposed');
  const malformed=await get('/%25ZZ');assert.ok([400,404].includes(malformed.status));
  const root=await get('/');assert.equal(root.status,200);
  const regionIndex=await get('/region/');assert.equal(regionIndex.status,200);const places=await get('/places/');assert.equal(places.status,200);assert.ok((await places.text()).includes('캠핑장'));const camping=await get('/places/'+encodeURIComponent('캠핑장')+'/');assert.equal(camping.status,200);const reka=await get('/taksong/type/'+Buffer.from('렉카탁송','utf8').toString('hex')+'/');assert.equal(reka.status,200);const daeriMap=await get('/sitemap-daeri.xml');assert.equal(daeriMap.status,200);assert.equal(((await daeriMap.text()).match(/<loc>/g)||[]).length,regions.length);const taksongMap=await get('/sitemap-taksong.xml');assert.equal(taksongMap.status,200);assert.equal(((await taksongMap.text()).match(/<loc>/g)||[]).length,regions.length);
  const search=await get('/region/?q='+encodeURIComponent('가평읍'));assert.equal(search.status,200);assert.ok((await search.text()).includes('가평읍'));
  console.log('PASS: server, '+regions.length+' regions, pages, no-history content, sitemap, 404, homepage');
 }catch(e){console.error(e);console.error(stderr);process.exitCode=1}finally{child.kill()}
})();
