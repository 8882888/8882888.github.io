#!/usr/bin/env python3
"""Build crawlable regional post summaries from already-public Naver post metadata."""
import html
import json
import pathlib
import re
from urllib.parse import urlencode

ROOT = pathlib.Path(__file__).resolve().parents[1]
POSTS = ROOT / "blog/posts.json"
QUOTES = ROOT / "data/verified_fare_quotes.json"
REGION_DATA = ROOT / "data/regions.json"
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

def build(name, matches, quotes, districts):
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
    result.append("<h3>" + name + " 검증된 예상요금 자료</h3>")
    applicable = [q for q in quotes if q["region"] == name]
    if not applicable:
        result.append("<p>현재 검증되어 공개된 예상요금 자료가 없습니다. 아래 계산기에서 조회해 주세요.</p>")
    for q in applicable[:12]:
        label = "대리운전" if q["service"] == "daeri" else "자동차탁송"
        result.append("<article><h4>" + html.escape(q["origin"] + " → " + q["destination"] + " " + label) +
                      " 예상요금</h4><p>계산기 확인 금액 " + format(q["amount_krw"], ",") + "원 · 도로거리 " +
                      html.escape(str(q["distance_km"])) + "km · 확인일 " + html.escape(q["verified_at"]) +
                      ". 실제 운행 후기가 아닌 참고요금이며 최종 금액은 상담 시 확인합니다.</p></article>")
    result.append('<h3>' + name + ' 출발 주요 구간 예상요금 조회</h3>')
    result.append('<p>실제 후기가 없는 구간도 출발지와 도착지를 입력해 도로거리 기반 예상요금을 조회할 수 있습니다. 아래 링크는 금액을 미리 정한 견적이 아니며, 조회 시 계산기가 실제 도로거리를 확인합니다.</p>')
    destinations = [("서울 강남역", "서울 강남"), ("인천시청", "인천"), ("부산역", "부산"), ("대구역", "대구")]
    origins = {"incheon": "인천시청", "seoul": "서울시청", "gyeonggi": "수원시청", "busan": "부산시청", "daegu": "대구시청", "gangwon": "강릉시청"}
    origin = origins.get(next((slug for slug, info in REGIONS.items() if info[0] == name), ""), name)
    from urllib.parse import urlencode
    result.append("<ul>")
    for dest, dest_label in destinations:
        if dest == origin:
            continue
        for service, label in (("daeri", "대리운전"), ("taksong", "자동차탁송")):
            query = urlencode({"service": service, "from": origin, "to": dest, "auto": "1"})
            result.append('<li><a href="/fare/?' + html.escape(query, quote=True) + '">' + html.escape(name + ' → ' + dest_label + ' ' + label + ' 예상요금 조회') + '</a> · 도로거리 기반 참고요금, 실제 배차 전 확인 필요</li>')
    result.append("</ul>")
    result.append('<p><a href="/blog/">전체 공개 운행정보 자료실</a></p></section>')
    return "\n".join(result)

def main():
    posts = json.loads(POSTS.read_text(encoding="utf-8"))
    raw = json.loads(QUOTES.read_text(encoding="utf-8")) if QUOTES.exists() else []
    region_data = json.loads(REGION_DATA.read_text(encoding="utf-8")).get("regions", [])
    quotes = []
    for q in raw:
        if not isinstance(q, dict) or q.get("source") != "road-fare-calculator-verified":
            continue
        if q.get("region") not in [v[0] for v in REGIONS.values()] or q.get("service") not in ("daeri", "taksong"):
            continue
        if not all(isinstance(q.get(k), str) and q[k].strip() for k in ("origin", "destination", "verified_at")):
            continue
        if type(q.get("amount_krw")) is not int or q["amount_krw"] <= 0 or q["amount_krw"] % 5000:
            continue
        if type(q.get("distance_km")) not in (int, float) or not 0 < q["distance_km"] < 3000:
            continue
        quotes.append(q)
    for slug, (name, terms) in REGIONS.items():
        page = ROOT / "region" / (slug + "-daeri-taksong") / "index.html"
        original = page.read_text(encoding="utf-8")
        matches = [p for p in posts if any(term in (p.get("title", "") + " " + p.get("category", "")) for term in terms)]
        aliases = {"인천": ["인천광역시"], "서울": ["서울특별시"], "경기": ["경기도"], "부산": ["부산광역시"], "대구": ["대구광역시"], "강원": ["강원특별자치도", "강원도"]}
        parents = aliases.get(name, [name])
        districts = list(dict.fromkeys(r.get("name", "") for r in region_data if r.get("parent_name") in parents and r.get("level") in ("시", "군", "구", "시군구")))
        block = START + "\n" + build(name, matches, quotes, districts) + "\n" + END
        if START in original and END in original:
            updated = re.sub(re.escape(START) + r"[\s\S]*?" + re.escape(END), lambda _: block, original, count=1)
        else:
            updated = original.replace("</main>", block + "</main>", 1)
        if updated != original:
            page.write_text(updated, encoding="utf-8")
            print(slug, "updated; matching public posts:", len(matches))

if __name__ == "__main__":
    main()
