#!/usr/bin/env python3
"""Check two live Busan taksong landing pages: genuine review-first titles and regional tags."""
import html
import os
import re
from html.parser import HTMLParser
from urllib.request import Request, urlopen

BASE=os.environ.get("SMART24_AUDIT_BASE","https://jeongukdaeri.kr").rstrip("/")
ROUTES=("/taksong/busan/","/region/busan-daeri-taksong/")
SOURCE_IDS=("224445300887","224433939509","224452085535")
REQUIRED_TAGS=("#부산탁송","#부산시탁송","#부산기장군탁송","#부산강서구탁송")

class BusanParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.capture=None
        self.title=""
        self.h1=""
        self.sections=[]
        self.tags=None
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag in ("title","h1"):
            self.capture=tag
        if tag=="section":
            self.sections.append(attrs.get("id",""))
        if tag=="p" and attrs.get("class")=="busan-local-taksong-tags":
            self.capture="tags"
            self.tags=""
    def handle_endtag(self,tag):
        if (tag=="title" and self.capture=="title") or (tag=="h1" and self.capture=="h1") or (tag=="p" and self.capture=="tags"):
            self.capture=None
    def handle_data(self,data):
        if self.capture=="title":self.title+=data
        elif self.capture=="h1":self.h1+=data
        elif self.capture=="tags":self.tags+=data

def audit(route):
    url=BASE+route+"?audit_busan_review_first=20261104"
    request=Request(url,headers={"User-Agent":"Smart24-Busan-Review-Integrity/1.0","Cache-Control":"no-cache"})
    with urlopen(request,timeout=30) as resp:
        if resp.status!=200:raise RuntimeError(f"{route} HTTP {resp.status}")
        text=resp.read().decode("utf-8")
    p=BusanParser()
    p.feed(text)
    if not html.unescape(p.title).startswith("부산탁송 후기"):
        raise AssertionError(f"{route}: title is not review-first: {p.title!r}")
    if not html.unescape(p.h1).startswith("부산탁송 후기"):
        raise AssertionError(f"{route}: H1 is not review-first: {p.h1!r}")
    if not p.sections or p.sections[0]!="busan-taksong-real-review-first-20261104":
        raise AssertionError(f"{route}: initial content is not original review: {p.sections[:4]!r}")
    if not p.tags:raise AssertionError(f"{route}: local hashtag paragraph missing")
    tags=p.tags.split()
    if len(tags)!=30 or len(set(tags))!=30 or any(t not in tags for t in REQUIRED_TAGS):
        raise AssertionError(f"{route}: Busan tags invalid: {len(tags)}")
    for post_id in SOURCE_IDS:
        if f"https://blog.naver.com/wjdtnr4757/{post_id}" not in text:
            raise AssertionError(f"{route}: original Naver review missing {post_id}")
    print(f"PASS {route}: review-first title/H1/section, 3 verified originals, 30 unique Busan tags",flush=True)

for route in ROUTES:
    audit(route)
print("SMART24_BUSAN_REVIEWS 2/2 live pages verified",flush=True)
