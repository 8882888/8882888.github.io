#!/usr/bin/env python3
"""Build crawlable regional post summaries from already-public Naver post metadata."""
import html
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
POSTS = ROOT / "blog/posts.json"
REGIONS = {
    "incheon": ("인천", ["인천", "송도", "청라", "부평", "계양", "동춘", "주안", "검단"]),
    "seoul": ("서울", ["서울", "강남", "서초", "송파", "마포", "용산", "성수", "영등포", "구로", "강서", "노원"]),
    "gyeonggi": ("경기", ["경기", "수원", "성남", "용인", "고양", "화성", "안산", "평택", "동탄", "부천", "김포", "광명", "이천", "파주"]),
    "busan": ("부산", ["부산", "해운대", "기장", "서면", "광안리"]),
    "daegu": ("대구", ["대구", "수성", "범어", "달서", "동성로"]),
    "gangwon": ("강원", ["강원", "속초", "강릉", "양양", "원주", "동해", "삼척", "평창", "정선", "설악", "춘천", "태백", "영월"]),
}
START = "<!-- SMART24_REGIONAL_POSTS_START -->"
END = "<!-- SMART24_REGIONAL_POSTS_END -->"

def category(post):
    s = post.get("title", "") + " " + post.get("category", "")
    if re.search("탁송|차량이동|차량회수", s):
        return "taksong"
    if re.search("대리운전|대리기사|장거리대리", s):
        return "daeri"
    return None

def build(name, matches):
    result = ['<section aria-label="' + name + ' 실제 공개 운행정보 자동 요약">', '<h2>' + name + ' 대리운전·자동차탁송 최신 공개 글</h2>',
              '<p>아래 요약은 공개된 블로그 제목을 기반으로 자동 구성했습니다. 실제 운행 내용과 완료 여부는 원문을 확인해 주세요. 확인되지 않은 운행 사실은 추가하지 않습니다.</p>']
    for kind, label in (("daeri", "대리운전"), ("taksong", "자동차탁송")):
        result.append("<h3>" + name + " " + label + " 후기·안내</h3>")
        group = [p for p in matches if category(p) == kind][:8]
        if not group:
            result.append("<p>현재 연결된 공개 글이 없습니다.</p>")
        for post in group:
            title = html.escape(post.get("title", "공개 글"))
            url = post.get("url", "")
            if not re.fullmatch(r"https://blog\.naver\.com/[A-Za-z0-9_-]+/[0-9]+", url):
                continue
            result.append('<article><h4><a href="' + html.escape(url, quote=True) + '" rel="noopener noreferrer">' + title +
                          '</a></h4><p>공개 글 제목: ' + title + '. 지역별 ' + label +
                          ' 관련 정보이며, 상세 운행 조건은 원문에서 확인할 수 있습니다.</p></article>')
    result.append('<p><a href="/blog/">전체 공개 운행정보 자료실</a></p></section>')
    return "\n".join(result)

def main():
    posts = json.loads(POSTS.read_text(encoding="utf-8"))
    for slug, (name, terms) in REGIONS.items():
        page = ROOT / "region" / (slug + "-daeri-taksong") / "index.html"
        original = page.read_text(encoding="utf-8")
        matches = [p for p in posts if any(term in (p.get("title", "") + " " + p.get("category", "")) for term in terms)]
        block = START + "\n" + build(name, matches) + "\n" + END
        if START in original and END in original:
            updated = re.sub(re.escape(START) + r"[\s\S]*?" + re.escape(END), lambda _: block, original, count=1)
        else:
            updated = original.replace("</main>", block + "</main>", 1)
        if updated != original:
            page.write_text(updated, encoding="utf-8")
            print(slug, "updated; matching public posts:", len(matches))

if __name__ == "__main__":
    main()
