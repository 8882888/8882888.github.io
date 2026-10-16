#!/usr/bin/env python3
"""Validate generated static pages and sitemap targets before GitHub Pages deployment."""
from pathlib import Path
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(".")
SITE_PREFIX = "/smart-bunny-homepage"
REQUIRED = [
    ROOT / "index.html",
    ROOT / "robots.txt",
    ROOT / "sitemap.xml",
    ROOT / "special" / "index.html",
]

def main():
    missing = [str(path) for path in REQUIRED if not path.is_file()]
    if missing:
        raise SystemExit("필수 파일 누락: " + ", ".join(missing))

    html_files = list(ROOT.rglob("*.html"))
    if len(html_files) > 100000:
        raise SystemExit(f"GitHub Pages 정적 파일 수 제한을 넘을 수 있습니다: HTML {len(html_files)}개")

    tree = ET.parse(ROOT / "sitemap.xml")
    namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = [node.text for node in tree.findall(".//sm:loc", namespace) if node.text]
    if not urls:
        raise SystemExit("sitemap.xml에 URL이 없습니다.")

    broken = []
    for url in urls:
        parsed = urlsplit(url)
        path = unquote(parsed.path)
        if path == SITE_PREFIX or path == SITE_PREFIX + "/":
            local = ROOT / "index.html"
        elif path.startswith(SITE_PREFIX + "/"):
            relative = path[len(SITE_PREFIX) + 1:]
            local = ROOT / relative
            if path.endswith("/"):
                local = local / "index.html"
        else:
            broken.append((url, "사이트 기본 경로와 다름"))
            continue
        if not local.is_file():
            broken.append((url, str(local)))

    if broken:
        preview = "\n".join(f"- {url} -> {target}" for url, target in broken[:20])
        raise SystemExit(f"사이트맵 링크 오류 {len(broken)}건:\n{preview}")

    print(f"검증 완료: HTML {len(html_files)}개, 사이트맵 URL {len(urls)}개, 누락 링크 0개")

if __name__ == "__main__":
    main()
