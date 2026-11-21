#!/usr/bin/env python3
"""Regression for public-only 17-province Pages staging, not Cloudtype."""
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from tools.build_compact_pages_backup import stage, NOINDEX

with tempfile.TemporaryDirectory(prefix='smart24-pages-') as tmp:
    root = Path(tmp)
    provinces = [{'name': '테스트시도' + str(i), 'slug': 'province-' + str(i), 'level': '시도'}
                 for i in range(17)]
    (root / 'data').mkdir()
    (root / 'data/regions.json').write_text(
        json.dumps({'regions': provinces}, ensure_ascii=False), encoding='utf-8')
    (root / 'data/ride-history.json').write_text(
        '[{"customer":"DO-NOT-PUBLISH"}]', encoding='utf-8')
    (root / '.github/workflows').mkdir(parents=True)
    (root / '.github/workflows/secrets.yml').write_text('PRIVATE', encoding='utf-8')
    (root / 'assets').mkdir()
    (root / 'assets/traffic.css').write_text('body{color:black}', encoding='utf-8')
    page = '<!doctype html><head>' + NOINDEX + \
           '<link rel="canonical" href="https://jeongukdaeri.kr/">' + \
           '<link rel="stylesheet" href="/assets/traffic.css"></head><body>public</body>'
    (root / 'index.html').write_text(page, encoding='utf-8')
    (root / 'region').mkdir()
    (root / 'region/index.html').write_text(page, encoding='utf-8')
    for p in provinces:
        dest = root / 'region' / p['slug'] / 'index.html'
        dest.parent.mkdir(parents=True)
        dest.write_text(page, encoding='utf-8')
    result = stage(root, root / '_pages_mirror')
    mirror = root / '_pages_mirror'
    assert result['provinceCount'] == 17
    assert result['htmlPages'] == 19
    assert (mirror / 'index.html').is_file()
    assert (mirror / 'region/province-16/index.html').is_file()
    assert (mirror / 'assets/traffic.css').is_file()
    assert (mirror / 'robots.txt').read_text(encoding='utf-8') == \
           'User-agent: *\nDisallow: /\n'
    assert not (mirror / 'data').exists(), 'Private ride data must not enter Pages artifacts'
    assert not (mirror / '.github').exists(), 'Source workflows are not public backup content'
    assert not (mirror / 'tools').exists(), 'No source code is deployed in the static mirror'
    assert len(list(mirror.rglob('*.html'))) == 19
    assert all(p.read_text(encoding='utf-8').count(NOINDEX) == 1
               for p in mirror.rglob('*.html'))
print('PASS public-only 17-province noindex Pages mirror; no data or source leakage')
