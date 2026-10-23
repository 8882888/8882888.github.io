#!/usr/bin/env python3
"""Report duplicate or low-information HTML pages without inventing SEO claims."""
import collections
import hashlib
import html
import json
import re
from pathlib import Path

root = Path(".")
pages = list((root / "region").rglob("index.html"))
titles = collections.defaultdict(list)
descriptions = collections.defaultdict(list)
short_pages = []
missing_canonical = []
for path in pages:
    source = path.read_text(encoding="utf-8")
    title = re.search(r"<title>(.*?)</title>", source, re.I | re.S)
    description = re.search(r'<meta name="description" content="([^"]*)"', source, re.I)
    canonical = re.search(r'<link rel="canonical" href="([^"]*)"', source, re.I)
    if title:
        titles[html.unescape(title.group(1)).strip()].append(str(path))
    if description:
        descriptions[html.unescape(description.group(1)).strip()].append(str(path))
    if not canonical:
        missing_canonical.append(str(path))
    stripped = re.sub(r"<(script|style)\\b[^>]*>.*?</\\1>", " ", source, flags=re.I | re.S)
    stripped = re.sub(r"<[^>]+>", " ", stripped)
    stripped = re.sub(r"\\s+", " ", html.unescape(stripped)).strip()
    if len(stripped) < 450:
        short_pages.append(str(path))
report = {
    "region_html_checked": len(pages),
    "duplicate_titles": sum(len(v) for v in titles.values() if len(v) > 1),
    "duplicate_descriptions": sum(len(v) for v in descriptions.values() if len(v) > 1),
    "short_content_under_450_characters": len(short_pages),
    "missing_canonical": len(missing_canonical),
    "examples": {
        "duplicate_titles": [v[:3] for v in titles.values() if len(v) > 1][:5],
        "short_pages": short_pages[:10],
        "missing_canonical": missing_canonical[:10],
    },
    "note": "SEO audit is not a Naver indexing or ranking confirmation.",
}
Path("seo-quality-audit.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, ensure_ascii=False))
if missing_canonical:
    raise SystemExit("Missing canonical tags in generated region pages")
