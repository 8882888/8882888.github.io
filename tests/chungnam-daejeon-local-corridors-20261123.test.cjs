'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const source=require('../data/chungnam-daejeon-local-corridors-20261123.json');
const {create}=require('../lib/chungnam-daejeon-local-corridors.cjs');
const legal=['12','06','01','02'].flatMap(x=>JSON.parse(read('data/legal-regions/'+x+'.json')).full_names);
const regions=[],byFull=new Map();
for(const full of legal){
 const last=full.split(' ').at(-1);
 const level=full.split(' ').length===1?'시도':/리$/.test(last)?'리':
  /읍$/.test(last)?'읍':/면$/.test(last)?'면':
  /구$/.test(last)?'구':/군$/.test(last)?'군':
  /시$/.test(last)?'시':'동';
 const region={full_name:full,name:last,level,slug:'regression-'+regions.length};
 regions.push(region);byFull.set(full,region);
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(r,kind)=>'/'+kind+'/region/'+r.slug+'/';
const render=create({regions,regionByFullName:byFull,servicePath:link,esc});
test('official 15 Chungnam cities/counties plus 5 Daejeon districts keep only 44 existing canonicals',()=>{
 const c=regions.filter(x=>x.full_name.startsWith('충청남도 ')&&['시','군'].includes(x.level));
 const d=regions.filter(x=>x.full_name.startsWith('대전광역시 ')&&x.level==='구');
 assert.equal(c.length,15);
 assert.equal(c.filter(x=>x.level==='시').length,8);
 assert.equal(c.filter(x=>x.level==='군').length,7);
 assert.equal(d.length,5);
 assert.equal(source.chungnam.length,15);
 assert.equal(source.daejeon.length,5);
 assert.equal(new Set([...source.chungnam,...source.daejeon].map(x=>x.region)).size,20);
 assert.equal(render.sourceCount,20);
 assert.equal(render.canonicalPaths.length,44);
 assert.equal(new Set(render.canonicalPaths).size,44);
 assert.deepEqual(new Set(source.chungnam.map(x=>x.region)),new Set(c.map(x=>x.full_name)));
 assert.deepEqual(new Set(source.daejeon.map(x=>x.region)),new Set(d.map(x=>x.full_name)));
});
test('30 Chungnam municipality service panels render legal origin, Daejeon & reverse fare URLs',()=>{
 let count=0;
 for(const item of source.chungnam){
  const region=byFull.get(item.region);
  assert(region);
  for(const sub of item.local)assert(byFull.has(item.region+' '+sub));
  for(const dest of [...item.neighbors,item.daejeon,...item.long])
   assert(byFull.has(dest),'unverified route '+item.region+' → '+dest);
  for(const kind of ['daeri','taksong']){
   const html=render.regionSection(region,kind);
   assert.equal((html.match(/id="chungnam-daejeon-corridors-20261123"/g)||[]).length,1);
   assert(html.includes(item[kind]),item.region+' distinct '+kind);
   assert(html.includes('/fare/?service='+kind+'&amp;from='));
   assert(html.includes(encodeURIComponent(item.region+' '+item.local[0])));
   assert(html.includes(encodeURIComponent(item.region+' '+item.local[1])));
   for(const dest of [...item.neighbors,...item.long])
    assert(html.includes(encodeURIComponent(dest)),'missing local/long '+dest);
   assert(html.includes(encodeURIComponent(item.region)+'&amp;to='+encodeURIComponent(item.daejeon)));
   assert(html.includes(encodeURIComponent(item.daejeon)+'&amp;to='+encodeURIComponent(item.region)));
   assert(html.includes('배차완료')&&html.includes('운행완료'));
   assert(html.includes('tel:18114294'));
   assert(/복귀|귀환|인계/.test(html));
   const meta=render.searchMeta(region,kind);
   assert(meta&&meta.title.includes(kind==='daeri'?'대리운전':'탁송'));
   assert(meta.description.includes('1811-4294'));
   count++;
  }
 }
 assert.equal(count,30);
});
test('10 Daejeon district panels link two Chungnam cities/counties both directions',()=>{
 let count=0;
 for(const item of source.daejeon){
  const region=byFull.get(item.region);
  assert(region);
  for(const sub of item.local)assert(byFull.has(item.region+' '+sub));
  for(const dest of [...item.metroNeighbors,...item.chungnam,...item.long])
   assert(byFull.has(dest));
  for(const kind of ['daeri','taksong']){
   const html=render.regionSection(region,kind);
   assert.equal((html.match(/id="chungnam-daejeon-corridors-20261123"/g)||[]).length,1);
   assert(html.includes(item[kind]));
   for(const near of item.chungnam){
    assert(html.includes(encodeURIComponent(item.region)+'&amp;to='+encodeURIComponent(near)));
    assert(html.includes(encodeURIComponent(near)+'&amp;to='+encodeURIComponent(item.region)));
   }
   for(const near of [...item.metroNeighbors,...item.long])
    assert(html.includes(encodeURIComponent(near)));
   assert(html.includes('대전')&&html.includes('충남'));
   assert(html.includes('배차완료'));
   assert(html.includes('tel:18114294'));
   count++;
  }
 }
 assert.equal(count,10);
});
test('existing Chungnam and Daejeon province hubs crosslink all 15+5 local service URLs',()=>{
 for(const [full,own,cross] of [
  ['충청남도',source.chungnam,source.daejeon],
  ['대전광역시',source.daejeon,source.chungnam]
 ]){
  for(const kind of ['daeri','taksong']){
   const html=render.regionSection(byFull.get(full),kind);
   assert(html.includes('id="chungnam-daejeon-regional-hub-20261123"'));
   for(const item of [...own,...cross]){
    const target=byFull.get(item.region);
    assert(html.includes(link(target,kind)),'missing hub discovery '+item.region);
   }
   assert(html.includes('대전↔충남'));
   assert(html.includes('15개 시'));
   const meta=render.searchMeta(byFull.get(full),kind);
   assert(meta.description.includes('대전↔충남'));
  }
 }
});
test('new SEO content does not replace evidence-backed page descriptions or previous regional guides',()=>{
 const server=read('server.js');
 assert(server.includes("require('./lib/chungnam-daejeon-local-corridors.cjs').create"));
 assert(server.includes('const chungnamDaejeonSearchMeta=(!priorityMeta&&!focus50Info&&!historicalTitleTrip&&!verifiedTitleTrip&&!verifiedDaeriTitleTrip)'));
 assert(server.includes('chungnamDaejeonSearchMeta?.title'));
 assert(server.includes('chungnamDaejeonSearchMeta?.description'));
 assert.equal(server.split('chungnamDaejeonGuides.regionSection(r,kind)').length-1,1);
 for(const old of ['chungnamPortGuides','chungcheongGuides','gyeongbukDaeguGuides','jeonbukServiceGuides','jeonnamGwangjuServiceGuides'])
  assert(server.includes(old+'.regionSection(r,kind)'));
 assert.equal(render.canonicalPaths.length,44);
});
