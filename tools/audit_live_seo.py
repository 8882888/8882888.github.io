#!/usr/bin/env python3
"""Check production HTML freshness against this repository's SEO rules.

This verifies deployment and crawlable HTML, NOT Google/Naver indexing or ranking.
Uses only Python's standard library. Prints GitHub Actions job summary when available.
"""
import html
import hashlib
import json
import os
import re
from pathlib import Path
import sys
import urllib.error
import urllib.request
from urllib.parse import quote, unquote, urlencode
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

BASE = "https://jeongukdaeri.kr"
EXPECTED_NAVER_SOURCE_COUNT = len(json.loads(Path("blog/posts.json").read_text(encoding="utf-8")))
PATHS = {
    "/": "special-business-top-links-20261103",
    "/coverage/": "nationwide-seventeen-province-coverage-20261105",
    "/taksong/": "specialized-business-taksong-hub",
    "/daeri/": "real-original-daeri-links-20261102",
    "/region/": "verified-naver-region-links-20261102",
    "/blog/archive/": str(EXPECTED_NAVER_SOURCE_COUNT),
    "/health/seo-report/": "서버 파일 지문:",
    "/taksong/busan/": "local-naver-originals",
    "/taksong/daegu/": "local-naver-originals",
    "/taksong/incheon/": "local-naver-originals",
    "/taksong/gwangju/": "local-naver-originals",
    "/taksong/daejeon/": "local-naver-originals",
    "/taksong/ulsan/": "local-naver-originals",
    "/taksong/gyeongnam/changwon-si/": "local-naver-originals",
    "/taksong/gyeongnam/gimhae-si/": "local-naver-originals",
    "/daeri/busan/": "local-naver-originals",
    "/daeri/daegu/": "local-naver-originals",
    "/daeri/gwangju/": "광주대리운전",
    "/business/rental-car/": "rental-b2b-operating-guide-20261103",
    "/business/used-car/": "dealer-b2b-operating-guide-20261103",
    "/business/export-port/": "export-b2b-operating-guide-20261103",
    "/business/auction/": "auction-b2b-operating-guide-20261103",
}
BLOG_HASHTAG_ARTICLES = {
    "/blog/daeri-regions/" + item["slug"] + "/": item["tags"]
    for item in json.loads(Path("data/blog-hashtags-priority.json").read_text(encoding="utf-8"))["articles"]
}
for route in BLOG_HASHTAG_ARTICLES:
    PATHS[route] = "blog-local-hashtags-30"

FARE_VISUAL_ROUTES = {
    "/설악산탁송/": ("mountain-route-fare-table-202611", "original-mountain-fare-visual"),
    "/지리산탁송/": ("mountain-route-fare-table-202611", "original-mountain-fare-visual"),
    "/special/cycling-trail-transport/": ("cycling-route-fare-table-202611", "keyword-image-first-202611"),
    "/route-taksong/": ("cycling-visible-fare-table-20261103", None),
}
for route, (fare_id, visual_id) in FARE_VISUAL_ROUTES.items():
    PATHS[route] = fare_id

CYCLING_COURSE_IDS = ("yeongsan", "seomjin", "eastcoast", "geumgang", "ocheon", "nakdonggang")
for course_id in CYCLING_COURSE_IDS:
    PATHS["/route-taksong/courses/" + course_id + "/"] = "cycling-course-primary-visual"

JOURNEY_PLANS = {x["path"]: x for x in json.loads(Path("data/region-journey-links.json").read_text(encoding="utf-8"))["pages"]}
JOURNEY_KEYWORDS = {
    "/taksong/busan/": "부산탁송",
    "/taksong/busan/gijang-gun/": "기장군탁송",
    "/taksong/daegu/": "대구탁송",
    "/taksong/ulsan/": "울산탁송",
    "/taksong/incheon/": "인천탁송",
    "/taksong/gwangju/": "광주탁송",
    "/taksong/daejeon/": "대전탁송",
    "/taksong/gyeongnam/changwon-si/": "창원탁송",
    "/taksong/gyeongnam/gimhae-si/": "김해탁송",
    "/taksong/jeju/": "제주도탁송",
}
assert len(JOURNEY_PLANS) == len(JOURNEY_KEYWORDS) == 10, "Ten canonical regional landing pages must match"
for route in JOURNEY_PLANS:
    PATHS.setdefault(route, "verified-region-journey-links")

