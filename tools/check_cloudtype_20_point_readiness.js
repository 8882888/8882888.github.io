'use strict';
// 20 source-level release gates. Passing does NOT prove Cloudtype has deployed.
// Never print tokens, YAML secret values, private URLs, or visitor data.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const deploy=read('.github/workflows/cloudtype-redeploy.yml');
const audit=read('.github/workflows/official-production-audit.yml');
const server=read('server.js');
const home=read('index.html');
const live=read('tools/check_live_taksong_deploy.py');
const services=[
 ['대리운전','/daeri/'],
 ['자동차탁송','/taksong/'],
 ['법인대리운전','/service/corporate/'],
 ['골프대리운전','/service/golf/'],
 ['장거리대리운전','/service/long-distance-daeri/']
];
const start=home.indexOf('<nav id="homepage-primary-services-20261106"');
const stop=home.indexOf('</nav>',start);
const nav=start>=0&&stop>start?home.slice(start,stop):'';
const checks=[
 ['01','Production deploy triggers on main',/push:[\s\S]*?branches:\s*\[main\]/.test(deploy)],
 ['02','Manual dispatch enabled',/workflow_dispatch:/.test(deploy)],
 ['03','Production deploy serializes concurrent releases',deploy.includes('group: smart24-cloudtype-production-redeploy')],
 ['04','Production credentials missing => explicit failure',deploy.includes('No production redeploy was requested')&&deploy.includes('exit 1')],
 ['05','Cloudtype API key is a GitHub secret',deploy.includes('CLOUDTYPE_TOKEN: ${{ secrets.CLOUDTYPE_TOKEN }}')],
 ['06','Existing application YAML stored as secret',deploy.includes('CLOUDTYPE_DEPLOY_YAML: ${{ secrets.CLOUDTYPE_DEPLOY_YAML }}')],
 ['07','Existing project identity comes from variables',deploy.includes('CLOUDTYPE_PROJECT: ${{ vars.CLOUDTYPE_PROJECT }}')],
 ['08','Existing application name comes from variables',deploy.includes('CLOUDTYPE_APP: ${{ vars.CLOUDTYPE_APP }}')],
 ['09','Deployment stage comes from variables',deploy.includes('CLOUDTYPE_STAGE: ${{ vars.CLOUDTYPE_STAGE }}')],
 ['10','YAML app name checked before deployment',deploy.includes('matches[0]!=os.environ[\'ORIGINAL_APP\']')],
 ['11','Official Cloudtype deploy action used',deploy.includes('uses: cloudtype-github-actions/deploy@v1')],
 ['12','Unverified webhook removed',!deploy.includes('api.cloudtype.io/webhooks/deploy')],
 ['13','Mass deployment to all stages prohibited',deploy.includes('allStages: false')&&!deploy.includes('allStages: true')],
 ['14','Real Node server smoke test is a deploy gate',deploy.includes('node tools/smoke_production_server.js')],
 ['15','Deployed release must match source fingerprint',deploy.includes('expected="$(sha256sum server.js')&&deploy.includes("actual=\"$(jq -r '.release")],
 ['16','Release verification uses official domain',deploy.includes('https://jeongukdaeri.kr/health')],
 ['17','Independent production audit checks live hashes',audit.includes('check_live_taksong_deploy.py')&&live.includes('deployment_hashes')],
 ['18','Fare lookup stays first and all five fixed service links remain present',start>home.indexOf('id="homepage-fare-top"')&&start>home.indexOf('</header>')&&services.every(([label,href])=>nav.includes('href="'+href+'"')&&nav.includes('>'+label+'</a>'))],
 ['19','Five-service navigation stays sticky',nav.includes('position:sticky;top:0;z-index:1100')&&home.includes('grid-template-columns:repeat(5,minmax(0,1fr))!important')],
 ['20','Homepage cache and missing menu are repaired',server.includes('cachedHomepageSignature!==signature')&&server.includes('if(!html.includes(start))html=html.replace')&&server.includes("headers['x-smart24-primary-nav']='four-services-sticky-20261106'")&&server.includes("headers['cache-control']='no-store, max-age=0, must-revalidate'")]
];
if(checks.length!==20)throw Error('Expected exactly 20 independent release checks');
for(const [number,name,valid] of checks){
 process.stdout.write((valid?'PASS':'FAIL')+' '+number+' '+name+'\n');
}
const failed=checks.filter(x=>!x[2]);
console.log('Source-level release readiness:',checks.length-failed.length+'/20 passed.');
console.log('IMPORTANT: Production deployment and real-device menu behavior are NOT confirmed by these checks.');
if(failed.length)process.exitCode=1;
