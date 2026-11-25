#!/usr/bin/env python3
"""Read-only production sitemap proof. Not a Naver index report."""
import json
import pathlib
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = "https://jeongukdaeri.kr"
OWNERS = json.loads((ROOT / "data/sitemap-url-owners.json").read_text(encoding="utf-8"))

def get_xml(path):
    for attempt in range(3):
        try:
            request = urllib.request.Request(BASE + path, headers={
                "User-Agent": "Smart24-Release-Ownership-Verification/1.0",
                "Cache-Control": "no-cache, no-store", "Pragma": "no-cache",
            })
            with urllib.request.urlopen(request, timeout=20) as response:
                if response.status != 200 or response.geturl() != BASE + path:
                    raise ValueError("Unexpected HTTP response or redirect: " + path)
                return ET.fromstring(response.read())
        except urllib.error.HTTPError as error:
            if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                raise
        except (urllib.error.URLError, TimeoutError):
            if attempt == 2:
                raise
        time.sleep(2 * (attempt + 1))

def canonical_route(value):
    url = urllib.parse.urlsplit(value)
    if url.scheme != "https" or url.netloc != "jeongukdaeri.kr" or url.query or url.fragment:
        raise ValueError("Noncanonical sitemap URL: " + value)
    return urllib.parse.unquote(url.path)

def main():
    expected = defaultdict(set)
    for route, feed in OWNERS.items():
        expected[feed].add(route)
    index = get_xml("/sitemap-all.xml")
    if index.tag.split("}")[-1] != "sitemapindex":
        raise ValueError("Expected sitemapindex")
    feeds = [canonical_route(node.text or "") for node in index.findall("{*}sitemap/{*}loc")]
    if len(feeds) != len(set(feeds)) or set(feeds) != set(expected):
        raise ValueError("Sitemap index differs from ownership registry")
    def check(feed):
        root = get_xml(feed)
        if root.tag.split("}")[-1] != "urlset":
            raise ValueError(feed + " is not a URL set")
        routes = [canonical_route(node.text or "") for node in root.findall("{*}url/{*}loc")]
        counts = Counter(routes)
        missing = sorted(expected[feed] - set(routes))
        extra = sorted(set(routes) - expected[feed])
        duplicates = sorted(route for route, count in counts.items() if count != 1)
        if missing or extra or duplicates:
            raise ValueError(f"{feed}: missing={missing[:8]}, extra={extra[:8]}, duplicates={duplicates[:8]}")
        if feed in ("/sitemap.xml", "/sitemap-taksong.xml", "/sitemap-daeri.xml"):
            limit = 499 if feed == "/sitemap.xml" else 500
            if len(routes) > limit:
                raise ValueError(feed + " exceeds focused URL limit")
            if feed != "/sitemap.xml" and any(node.tag.split("}")[-1] == "image" for node in root.iter()):
                raise ValueError(feed + " contains image entries")
        print(f"PASS {feed}: {len(routes)} canonical URLs", flush=True)
        return routes
    all_routes = []
    with ThreadPoolExecutor(max_workers=3) as executor:
        for routes in executor.map(check, feeds):
            all_routes.extend(routes)
    if len(all_routes) != len(set(all_routes)) or set(all_routes) != set(OWNERS):
        raise ValueError("Global sitemap ownership mismatch")
    print(f"PASS {len(feeds)} sitemap feeds, {len(all_routes)} unique canonical URLs. Not an indexed URL count.")

if __name__ == "__main__":
    main()
