#!/usr/bin/env python3
"""Stage a bounded, noindex GitHub Pages fallback; never upload the repository.

Cloudtype remains the primary public site. A Pages artifact MUST NOT contain
ride-history, customer details, repositories, private JSON, or 100k thin local
pages. This program stages only the national service hubs, the official all province landing pages generated from the actual official CSV
and their referenced static assets. A 17-province independent registry check
remains separate from changing government CSV snapshots.
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
    # The committed pilot uses level='시도'; the fresh government CSV uses
    # level='시·도' and legal-code suffixes. Both produce province prefixes
    # such as /region/seoul/ rather than the complete legal-code slug.
    groups = sorted({str(r.get('slug', '')).strip('/').split('/')[0]
                     for r in data['regions'] if str(r.get('slug', '')).strip('/')})
    if not 15 <= len(groups) <= 19:
        raise ValueError('Unexpected official static province grouping: ' + str(len(groups)))
    legal_dir = source_root / 'data/legal-regions'
    reference_provinces = sorted(legal_dir.glob('[0-9][0-9].json')) if legal_dir.is_dir() else []
    if reference_provinces and len(reference_provinces) != 17:
        raise ValueError('17-province canonical reference inventory is incomplete')
    html_paths = set(ROOT_PAGES)
    province_html = {'region/' + group + '/index.html' for group in groups}
    html_paths.update(province_html)
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
            if relative in province_html:
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
    if 'index.html' not in copied or not province_html.issubset(set(copied)):
        raise ValueError('Nationwide root and 17 province pages must be present')
    if len(copied) > MAX_FILES or total_bytes > MAX_BYTES:
        raise ValueError('Unbounded backup artifact: %d files, %d bytes' % (len(copied), total_bytes))
    (dest / 'robots.txt').write_text('User-agent: *\nDisallow: /\n', encoding='utf-8')
    (dest / '.nojekyll').write_text('', encoding='utf-8')
    manifest = {
        'scope': 'nonindexed bounded GitHub Pages fallback, not official Cloudtype',
        'provinceCount': len(groups), 'canonicalProvinceReferenceCount': len(reference_provinces),
        'provinceGroupingGap': len(reference_provinces) - len(groups) if reference_provinces else None,
        'htmlPages': sum(x.endswith('.html') for x in copied),
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
