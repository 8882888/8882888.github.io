'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
test('retired Pages workflow is read-only and contains no publish steps or write permissions',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../.github/workflows/pages.yml'),'utf8');
 assert.doesNotMatch(source,/actions\/(?:configure-pages|deploy-pages|upload-pages-artifact)@/);
 assert.doesNotMatch(source,/\b(?:pages|id-token|contents):\s*write\b/);
 assert.match(source,/contents: read/);
 assert.match(source,/\.has_pages/);
 assert.match(source,/https:\/\/8882888\.github\.io\//);
 assert.match(source,/exit 1/);
});
