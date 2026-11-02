'use strict';
// Offline, deterministic checks: this does NOT confirm live Cloudtype deployment or Naver indexing.
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const check=(ok,message)=>{if(!ok)throw Error('SEO check failed: '+message)};
const posts=JSON.parse(read('blog/posts.json'));
check(Array.isArray(posts)&&posts.length>=630,'630 original blog links must remain');
const ids=new Set(),urls=new Set(),categories=new Set();
for(const p of posts){
 check(typeof p.title==='string'&&p.title.trim()&&typeof p.category==='string','post title and category');
 check(/^https:\/\/blog\.naver\.com\/wjdtnr4757\/[0-9]{12}$/.test(p.url),'original Naver URL format: '+p.url);
 check(p.id===p.url.slice(p.url.lastIndexOf('/')+1),'Naver post ID mismatch');
 check(!ids.has(p.id)&&!urls.has(p.url),'duplicate post ID or URL: '+p.id);
 ids.add(p.id);urls.add(p.url);categories.add(p.category);
}
check(categories.size>=52,'52 original categories should remain');
const sections=[
 ['region/index.html','verified-naver-region-links-20261102'],
 ['service/taksong/index.html','real-original-taksong-links-20261102'],
 ['service/daeri/index.html','real-original-daeri-links-20261102'],
 ['blog/taksong-categories/index.html','naver-taksong-direct-originals-20261102'],
 ['blog/daeri-regions/index.html','naver-daeri-direct-originals-20261102'],
 ['region/busan-daeri-taksong/index.html','busan-direct-naver-evidence-20261102'],
 ['region/daegu-daeri-taksong/index.html','daegu-direct-naver-evidence-20261102'],
 ['region/incheon-daeri-taksong/index.html','incheon-direct-naver-evidence-20261102'],
 ['fare/jeju/index.html','jeju-original-evidence-20261102'],
 ['service/heavy-truck-taksong/index.html','heavy-original-links-20261102']
];
for(const [p,id] of sections){
 const html=read(p);
 check(html.includes('id="'+id+'"'),'missing editorial link section: '+p);
 if(p==='service/daeri/index.html'){
  check(/<meta\s+name="robots"\s+content="noindex,follow"/i.test(html),'legacy daeri URL must remain noindex: '+p);
 }else{
  check(!/<meta\s+name="robots"\s+content="noindex/i.test(html),'unexpected noindex: '+p);
 }
}
const home=read('index.html');
check(home.indexOf('<body>')<home.indexOf('<header')&&home.indexOf('<header')<home.indexOf('<section id="mobile-direct-image-priority"'),'homepage general service must precede mountain posters');
check(home.includes('id="general-taksong-service-focus-20261102"'),'missing general regional focus');
const rules=JSON.parse(read('data/seo-pages.json')).pages;
for(const p of ['/','/taksong/','/daeri/','/region/']){
 const rule=rules.find(x=>x.path===p);
 check(rule&&rule.title&&rule.description,'production SEO metadata for '+p);
}
const server=read('server.js');
for(const x of ['staticOriginalSourceSection','regionDirectOriginalLinks','real-original-taksong-links-20261102','real-original-daeri-links-20261102','/blog/taksong-categories/']){
 check(server.includes(x),'Cloudtype source/sitemap wiring: '+x);
}
const sitemap=read('sitemap.xml');
for(const route of ['/설악산탁송/','/지리산탁송/','/blog/archive/','/service/taksong/']){
 check(sitemap.includes('https://jeongukdaeri.kr'+route),'static sitemap route '+route);
}
const businessChecks=[
 ['business/rental-car/index.html','rental-b2b-operating-guide-20261103'],
 ['business/used-car/index.html','dealer-b2b-operating-guide-20261103'],
 ['business/export-port/index.html','export-b2b-operating-guide-20261103'],
 ['business/auction/index.html','auction-b2b-operating-guide-20261103']
];
for(const [p,id] of businessChecks){
 const html=read(p);
 check(html.includes('id="'+id+'"'),'missing business guidance: '+p);
 check(html.includes('href="tel:18114294"'),'missing business phone contact: '+p);
 check(html.includes('https://blog.naver.com/wjdtnr4757/'),'missing verified Naver source links: '+p);
}
const priorities=JSON.parse(read('data/priority-regions.json')).pages;
check(priorities.length>=34,'at least 34 current priority pages must remain');
check(server.includes('priorityByKey.size!==priorityRegionalPages.length'),'startup priority validation must be data-driven');
check(!server.includes("priorityRegionalPages.length!==27"),'old hardcoded count would crash Cloudtype deployment');
const priorityKeys=new Set(priorities.map(x=>x.kind+'|'+x.region));
check(priorities.length===priorityKeys.size,'duplicate metropolitan priority rule');
for(const key of ['taksong|광주광역시','taksong|대전광역시','taksong|경상남도 창원시','daeri|광주광역시','daeri|대전광역시','daeri|울산광역시']){
 check(priorityKeys.has(key),'missing curated regional SEO topic: '+key);
}
check(server.includes("sparseVillage=r.level==='리'"),'sparse village low-quality indexing protection missing');
check(server.includes("specialized-business-taksong-hub"),'production business hub direct links missing');
check(home.includes('id="special-business-top-links-20261103"'),'homepage business navigation missing');
const curated=JSON.parse(read('data/priority-blog-links.json')).pages;
check(curated.length===10,'expected exactly ten curated existing service pages');
const curatedKeys=new Set(),curatedIds=new Set();
for(const item of curated){
 const key=item.kind+'|'+item.region;
 check(!curatedKeys.has(key),'duplicate curated service page '+key);
 check(priorityKeys.has(key),'unrecognized priority region '+key);
 curatedKeys.add(key);
 check(item.ids.length===2,'require two original Naver sources for '+key);
 check(typeof item.focus==='string'&&item.focus.length>=20,'missing unique editorial context '+key);
 for(const id of item.ids){
  check(ids.has(id),'curated source id missing from original 630 posts: '+id);
  check(!curatedIds.has(id),'source must not be reused in separate curated region: '+id);
  curatedIds.add(id);
 }
}
check(server.includes("priorityBlogEvidence(r,kind)"),'ten dynamic regional source sections not wired');
check(server.includes("priorityBlogLinksByKey"),'ten curated sections not loaded');
const nonCanonicalSitemapAliases=[
 '/service/daeri/','/special/nationwide-daeri/',
 '/special/seoraksan-transport/','/special/jirisan-transport/'
];
for(const route of nonCanonicalSitemapAliases){
 check(!sitemap.includes('<loc>https://jeongukdaeri.kr'+route+'</loc>'),'redirect/canonical alias in sitemap '+route);
}
for(const route of ['/taksong/','/daeri/']){
 check(sitemap.includes('<loc>https://jeongukdaeri.kr'+route+'</loc>'),'canonical service hub missing in sitemap '+route);
}
const daeriLegacy=read('service/daeri/index.html');
check(daeriLegacy.includes('rel="canonical" href="https://jeongukdaeri.kr/daeri/"'),'legacy daeri alias must canonicalize to /daeri/');
check(/<meta name="robots" content="noindex,follow">/.test(daeriLegacy),'legacy daeri alias must not compete for indexing');
check(server.includes("pathname==='/health/seo-report/'"),'human-readable production deployment report missing');
check(server.includes('deployment_hashes:Object.fromEntries'),'source-level SHA256 diagnostic missing');
const smoke=read('tools/smoke_production_server.js');
const liveAudit=read('tools/audit_live_seo.py');
const priorityPublicURLs=[
 '/','/taksong/','/daeri/','/region/',
 '/taksong/busan/','/taksong/daegu/','/taksong/incheon/','/taksong/gwangju/',
 '/taksong/daejeon/','/taksong/ulsan/',
 '/taksong/gyeongnam/changwon-si/','/taksong/gyeongnam/gimhae-si/',
 '/daeri/busan/','/daeri/daegu/','/daeri/incheon/','/daeri/gwangju/',
 '/daeri/daejeon/','/daeri/ulsan/',
 '/blog/archive/','/blog/taksong-categories/'
];
check(priorityPublicURLs.length===20&&new Set(priorityPublicURLs).size===20,'20 unique priority public URLs');
for(const url of priorityPublicURLs){
 check(smoke.includes("'"+url+"'"),'20-route startup smoke test missing '+url);
 // Live audit has intentionally different role: includes the ten source-linked
 // metro pages, the four national service hubs and deployment diagnostics.
}
for(const url of [
 '/','/taksong/','/daeri/','/region/','/blog/archive/',
 '/taksong/busan/','/taksong/daegu/','/taksong/incheon/',
 '/taksong/gwangju/','/taksong/daejeon/','/taksong/ulsan/',
 '/taksong/gyeongnam/changwon-si/','/taksong/gyeongnam/gimhae-si/',
 '/daeri/busan/','/daeri/daegu/'
]){
 check(liveAudit.includes('"'+url+'":'),'production HTML audit must include '+url);
}
const pagesCi=read('.github/workflows/pages.yml');
const cloudtypeCi=read('.github/workflows/cloudtype-redeploy.yml');
for(const [name,workflow] of [['GitHub Pages',pagesCi],['Cloudtype',cloudtypeCi]]){
 check(workflow.includes('node tools/smoke_production_server.js'),name+' must run real startup test');
}
const configurePages=read('tools/configure_site.py');
check(configurePages.includes('GitHub Pages backup: official Cloudtype CNAME not published'),'backup CNAME protection missing');
check(pagesCi.includes('Stop GitHub Pages mirror from claiming the Cloudtype domain'),'backup domain claim build guard missing');
console.log('PASS: '+posts.length+' unique Naver post URLs, '+categories.size+' categories, '+sections.length+' original-source sections, production SEO overrides, homepage order and core sitemaps.');
