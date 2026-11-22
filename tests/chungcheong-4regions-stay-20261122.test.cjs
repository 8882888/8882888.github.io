'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const legal=fs.readdirSync(path.join(root,'data/legal-regions')).filter(f=>/^\d{2}\.json$/.test(f)).sort()
 .flatMap(file=>JSON.parse(fs.readFileSync(path.join(root,'data/legal-regions',file),'utf8')).full_names);
const data=require('../data/chungcheong-four-region-stay-golf-20261122.json');
const portData=require('../data/chungnam-ports-pension-fishing-20261122.json');
const {create,HUB}=require('../lib/chungcheong-4regions-stay-guide.cjs');
const {createNationwideLocalityExplorer}=require('../lib/nationwide-locality-explorer');
const regions=[],byFull=new Map(),bySlug=new Map(),childrenByParent=new Map();
for(const full of legal){
 const parts=full.split(' '),name=parts.at(-1),parent=byFull.get(parts.slice(0,-1).join(' '));
 const level=parts.length===1?'시도':/리$/.test(name)?'리':/읍$/.test(name)?'읍':/면$/.test(name)?'면':/구$/.test(name)?'구':/군$/.test(name)?'군':/시$/.test(name)?'시':'동';
 const r={name,full_name:full,slug:'area-'+(regions.length+1),parent_slug:parent?.slug||null,level};
 regions.push(r);byFull.set(full,r);bySlug.set(r.slug,r);
 if(parent){if(!childrenByParent.has(parent.slug))childrenByParent.set(parent.slug,[]);childrenByParent.get(parent.slug).push(r)}
}
const esc=x=>String(x).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const servicePath=(r,k)=>'/'+k+'/test-'+r.slug+'/';
const explorer=createNationwideLocalityExplorer({regions,bySlug,childrenByParent,servicePath,escapeHtml:esc});
const guide=create({regions,regionByFullName:byFull,servicePath,esc,nationwideExplorer:explorer});
const four=['충청남도','충청북도','대전광역시','세종특별자치시'];
test('Four Chungcheong divisions and all 32 existing city/county/district guides are legal and original',()=>{
 assert.equal(regions.filter(r=>r.level==='시도').length,17);
 assert.ok(regions.length>20000);
 assert.equal(guide.provinceCount,4);
 assert.equal(guide.originalGuideCount,17);
 assert.equal(guide.existingChungnamCount,15);
 assert.deepEqual(guide.counts,{충청남도:15,충청북도:11,대전광역시:5,세종특별자치시:1});
 assert.equal(portData.municipalities.length,15);
 assert.equal(data.newGuides.length,17);
 for(const row of data.newGuides){
  assert.ok(byFull.has(row.region));
  const prefix=row.region==='세종특별자치시'?'세종특별자치시 (직할) ':row.region+' ';
  for(const name of row.areas)assert.ok(byFull.has(prefix+name),'Unregistered official place: '+row.region+' / '+name);
  assert.ok(row.daeri.length>=85&&row.taksong.length>=85);
  assert.ok(row.context.length>=20);
 }
});
test('Every Chungbuk municipality and Daejeon borough has distinct, service-separated pages with real township links',()=>{
 for(const kind of ['daeri','taksong']){
  const examples=new Set(),titles=new Set();
  for(const row of data.newGuides.filter(x=>x.region!=='세종특별자치시')){
   const r=byFull.get(row.region),html=guide.regionSection(r,kind),meta=guide.searchMeta(r,kind);
   assert.ok(html.includes(row[kind]),'Missing source content '+row.region);
   assert.ok(html.length>1200,'Too thin local explanatory content '+row.region);
   assert.ok(html.includes('펜션')&&html.includes('골프장')&&html.includes('1811-4294'));
   for(const area of row.areas){
    const region=byFull.get(row.region+' '+area);
    assert.ok(html.includes(servicePath(region,kind)),'Missing locality '+area);
   }
   assert.ok(meta&&meta.title.includes(kind==='daeri'?'대리운전':'탁송'));
   assert.ok(meta.description.includes('1811-4294'));
   assert.ok(!examples.has(html),'Duplicate same region HTML '+row.region);
   assert.ok(!titles.has(meta.title),'Duplicate title '+meta.title);
   examples.add(html);titles.add(meta.title);
  }
  assert.equal(examples.size,16);
 }
});
test('Sejong has real (직할) 읍면동 references and its own two service-specific guides',()=>{
 const r=byFull.get('세종특별자치시'),s=data.newGuides.find(x=>x.region===r.full_name);
 for(const k of ['daeri','taksong']){
  const html=guide.regionSection(r,k);
  assert.ok(html.includes(s[k])&&html.includes('세종호수공원'));
  assert.ok(html.includes(servicePath(byFull.get('세종특별자치시 (직할) 조치원읍'),k)));
  assert.ok(html.includes(servicePath(byFull.get('세종특별자치시 (직할) 보람동'),k)));
  assert.ok(html.includes('충청도 펜션'));
  assert.ok(html.includes('충북')&&html.includes('충남')&&html.includes('대전'));
 }
});
test('Preserve 15 Chungnam harbor guide pages and add only short cross-province customer navigation',()=>{
 for(const row of portData.municipalities){
  const r=byFull.get(row.region);
  for(const k of ['daeri','taksong']){
   const html=guide.regionSection(r,k);
   assert.ok(html.includes('팬션')&&html.includes('낚시터'));
   assert.ok(html.includes(HUB)&&html.includes('1811-4294')===false);
   assert.ok(html.length<1350,'Do not duplicate entire original Chungnam guide');
   assert.equal(guide.searchMeta(r,k),null,'Must not overwrite existing reviewed Chungnam SEO');
  }
 }
});
test('Canonical keyword resolver handles common pension typos, borough, deep township, and avoids ambiguous non-Chungcheong places',()=>{
 const sample=[
  ['충청도대리운전',HUB],['충청도탁송',HUB],['충청권펜션대리운전',HUB],
  ['충청남도펜션대리운전',servicePath(byFull.get('충청남도'),'daeri')],
  ['충북괴산펜션대리운전',servicePath(byFull.get('충청북도 괴산군'),'daeri')],
  ['충북단양팬션탁송',servicePath(byFull.get('충청북도 단양군'),'taksong')],
  ['충북제천시골프장대리운전',servicePath(byFull.get('충청북도 제천시'),'daeri')],
  ['대전유성구호텔대리운전',servicePath(byFull.get('대전광역시 유성구'),'daeri')],
  ['대전서구골프장대리운전',servicePath(byFull.get('대전광역시 서구'),'daeri')],
  ['충남당진시펜션탁송',servicePath(byFull.get('충청남도 당진시'),'taksong')],
  ['대전광역시 유성구 봉명동 팬션 대리운전',servicePath(byFull.get('대전광역시 유성구 봉명동'),'daeri')],
  ['충청북도 청주시 흥덕구 오송읍 펜션 대리운전',servicePath(byFull.get('충청북도 청주시 흥덕구 오송읍'),'daeri')],
  ['충청남도 태안군 소원면 호텔 탁송',servicePath(byFull.get('충청남도 태안군 소원면'),'taksong')],
  ['세종 조치원읍 팬션 대리운전',servicePath(byFull.get('세종특별자치시 (직할) 조치원읍'),'daeri')]
 ];
 for(const [q,target] of sample)assert.equal(guide.resolve(q),target,q);
 for(const q of ['전남여수펜션대리운전','광주펜션대리운전','충청도펜션임대','고소작업차탁송','충북괴산군대리운전','대전서구탁송'])assert.equal(guide.resolve(q),null,q);
});
test('Indexable one-page Chungcheong hub links all four province services and their 32 actual regional URLs',()=>{
 let called=null;
 const layout=(title,description,body,canonical)=>{called={title,description,body,canonical};return body};
 const html=guide.hubPage({layout});
 assert.equal(called.canonical,'https://jeongukdaeri.kr'+HUB);
 assert.ok(called.title.includes('충청도대리운전')&&called.title.includes('탁송'));
 assert.ok(html.includes('충청남도 15개 시군')&&html.includes('충청북도 11개 시군'));
 for(const p of four){
  const province=byFull.get(p);
  for(const k of ['daeri','taksong'])assert.ok(html.includes(servicePath(province,k)),'Missing province '+p+' '+k);
 }
 for(const r of [...portData.municipalities,...data.newGuides]){
  const region=byFull.get(r.region);
  for(const k of ['daeri','taksong'])assert.ok(html.includes(servicePath(region,k)),'Missing municipal '+r.region);
 }
 assert.ok(!html.includes('운행완료했습니다')&&!html.includes('기사를 상주시켰습니다'));
});
test('Server has one canonical gateway and no duplicated robots sitemap declarations, while regional SEO titles preserve original rides',()=>{
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
 assert.ok(server.includes("chungcheongGuides.regionSection(r,kind)"));
 assert.ok(server.includes("chungcheongGuides.searchMeta(r,kind)"));
 assert.ok(server.includes("chungcheongGuides.resolve(searchIntent)"));
 assert.ok(server.includes("chungcheongGuides.hubPage({layout,host:"));
 assert.ok(server.includes("'/region/chungcheong-daeri-taksong/'"));
 assert.ok(server.includes("!priorityMeta&&!focus50Info&&!historicalTitleTrip&&!verifiedTitleTrip&&!verifiedDaeriTitleTrip"));
 assert.equal((fs.readFileSync(path.join(root,'robots.txt'),'utf8').match(/^Sitemap:/gm)||[]).length,8);
 for(const row of data.newGuides)assert.doesNotMatch(JSON.stringify(row),/배차완료|운행완료|실시간\s*배차|상주기사|정액\s*요금|제휴\s*계약/);
});
