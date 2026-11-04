#!/usr/bin/env python3
"""Verify all seven public Seoul editorial guide titles and headings after deploy."""
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen
import html, json, os, re

ROOT=Path(__file__).resolve().parent.parent
BASE=os.environ.get("SMART24_AUDIT_BASE","https://jeongukdaeri.kr").rstrip("/")
groups=json.loads((ROOT/"data/seoul-taksong-editorial.json").read_text(encoding="utf-8"))["groups"]

class Headings(HTMLParser):
    def __init__(self):
        super().__init__()
        self.current=None
        self.text={"title":"","h1":""}
    def handle_starttag(self,tag,attrs):
        if tag in self.text:
            self.current=tag
    def handle_endtag(self,tag):
        if tag==self.current:
            self.current=None
    def handle_data(self,data):
        if self.current:
            self.text[self.current]+=data

def audit(group):
    route="/blog/seoul-taksong/"+group["slug"]+"/"
    request=Request(BASE+route+"?audit_seoul_editorial=20261104",
                    headers={"User-Agent":"Smart24-Seoul-Editorial-Integrity/1.0","Cache-Control":"no-cache"})
    with urlopen(request,timeout=24) as resp:
        if resp.status!=200:raise RuntimeError(f"{route} HTTP {resp.status}")
        source=resp.read().decode("utf-8")
    headings=Headings()
    headings.feed(source)
    title=html.unescape(headings.text["title"])
    h1=html.unescape(headings.text["h1"])
    expected=group["theme"]
    if "undefined" in source.lower() or "null</" in source.lower():
        raise AssertionError(f"{route} contains a missing template field")
    if expected not in title or expected not in h1:
        raise AssertionError(f"{route} theme missing from title/H1: {expected!r}, {title!r}, {h1!r}")
    if group["title"] not in title or group["title"] not in h1:
        raise AssertionError(f"{route} district names missing in title/H1")
    return route

if len(groups)!=7:raise RuntimeError(f"Expected seven Seoul editorial guides, got {len(groups)}")
with ThreadPoolExecutor(max_workers=4) as executor:
    results=list(executor.map(audit,groups))
for route in results:
    print("PASS",route,flush=True)
print("SMART24_SEOUL_EDITORIAL 7/7 canonical pages have specific theme and no undefined",flush=True)
