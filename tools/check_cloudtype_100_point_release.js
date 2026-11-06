'use strict';
// 100 concrete, source-level release checks. These DO NOT verify live Cloudtype.
// A failure is a blocked release; never record a test pass as a customer inquiry.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const rules=[
  {
    "group": "deploy",
    "path": ".github/workflows/cloudtype-redeploy.yml",
    "name": "main trigger",
    "needle": "branches: [main]"
  },
  {
    "group": "deploy",
    "path": ".github/workflows/cloudtype-redeploy.yml",
    "name": "manual trigger",
    "needle": "workflow_dispatch:"
  },
  {
    "group": "deploy",
    "path": ".github/workflows/cloudtype-redeploy.yml",
    "name": "single release group",
    "needle": "group: smart24-cloudtype-production-redeploy"
  },
  {
    "group": "deploy",
    "path": ".github/workflows/cloudtype-redeploy.yml",
    "name": "cancel obsolete releases",
    "needle": "cancel-in-progress: true"
  },
  {
    "group": "deploy",
    "path": ".github/workflows/cloudtype-redeploy.yml",
    "name": "secret token",
    "needle": "secrets.CLOUDTYPE_TOKEN"
  },
  {
    "group": "deploy",
    "path": ".github/workflows/cloudtype-redeploy.yml",
    "name": "secret deployment yaml",
    "needle": "secrets.CLOUDTYPE_DEPLOY_YAML"
  },
  {
    "group": "deploy",
    "path": ".github/workflows/cloudtype-redeploy.yml",
    "name": "project variable",
    "needle": "vars.CLOUDTYPE_PROJECT"
  },
  {
    "group": "deploy",
    "path": ".github/workflows/cloudtype-redeploy.yml",
    "name": "app variable",
    "needle": "vars.CLOUDTYPE_APP"
  },
  {
    "group": "deploy",
    "path": ".github/workflows/cloudtype-redeploy.yml",
    "name": "stage variable",
    "needle": "vars.CLOUDTYPE_STAGE"
  },
  {
    "group": "deploy",
    "path": ".github/workflows/cloudtype-redeploy.yml",
    "name": "fail if missing",
    "needle": "No production redeploy was requested"
  },
  {
    "group": "deploy-safety",
    "path": ".github/workflows/cloudtype-redeploy.yml",
    "name": "official Cloudtype action",
    "needle": "cloudtype-github-actions/deploy@v1"
  },
  {
    "group": "deploy-safety",
    "path": ".github/workflows/cloudtype-redeploy.yml",
    "name": "no all-stage rollout",
    "needle": "allStages: false"
  },
  {
    "group": "deploy-safety",
    "path": ".github/workflows/cloudtype-redeploy.yml",
    "name": "no undocumented hook",
    "needle": "!api.cloudtype.io/webhooks/deploy"
  },
  {
    "group": "deploy-safety",
    "path": ".github/workflows/cloudtype-redeploy.yml",
    "name": "match original app",
    "needle": "ORIGINAL_APP"
  },
  {
    "group": "deploy-safety",
    "path": ".github/workflows/cloudtype-redeploy.yml",
    "name": "verify yaml app name",
    "needle": "matches[0]"
  },
  {
    "group": "deploy-safety",
    "path": ".github/workflows/cloudtype-redeploy.yml",
    "name": "block missing yaml",
    "needle": "CLOUDTYPE_DEPLOY_YAML(secret)"
  },
  {
    "group": "deploy-safety",
    "path": ".github/workflows/cloudtype-redeploy.yml",
    "name": "test production startup",
    "needle": "node tools/smoke_production_server.js"
  },
  {
    "group": "deploy-safety",
    "path": ".github/workflows/cloudtype-redeploy.yml",
    "name": "test critical SEO",
    "needle": "node tools/check_core_seo.js"
  },
  {
    "group": "deploy-safety",
    "path": ".github/workflows/cloudtype-redeploy.yml",
    "name": "compare health SHA",
    "needle": "sha256sum server.js"
  },
  {
    "group": "deploy-safety",
    "path": ".github/workflows/cloudtype-redeploy.yml",
    "name": "official website health",
    "needle": "https://jeongukdaeri.kr/health"
  },
  {
    "group": "audit",
    "path": ".github/workflows/official-production-audit.yml",
    "name": "daily audit",
    "needle": "cron:"
  },
  {
    "group": "audit",
    "path": ".github/workflows/official-production-audit.yml",
    "name": "on-demand audit",
    "needle": "workflow_dispatch:"
  },
  {
    "group": "audit",
    "path": ".github/workflows/official-production-audit.yml",
    "name": "check audit syntax",
    "needle": "py_compile tools/check_live_taksong_deploy.py"
  },
  {
    "group": "audit",
    "path": ".github/workflows/official-production-audit.yml",
    "name": "server check",
    "needle": "node --check server.js"
  },
  {
    "group": "audit",
    "path": ".github/workflows/official-production-audit.yml",
    "name": "customer menu check",
    "needle": "tests/homepage-top-services.test.js"
  },
  {
    "group": "audit",
    "path": ".github/workflows/official-production-audit.yml",
    "name": "taksong link check",
    "needle": "tests/taksong-priority-seo-links.test.js"
  },
  {
    "group": "audit",
    "path": ".github/workflows/official-production-audit.yml",
    "name": "live audit executable",
    "needle": "python tools/check_live_taksong_deploy.py"
  },
  {
    "group": "audit",
    "path": ".github/workflows/official-production-audit.yml",
    "name": "multiple attempts",
    "needle": "for attempt in 1 2 3"
  },
  {
    "group": "audit",
    "path": ".github/workflows/official-production-audit.yml",
    "name": "annotate failure",
    "needle": "::error::Production audit FAILED"
  },
  {
    "group": "audit",
    "path": ".github/workflows/official-production-audit.yml",
    "name": "retain evidence",
    "needle": "actions/upload-artifact@v4"
  },
  {
    "group": "top-menu",
    "path": "index.html",
    "name": "primary menu landmark",
    "needle": "id=\"homepage-primary-services-20261106\""
  },
  {
    "group": "top-menu",
    "path": "index.html",
    "name": "accessible landmark",
    "needle": "aria-label=\"주요 운전 서비스 바로가기\""
  },
  {
    "group": "top-menu",
    "path": "index.html",
    "name": "driver button",
    "needle": "href=\"/daeri/\""
  },
  {
    "group": "top-menu",
    "path": "index.html",
    "name": "transport button",
    "needle": "href=\"/taksong/\""
  },
  {
    "group": "top-menu",
    "path": "index.html",
    "name": "corporate button",
    "needle": "href=\"/service/corporate/\""
  },
  {
    "group": "top-menu",
    "path": "index.html",
    "name": "golf button",
    "needle": "href=\"/service/golf/\""
  },
  {
    "group": "top-menu",
    "path": "index.html",
    "name": "sticky rule",
    "needle": "position:sticky;top:0;z-index:1100"
  },
  {
    "group": "top-menu",
    "path": "index.html",
    "name": "desktop five columns",
    "needle": "grid-template-columns:repeat(5,minmax(0,1fr))!important"
  },
  {
    "group": "top-menu",
    "path": "index.html",
    "name": "mobile two columns",
    "needle": "grid-template-columns:repeat(2,minmax(0,1fr))"
  },
  {
    "group": "top-menu",
    "path": "index.html",
    "name": "focus accessibility",
    "needle": "a:focus-visible"
  },
  {
    "group": "homepage",
    "path": "index.html",
    "name": "fare form",
    "needle": "action=\"/fare/\""
  },
  {
    "group": "homepage",
    "path": "index.html",
    "name": "departure input",
    "needle": "name=\"from\""
  },
  {
    "group": "homepage",
    "path": "index.html",
    "name": "arrival input",
    "needle": "name=\"to\""
  },
  {
    "group": "homepage",
    "path": "index.html",
    "name": "service selector",
    "needle": "name=\"service\""
  },
  {
    "group": "homepage",
    "path": "index.html",
    "name": "telephone CTA",
    "needle": "href=\"tel:18114294\""
  },
  {
    "group": "homepage",
    "path": "index.html",
    "name": "transport trust link",
    "needle": "id=\"taksong-first-trust-home-20261106\""
  },
  {
    "group": "homepage",
    "path": "index.html",
    "name": "customer evidence section",
    "needle": "id=\"service-choice-advantages-20261105\""
  },
  {
    "group": "homepage",
    "path": "index.html",
    "name": "keyword service navigation",
    "needle": "id=\"keyword-service-navigation-20261106\""
  },
  {
    "group": "homepage",
    "path": "index.html",
    "name": "mobile contact bar",
    "needle": "mobile-consult-actions"
  },
  {
    "group": "homepage",
    "path": "index.html",
    "name": "large page rendering",
    "needle": "content-visibility:auto"
  },
  {
    "group": "server",
    "path": "server.js",
    "name": "homepage fingerprint",
    "needle": "cachedHomepageSignature!==signature"
  },
  {
    "group": "server",
    "path": "server.js",
    "name": "read modified homepage",
    "needle": "fs.readFileSync(path.join(ROOT,'index.html')"
  },
  {
    "group": "server",
    "path": "server.js",
    "name": "automatic menu restore",
    "needle": "if(!html.includes(start))html=html.replace"
  },
  {
    "group": "server",
    "path": "server.js",
    "name": "repair incomplete menu",
    "needle": "if(!complete||!present.includes('position:sticky'))"
  },
  {
    "group": "server",
    "path": "server.js",
    "name": "menu release header",
    "needle": "x-smart24-primary-nav"
  },
  {
    "group": "server",
    "path": "server.js",
    "name": "homepage no-store",
    "needle": "no-store, max-age=0, must-revalidate"
  },
  {
    "group": "server",
    "path": "server.js",
    "name": "health endpoint",
    "needle": "if(pathname==='/health')"
  },
  {
    "group": "server",
    "path": "server.js",
    "name": "SEO health JSON",
    "needle": "/health/seo.json"
  },
  {
    "group": "server",
    "path": "server.js",
    "name": "published code digest",
    "needle": "DEPLOY_SHA256"
  },
  {
    "group": "server",
    "path": "server.js",
    "name": "transport trust section",
    "needle": "taksong-trust-first-20261106"
  },
  {
    "group": "seo",
    "path": "data/seo-pages.json",
    "name": "official domain",
    "needle": "https://jeongukdaeri.kr"
  },
  {
    "group": "seo",
    "path": "data/seo-pages.json",
    "name": "official phone",
    "needle": "1811-4294"
  },
  {
    "group": "seo",
    "path": "data/seo-pages.json",
    "name": "homepage record",
    "needle": "\"path\": \"/\""
  },
  {
    "group": "seo",
    "path": "data/seo-pages.json",
    "name": "national driver record",
    "needle": "\"path\": \"/daeri/\""
  },
  {
    "group": "seo",
    "path": "data/seo-pages.json",
    "name": "national transport record",
    "needle": "\"path\": \"/taksong/\""
  },
  {
    "group": "seo",
    "path": "data/seo-pages.json",
    "name": "regional directory record",
    "needle": "\"path\": \"/region/\""
  },
  {
    "group": "seo",
    "path": "data/seo-pages.json",
    "name": "source-backed travel content",
    "needle": "\"path\": \"/travel/food-map/\""
  },
  {
    "group": "seo",
    "path": "data/seo-pages.json",
    "name": "taksong title",
    "needle": "전국자동차탁송 실제 운행후기 | 24시탁송"
  },
  {
    "group": "seo",
    "path": "data/seo-pages.json",
    "name": "driver title",
    "needle": "전국대리운전 실제 운행후기 | 장거리"
  },
  {
    "group": "seo",
    "path": "data/seo-pages.json",
    "name": "primary SEO metadata links to verified ride history",
    "needle": "실제 운행후기"
  },
  {
    "group": "corporate",
    "path": "service/corporate/index.html",
    "name": "canonical corporate URL",
    "needle": "https://jeongukdaeri.kr/service/corporate/"
  },
  {
    "group": "corporate",
    "path": "service/corporate/index.html",
    "name": "search title",
    "needle": "<title>법인대리운전"
  },
  {
    "group": "corporate",
    "path": "service/corporate/index.html",
    "name": "search description",
    "needle": "<meta name=\"description\""
  },
  {
    "group": "corporate",
    "path": "service/corporate/index.html",
    "name": "first customer action",
    "needle": "id=\"corporate-first-action-20261105\""
  },
  {
    "group": "corporate",
    "path": "service/corporate/index.html",
    "name": "postpaid terms",
    "needle": "id=\"corporate-postpaid-guide-20261105\""
  },
  {
    "group": "corporate",
    "path": "service/corporate/index.html",
    "name": "not automatically approved",
    "needle": "후불 정산은 자동 승인되는 상품이 아닙니다"
  },
  {
    "group": "corporate",
    "path": "service/corporate/index.html",
    "name": "contact inquiries",
    "needle": "id=\"corporate-inquiry-shortcuts-20261105\""
  },
  {
    "group": "corporate",
    "path": "service/corporate/index.html",
    "name": "contact phone",
    "needle": "tel:18114294"
  },
  {
    "group": "corporate",
    "path": "service/corporate/index.html",
    "name": "customer fares",
    "needle": "href=\"/fare/"
  },
  {
    "group": "corporate",
    "path": "service/corporate/index.html",
    "name": "verified ride history",
    "needle": "href=\"/reviews/"
  },
  {
    "group": "golf",
    "path": "service/golf/index.html",
    "name": "canonical golf URL",
    "needle": "https://jeongukdaeri.kr/service/golf/"
  },
  {
    "group": "golf",
    "path": "service/golf/index.html",
    "name": "golf search title",
    "needle": "<title>골프대리운전"
  },
  {
    "group": "golf",
    "path": "service/golf/index.html",
    "name": "search description",
    "needle": "<meta name=\"description\""
  },
  {
    "group": "golf",
    "path": "service/golf/index.html",
    "name": "ride time terms",
    "needle": "대기시간"
  },
  {
    "group": "golf",
    "path": "service/golf/index.html",
    "name": "food expense terms",
    "needle": "식대"
  },
  {
    "group": "golf",
    "path": "service/golf/index.html",
    "name": "round trip terms",
    "needle": "왕복"
  },
  {
    "group": "golf",
    "path": "service/golf/index.html",
    "name": "direct customer phone",
    "needle": "tel:18114294"
  },
  {
    "group": "golf",
    "path": "service/golf/index.html",
    "name": "daily driver connection",
    "needle": "/service/daily-driver/"
  },
  {
    "group": "golf",
    "path": "service/golf/index.html",
    "name": "responsive layout",
    "needle": "@media(max-width:600px)"
  },
  {
    "group": "golf",
    "path": "service/golf/index.html",
    "name": "first-level service heading",
    "needle": "<h1"
  },
  {
    "group": "regions",
    "path": "region/index.html",
    "name": "regional canonical",
    "needle": "https://jeongukdaeri.kr/region/"
  },
  {
    "group": "regions",
    "path": "region/index.html",
    "name": "region title",
    "needle": "전국 지역별 자동차탁송"
  },
  {
    "group": "regions",
    "path": "region/index.html",
    "name": "official SEO description",
    "needle": "<meta name=\"description\""
  },
  {
    "group": "regions",
    "path": "region/index.html",
    "name": "Busan regional service",
    "needle": "/region/busan-daeri-taksong/"
  },
  {
    "group": "regions",
    "path": "region/index.html",
    "name": "Daegu regional service",
    "needle": "/region/daegu-daeri-taksong/"
  },
  {
    "group": "regions",
    "path": "region/index.html",
    "name": "Incheon regional service",
    "needle": "/region/incheon-daeri-taksong/"
  },
  {
    "group": "regions",
    "path": "region/index.html",
    "name": "Gangwon regional service",
    "needle": "/region/gangwon-daeri-taksong/"
  },
  {
    "group": "regions",
    "path": "region/index.html",
    "name": "verifiable blog source",
    "needle": "blog.naver.com/wjdtnr4757"
  },
  {
    "group": "regions",
    "path": "region/index.html",
    "name": "actual ride history",
    "needle": "/reviews/history/"
  },
  {
    "group": "regions",
    "path": "region/index.html",
    "name": "regional customer search",
    "needle": "id=\"q\""
  }
];
const unique=new Set(rules.map(r=>r.group+'|'+r.name));
if(rules.length!==100||unique.size!==100)throw new Error('100 distinct checks required');
const cache=new Map();
let failures=0;
for(let i=0;i<rules.length;i++){
 const r=rules[i];
 let source=cache.get(r.path);
 if(source===undefined){source=fs.readFileSync(path.join(root,r.path),'utf8');cache.set(r.path,source)}
 const negate=r.needle.startsWith('!');
 const needle=negate?r.needle.slice(1):r.needle;
 const pass=negate?!source.includes(needle):source.includes(needle);
 const label=String(i+1).padStart(3,'0');
 process.stdout.write((pass?'PASS ':'FAIL ')+label+' '+r.group+' / '+r.name+'\n');
 if(!pass)failures++;
}
console.log('Source-release checks: '+(100-failures)+'/100. These are NOT live production checks.');
if(failures)process.exitCode=1;
