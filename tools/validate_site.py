#!/usr/bin/env python3
"""Validate generated static pages and sitemap targets before GitHub Pages deployment."""
import os
import re
from pathlib import Path
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(".")
SITE_PREFIX = ""
SITE_URL = os.environ.get("SITE_URL", "https://8882888.github.io").rstrip("/")
EXPECTED_HOST = urlsplit(SITE_URL).netloc
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

    namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    root = ET.parse(ROOT / "sitemap.xml").getroot()
    root_kind = root.tag.rsplit("}", 1)[-1]
    urls = []
    if root_kind == "sitemapindex":
        sitemap_locs = [node.text for node in root.findall(".//sm:sitemap/sm:loc", namespace) if node.text]
        if not sitemap_locs:
            raise SystemExit("사이트맵 인덱스에 하위 사이트맵이 없습니다.")
        if len(sitemap_locs) > 50000:
            raise SystemExit("사이트맵 인덱스가 허용 URL 수를 초과했습니다.")
        for sitemap_url in sitemap_locs:
            parsed_sitemap = urlsplit(sitemap_url)
            if parsed_sitemap.netloc != EXPECTED_HOST:
                raise SystemExit(f"하위 사이트맵 호스트 오류: {sitemap_url}")
            sitemap_path = ROOT / unquote(parsed_sitemap.path.lstrip("/"))
            if not sitemap_path.is_file():
                raise SystemExit(f"하위 사이트맵 파일이 없습니다: {sitemap_path}")
            sitemap_root = ET.parse(sitemap_path).getroot()
            if sitemap_root.tag.rsplit("}", 1)[-1] != "urlset":
                raise SystemExit(f"하위 사이트맵 형식 오류: {sitemap_path}")
            child_urls = [node.text for node in sitemap_root.findall(".//sm:url/sm:loc", namespace) if node.text]
            if len(child_urls) > 50000:
                raise SystemExit(f"하위 사이트맵 URL이 50,000개를 초과했습니다: {sitemap_path}")
            urls.extend(child_urls)
    elif root_kind == "urlset":
        urls = [node.text for node in root.findall(".//sm:url/sm:loc", namespace) if node.text]
        if len(urls) > 50000:
            raise SystemExit("단일 사이트맵이 50,000 URL 제한을 초과했습니다. 인덱스로 분리하세요.")
    else:
        raise SystemExit("sitemap.xml은 urlset 또는 sitemapindex 형식이어야 합니다.")
    if not urls:
        raise SystemExit("사이트맵에 URL이 없습니다.")

    broken = []
    for url in urls:
        if urlsplit(url).netloc != EXPECTED_HOST:
            broken.append((url, "사이트맵 호스트가 SITE_URL과 다름"))
            continue
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
            
    required_region_page = ROOT / "region/gangneung-taksong/index.html"
    required_region_card = ROOT / "assets/regions/gangneung-taksong-card.svg"
    for required_path in (required_region_page, required_region_card):
        if not required_path.is_file():
            raise SystemExit(f"지역 확장 필수 파일 누락: {required_path}")
    if f"{SITE_URL}/region/gangneung-taksong/" not in urls:
        raise SystemExit("강릉시 탁송 페이지가 생성 사이트맵에서 누락되었습니다.")
    # Verify each sitemap entry resolves to a real generated HTML or static file.
    canonical_errors = []
    canonical_pattern = re.compile(r"""<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']""", re.I)
    for html_path in html_files:
        html_text = html_path.read_text(encoding="utf-8")
        match = canonical_pattern.search(html_text)
        if match and urlsplit(match.group(1)).netloc != EXPECTED_HOST:
            canonical_errors.append((str(html_path), match.group(1)))
    if canonical_errors:
        preview = "\n".join(f"- {path}: {url}" for path, url in canonical_errors[:20])
        raise SystemExit(f"정규 URL 호스트 오류 {len(canonical_errors)}건 (기대 호스트: {EXPECTED_HOST}):\n{preview}")

    if broken:
        preview = "\n".join(f"- {url} -> {target}" for url, target in broken[:20])
        raise SystemExit(f"사이트맵 링크 오류 {len(broken)}건:\n{preview}")

    print(f"검증 완료: HTML {len(html_files)}개, 사이트맵 URL {len(urls)}개, 누락 링크 0개")

if __name__ == "__main__":
    main()
