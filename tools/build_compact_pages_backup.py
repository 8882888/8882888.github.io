#!/usr/bin/env python3
"""Stage a bounded, noindex GitHub Pages fallback; never upload the repository.

Cloudtype remains the primary public site. A Pages artifact MUST NOT contain
ride-history, customer details, repositories, private JSON, or 100k thin local
pages. This program stages only the national service hubs, the official 17
province pages and their referenced static assets.
"""
from __future__ import annotations
import json
import re
import shutil
from pathlib import Path

NOINDEX = '<meta name="robots" content="noindex,follow">'
SAFE_ASSET_EXTS = {'.css', '.js', '.svg', '.png', '.jpg', '.jpeg',
                   '.webp', '.avif', '.gif', '.ico', '.woff2'}
MAX_FILES = 350
MAX_BYTES = 40 * 1024 * 1024
ASSET_REF = re.compile(r'''(?:src|href)=["'](/assets/[A-Za-z0-9_./%-]+)["']''')
SKIP_PATH_PARTS = {'..', '.', '.git', '.github', 'data', 'node_modules'}
ROOT_PAGES = ('index.html', 'region/index.html',
              'region/gangneung-taksong/index.html',
              'region/innovation-cities/index.html',
              'daeri/index.html', 'taksong/index.html',
              'fare/index.html', 'coverage/index.html')

def stage(source_root: Path, dest: Path) -> dict:
    source_root = source_root.resolve()
    dest = dest.resolve()
    if dest == source_root or source_root in dest.parents and dest.name != '_pages_mirror':
        raise ValueError('Mirror must use dedicated _pages_mirror output')
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    data = json.loads((source_root / 'data/regions.json').read_text(encoding='utf-8'))
    provinces = [r for r in data['regions'] if r.get('level') == '시도']
    if len(provinces) != 17 or len({p['name'] for p in provinces}) != 17:
        raise ValueError('Pages mirror must include exactly 17 source province groups')
    html_paths = set(ROOT_PAGES)
    html_paths.update('region/' + p['slug'].strip('/') + '/index.html'
                      for p in provinces)
    # Existing stable service entry pages, never individual 20k village routes.
    for section in ('service', 'business', 'reviews'):
        root = source_root / section
        if root.exists():
            html_paths.update(p.relative_to(source_root).as_posix()
                              for p in root.glob('*/index.html') if p.is_file())
    copied = []
    missing = []
    total_bytes = 0
    assets = set()
    for relative in sorted(html_paths):
        src = source_root / relative
        if not src.is_file():
            if relative.startswith('region/') and relative.endswith('/index.html') and (
                    relative in {'region/' + p['slug'].strip('/') + '/index.html' for p in provinces}):
                raise ValueError('Missing an official province fallback: ' + relative)
            missing.append(relative)
            continue
        html = src.read_text(encoding='utf-8')
        if html.count(NOINDEX) != 1:
            raise ValueError('Missing exactly one noindex mirror tag: ' + relative)
        if 'https://jeongukdaeri.kr/' not in html:
            raise ValueError('Pages fallback must point to official canonical: ' + relative)
        dst = dest / relative
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_text(html, encoding='utf-8')
        copied.append(relative)
        total_bytes += dst.stat().st_size
        assets.update(ASSET_REF.findall(html))
    for reference in sorted(assets):
        rel = Path(reference.lstrip('/'))
        if any(x in SKIP_PATH_PARTS for x in rel.parts) or rel.suffix.lower() not in SAFE_ASSET_EXTS:
            continue
        src = source_root / rel
        if not src.is_file() or src.is_symlink():
            continue
        dst = dest / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dst)
        copied.append(rel.as_posix())
        total_bytes += dst.stat().st_size
    if 'index.html' not in copied or len({p for p in copied if p.startswith('region/') and p.endswith('/index.html')}) < 17:
        raise ValueError('Nationwide root and 17 province pages must be present')
    if len(copied) > MAX_FILES or total_bytes > MAX_BYTES:
        raise ValueError('Unbounded backup artifact: %d files, %d bytes' % (len(copied), total_bytes))
    (dest / 'robots.txt').write_text('User-agent: *\nDisallow: /\n', encoding='utf-8')
    (dest / '.nojekyll').write_text('', encoding='utf-8')
    manifest = {
        'scope': 'nonindexed bounded GitHub Pages fallback, not official Cloudtype',
        'provinceCount': 17, 'htmlPages': sum(x.endswith('.html') for x in copied),
        'assetCount': len(copied) - sum(x.endswith('.html') for x in copied),
        'bytes': total_bytes, 'missingOptionalPages': missing,
        'canonicalHost': 'https://jeongukdaeri.kr',
        'excludes': ['data', 'ride-history', 'source code', 'full 20562 locality mirror']
    }
    (dest / 'mirror-manifest.json').write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(manifest, ensure_ascii=False))
    return manifest

if __name__ == '__main__':
    stage(Path('.'), Path('_pages_mirror'))
