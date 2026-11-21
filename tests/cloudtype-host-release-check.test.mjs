import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import fs from 'node:fs';

test('both Cloudtype hosts verify three exact source fingerprints and reject stale ones',{timeout:30000},async()=>{
  const root=path.resolve(import.meta.dirname,'..');
  const files=['server.js','data/priority-regions.json','data/seo-pages.json'];
  const hashes=Object.fromEntries(files.map(name=>[name,
    crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex')]));
  const server=http.createServer((req,res)=>{
    res.setHeader('content-type','application/json');
    const deployed={...hashes};
    if(req.url.startsWith('/stale/'))deployed['server.js']='outdated-source';
    res.end(JSON.stringify({deployment_hashes:deployed}));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const dir=await mkdtemp(path.join(os.tmpdir(),'cloudtype-check-'));
  const base='http://127.0.0.1:'+server.address().port;
  const execute=async(direct)=>{
    const cp=spawn(process.execPath,['tools/check_cloudtype_hosts.mjs'],{
      cwd:root,env:{...process.env,CLOUDTYPE_OFFICIAL_URL:base+'/good',
        CLOUDTYPE_DIRECT_URL:base+direct,CLOUDTYPE_CHECK_REPORT_DIR:dir}});
    return await new Promise((resolve,reject)=>{
      cp.on('error',reject);cp.on('exit',resolve);
    });
  };
  try{
    assert.equal(await execute('/good'),0,'matching official and direct server hash must pass');
    const result=JSON.parse(await readFile(path.join(dir,'cloudtype-host-release-check.json'),'utf8'));
    assert.equal(result.results.length,2);
    assert(result.results.every(row=>row.ok));
    assert.equal(await execute('/stale'),1,'stale direct origin must fail');
    const failed=JSON.parse(await readFile(path.join(dir,'cloudtype-host-release-check.json'),'utf8'));
    assert.equal(failed.results[0].ok,true);
    assert.deepEqual(failed.results[1].mismatches,['server.js']);
  }finally{
    await new Promise(resolve=>server.close(resolve));
    await rm(dir,{recursive:true,force:true});
  }
});
