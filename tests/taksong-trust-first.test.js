'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const server=read('server.js'),home=read('index.html'),seo=JSON.parse(read('data/seo-pages.json'));
assert(server.includes('id="taksong-trust-first-20261106"'),'trust panel omitted');
assert(server.includes('taksongTrustFirst+nationwideServiceIntentHub(kind)+operationalNotice'),
 'trust-first priority lost before nationwide service hub');
assert(server.includes("x.service==='taksong'&&x.verified===true&&x.status==='completed'"),'verified ride gate missing');
assert(server.includes('차량 인수부터 인계까지 4단계'),'handover procedure missing');
assert(server.includes('보험 적용 및 보장 범위'),'insurance disclosure missing');
assert(home.includes('id="taksong-first-trust-home-20261106"'),'homepage transport priority missing');
assert(home.includes('href="/reviews/history/?kind=taksong"'),'verified transport records must be linked');
const rule=seo.pages.find(x=>x.path==='/taksong/');
assert(/실제 (?:운행기록|운행후기)/.test(rule.title)&&rule.description.includes('인수인계'),
 'transport metadata must serve customers');
const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'3168'},stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
(async()=>{
 try{
  for(let i=0;i<120&&!output.includes('listening');i++)await new Promise(r=>setTimeout(r,100));
  assert(output.includes('listening'),output);
  const response=await fetch('http://127.0.0.1:3168/taksong/');
  assert.equal(response.status,200);
  const html=await response.text();
  assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,'unique H1');
  assert(html.includes('taksong-trust-first-20261106'));
  assert(html.includes('차량 인수부터 인계까지 4단계'));
  assert(html.includes('https://jeongukdaeri.kr/taksong/'),'canonical link');
  assert(html.includes('실제 운행기록'),'metadata');
  assert(html.includes('tel:18114294'),'contact');
  assert(html.indexOf('taksong-trust-first-20261106')<html.indexOf('taksong-24-hour-and-weather'),'trust panel must appear early');
  console.log('PASS taksong evidence-first hub and canonical customer flow');
 }finally{child.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
