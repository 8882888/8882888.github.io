#!/usr/bin/env python3
"""Read-only production SEO smoke test. No index submissions or rank claims."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import re
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

ROOT = "https://jeongukdaeri.kr"
PAGES = {
    "/taksong/": "전국 자동차탁송",
    "/daeri/": "전국대리운전",
    "/taksong/busan/": "부산탁송",
    "/taksong/daegu/": "대구탁송",
    "/taksong/ulsan/": "울산탁송",
    "/taksong/sejong/": "세종탁송",
    "/recruit/taksong/": "탁송기사모집",
    "/recruit/daeri/": "대리기사모집",
    "/coverage/": "전국 17개 시·도",
    "/reviews/history/excel-0013/": "자동차탁송",
    "/reviews/history/excel-0031/": "자동차탁송",
    "/reviews/history/excel-0071/": "대리운전",
}
SITEMAPS = ["/sitemap-priority.xml", "/sitemap-verified-regions.xml", "/sitemap-all.xml"]
UA = "Smart24-ReadOnly-SEO-Healthcheck/1.0"

class Head(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ""
        self.canonical = []
        self.robots = []
        self.in_title = False
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "title":
            self.in_title = True
        if tag == "link" and attrs.get("rel", "").lower() == "canonical":
            self.canonical.append(attrs.get("href", ""))
        if tag == "meta" and attrs.get("name", "").lower() == "robots":
            self.robots.append(attrs.get("content", ""))
    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
    def handle_data(self, data):
        if self.in_title:
            self.title += data

def fetch(path):
    req = urllib.request.Request(ROOT + path, headers={"User-Agent": UA, "Accept": "text/html,application/xml,*/*"})
    # The verified sitemap performs original-ride locality evidence checks.
    # On a 512 MB Cloudtype instance, never send multiple sitemap cold-cache
    # requests concurrently; allow exactly one bounded retry for timeouts.
    retryable = path in {"/sitemap-verified-regions.xml", "/sitemap-all.xml"}
    attempts = 2 if retryable else 1
    timeout = 20 if retryable else 14
    for attempt in range(attempts):
        started = time.monotonic()
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                result = (path, resp.status, resp.url, dict(resp.headers.items()),
                          resp.read(2_000_000).decode("utf-8", "replace"), None)
            if attempt:
                print(f"[WARN] {path} recovered after {attempt} timeout(s); inspect latency and crawler logs")
            print(f"[HTTP] {path}: {round(time.monotonic() - started, 2)}s, status={result[1]}")
            return result
        except (TimeoutError, urllib.error.URLError) as exc:
            if attempt + 1 >= attempts:
                return path, None, None, {}, "", f"{exc} after {attempts} attempt(s)"
            print(f"[WARN] {path} attempt {attempt + 1} timed out or disconnected: {exc}")
            time.sleep(0.8)
        except Exception as exc:
            return path, None, None, {}, "", str(exc)

def verify(result):
    path, status, final_url, headers, body, err = result
    problems = []
    if err or status != 200:
        return path, ["HTTP/connection problem: " + str(err or status)]
    if final_url.rstrip("/") != (ROOT + path).rstrip("/"):
        problems.append("Unexpected redirect to " + str(final_url))
    if "noindex" in headers.get("X-Robots-Tag", headers.get("x-robots-tag", "")).lower():
        problems.append("X-Robots-Tag contains noindex")
    if path in PAGES:
        parser = Head()
        parser.feed(body[:200000])
        if PAGES[path] not in parser.title:
            problems.append("Unexpected title: " + parser.title[:100])
        if len(parser.canonical) != 1 or parser.canonical[0] != ROOT + path:
            problems.append("Missing/incorrect canonical: " + str(parser.canonical))
        if not parser.robots or any("noindex" in x.lower() for x in parser.robots):
            problems.append("Missing indexable robots meta: " + str(parser.robots))
        if path == "/coverage/":
            if 'id="verified-coverage-crawl-links"' not in body:
                problems.append("Missing evidence-backed nationwide links: latest deployment may be absent")
            if '/reviews/history/' not in body:
                problems.append("Missing original ride record links")
    elif path in SITEMAPS:
        try:
            xml = ET.fromstring(body)
            ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
            locs = [e.text for e in xml.findall(".//s:loc", ns)]
            if not locs:
                problems.append("Sitemap has no URL locations")
            if path == "/sitemap-priority.xml":
                for required in ["/taksong/", "/daeri/", "/recruit/taksong/", "/recruit/daeri/"]:
                    if ROOT + required not in locs:
                        problems.append("Missing priority URL " + required)
            if path == "/sitemap-all.xml":
                for required in ["/sitemap-priority.xml", "/sitemap-verified-regions.xml"]:
                    if ROOT + required not in locs:
                        problems.append("Missing sitemap reference " + required)
            if any(loc and not loc.startswith(ROOT + "/") for loc in locs):
                problems.append("Off-domain sitemap URL")
        except ET.ParseError as exc:
            problems.append("Invalid sitemap XML: " + str(exc))
    return path, problems

def check_deployed_source():
    path = "/health/seo.json"
    expected = hashlib.sha256((Path(__file__).resolve().parents[1] / "server.js").read_bytes()).hexdigest()
    # Cloudtype reports a successful deploy before all public requests
    # necessarily observe its new source hash. Recheck a brief, finite window.
    # Persistent stale deployments must still fail.
    for attempt in range(3):
        _, status, _, _, body, err = fetch(path)
        if err or status != 200:
            issue = "Deployment proof unavailable: " + str(err or status)
        else:
            try:
                payload = json.loads(body)
                observed = payload.get("deployment_hashes", {}).get("server.js", "")
                if observed == expected:
                    if attempt:
                        print(f"[WARN] Cloudtype release hash verified after {attempt + 1} attempts; deployment was still settling")
                    return path, []
                issue = "Deployed server.js hash differs from checked-out GitHub source (deployment stale or different revision)"
            except (ValueError, OSError, TypeError) as exc:
                return path, ["Invalid deployment proof: " + str(exc)]
        if attempt < 2:
            print(f"[WARN] Cloudtype release check {attempt + 1}/3: {issue}")
            time.sleep(3)
    return path, [issue]

def main():
    # Customer HTML probes may run concurrently, but large sitemap cold-cache
    # probes must be serial; the previous 4-worker batch timed out both
    # /sitemap-verified-regions.xml and /sitemap-all.xml under contention.
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(fetch, PAGES))
    results.extend(fetch(route) for route in SITEMAPS)
    failures = 0
    checks = list(map(verify, results)) + [check_deployed_source()]
    for path, problems in checks:
        print(("[FAIL]" if problems else "[PASS]"), path)
        for issue in problems:
            failures += 1
            print("  -", issue)
    print("Checked", len(checks), "URLs; errors", failures)
    return 1 if failures else 0

if __name__ == "__main__":
    sys.exit(main())
