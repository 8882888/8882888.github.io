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
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

BASE = "https://jeongukdaeri.kr"
PATHS = {
    "/": "special-business-top-links-20261103",
    "/taksong/": "specialized-business-taksong-hub",
    "/daeri/": "real-original-daeri-links-20261102",
    "/region/": "verified-naver-region-links-20261102",
    "/blog/archive/": "630",
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
    "/daeri/gwangju/": "광주광역시대리운전",
    "/business/rental-car/": "rental-b2b-operating-guide-20261103",
    "/business/used-car/": "dealer-b2b-operating-guide-20261103",
    "/business/export-port/": "export-b2b-operating-guide-20261103",
    "/business/auction/": "auction-b2b-operating-guide-20261103",
}
CURATED_SOURCE_ROUTES = {
    "/taksong/busan/", "/taksong/daegu/", "/taksong/incheon/",
    "/taksong/gwangju/", "/taksong/daejeon/", "/taksong/ulsan/",
    "/taksong/gyeongnam/changwon-si/", "/taksong/gyeongnam/gimhae-si/",
    "/daeri/busan/", "/daeri/daegu/",
}

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
        elif tag == "h1":
            self.h1 += 1

    def handle_endtag(self, tag):
        if tag == "title":
            self.is_title = False

    def handle_data(self, data):
        if self.is_title:
            self.title += data


def fetch(path):
    req = urllib.request.Request(BASE + path, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=22) as response:
        return response.status, response.url, response.read(4_000_000).decode("utf-8", "replace"), response.headers


def run():
    with open("data/seo-pages.json", encoding="utf-8") as stream:
        rules = {p["path"]: p for p in json.load(stream)["pages"]}
    rows = []
    failures = 0
    for path, marker in PATHS.items():
        errors = []
        status = "-"
        try:
            status, final_url, body, headers = fetch(path)
            parser = SEOParser()
            parser.feed(body)
            expected_title = rules.get(path, {}).get("title")
            if status != 200 or final_url.rstrip("/") != (BASE + path).rstrip("/"):
                errors.append("unexpected HTTP status or redirect")
            if expected_title and parser.title.strip() != expected_title:
                errors.append("old/mismatched SEO title: " + parser.title.strip()[:85])
            if marker not in body:
                errors.append("expected deployed content marker absent")
            if path == "/daeri/gwangju/" and re.search(r"<h3>광주시\s*(?:쌍동리|초월읍|곤지암읍)", body):
                errors.append("Gyeonggi Gwangju-si ride wrongly displayed as Gwangju Metropolitan City evidence")
            if path != "/health/seo-report/":
                if parser.canonical_count != 1:
                    errors.append(f"expected exactly one canonical, got {parser.canonical_count}")
                elif parser.canonical.rstrip("/") != (BASE + path).rstrip("/"):
                    errors.append("canonical mismatch: " + parser.canonical[:95])
            if path == "/health/seo-report/":
                if "noindex" not in parser.robots.lower() or "noindex" not in headers.get("X-Robots-Tag", "").lower():
                    errors.append("diagnostic page must be noindex in HTML and X-Robots-Tag")
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
        if health.get('priority_region_count') != expected_priority_count:
            errors.append(f"priority region count not deployed: live={health.get('priority_region_count')!r}, GitHub={expected_priority_count}")
        group_count = health.get("curated_source_groups")
        link_count = health.get("curated_source_links")
        if status != 200:
            errors.append("health route did not return HTTP 200")
        if source_count != 630:
            errors.append(f"published Naver source data mismatch: {source_count!r}")
        if group_count != 10 or link_count != 20:
            errors.append(f"old Cloudtype deployment: curated groups={group_count!r}, links={link_count!r}")
        live_hashes = health.get("deployment_hashes") or {}
        for filepath in ["server.js", "index.html", "data/seo-pages.json", "data/priority-blog-links.json"]:
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
    detail = "; ".join(errors) if errors else "630 posts, 10 region groups, 20 links, exact SEO titles and 4 source SHA256 fingerprints deployed"
    print(f"{result}: /health/seo.json — {detail}")
    rows.append(("/health/seo.json", status, result, detail))

    # XML endpoints can fail in text-extraction tools; test actual HTTP and XML here.
    for path, required in [
        ("/robots.txt", "Sitemap: " + BASE + "/sitemap.xml"),
        ("/sitemap-priority.xml", "<urlset"),
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
                expected = {BASE + "/daeri/", BASE + "/taksong/"}
                expected |= {BASE + route for route in CURATED_SOURCE_ROUTES}
                if path == "/sitemap.xml":
                    expected |= {
                        BASE + "/blog/archive/", BASE + "/설악산탁송/", BASE + "/지리산탁송/",
                        BASE + "/business/rental-car/", BASE + "/business/used-car/",
                        BASE + "/business/export-port/", BASE + "/business/auction/",
                    }
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
