'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {create,reviewTargets,intentGuide}=require('../lib/locality-evidence-guide-20261127.cjs');
const root=path.join(__dirname,'..'),dir=path.join(root,'data');
const rows=fs.readdirSync(dir).filter(f=>/^naver-regional-focus-.*\.json$/.test(f)&&!f.includes('candidates')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(dir,f))).priority);
const names=fs.readdirSync(path.join(dir,'legal-regions')).filter(f=>/^\d{2}\.json$/.test(f)).flatMap(f=>JSON.parse(fs.readFileSync(path.join(dir,'legal-regions',f))).full_names);
const regions=[...new Set(names)].map((full_name,i)=>({full_name,slug:'test-'+i}));
const source=fs.readFileSync(path.join(root,'server.js'),'utf8');
const g=create({rows,regions,servicePath:(r,k)=>'/'+k+'/'+r.slug+'/',esc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')});
test('complete exact existing backlog, not an arbitrary top-N or blanket index expansion',()=>{
 assert.equal(rows.length,2900);
 assert.equal(g.targets.size,1918);
 assert.equal(g.plans.size,1918);
 const allProvinces=new Set(rows.map(x=>x.region.split(' ')[0]));
 const selectedProvinces=new Set(rows.filter(x=>g.targets.has(x.kind+'|'+x.region)).map(x=>x.region.split(' ')[0]));
 const renderedProvinces=new Set([...g.plans.values()].map(x=>x.region.full_name.split(' ')[0]));
 assert.deepEqual([...renderedProvinces].sort(),[...selectedProvinces].sort());
 assert.equal(selectedProvinces.size,16,'current flagged cohort spans 16 provinces; investigate any change');
 for(const province of allProvinces){
  const source=rows.filter(x=>x.region.split(' ')[0]===province);
  const selected=source.filter(x=>g.targets.has(x.kind+'|'+x.region));
  assert.equal([...g.plans.values()].filter(x=>x.region.full_name.split(' ')[0]===province).length,selected.length,province);
  console.log('Locality coverage:',province,selected.length,'of',source.length);
 }
 console.log('Source provinces without flagged rows:',[...allProvinces].filter(x=>!selectedProvinces.has(x)).join(', ')||'none');
 for(const row of rows){
  const p=g.plans.get(row.kind+'|'+row.region);
  const r=regions.find(x=>x.full_name===row.region);
  assert(r);
  const html=g.render(r,row.kind);
  if(!p){assert.equal(html,'');continue;}
  assert(html.includes(row.region));
  assert(html.includes('from='+encodeURIComponent(row.region)));
  assert(html.includes('to='+encodeURIComponent(row.region)));
  assert(html.includes('region='+encodeURIComponent(r.slug)));
  if(p.parent)assert(html.includes(p.parent.full_name));
  assert(!/완료 운행후기|상주 기사|배차 보장/.test(html));
 }
});
test('service intent is conditional and does not assert facilities',()=>{
 assert.equal(intentGuide({kind:'taksong',keyword:'렌트카탁송',topic:'반납',related:''})[0],'렌터카 반납·회수');
 assert.equal(intentGuide({kind:'daeri',keyword:'골프장대리운전',topic:'',related:''})[0],'골프장 이동');
 assert.match(source,/localityEvidenceGuide\.render\(r,kind\)/);
 assert.match(source,/locality-evidence-guide-20261127\.cjs/);
});

test('diagnose locality-name-only duplication without granting editorial or indexability approval',()=>{
 const selected=rows.filter(row=>g.targets.has(row.kind+'|'+row.region));
 const normalize=(text,row)=>{
  let value=String(text||'').normalize('NFKC').toLowerCase();
  const parts=row.region.split(/\s+/);
  const aliases=[row.region,parts.join(''),...parts];
  for(const alias of [...new Set(aliases)].sort((a,b)=>b.length-a.length)){
   if(alias)value=value.split(alias.toLowerCase()).join('지역');
  }
  return value.replace(/[^\p{L}\p{N}]/gu,'');
 };
 assert.equal(normalize('서울특별시 강남구 차량 인계',{region:'서울특별시 강남구'}),normalize('부산광역시 해운대구 차량 인계',{region:'부산광역시 해운대구'}));
 assert.notEqual(normalize('강남구 정비 접수',{region:'서울특별시 강남구'}),normalize('해운대구 차량 반납',{region:'부산광역시 해운대구'}));
 const groups=new Map();
 for(const row of selected){
  const original=['topic','pickup','handover'].map(f=>normalize(row[f],row)).join('|');
  const key=row.kind+'|'+original;
  const group=groups.get(key)||[];
  group.push(row);groups.set(key,group);
 }
 const repeated=[...groups.values()].filter(group=>group.length>1).sort((a,b)=>b.length-a.length);
 const affected=repeated.reduce((n,group)=>n+group.length,0);
 assert.equal([...groups.values()].reduce((n,group)=>n+group.length,0),1918);
 console.log('Normalized original-copy audit:',JSON.stringify({pages:selected.length,distinctGroups:groups.size,duplicateGroups:repeated.length,affectedPages:affected,largestGroup:repeated[0]?.length||0}));
 const byProvince={},byService={};
 for(const group of repeated)for(const row of group){const province=row.region.split(' ')[0];byProvince[province]=(byProvince[province]||0)+1;byService[row.kind]=(byService[row.kind]||0)+1;}
 assert.equal(Object.values(byProvince).reduce((a,b)=>a+b,0),affected);
 assert.equal(Object.values(byService).reduce((a,b)=>a+b,0),affected);
 console.log('Duplicate affected by province:',JSON.stringify(byProvince));
 console.log('Duplicate affected by service:',JSON.stringify(byService));
 for(const [i,group] of repeated.entries())console.log('Editorial remediation queue:',JSON.stringify({group:i+1,size:group.length,items:group.map(r=>({kind:r.kind,region:r.region,keyword:r.keyword}))}));
 // The added booking text is shared service guidance, not local evidence.
 const intents=new Map();
 for(const row of selected){const key=row.kind+'|'+JSON.stringify(intentGuide(row));intents.set(key,(intents.get(key)||0)+1);}
 console.log('Shared booking guidance groups (not proof of unique content):',JSON.stringify([...intents.entries()].sort((a,b)=>b[1]-a[1])));
 // Exact normalized matches are a lower bound, not a full near-duplicate or live HTML audit.
});

test('first twenty duplicate pages contain distinct source-backed local booking advice',()=>{
 const targets=[['서울특별시 은평구 불광동','불광역','pts.map.naver.com'],['부산광역시 남구 용당동','신선대부두','busanpa.com'],['강원특별자치도 양양군 현남면','인구항','tour.yangyang.go.kr'],['전북특별자치도 무주군 무주읍','반딧불장터','tour.muju.go.kr'],['경상남도 김해시 내동','연지공원','access.visitkorea.or.kr'],['대구광역시 서구 내당동','내당역','data.go.kr'],['광주광역시 북구 양산동','양산저수지','gwangju.go.kr'],['울산광역시 동구 방어동','방어진항','donggu.ulsan.kr'],['경기도 이천시 부발읍','부발역','pts.map.naver.com'],['경기도 군포시 당동','군포역','bustrain.kr']];
 const advice=new Set();
 for(const [name,landmark,domain] of targets){
  const region=regions.find(r=>r.full_name===name);assert(region);
  for(const kind of ['daeri','taksong']){
   assert(g.targets.has(kind+'|'+name));
   const html=g.render(region,kind);
   const match=html.match(/지역별 차량 위치와 이용 조건<\/h4><p>(.*?)<\/p>/);
   assert(match,name+' '+kind);assert(match[1].includes(landmark),name+' '+kind);
   assert(html.includes(domain));advice.add(match[1]);
  }
 }
 assert.equal(advice.size,20);
 console.log('Source-backed first two batches: 20 distinct regional service paragraphs; original duplicate baseline remains unchanged.');
});

test('bulk remediation covers every one of the 858 duplicate pages with real archive matching and no invented evidence',()=>{
 const {matchingHistoryRegion,publicPlace}=require('../lib/regional-history-evidence');
 const vm=require('node:vm');
 const archive=JSON.parse(fs.readFileSync(path.join(dir,'ride-history.json'),'utf8'));
 const canonical=JSON.parse(fs.readFileSync(path.join(dir,'seo-history-duplicates.json'),'utf8')).canonicalById;
 const start=source.indexOf('function completedRidePublicPlace(raw)');
 const end=source.indexOf('const historicalRideById=',start);
 assert(start>=0&&end>start);
 const rides=vm.runInNewContext(source.slice(start,end)+';historicalRides',{rides:archive,publicPlace});
 assert.equal(rides.length,2591);
 const realRegions=regions.map(r=>{
  const parts=r.full_name.split(' '),name=parts.at(-1);
  return {...r,name,level:parts.length===1?'시도':/리$/.test(name)?'리':/읍$/.test(name)?'읍':/면$/.test(name)?'면':/구$/.test(name)?'구':/군$/.test(name)?'군':/시$/.test(name)?'시':'동'};
 });
 const eligible=rides.filter(x=>(!canonical[x.id]||canonical[x.id]===x.id)&&x.departure!=='지역 비공개'&&x.destination!=='지역 비공개');
 const counts={processed:0,archiveMatched:0,curatedParagraph:0,both:0,neither:0,archiveLinks:0};
 const publishedPosts=JSON.parse(fs.readFileSync(path.join(root,'blog/posts.json'),'utf8'));
 let originalMatched=0,additionalOriginalCoverage=0,reviewedMatched=0,reviewedAdditional=0;
 const lookup=(r,kind)=>eligible.filter(x=>x.service===kind&&matchingHistoryRegion(x,r,realRegions)).filter((x,i,a)=>a.findIndex(y=>y.date===x.date&&y.departure===x.departure&&y.destination===x.destination&&y.fare===x.fare)===i).slice(0,20);
 const batch=create({rows,regions:realRegions,servicePath:(r,k)=>'/'+k+'/'+r.slug+'/',esc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'),historyFor:lookup,publishedPosts});
 assert.equal(batch.targets.size,1918);assert.equal(batch.duplicates.size,858);
 for(const row of rows){
  const r=realRegions.find(x=>x.full_name===row.region);
  const html=batch.render(r,row.kind),selected=batch.duplicates.has(row.kind+'|'+row.region);
  assert.equal(html.includes('class="locality-batch-evidence"'),selected);
  if(!selected)continue;
  counts.processed++;
  const nav=html.match(/<nav[^>]*class="locality-batch-navigation">([\s\S]*?)<\/nav>/);
  assert(nav,row.region+' missing service navigation');
  assert(nav[1].includes('href="/'+row.kind+'/"'));
  assert(nav[1].includes('상위 지역 안내는 해당 세부 지역의 운행 실적이나 고유자료를 뜻하지 않습니다.'));
  const hrefs=[...nav[1].matchAll(/href="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(new Set(hrefs).size,hrefs.length);
  for(const href of hrefs.slice(1)){
   const ancestor=realRegions.find(x=>href==='/'+row.kind+'/'+x.slug+'/');
   assert(ancestor&&row.region.startsWith(ancestor.full_name+' '),row.region+' invalid ancestor '+href);
   assert(rows.some(x=>x.kind===row.kind&&x.region===ancestor.full_name));
  }
  const records=lookup(r,row.kind).slice(0,3);
  const curated=html.includes('지역별 차량 위치와 이용 조건');
  if(records.length)counts.archiveMatched++;
  if(curated)counts.curatedParagraph++;
  if(records.length&&curated)counts.both++;
  if(!records.length&&!curated)counts.neither++;
  const originals=html.includes('class="locality-original-articles"');
  if(originals){originalMatched++;if(!records.length&&!curated)additionalOriginalCoverage++;}
  const reviewed=html.includes('class="locality-reviewed-originals"');
  if(reviewed){reviewedMatched++;if(!originals&&!records.length&&!curated)reviewedAdditional++;}
  counts.archiveLinks+=records.length;
  for(const record of records)assert(html.includes('/reviews/history/'+record.id+'/'));
  if(!records.length)assert(html.includes('이 안내에 연결된 공개 완료 운행기록이 없습니다.'));
  assert.equal((html.match(/href="\/reviews\/history\/excel-\d+\/"/g)||[]).length,records.length);
 }
 assert.equal(counts.processed,858);
 console.log('BULK_858_NAVIGATION_AUDIT',JSON.stringify({processed:counts.processed,serviceHubLinked:counts.processed,invalidAncestorLinks:0}));
 assert.equal(counts.curatedParagraph,34);
 assert.equal(counts.neither,counts.processed-counts.archiveMatched-counts.curatedParagraph+counts.both);
 assert.match(source,/historyFor:\(r,kind\)=>cachedRegionalRideLookups\(r,kind\)\.regionalBatchMatches/);
 console.log('BULK_858_EVIDENCE_AUDIT',JSON.stringify(counts));
 console.log('PUBLISHED_ORIGINAL_COVERAGE',JSON.stringify({posts:publishedPosts.length,originalMatched,additionalOriginalCoverage,combined:counts.processed-counts.neither+additionalOriginalCoverage,remaining:counts.neither-additionalOriginalCoverage}));
 console.log('REVIEWED_ORIGINAL_COVERAGE',JSON.stringify({reviewedMatched,reviewedAdditional,combined:counts.processed-counts.neither+additionalOriginalCoverage+reviewedAdditional,remaining:counts.neither-additionalOriginalCoverage-reviewedAdditional}));
 assert.match(source,/publishedPosts:publishedBlogPosts/);
});


test('qualified abbreviated blog titles resolve conservatively and never cross service types',()=>{
 const region='서울특별시 강남구 역삼동';
 const row={kind:'taksong',region,keyword:'역삼동탁송',topic:'차량 이동 안내',pickup:'인수',handover:'인계',related:'/service/taksong/'};
 const other={...row,region:'서울특별시 강남구 논현동',keyword:'논현동탁송'};
 const rs=[region,other.region,'인천광역시 남동구 논현동'].map((full_name,i)=>({full_name,slug:'alias-'+i}));
 const posts=[
 {title:'서울 강남 역삼 자동차탁송 안내',url:'https://blog.naver.com/wjdtnr4757/123'},
 {title:'서울 강남 역삼 대리운전 안내',url:'https://blog.naver.com/wjdtnr4757/124'},
 {title:'역삼동 탁송 안내',url:'https://blog.naver.com/wjdtnr4757/125'},
 {title:'출발지 서울 강남 역삼 자동차탁송 안내',url:'https://blog.naver.com/wjdtnr4757/127'},
 {title:'강남 역삼동탁송 안내',url:'https://blog.naver.com/wjdtnr4757/126'},
 {title:'서울 강남 역삼 자동차탁송 안내',url:'https://example.com/123'}
 ];
 const result=create({rows:[row,other],regions:rs,servicePath:(r,k)=>'/'+k+'/'+r.slug+'/',esc:String,publishedPosts:posts});
 assert.equal(result.duplicates.size,2);
 const html=result.render(rs[0],'taksong');
 for(let i=0;i<20;i++)assert.equal(result.render(rs[0],'taksong'),html,'repeated requests preserve identical reference output');
 assert(html.includes('wjdtnr4757/123'));
 assert(html.includes('wjdtnr4757/126'));
 assert(html.includes('wjdtnr4757/127'));
 assert(!html.includes('wjdtnr4757/124'));
 assert(!html.includes('wjdtnr4757/125'));
 assert(!html.includes('example.com/123'));
 assert(!result.render(rs[1],'taksong').includes('wjdtnr4757/123'));
});

 test('reviewed originals are scoped to exact region and service and verified catalog URLs',()=>{
 const region='부산광역시 기장군',other='부산광역시 기장군 기장읍';
 const row={kind:'taksong',region,keyword:'기장군탁송',topic:'차량 이동',pickup:'인수',handover:'인계',related:'/taksong/'};
 const rs=[region,other].map((full_name,i)=>({full_name,slug:'test-'+i}));
 const url='https://blog.naver.com/wjdtnr4757/123';
 const posts=[{title:'차량 이동 관련 안내',url}];
 const reviewedOriginals=[{region,kind:'taksong',post_id:'123',scope:'regional_guide',note:'지역 안내'},{region:other,kind:'taksong',post_id:'123',scope:'related_service'},{region,kind:'taksong',post_id:'999',scope:'regional_guide'}];
 const g=create({rows:[row,{...row,region:other},{...row,kind:'daeri'},{...row,kind:'daeri',region:other}],regions:rs,servicePath:(r,k)=>'/'+k+'/'+r.slug+'/',esc:String,publishedPosts:posts,reviewedOriginals,priorityOriginals:[]});
 assert(g.render(rs[0],'taksong').includes(url));
 assert(!g.render(rs[1],'taksong').includes(url));
 assert(!g.render(rs[0],'daeri').includes(url));
 assert(!g.render(rs[0],'taksong').includes('/999'));
 });

test('two additional long-distance locality guides cite official parking location sources',()=>{
 for(const [name,place,domain] of [['대구광역시 수성구 상동','수성못공영주차장','suseong.kr'],['광주광역시 서구 금호동','금호동 764','seogufmc.or.kr']]){
 const region=regions.find(r=>r.full_name===name);assert(region);assert(g.duplicates.has('daeri|'+name));const html=g.render(region,'daeri');assert(html.includes(place));assert(html.includes(domain));assert(html.includes('지역별 차량 위치와 이용 조건'));
 }
});
