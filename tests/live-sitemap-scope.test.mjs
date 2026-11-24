import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=pathName=>fs.readFileSync(path.join(root,pathName),'utf8');

test('only city, county and district locality feeds are promoted in public root sitemap',()=>{
 const app=read('server.js');
 const at=app.indexOf("if(pathname==='/sitemap-history.xml'||pathname==='/sitemap-all.xml'){");
 assert.notEqual(at,-1);
 const section=app.slice(at,at+2400);
 assert.match(section,/\['city','county','district'\]\.map/);
 assert.doesNotMatch(section,/sitemap-localities-province/);
 assert.match(section,/Do not promote thousands/);
 assert.doesNotMatch(section,/\['province','city','county','district','eup'/);
});

test('release verification keeps private broad-count diagnostics separate from published sitemap',()=>{
 const source=read('scripts/verify-live-seo-release.cjs');
 assert.match(source,/publishedLocalityLevels=\['province','city','county','district'\]/);
 assert.match(source,/withheldLocalityLevels=\['eup','myeon','dong','ri'\]/);
 assert.match(source,/Missing promoted locality sitemap/);
 assert.match(source,/Thin or overlapping locality sitemap must not be promoted/);
 assert.match(source,/withheldLocalityCounts/);
 assert.doesNotMatch(source,/hasVillageMap!==\(expectedCounts\.ri>0\)/);
 const workflow=read('.github/workflows/verify-live-seo.yml');
 assert.match(workflow,/if: \$\{\{ github\.event_name !==? 'pull_request' \}\}/);
});

test('robots.txt remains fully permissive and unchanged by sitemap verification',()=>{
 const source=read('robots.txt');
 assert.match(source,/^User-agent: \*\r?\nAllow: \/\s*$/m);
 assert.doesNotMatch(source,/^Disallow:/mi);
});