CURATED_SOURCE_ROUTES = {
    "/taksong/busan/", "/taksong/daegu/", "/taksong/incheon/",
    "/taksong/gwangju/", "/taksong/daejeon/", "/taksong/ulsan/",
    "/taksong/gyeongnam/changwon-si/", "/taksong/gyeongnam/gimhae-si/",
    "/daeri/busan/", "/daeri/daegu/",
}
PROMOTED_REGION_SOURCE_PAGES={
    item["path"]: item["ids"] for item in json.loads(Path("data/priority-blog-links.json").read_text(encoding="utf-8"))["pages"]
    if item.get("kind")=="taksong" and item.get("path")
}
for route in PROMOTED_REGION_SOURCE_PAGES:
    PATHS[route]="local-naver-originals"
    CURATED_SOURCE_ROUTES.add(route)


HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; Smart24SeoAudit/1.0)",
           "Cache-Control": "no-cache", "Pragma": "no-cache"}


class SEOParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.is_title = False
        self.title = ""
        self.canonical = ""
        self.canonical_count = 0
        self.robots = ""
        self.description = ""
        self.h1 = 0

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "title":
            self.is_title = True
        elif tag == "link" and d.get("rel", "").lower() == "canonical":
            self.canonical = d.get("href", "")
            self.canonical_count += 1
        elif tag == "meta" and d.get("name", "").lower() == "robots":
            self.robots = d.get("content", "")
        elif tag == "meta" and d.get("name", "").lower() == "description":
            self.description = d.get("content", "")
        elif tag == "h1":
            self.h1 += 1

    def handle_endtag(self, tag):
        if tag == "title":
            self.is_title = False

    def handle_data(self, data):
        if self.is_title:
            self.title += data


def fetch(path):
    req = urllib.request.Request(BASE + quote(path, safe='/%?=&'), headers=HEADERS)
    with urllib.request.urlopen(req, timeout=22) as response:
        return response.status, response.url, response.read(4_000_000).decode("utf-8", "replace"), response.headers


