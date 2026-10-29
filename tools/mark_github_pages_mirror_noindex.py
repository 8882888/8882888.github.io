#!/usr/bin/env python3
"""Mark only the GitHub Pages build artifact as an auxiliary, non-indexed mirror.

Cloudtype serves the official jeongukdaeri.kr site from server.js / index.html.
This script runs only after the GitHub Pages static build and before artifact upload.
Source files in the Git repository and all Cloudtype build files stay unchanged.
"""
from pathlib import Path
import re

META = re.compile(r"<meta\b[^>]*>", re.I)
HEAD = re.compile(r"<head\b[^>]*>", re.I)
NAME_ROBOTS = re.compile(r"\bname\s*=\s*(['\"]?)robots\1(?=\s|/?>)", re.I)
NOINDEX = '<meta name="robots" content="noindex,follow">'
SKIP_DIRS = {'.git', '.github', 'node_modules', '.venv', '__pycache__', '.cache'}

def convert(source: str) -> str:
    if not HEAD.search(source):
        return source
    source = META.sub(lambda m: '' if NAME_ROBOTS.search(m.group(0)) else m.group(0), source)
    return HEAD.sub(lambda m: m.group(0) + '\n' + NOINDEX, source, count=1)

def main() -> None:
    count = 0
    for root, dirs, files in __import__('os').walk('.'):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for filename in files:
            if not filename.lower().endswith('.html'):
                continue
            path = Path(root) / filename
            source = path.read_text(encoding='utf-8')
            updated = convert(source)
            if updated == source:
                continue
            if updated.count(NOINDEX) != 1:
                raise RuntimeError(f'Mirror noindex tag count wrong: {path}')
            if path == Path('index.html') or path.as_posix() == 'index.html':
                if 'https://jeongukdaeri.kr/' not in updated:
                    raise RuntimeError('Official canonical link missing from mirror homepage')
            path.write_text(updated, encoding='utf-8')
            count += 1
    if count < 2:
        raise RuntimeError(f'Expected at least homepage and region HTML pages, got {count}')
    index = Path('index.html').read_text(encoding='utf-8')
    if index.count(NOINDEX) != 1 or 'rel="canonical" href="https://jeongukdaeri.kr/"' not in index:
        raise RuntimeError('GitHub Pages mirror homepage validation failed')
    print(f'GitHub Pages only: marked {count} HTML files noindex,follow; Cloudtype site untouched')

if __name__ == '__main__':
    main()
