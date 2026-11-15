import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('published cycling course pages use their own vehicle-free SVGs and OG images',()=>{
 for(const slug of ['yeongsan','seomjin','eastcoast','geumgang','ocheon','nakdonggang']){
  const page=read('route-taksong/courses/'+slug+'/index.html');
  const relative='/assets/cycling-routes/'+slug+'-taksong.svg';
  assert.ok(page.includes('src="'+relative+'"'),slug+' inline SVG');
  assert.ok(page.includes('property="og:image" content="https://jeongukdaeri.kr'+relative+'"'),slug+' OG image');
  const svg=read('assets/cycling-routes/'+slug+'-taksong.svg');
  assert.ok(svg.includes('<svg')&&!/<(?:image|script|foreignObject)\b/i.test(svg),slug+' must remain a text-only SVG');
 }
});

test('live SEO audit matches the fare-first homepage and current cycling visuals',()=>{
 const source=read('tools/audit_live_seo.py');
 const home=read('index.html');
 assert.ok(home.indexOf('id="homepage-fare-form"')<home.indexOf('<div class="hero hero-with-photo">'));
 assert.match(source,/home fare-lookup-first section missing/);
 assert.match(source,/retired vehicle image improperly restored/);
 assert.match(source,/cycling-certification-centers-visual-20261111/);
 assert.match(source,/safe national SVG card not served as SVG/);
 assert.ok(!source.includes('cycling-course-primary-visual'),'retired course image marker must not block deployment');
 assert.ok(!source.includes('primary vehicle image missing from homepage'),'forbidden vehicle photos must never be a requirement');
});