def run():
    with open("data/seo-pages.json", encoding="utf-8") as stream:
        rules = {p["path"]: p for p in json.load(stream)["pages"]}
    rows = []
    failures = 0
    # Discover every published 50/100-region batch, including new additions,
    # rather than freezing the SEO deploy comparison at the old 1,500 pages.
    focus_files = [str(path) for path in sorted(Path('data').glob('naver-regional-focus*.json')) if 'candidates' not in path.name]
    focus_entries = [entry for filename in focus_files for entry in json.loads(Path(filename).read_text(encoding='utf-8'))['priority']]
    focus_keys = {(entry['kind'], entry['region']) for entry in focus_entries}
    for path, marker in PATHS.items():
        errors = []
        status = "-"
        try:
            status, final_url, body, headers = fetch(path)
            parser = SEOParser()
            parser.feed(body)
            expected_title = rules.get(path, {}).get("title")
            if status != 200 or unquote(final_url).rstrip("/") != (BASE + path).rstrip("/"):
                errors.append("unexpected HTTP status or redirect")
            if expected_title and parser.title.strip() != expected_title:
                errors.append("old/mismatched SEO title: " + parser.title.strip()[:85])
            if marker not in body:
                errors.append("expected deployed content marker absent")
            if path in BLOG_HASHTAG_ARTICLES:
                tag_match = re.search(r'<p class="tags"[^>]*>([^<]+)</p>', body)
                tags = tag_match.group(1).strip().split() if tag_match else []
                if tags != BLOG_HASHTAG_ARTICLES[path]:
                    errors.append("expected exactly 30 original regional blog keywords")
            for source_id in PROMOTED_REGION_SOURCE_PAGES.get(path, []):
                if "https://blog.naver.com/wjdtnr4757/"+source_id not in body:
                    errors.append("original Naver blog link not deployed: "+source_id)
            if path in JOURNEY_PLANS:
                keyword = JOURNEY_KEYWORDS[path]
                accepted_keywords = (keyword, "기장탁송") if path == "/taksong/busan/gijang-gun/" else (keyword,)
                if not any(label in parser.title for label in accepted_keywords):
                    errors.append("regional title lacks main locality keyword: " + " / ".join(accepted_keywords))
                if not 45 <= len(parser.description.strip()) <= 175:
                    errors.append("regional description length outside 45-175 characters: " + str(len(parser.description.strip())))
                if not parser.description.strip():
                    errors.append("regional description missing")
                if not re.search(r'<a\b[^>]*href="tel:' + ('18775245' if path == "/taksong/jeju/" else '18114294') + '"', body):
                    errors.append("regional customer phone action missing")
                if "noindex" in parser.robots.lower() or "noindex" in headers.get("X-Robots-Tag", "").lower():
                    errors.append("important regional page accidentally excluded from index")
                if 'id="verified-region-journey-links"' not in body:
                    errors.append("curated inter-region customer navigation missing")
                for link in JOURNEY_PLANS[path]["related"]:
                    if 'href="' + link["path"] + '"' not in body:
                        errors.append("missing canonical related-region link: " + link["path"])
                for faq in JOURNEY_PLANS[path]["faq"]:
                    if html.escape(faq["question"], quote=False) not in body:
                        errors.append("missing specific customer question")
                    if html.escape(faq["answer"], quote=False) not in body:
                        errors.append("missing specific customer answer")
                if 'id="regional-original-source-links-20261103"' not in body:
                    errors.append("missing source-backed regional customer evidence section")
                for item in JOURNEY_PLANS[path]["handover"]:
                    if html.escape(item, quote=False) not in body:
                        errors.append("missing distinct vehicle handover guidance")
                for original in JOURNEY_PLANS[path]["originals"]:
                    expected_link = 'href="https://blog.naver.com/wjdtnr4757/' + original["id"] + '"'
                    if expected_link not in body:
                        errors.append("missing published Naver original link " + original["id"])
                    if html.escape(original["note"], quote=False) not in body:
                        errors.append("missing source context for Naver original " + original["id"])
            if path == "/taksong/gwangju/" and "광산구·풍암매매단지·송도수출단지 장거리탁송" in body:
                errors.append("Incheon Songdo incorrectly grouped into Gwangju facilities")
            if path == "/daeri/gwangju/" and re.search(r"<h3>광주시\s*(?:쌍동리|초월읍|곤지암읍)", body):
                errors.append("Gyeonggi Gwangju-si ride wrongly displayed as Gwangju Metropolitan City evidence")
            if path in FARE_VISUAL_ROUTES:
                fare_id, visual_id = FARE_VISUAL_ROUTES[path]
                fare_pos = body.find('<section id="' + fare_id + '"')
                visual_pos = body.find('<figure id="' + visual_id + '"') if visual_id else 999999999
                if fare_pos < 0 or not re.search(r'<table\b', body):
                    errors.append("historical fare table not available on page")
                elif visual_id and path in ("/설악산탁송/", "/지리산탁송/") and (visual_pos < 0 or visual_pos > fare_pos or visual_pos > body.find("<header")):
                    errors.append("original mountain fare poster is not the first visual")
                elif visual_id and path == "/special/cycling-trail-transport/" and (visual_pos < 0 or fare_pos > visual_pos):
                    errors.append("cycling fare table is hidden by a large banner")
                if not re.search(r'<img\b[^>]*src="/assets/', body):
                    errors.append("visible photo/image missing from restored guide")
                if path == "/route-taksong/" and "생활체육공원 → 배알도" not in body:
                    errors.append("cycling hub lacks route-specific historical quote")
            if path.startswith(("/taksong/", "/daeri/")) and path.count("/") >= 3 and path not in ("/taksong/", "/daeri/"):
                kind = "taksong" if path.startswith("/taksong/") else "daeri"
                image_match = re.search(r'src="(/card/area-\d+-' + kind + r'-brand-v5\.png)"', body)
                if not image_match:
                    errors.append("region does not display current dynamic PNG v5")
                else:
                    image_path = image_match.group(1)
                    if 'property="og:image" content="' + BASE + image_path + '"' not in body:
                        errors.append("og:image does not match the region card")
                    if 'href="' + image_path + '" target="_blank"' not in body:
                        errors.append("card lacks full-resolution expand link")
                    if 'class="regional-responsive-card"' not in body:
                        errors.append("card does not use responsive sizing")
            if path.startswith("/route-taksong/courses/"):
                course_id = path.strip("/").split("/")[-1]
                picture = "/assets/cycling-routes/" + course_id + "-taksong.svg"
                if 'src="' + picture + '"' not in body or 'property="og:image" content="' + BASE + picture + '"' not in body:
                    errors.append("course-specific image and OG metadata missing")
                if 'src="/assets/smart24-business-card-inline.webp"' in body:
                    errors.append("misleading business card image on cycling course")
            if path in ("/route-taksong/", "/special/cycling-trail-transport/"):
                if "national-cycling-true-topic-image" not in body or 'src="/assets/smart24-business-card-inline.webp"' in body:
                    errors.append("cycling hub retains common business card or lacks topical image")
            if path == "/" and 'id="mountain-cycling-fare-first-20261103"' not in body:
                errors.append("first-screen mountain/cycling fare and image panel missing")
            if path == "/":
                hero_pos = body.find('<div class="hero hero-with-photo">')
                fares_pos = body.find('id="mountain-cycling-fare-first-20261103"')
                if hero_pos < 0 or fares_pos < 0 or hero_pos > fares_pos:
                    errors.append("latest conversion-first hero not before fare table (possibly stale Cloudtype release)")
                if 'class="mobile-consult-actions"' not in body or 'href="tel:18114294"' not in body:
                    errors.append("mobile phone/fare conversion bar missing")
                if 'id="home-business-service-links-20261104"' not in body:
                    errors.append("consolidated homepage B2B links missing (possibly older deployed revision)")
                for stale_id in ("service-center-home-priority-20261102",
                                 "fleet-export-dealer-home-20261102",
                                 "rental-capital-special-home-20261102",
                                 "homepage-mountain-fare-shortcuts-202611"):
                    if 'id="' + stale_id + '"' in body:
                        errors.append("repeated old homepage section still deployed: " + stale_id)
                if 'src="/assets/vehicles/santafe-1811.webp"' not in body:
                    errors.append("primary vehicle image missing from homepage")
            if path != "/health/seo-report/":
                if parser.canonical_count != 1:
                    errors.append(f"expected exactly one canonical, got {parser.canonical_count}")
                elif parser.canonical.rstrip("/") != (BASE + path).rstrip("/"):
                    errors.append("canonical mismatch: " + parser.canonical[:95])
            if path == "/health/seo-report/":
                if "noindex" not in parser.robots.lower() or "noindex" not in headers.get("X-Robots-Tag", "").lower():
                    errors.append("diagnostic page must be noindex in HTML and X-Robots-Tag")
                if "no-store" not in headers.get("Cache-Control", "").lower():
                    errors.append("diagnostic HTML must have no-store Cache-Control")
            elif "noindex" in parser.robots.lower() or "noindex" in headers.get("X-Robots-Tag", "").lower():
                errors.append("noindex found in HTML or HTTP header on priority page")
            if parser.h1 != 1:
                errors.append("expected exactly one H1, got " + str(parser.h1))
        except Exception as ex:
            errors.append(type(ex).__name__ + ": " + str(ex)[:125])
        result = "PASS" if not errors else "FAIL"
        failures += bool(errors)
        detail = "; ".join(errors) if errors else "HTML/SEO marker present"
        print(f"{result}: {path} — {detail}")
        rows.append((path, status, result, detail))

    # /health is an early, low-cost signal even when the more detailed SEO report is absent.
    # A 200 response from an older running instance is not proof of an up-to-date deployment.
    errors = []
    status = "-"
    try:
        status, final_url, body, headers = fetch("/health")
        health_basic = json.loads(body)
        actual_release = str(health_basic.get("release", ""))
        expected_source = hashlib.sha256(Path("server.js").read_bytes()).hexdigest()[:16]
        if status != 200 or health_basic.get("ok") is not True:
            errors.append("health endpoint is not ready")
        if "no-store" not in headers.get("Cache-Control", "").lower():
            errors.append("/health must have no-store Cache-Control")
        if actual_release != "sha256-" + expected_source:
            errors.append(f"stale running Node process, release={actual_release!r}, expected sha256-{expected_source}")
        if health_basic.get("regions", 0) < 20000:
            errors.append("incomplete regional data")
    except Exception as ex:
        errors.append(type(ex).__name__ + ": " + str(ex)[:125])
    result = "PASS" if not errors else "FAIL"
    failures += bool(errors)
    detail = "; ".join(errors) if errors else "running Node hash matches latest GitHub server.js and full region count"
    print(f"{result}: /health — {detail}")
    rows.append(("/health", status, result, detail))

    # Health JSON is generated by the live Node server; this is the decisive deployment freshness check.
    errors = []
    status = "-"
    try:
        status, final_url, body, headers = fetch("/health/seo.json")
        health = json.loads(body)
        source_count = health.get("blog_source_count")
        expected_priority_count = len(json.loads(Path('data/priority-regions.json').read_text(encoding='utf-8'))['pages'])
        if len(focus_entries) != 2900 or len(focus_keys) != 2900 or len({entry['keyword'] for entry in focus_entries}) != 2900:
            errors.append('2900 curated region entries are missing or duplicated in GitHub source')
        if health.get('naver_focus_region_count') != len(focus_entries):
            errors.append(f"curated regional batch not deployed: live={health.get('naver_focus_region_count')!r}, GitHub={len(focus_entries)}")
        if health.get('priority_region_count') != expected_priority_count:
            errors.append(f"priority region count not deployed: live={health.get('priority_region_count')!r}, GitHub={expected_priority_count}")
        group_count = health.get("curated_source_groups")
        link_count = health.get("curated_source_links")
        if status != 200:
            errors.append("health route did not return HTTP 200")
        if "no-store" not in headers.get("Cache-Control", "").lower():
            errors.append("/health/seo.json must have no-store Cache-Control")
        if source_count != EXPECTED_NAVER_SOURCE_COUNT:
            errors.append(f"published Naver source data mismatch: {source_count!r}")
        curated_entries = json.loads(Path("data/priority-blog-links.json").read_text(encoding="utf-8"))["pages"]
        expected_groups = len(curated_entries)
        expected_links = sum(len(entry["ids"]) for entry in curated_entries)
        if group_count != expected_groups or link_count != expected_links:
            errors.append(f"curated original sources are stale: live groups={group_count!r}, links={link_count!r}; expected {expected_groups}/{expected_links}")
        live_hashes = health.get("deployment_hashes") or {}
        for filepath in ["server.js", "index.html", "data/seo-pages.json", "data/priority-blog-links.json", "lib/regional-history-evidence.js", "data/priority-regions.json", "data/region-journey-links.json"]:
            expected_hash = hashlib.sha256(Path(filepath).read_bytes()).hexdigest()
            live_hash = live_hashes.get(filepath)
            if not live_hash:
                errors.append(f"deployment SHA256 missing: {filepath}")
            elif expected_hash != live_hash:
                errors.append(f"Cloudtype source behind or divergent: {filepath} (GitHub {expected_hash[:12]}, live {live_hash[:12]})")
        live_rules = health.get("seo_meta", {})
        for name, path in [("home", "/"), ("taksong", "/taksong/"), ("daeri", "/daeri/"), ("region", "/region/")]:
            expected = rules.get(path, {}).get("title")
            actual = (live_rules.get(name) or {}).get("title")
            if expected and actual != expected:
                errors.append(f"{name} SEO metadata not deployed")
    except Exception as ex:
        errors.append(type(ex).__name__ + ": " + str(ex)[:125])
    result = "PASS" if not errors else "FAIL"
    failures += bool(errors)
    detail = "; ".join(errors) if errors else f"{EXPECTED_NAVER_SOURCE_COUNT} posts and all curated original-source regions, SEO titles and source SHA256 fingerprints match"
    print(f"{result}: /health/seo.json — {detail}")
    rows.append(("/health/seo.json", status, result, detail))

    # XML endpoints can fail in text-extraction tools; test actual HTTP and XML here.
    for path, required in [
        ("/robots.txt", "Sitemap: " + BASE + "/sitemap-taksong.xml"),
        ("/sitemap-priority.xml", "<urlset"),
        ("/sitemap-taksong.xml", "<urlset"),
        ("/sitemap.xml", "<urlset"),
    ]:
        errors = []
        status = "-"
        try:
            status, final_url, body, headers = fetch(path)
            if status != 200 or required not in body:
                errors.append("missing expected XML/robots content or HTTP status")
            if path.endswith(".xml") and status == 200:
                root = ET.fromstring(body)
                locs = {node.text for node in root.iter() if node.tag.endswith("loc") and node.text}
                if path == "/sitemap-taksong.xml":
                    expected = {BASE + "/taksong/"} | {BASE + route for route in JOURNEY_PLANS}
                else:
                    expected = {BASE + "/daeri/", BASE + "/taksong/"}
                    expected |= {BASE + route for route in CURATED_SOURCE_ROUTES}
                    expected |= {BASE + route for route in JOURNEY_PLANS}
                    expected |= {BASE + route for route in BLOG_HASHTAG_ARTICLES}
                if path == "/sitemap.xml":
                    expected |= {
                        BASE + "/blog/archive/", BASE + "/설악산탁송/", BASE + "/지리산탁송/",
                        BASE + "/business/rental-car/", BASE + "/business/used-car/",
                        BASE + "/business/export-port/", BASE + "/business/auction/",
                    }
                if path == '/sitemap-priority.xml' and len(locs) < len(focus_entries):
                    errors.append(f'priority sitemap has fewer URLs ({len(locs)}) than curated region targets ({len(focus_entries)})')
                missing = expected - locs
                if missing:
                    errors.append("required canonical URLs missing: " + ", ".join(sorted(missing)[:6]))
                duplicate_aliases = {BASE + "/service/daeri/", BASE + "/special/nationwide-daeri/",
                                     BASE + "/special/seoraksan-transport/", BASE + "/special/jirisan-transport/"}
                duplicates = locs & duplicate_aliases
                if duplicates:
                    errors.append("redirect/canonical alias submitted: " + ", ".join(sorted(duplicates)))
        except Exception as ex:
            errors.append(type(ex).__name__ + ": " + str(ex)[:125])
        result = "PASS" if not errors else "FAIL"
        failures += bool(errors)
        detail = "; ".join(errors) if errors else "accessible, expected content present"
        print(f"{result}: {path} — {detail}")
        rows.append((path, status, result, detail))

    # Six purpose-specific cycling graphics plus the nationwide hub image.
    for slug in list(CYCLING_COURSE_IDS) + ["nationwide"]:
        path = "/assets/cycling-routes/" + slug + "-taksong.svg"
        errors = []
        status = "-"
        try:
            req = urllib.request.Request(BASE + path, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=22) as response:
                status = response.status
                image_bytes = response.read()
                if status != 200 or "image/svg+xml" not in response.headers.get("Content-Type", "") or b"<svg " not in image_bytes:
                    errors.append("cycling image is not valid SVG response")
                if b"1811-4294" not in image_bytes:
                    errors.append("graphic lacks official contact")
        except Exception as ex:
            errors.append(type(ex).__name__ + ": " + str(ex)[:120])
        result = "PASS" if not errors else "FAIL"
        failures += bool(errors)
        print(f"{result}: {path} — " + ("; ".join(errors) if errors else "topical cycling picture delivered"))
        rows.append((path, status, result, "; ".join(errors) if errors else "topical cycling illustration and MIME delivered"))

    # Live images are checked as bytes, not just as HTML filenames.
    asset_probes = {
        "/assets/seoraksan-taksong-original-fare.png": "image/png",
        "/assets/jirisan-taksong-original-fare.png": "image/png",
        "/assets/smart24-taksong-brand.webp": "image/webp",
        "/assets/smart24-business-card-inline.webp": "image/webp",
    }
    for path, expected_type in asset_probes.items():
        errors = []
        status = "-"
        try:
            request = urllib.request.Request(BASE + path, headers=HEADERS)
            with urllib.request.urlopen(request, timeout=22) as response:
                status = response.status
                content_type = response.headers.get("Content-Type", "").split(";")[0]
                cache_control = response.headers.get("Cache-Control", "")
                etag = response.headers.get("ETag", "")
                sample = response.read(64)
                if status != 200 or content_type != expected_type or not sample:
                    errors.append("image failed: HTTP/content type/empty response")
                if "max-age=3600" not in cache_control or not etag:
                    errors.append("image cache validation headers missing")
        except Exception as ex:
            errors.append(type(ex).__name__ + ": " + str(ex)[:125])
        result = "PASS" if not errors else "FAIL"
        failures += bool(errors)
        detail = "; ".join(errors) if errors else "live image delivered with caching and ETag"
        print(f"{result}: {path} — {detail}")
        rows.append((path, status, result, detail))

    # Verify the actual production API that powers instant, in-place locality cards.
    # These are interaction checks only, not search ranking or Naver image-index claims.
    card_queries = [
        ("부산대리운전", "daeri", "matched"),
        ("울산탁송", "taksong", "matched"),
        ("광주", None, "ambiguous"),
        ("제주도탁송", "taksong", "matched"),
    ]
    for keyword, wanted_service, wanted_status in card_queries:
        path = "/api/region-card-preview?" + urlencode({"q": keyword})
        errors = []
        status = "-"
        try:
            req = urllib.request.Request(BASE + path, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=22) as response:
                status = response.status
                payload = json.loads(response.read().decode("utf-8"))
                if response.headers.get("X-Robots-Tag") != "noindex, nofollow":
                    errors.append("preview endpoint not set to noindex")
                if "application/json" not in response.headers.get("Content-Type", ""):
                    errors.append("preview endpoint must return JSON")
                if status != 200 or payload.get("status") != wanted_status:
                    errors.append("keyword locality resolution incorrect")
                cards = payload.get("cards", [])
                if wanted_service:
                    if len(cards) != 1 or cards[0].get("kind") != wanted_service:
                        errors.append("wrong driver/taksong card returned")
                    elif not cards[0].get("image", "").endswith("-" + wanted_service + "-brand-v5.png"):
                        errors.append("wrong service card image version")
                    elif keyword == "제주도탁송" and cards[0].get("phone") != "1877-5245":
                        errors.append("Jeju dedicated phone not preserved")
                    if len(cards) == 1 and keyword in ("부산대리운전", "울산탁송"):
                        preview_path = cards[0].get("previewImage", "")
                        if not re.fullmatch(r"/card/area-\d+-(?:daeri|taksong)-brand-v5\.webp", preview_path):
                            errors.append("optimized local preview URL missing")
                        else:
                            req2 = urllib.request.Request(BASE + preview_path, headers=HEADERS)
                            with urllib.request.urlopen(req2, timeout=22) as picture:
                                header = picture.read(12)
                                etag = picture.headers.get("ETag", "")
                                if (picture.status != 200 or picture.headers.get("Content-Type", "").split(";")[0] != "image/webp"
                                        or not header.startswith(b"RIFF") or header[8:12] != b"WEBP" or not etag):
                                    errors.append("optimized WebP image invalid or missing cache ETag")
                elif cards:
                    errors.append("ambiguous name unexpectedly selects a card")
        except Exception as ex:
            errors.append(type(ex).__name__ + ": " + str(ex)[:120])
        result = "PASS" if not errors else "FAIL"
        failures += bool(errors)
        detail = "; ".join(errors) if errors else "correct locality, service-only dynamic image and noindex response"
        print(f"{result}: {path} — {detail}")
        rows.append((path, status, result, detail))

    # Live checks for keyword-specific expanded imagery; this catches a stale
    # production library even when server.js itself has not changed.
    keyword_cases = [
        ("설악산탁송", "/assets/seoraksan-taksong-fares.svg"),
        ("지리산탁송", "/assets/jirisan-taksong-fares.svg"),
        ("영산강길종주탁송", "/assets/cycling-routes/yeongsan-taksong.svg"),
        ("섬진강종주탁송", "/assets/cycling-routes/seomjin-taksong.svg"),
        ("골프장대리운전", "/keyword-card/golf-daeri.svg"),
        ("법인대리운전", "/keyword-card/corporate-daeri.svg"),
        ("부산렌트카탁송", "/keyword-card/rent-taksong/area-"),
        ("대구법인대리운전", "/keyword-card/corporate-daeri/area-"),
        ("제주도렌터카탁송", "/keyword-card/rent-taksong/area-"),
    ]
    for keyword, expected_image in keyword_cases:
        path = "/api/region-card-preview?" + urlencode({"q": keyword})
        errors = []
        status = "-"
        try:
            with urllib.request.urlopen(urllib.request.Request(BASE + path, headers=HEADERS), timeout=22) as response:
                status = response.status
                payload = json.loads(response.read().decode("utf-8"))
            cards = payload.get("cards") or []
            if payload.get("status") != "matched" or len(cards) != 1:
                errors.append("exact keyword image not matched")
            else:
                image_path = cards[0].get("image", "")
                if expected_image not in image_path:
                    errors.append("service- or route-specific image mismatch")
                if keyword == "제주도렌터카탁송" and cards[0].get("phone") != "1877-5245":
                    errors.append("Jeju-specific phone missing")
                with urllib.request.urlopen(urllib.request.Request(BASE + image_path, headers=HEADERS), timeout=22) as img:
                    head = img.read(3500)
                    if img.status != 200 or not ("image/svg+xml" in img.headers.get("Content-Type", "")):
                        errors.append("keyword image HTTP/MIME invalid")
                    if image_path.startswith("/keyword-card/") and keyword in ("골프장대리운전", "법인대리운전"):
                        if keyword.encode("utf-8") not in head:
                            errors.append("visible keyword not present in dynamically generated SVG")
        except Exception as ex:
            errors.append(type(ex).__name__ + ": " + str(ex)[:120])
        result = "PASS" if not errors else "FAIL"
        failures += bool(errors)
        detail = "; ".join(errors) if errors else "service and route matched, actual matching SVG served"
        print(f"{result}: {path} — {detail}")
        rows.append((path, status, result, detail))
    for path, keyword_marker in [
        ("/special/pension-daeri/", 'data-kind="daeri"'),
        ("/special/osaek/", "seoraksan-taksong-fares.svg"),
        ("/special/seongjung-jongju/", "jirisan-taksong-fares.svg"),
        ("/special/national-cycling-tour/", "cycling-routes/nationwide-taksong.svg"),
    ]:
        errors = []
        status = "-"
        try:
            with urllib.request.urlopen(urllib.request.Request(BASE + path, headers=HEADERS), timeout=22) as response:
                status = response.status
                body = response.read().decode("utf-8")
                if 'id="keyword-intent-dynamic-image"' not in body or keyword_marker not in body:
                    errors.append("keyword-matched image missing from public landing page")
                if "smart24-taksong-brand.webp" in body and "national-cycling-tour" in path:
                    errors.append("old Gangneung-branded image remains")
        except Exception as ex:
            errors.append(type(ex).__name__ + ": " + str(ex)[:120])
        result = "PASS" if not errors else "FAIL"
        failures += bool(errors)
        detail = "; ".join(errors) if errors else "keyword image visible on public page"
        print(f"{result}: {path} — {detail}")
        rows.append((path, status, result, detail))

    # Locality + company-intent and four high-value driving services.
    # Verifies actual service-specific image delivery, not Naver rankings.
    business_queries = [
        ("골프대리운전", "daeri", "/keyword-card/golf-daeri.svg", None, "1811-4294"),
        ("일일기사", "daeri", "/keyword-card/daily-driver.svg", None, "1811-4294"),
        ("법인대리운전", "daeri", "/keyword-card/corporate-daeri.svg", None, "1811-4294"),
        ("법인카드대리운전", "daeri", "/keyword-card/corporate-card-daeri.svg", None, "1811-4294"),
        ("부산골프대리운전", "daeri", "/keyword-card/golf-daeri/area-", "부산광역시", "1811-4294"),
        ("부산탁송업체", "taksong", "-taksong-brand-v5.png", "부산광역시", "1811-4294"),
        ("제주도탁송회사", "taksong", "-taksong-brand-v5.png", "제주특별자치도", "1877-5245"),
        ("서울강남법인카드대리운전회사", "daeri", "/keyword-card/corporate-card-daeri/area-", "서울특별시 강남구", "1811-4294"),
    ]
    for keyword, expected_kind, image_fragment, expected_region, expected_phone in business_queries:
        path = "/api/region-card-preview?" + urlencode({"q": keyword})
        errors = []
        status = "-"
        try:
            with urllib.request.urlopen(urllib.request.Request(BASE + path, headers=HEADERS), timeout=22) as response:
                status = response.status
                data = json.loads(response.read().decode("utf-8"))
            cards = data.get("cards") or []
            if data.get("status") != "matched" or len(cards) != 1:
                errors.append("wrong or ambiguous professional-company keyword")
            else:
                card = cards[0]
                if card.get("kind") != expected_kind:
                    errors.append("wrong taksong/daeri service")
                if image_fragment not in card.get("image", ""):
                    errors.append("wrong company/service keyword image")
                if expected_region and data.get("region") != expected_region:
                    errors.append("wrong legal locality")
                if card.get("phone") != expected_phone:
                    errors.append("regional phone wrong")
                with urllib.request.urlopen(urllib.request.Request(BASE + card.get("image", ""), headers=HEADERS), timeout=22) as img:
                    if img.status != 200:
                        errors.append("missing dynamic company image")
        except Exception as ex:
            errors.append(type(ex).__name__ + ": " + str(ex)[:120])
        verdict = "PASS" if not errors else "FAIL"
        failures += bool(errors)
        description = "; ".join(errors) if errors else "live company/driver keyword and image match"
        print(f"{verdict}: {path} — {description}")
        rows.append((path, status, verdict, description))
    for path, heading in [
        ("/service/corporate/", "법인카드대리운전"),
        ("/service/golf/", "골프대리운전"),
        ("/service/daily-driver/", "일일기사"),
        ("/daeri/", "four-specialized-driver-services"),
    ]:
        errors = []
        status = "-"
        try:
            with urllib.request.urlopen(urllib.request.Request(BASE + path, headers=HEADERS), timeout=22) as response:
                status = response.status
                page = response.read().decode("utf-8")
                if heading not in page:
                    errors.append("targeted service landing link or text missing")
        except Exception as ex:
            errors.append(type(ex).__name__ + ": " + str(ex)[:120])
        verdict = "PASS" if not errors else "FAIL"
        failures += bool(errors)
        description = "; ".join(errors) if errors else "live dedicated driver SEO content visible"
        print(f"{verdict}: {path} — {description}")
        rows.append((path, status, verdict, description))

    lines = [
        "## Production SEO deployment audit",
        "",
        "Compares GitHub SEO settings to public HTTP responses; does **not** prove Naver indexing.",
        "",
        "| URL | HTTP | Result | Findings |",
        "|---|---:|---|---|",
    ]
    for path, status, result, detail in rows:
        safe = detail.replace("|", "/").replace("\n", " ")
        lines.append(f"| `{path}` | {status} | **{result}** | {safe} |")
    lines += ["", f"**Failures: {failures} / {len(rows)}**"]
    summary = "\n".join(lines) + "\n"
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as stream:
            stream.write(summary)
    print("Failures: ", failures)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(run())
