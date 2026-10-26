#!/usr/bin/env python3
"""Append public Naver RSS entries to the existing archive without removing old posts."""
import json, re, html, pathlib, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timezone
ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "blog/posts.json"
PAGE = ROOT / "blog/index.html"
RSS = "https://rss.blog.naver.com/wjdtnr4757.xml"
def main():
    old = json.loads(DATA.read_text(encoding="utf-8"))
    assert len(old) >= 630, "Refusing to replace the established archive"
    request = urllib.request.Request(RSS, headers={"User-Agent": "Mozilla/5.0 (compatible; Smart24Archive/1.0)"})
    with urllib.request.urlopen(request, timeout=20) as response:
        xml = response.read(2_000_000)
    root = ET.fromstring(xml)
    existing = {str(p["id"]) for p in old}
    added = []
    for item in root.findall(".//channel/item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        match = re.search(r"(?:blog\.naver\.com/wjdtnr4757/|logNo=)(\d+)", link)
        if not match or not title or match.group(1) in existing:
            continue
        post_id = match.group(1)
        category = (item.findtext("category") or "미분류").strip()
        added.append({"id": post_id, "title": title, "category": category, "date": (item.findtext("pubDate") or ""), "url": "https://blog.naver.com/wjdtnr4757/" + post_id})
        existing.add(post_id)
    if not added:
        print("No new RSS posts; existing archive unchanged")
        return
    page = PAGE.read_text(encoding="utf-8")
    cards = "".join('<article data-category="'+html.escape(p["category"], quote=True)+'"><p class="category">'+html.escape(p["category"])+'</p><h2><a href="'+html.escape(p["url"], quote=True)+'" target="_blank" rel="noopener">'+html.escape(p["title"])+'</a></h2><p><a href="'+html.escape(p["url"], quote=True)+'" target="_blank" rel="noopener">네이버 블로그 원문 보기 ↗</a></p></article>' for p in added)
    marker = '<div id="posts">'
    assert page.count(marker) == 1
    page = page.replace(marker, marker + cards, 1)
    for category in sorted({p["category"] for p in added}):
        option = '<option>'+html.escape(category)+'</option>'
        if option not in page:
            page = page.replace('<option value="">전체 분류</option>', '<option value="">전체 분류</option>'+option, 1)
    page = page.replace("공개 글 630개", "공개 글 "+str(len(old)+len(added))+"개")
    page = re.sub(r"목록 확인: [^<]*", "목록 확인: "+datetime.now(timezone.utc).strftime("%Y년 %m월 %d일")+" (UTC). 새 글은 목록 갱신 후 표시됩니다.", page, count=1)
    DATA.write_text(json.dumps(added+old, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    PAGE.write_text(page, encoding="utf-8")
    print("Added", len(added), "posts; total", len(old)+len(added))
if __name__ == "__main__":
    main()
