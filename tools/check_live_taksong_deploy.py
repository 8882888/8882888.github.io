#!/usr/bin/env python3
"""Audit the *official* live Cloudtype site against this Git revision.

Run locally or in GitHub Actions. This is NOT a Naver Search Advisor index report.
It deliberately fails on stale production deployment so source-only changes cannot
be mistaken for completed SEO work.
"""
import hashlib
import html
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import sys
from urllib import error, request
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE = os.getenv("LIVE_SITE_BASE", "https://jeongukdaeri.kr").rstrip("/")
TIMEOUT = 16

def get(path):
    req = request.Request(BASE + path, headers={"User-Agent": "Smart24-Production-SEO-Audit/1.0"})
    try:
        with request.urlopen(req, timeout=TIMEOUT) as r:
            data = r.read(5_000_000)
            return {"status": r.status, "url": r.geturl(), "headers": dict(r.headers), "body": data.decode("utf-8", errors="replace")}
    except Exception as ex:
        return {"status": 0, "url": BASE + path, "error": str(ex), "headers": {}, "body": ""}

class Head(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ""
        self.in_title = False
        self.canonical = None
        self.robots = []
        self.description = None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title":
            self.in_title = True
        if tag == "link" and a.get("rel", "").lower() == "canonical":
            self.canonical = a.get("href")
        if tag == "meta" and a.get("name", "").lower() == "robots":
            self.robots.append(a.get("content", ""))
        if tag == "meta" and a.get("name", "").lower() == "description":
            self.description = a.get("content")
    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
    def handle_data(self, data):
        if self.in_title:
            self.title += data

failures = []
report = {"scope": "official production deployment, NOT Naver index or actual customers", "base": BASE, "checks": {}, "failures": failures}

def test(cond, message):
    if not cond:
        failures.append(message)
    return cond

rules = {p["path"]: p for p in json.loads((ROOT / "data/seo-pages.json").read_text(encoding="utf-8"))["pages"]}
live_health = get("/health/seo.json")
report["checks"]["health"] = {"status": live_health["status"], "error": live_health.get("error")}
if test(live_health["status"] == 200, "Production /health/seo.json is not HTTP 200"):
    try:
        payload = json.loads(live_health["body"])
        hashes = payload.get("deployment_hashes", {})
        for filename in ["server.js", "index.html", "data/seo-pages.json"]:
            expected = hashlib.sha256((ROOT / filename).read_bytes()).hexdigest()
            actual = hashes.get(filename)
            report["checks"]["deploy_hash_" + filename] = {"matches": actual == expected, "expected_prefix": expected[:12], "actual_prefix": str(actual or "")[:12]}
            test(actual == expected, "Production is stale or missing SHA256: " + filename)
    except (ValueError, TypeError) as ex:
        test(False, "Invalid live deployment health JSON: " + str(ex))

for route in ["/", "/taksong/"]:
    res = get(route)
    parser = Head()
    parser.feed(res["body"])
    seo = rules[route]
    report["checks"]["page_" + route] = {"status": res["status"], "final_url": res["url"], "title": parser.title, "canonical": parser.canonical, "robots": parser.robots}
    test(res["status"] == 200, route + " must return HTTP 200")
    test(res["url"].rstrip("/") == (BASE + route).rstrip("/"), route + " redirects away from canonical URL")
    test(parser.canonical == BASE + route, route + " canonical mismatch")
    test("noindex" not in ",".join(parser.robots).lower(), route + " has noindex")
    test("noindex" not in res["headers"].get("X-Robots-Tag", "").lower(), route + " X-Robots-Tag noindex")
    test(parser.title == seo["title"], route + " SEO title does not match latest curated source")
    test(parser.description == seo["description"], route + " SEO description does not match latest curated source")
    if route == "/taksong/":
        test("taksong-trust-first-20261106" in res["body"], "Live taksong trust-first section missing")
        test('href="/reviews/history/?kind=taksong"' in res["body"], "Live taksong evidence link missing")

robot = get("/robots.txt")
report["checks"]["robots"] = {"status": robot["status"], "contains_sitemap": "Sitemap: " + BASE + "/sitemap-priority.xml" in robot["body"]}
test(robot["status"] == 200, "Robots.txt missing")
test("User-agent: *" in robot["body"] and "Allow: /" in robot["body"], "Robots.txt missing allowed root")
test("Sitemap: " + BASE + "/sitemap-priority.xml" in robot["body"], "Robots.txt does not publish priority sitemap")

sm = get("/sitemap-priority.xml")
report["checks"]["sitemap"] = {"status": sm["status"], "parseable": False, "priority_count": 0}
test(sm["status"] == 200, "Priority sitemap is not HTTP 200")
if sm["status"] == 200:
    try:
        doc = ET.fromstring(sm["body"])
        urls = [x.text for x in doc.iter() if x.tag.endswith("loc") and x.text]
        report["checks"]["sitemap"]["parseable"] = True
        report["checks"]["sitemap"]["priority_count"] = len(urls)
        for path in ["/taksong/","/taksong/busan/","/taksong/daegu/","/taksong/ulsan/","/taksong/gyeongnam/changwon-si/","/taksong/sejong/","/taksong/gangwon/sokcho-si/","/taksong/gangwon/gangreung-si/","/설악산탁송/"]:
            test(BASE + path in urls, "Priority sitemap omits commercial transport page: " + path)
        test(all(x.startswith(BASE + "/") for x in urls), "Sitemap contains non-canonical host")
        test(len(urls) == len(set(urls)), "Priority sitemap has duplicate URLs")
    except ET.ParseError as ex:
        test(False, "Priority sitemap XML invalid: " + str(ex))
print(json.dumps(report, ensure_ascii=False, indent=2))
sys.exit(1 if failures else 0)
