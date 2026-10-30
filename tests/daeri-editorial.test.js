'use strict';
const assert=require('node:assert/strict');
const editorial=require('../lib/daeri-blog-editorial');
const source=require('../blog/posts.json');
assert.equal(editorial.provinces.length,17,'all 17 nationwide provinces are represented');
assert.equal(new Set(editorial.provinces.map(p=>p.region)).size,17,'no duplicate provinces');
const originalById=new Map(source.map(p=>[p.id,p]));
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const p of editorial.provinces){
 assert.ok(p.title.includes('대리운전'),'unique province article title is about designated driving');
 assert.ok(p.summary.length>=38&&p.tip.length>=38,'region article provides substantial local booking information');
 for(const id of p.ids){
  const original=originalById.get(id);
  assert.ok(original,'article must be in real source index: '+id);
  assert.equal(editorial.sourcePost(id).url,original.url,'do not invent links');
 }
}
for(const p of editorial.featured)for(const id of p.ids)assert.ok(originalById.has(id),'national feature has original');
const fakeRegions=editorial.provinces.map((p,i)=>({full_name:p.region,name:p.region,slug:'area-'+(i+1)}));
const route=(r,kind)=>'/'+kind+'/'+r.slug+'/';
const national=editorial.national(fakeRegions,route,esc);
assert.equal((national.match(/class="daeri-blog-links"/g)||[]).length,4,'national section has four curated topic groups');
assert.equal((national.match(/href="\/daeri\/area-\d+\/"/g)||[]).length,17,'national index includes seventeen real region links');
assert.ok(!national.includes('/taksong/area-'),'only designated-driver region links in editorial index');
assert.ok(national.includes('1811-4294'),'current homepage contact is intact');
for(const x of editorial.provinces){
 const province=editorial.province(fakeRegions.find(r=>r.full_name===x.region),[],route,esc);
 assert.ok(province.includes(x.title),'province gets distinct article');
 assert.ok(province.includes(x.tip),'province gets local customer booking advice');
 if(!x.ids.length)assert.ok(province.includes('원문이 부족'),'do not fabricate an unpublished local driver story');
 for(const id of x.ids)assert.ok(province.includes(originalById.get(id).url),'original Naver URL kept');
}
async function get(p){
 const res=await fetch('http://127.0.0.1:3000'+p,{signal:AbortSignal.timeout(25000)});
 assert.equal(res.status,200,'expected 200 '+p);
 return res.text();
}
(async()=>{
 const hub=await get('/daeri/');
 assert.ok(hub.includes('id="national-daeri-blog-editorial"'),'nationwide driver editorial is visible');
 assert.ok(hub.includes('강남·프리미엄·법인 대리운전'),'driver services have their own editorial grouping');
 assert.ok(hub.includes('href="/daeri/gangwon/"'),'national guide links existing Gangwon page');
 assert.ok(hub.includes(originalById.get('224445451429').url),'national guide links actual Naver original');
 const provincePaths=[
  ['/daeri/seoul/','서울특별시','224386422952'],
  ['/daeri/busan/','부산광역시','224452970245'],
  ['/daeri/daegu/','대구광역시','224451280349'],
  ['/daeri/gangwon/','강원특별자치도','224420736659']
 ];
 for(const [p,name,id] of provincePaths){
  const html=await get(p);
  assert.ok(html.includes('id="province-daeri-blog-guide"'),name+' blog-style editorial is visible');
  assert.ok(html.includes(originalById.get(id).url),name+' original source link is present');
  assert.ok(html.includes('1811-4294'),name+' retains current phone');
 }
 const homepage=await get('/');
 for(const id of ['224445451429','224420736659','224386422952','224452987205'])
  assert.ok(homepage.includes(originalById.get(id).url),'homepage displays unchanged original driver post '+id);
 assert.ok(homepage.includes('/daeri/#national-daeri-blog-editorial'),'home links to nationwide editorial');
 const taksong=await get('/taksong/');
 assert.ok(!taksong.includes('id="national-daeri-blog-editorial"'),'taksong hub remains independent');
 console.log('PASS: 17 national designated-driver provinces, curated Naver original articles, homepage and service pages');
})().catch(err=>{console.error(err);process.exitCode=1;});
