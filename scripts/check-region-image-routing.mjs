// Static regression checks for nationwide region/service image routing.
// Run: node scripts/check-region-image-routing.mjs
import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const regions = JSON.parse(read('data/regions.json')).regions;
const page = read('go/region-service/index.html');
const cards = read('assets/region-card-preview.js');
const unique = new Set();
for (const region of regions) {
  assert(region.name && region.parent_name && Array.isArray(region.services));
  const key = region.parent_name + '/' + region.name;
  assert(!unique.has(key), 'Duplicate region: ' + key);
  unique.add(key);
  for (const kind of ['daeri', 'taksong']) assert(region.services.includes(kind), key + ' missing ' + kind);
}
for (const file of ['assets/service-daeri-visual.svg', 'assets/service-taksong-visual.svg']) {
  assert(existsSync(new URL(file, root)), 'Missing verified service image ' + file);
}
const scripts = [...page.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/g)];
for (const [, script] of scripts) new vm.Script(script);
new vm.Script(cards);
assert(page.includes('/api/region-card-preview?'), 'Missing image candidate API');
assert(page.includes('cardData.status===\'matched\''), 'Missing exact match requirement');
assert(page.includes('probe.onload') && page.includes('probe.onerror'), 'Missing image load validation');
assert(cards.includes('serviceFallback'), 'Missing card image fallback');
assert(page.includes('tel:18114294'), 'Missing phone link');
console.log('PASS: ' + regions.length + ' regions, ' + unique.size + ' unique region keys, two verified service visuals, syntax and fallback checks');
