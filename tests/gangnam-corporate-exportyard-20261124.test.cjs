'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const gangnamSource=read('lib/gangnam-yulhyeon-b2b-seo.cjs');
const corporate=read('service/corporate/index.html');
const exportYard=read('business/export-port/index.html');
const titleOf=s=>(s.match(/<title>([^<]+)<\/title>/)||[])[1];
const descriptionOf=s=>(s.match(/<meta name="description" content="([^"]+)"/)||[])[1];
const schemaOf=s=>JSON.parse(s.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
const gangnamPriority=JSON.parse(read('data/priority-regions.json')).pages
 .find(x=>x.region==='서울특별시 강남구'&&x.kind==='daeri');
test('Gangnam source keeps source-backed regional topic and leads with strongest local intent',()=>{
 const t='강남대리운전 | 강남역·테헤란로 법인·후불·고급·장거리';
 const d='강남역·테헤란로 주변 야간 출발 안내. 강남역과 테헤란로 일대는 약속 장소 확인. 강남대리운전·법인·장거리 상담 1811-4294.';
 assert.ok(gangnamSource.includes("title:'"+t+"'"));
 assert.ok(gangnamSource.includes("description:'"+d+"'"));
 assert.ok(d.includes(gangnamPriority.topic));
 assert.ok(d.includes(gangnamPriority.detail.split(/[.!?。]/)[0].trim().slice(0,16)));
 assert.ok([...d].length<=85);
 assert.ok(t.length<65);
 assert.ok(gangnamSource.includes('id="gangnam-b2b-local-seo-20261122"'));
 assert.ok(gangnamSource.includes('강남역·테헤란로·역삼·삼성 출발 예약 체크'));
 assert.ok(gangnamSource.includes('강남 장거리대리운전 안내'));
 assert.ok(gangnamSource.includes('후불대리운전과 법인카드대리운전은 사전 승인·계약'));
 assert.ok(gangnamSource.includes('같은 기사 대기지점으로 취급하지 않습니다'));
});
test('Corporate search authority preserved while Gangnam district and dong links lead to canonical originals',()=>{
 assert.equal(titleOf(corporate),'법인대리운전 | 법인카드·후불정산·단체·CEO 예약');
 assert.match(descriptionOf(corporate),/^전국 법인대리운전/);
 assert.match(corporate,/<link rel="canonical" href="https:\/\/jeongukdaeri.kr\/service\/corporate\/"/);
 const first=corporate.indexOf('id="gangnam-corporate-direct-canonical-20261124"');
 const old=corporate.indexOf('id="nationwide-ceo-daeri-booking-20261124"');
 assert.ok(first>0&&old>first,'Gangnam locality decision near first view, original nationwide intent retained');
 for(const url of ['/daeri/seoul/gangnam-gu/','/daeri/seoul/gangnam-gu/yeoksam-dong/',
 '/daeri/seoul/gangnam-gu/samseong-dong/','/service/daily-driver/','/business/']){
  assert.ok(corporate.includes('href="'+url+'"'),'Grounded corporate related link '+url);
 }
 assert.ok(corporate.includes('법인카드·후불·월말정산은 계약 전 자동 승인되지 않습니다'));
 assert.ok(corporate.includes('고객 없이 회사 차량만 옮기는 업무'));
 assert.equal((corporate.match(/<h1\b/g)||[]).length,1);
});
test('Export-yard search title and description match OG and JSON-LD without fake sales or pricing',()=>{
 const title='중고차수출단지탁송 | 송도·경매장 출고·수출업체 반입';
 assert.equal(titleOf(exportYard),title);
 assert.equal((exportYard.match(/<meta property="og:title" content="([^"]+)"/)||[])[1],title);
 assert.equal((exportYard.match(/<meta property="og:description" content="([^"]+)"/)||[])[1],descriptionOf(exportYard));
 assert.ok(descriptionOf(exportYard).startsWith('중고차수출단지탁송·수출업체탁송'));
 assert.ok([...descriptionOf(exportYard)].length<=160);
 assert.ok(exportYard.includes('https://jeongukdaeri.kr/business/export-port/'));
 assert.ok(exportYard.includes('<h1>중고차수출단지탁송'));
 const graph=schemaOf(exportYard)['@graph'];
 const page=graph.find(x=>x['@type']==='WebPage');
 assert.equal(page.name,title);
 assert.equal(page.description,descriptionOf(exportYard));
 assert.equal(graph.find(x=>x['@type']==='BreadcrumbList').itemListElement[2].name,title);
 const service=graph.find(x=>x['@type']==='Service');
 assert.equal(service.provider.telephone,'1811-4294');
 assert.equal('offers' in service,false,'Do not invent price, guaranteed allocation or contract');
 assert.ok(exportYard.includes('id="exporter-ceo-b2b-sales-20261123"'),'Existing sales and source-backed guidance retained');
 assert.ok(exportYard.includes('중고차수출업체탁송 | 수출·무역업체 대표'));
 assert.ok(exportYard.includes('단지 반입과 통관·선박 선적은 별도 업무'));
 assert.ok(exportYard.includes('말소·무번호판·주행불가 차량은 일반 도로 로드탁송으로 운행한다고 약속하지 않고'));
 for(const href of ['/business/#export','/business/auction/','/business/used-car/','/taksong/incheon/'])
  assert.ok(exportYard.includes('href="'+href+'"'),href);
 assert.equal((exportYard.match(/<h1\b/g)||[]).length,1);
});
test('Canonical URLs, archives and original official discovery remain unchanged',()=>{
 const server=read('server.js');
 const robots=read('robots.txt');
 const pkg=JSON.parse(read('package.json'));
 assert.ok(server.includes("gangnamYulhyeonSeo.searchMeta(r,kind)"));
 assert.ok(server.includes("exporterB2BSales.resolve(searchIntent)"));
 assert.ok(server.includes('regionalReviewBatch300.length!==2591'));
 assert.ok(read('business/used-car/index.html').includes('href="/business/#export"'));
 assert.ok(robots.includes('Allow: /'));
 assert.equal((robots.match(/^Sitemap:/gm)||[]).length,8);
 assert.ok(pkg.scripts['check:seo'].includes('gangnam-corporate-exportyard-20261124.test.cjs'));
});
