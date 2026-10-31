#!/usr/bin/env python3
"""Maintain a homepage list of independently public, completed-trip blog posts."""
import html
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
POSTS = ROOT / "blog/posts.json"
HOME = ROOT / "index.html"
START = "<!-- SMART24_LATEST_REAL_REVIEWS_START -->"
END = "<!-- SMART24_LATEST_REAL_REVIEWS_END -->"
PUBLIC_URL = re.compile(r"^https://blog[.]naver[.]com/wjdtnr4757/[0-9]+$")
COMPLETED = re.compile(r"운행완료|운행후기|탁송후기|대리운전후기|배차완료|운행 완료|이동 완료")
EXCLUDE = re.compile(r"완벽정리|총정리|요금표|이용안내|예약방법|종합안내|지역별 안내")
TAKSONG = re.compile(r"탁송|차량회수|차량이동")
ROUTE = re.compile(r"→|에서.{2,35}까지|출발.{2,35}도착")


def render(posts):
    found = []
    seen = set()
    for post in posts:
        title = str(post.get("title", "")).strip()
        url = str(post.get("url", "")).strip()
        if not PUBLIC_URL.fullmatch(url) or not COMPLETED.search(title) or EXCLUDE.search(title) or url in seen:
            continue
        seen.add(url)
        # Prioritize distinct, concrete taksong routes, retaining original archive order within groups.
        priority = (0 if TAKSONG.search(title) and ROUTE.search(title) else
                    1 if TAKSONG.search(title) else
                    2 if ROUTE.search(title) else 3)
        found.append((priority, len(found), title, url))
    found.sort(key=lambda row: (row[0], row[1]))
    found = found[:6]
    lines = [
        '<div id="latest-public-ride-reviews" aria-labelledby="latest-public-ride-reviews-heading">',
        '<h3 id="latest-public-ride-reviews-heading">최근 공개된 실제 운행후기 · 출발지→도착지 중심</h3>',
        '<p>기존 네이버 공개 글 중 후기·완료 운행을 제목에 표시한 게시물을 연결하며, 출발지와 도착지가 구체적인 자동차탁송 후기를 우선 보여줍니다. 안내글·예약 소개는 제외합니다. 게시일과 실제 운행일은 다를 수 있으며, 원문에서 상세 조건을 확인해 주세요.</p>',
    ]
    if found:
        lines.append('<ul>')
        for _, _, title, url in found:
            lines.append('<li><a target="_blank" rel="noopener noreferrer" href="' + html.escape(url, quote=True) + '">' + html.escape(title) + '</a></li>')
        lines.append('</ul>')
    else:
        lines.append('<p>현재 조건에 맞는 공개 완료 후기를 확인하지 못했습니다. 기존 운행기록에서 확인해 주세요.</p>')
    lines.append('<p><a href="/reviews/history/">확인된 기존 운행기록</a> · <a href="/blog/">네이버 최신 공개 글</a></p></div>')
    return "\n".join(lines)


def main():
    posts = json.loads(POSTS.read_text(encoding="utf-8"))
    page = HOME.read_text(encoding="utf-8")
    assert len(posts) >= 630, "Refusing to rewrite the homepage from an incomplete blog archive"
    assert page.count(START) == 1 and page.count(END) == 1, "Missing or duplicated homepage review markers"
    before, tail = page.split(START, 1)
    _, after = tail.split(END, 1)
    new_page = before + START + "\n" + render(posts) + "\n" + END + after
    if new_page != page:
        HOME.write_text(new_page, encoding="utf-8")
        print("Updated homepage public ride reviews from established Naver archive")
    else:
        print("No new eligible public ride reviews; homepage unchanged")


if __name__ == "__main__":
    main()
