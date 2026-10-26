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

REGIONAL_GUIDES = {
    "인천": ("송도·청라·부평·계양·주안·검단", "송도와 청라는 신도시 단지·상업시설의 출입구 위치를 구체적으로 알려주시면 기사 접근에 도움이 됩니다. 부평·주안은 역세권과 상가 밀집 구역에서 정확한 승차 지점을 확인합니다.", "인천항·공항 주변은 일반 시내 출발과 접근 조건이 다를 수 있습니다. 공항·항만 차량 인수는 주차장과 출입 절차를 사전에 확인합니다."),
    "서울": ("강남·서초·송파·마포·용산·영등포", "강남과 서초의 대형 건물은 지하주차장 출입구와 차량 위치를 확인합니다. 심야 번화가에서는 탑승 위치를 구체적으로 안내해 기사와의 만남을 돕습니다.", "법인 업무 차량이나 서비스센터 이동은 차량 인수 담당자·주차 위치·인계 시간을 미리 확인합니다."),
    "경기": ("수원·용인·고양·화성·안산·평택·파주", "경기도는 시군 간 거리가 길고 신도시·산업단지·외곽 지역이 함께 분포합니다. 출발지의 상세 위치와 시간대를 기준으로 기사 접근 및 복귀 가능 여부를 확인합니다.", "골프장·산업단지·서비스센터 차량 이동은 출입 가능 시간과 차량 열쇠 인계 방법을 확인합니다."),
    "부산": ("해운대·기장·서면·광안리", "해운대·광안리의 관광 밀집 시간에는 차량 위치와 승차 지점을 정확하게 안내해 주시는 것이 좋습니다. 기장 외곽은 기사 접근시간을 함께 확인합니다.", "부산항 주변 차량 인수는 항만 출입 조건을 먼저 확인하고, 장거리 탁송은 도착지 인계 일정을 조율합니다."),
    "대구": ("수성구·범어동·달서구·동성로", "동성로 등 도심 번화가에서는 주차 위치와 출발 시간을 확인합니다. 수성구·달서구 외곽 이동은 기사 접근거리와 복귀 여건을 고려합니다.", "골프장 왕복·일일기사·장거리 탁송은 대기시간, 차량 인수 장소, 귀가 구간을 별도로 확인합니다."),
    "강원": ("속초·강릉·양양·원주·동해·삼척·평창·정선", "설악산 등 산행 출발지와 산간 관광지는 새벽 출발·주차장·탐방로 통제·셔틀 운행 여부를 먼저 확인합니다. 외진 장소는 기사 접근 및 통신 상태도 중요합니다.", "동해안 자전거 종주 구간과 산간 지역 탁송은 차량 인수 위치, 접근 가능한 도로, 기사 복귀 교통편을 함께 조율합니다."),
}

def service_guide(name):
    places, driving, delivery = REGIONAL_GUIDES[name]
    esc = html.escape
    return ("<section aria-label='" + esc(name) + " 대리운전 탁송 이용 방법'>"
      "<h2>" + esc(name) + " 대리운전·자동차탁송 이용 방법</h2>"
      "<p>" + esc(name) + " 주요 상담 지역은 " + esc(places) + "입니다. 전국 어디든 한 번에 상담할 수 있으며, 도심뿐 아니라 산간·오지·섬 지역도 차량 진입과 도선·선적 가능 조건을 확인해 배차를 진행합니다.</p>"
      "<h3>" + esc(name) + " 대리운전 기사 배차 과정</h3>"
      "<ol><li>출발지의 건물명·주차 위치와 도착지를 알려주세요.</li>"
      "<li>운행 희망 시간, 장거리 여부, 기사 접근 및 복귀 여건을 확인합니다.</li>"
      "<li>예상요금과 배차 가능 여부를 안내한 뒤 기사 배정을 진행합니다.</li>"
      "<li>기사가 차량 위치를 확인하고 목적지까지 운행합니다.</li></ol>"
      "<p>" + esc(driving) + "</p>"
      "<h3>" + esc(name) + " 자동차탁송 접수부터 차량 인계까지</h3>"
      "<ol><li>차량 인수 장소·도착지·차종·희망 시간을 접수합니다.</li>"
      "<li>운행 가능 기사와 이동 조건, 예상요금을 확인합니다.</li>"
      "<li>차량 열쇠·주차 위치·인수 담당자 정보를 조율합니다.</li>"
      "<li>배정된 기사가 차량을 인수해 목적지 담당자에게 인계합니다.</li></ol>"
      "<p>" + esc(delivery) + "</p>"
      "<h3>야간·장거리·산간·오지·섬 지역 상담</h3>"
      "<p>원거리 기사 이동, 산간 도로 접근, 도선·선적, 주차장 통제 및 복귀 교통편을 확인해 가능한 운행 방식을 안내합니다. 모든 장소에 즉시 배차를 보장하는 것은 아니며 실제 접근 조건을 확인합니다.</p>"
      "<p><a href='/fare/'>출발지·도착지로 예상요금 계산하기</a> · <a href='tel:18114294'>전국 상담 1811-4294</a></p></section>")

def build(name, matches, quotes, districts):
    result = ['<section aria-label="' + name + ' 실제 공개 운행정보 자동 요약">', '<h2>' + name + ' 대리운전·자동차탁송 최신 공개 글</h2>',
              '<p>아래 요약은 공개된 블로그 제목을 기반으로 자동 구성했습니다. 기존 공개 블로그 자료에서 해당 지역의 대리운전·탁송 운행 사례와 안내 글을 연결했습니다. 자세한 내용은 원문을 확인해 주세요.</p>']
    for kind, label in (("daeri", "대리운전"), ("taksong", "자동차탁송")):
        result.append("<h3>" + name + " " + label + " 후기·안내</h3>")
        group = [p for p in matches if category(p) == kind][:8]
        if not group:
            result.append("<p>해당 지역의 다른 공개 운행정보는 전체 자료실에서 확인할 수 있습니다.</p>")
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
        block = START + "\n" + service_guide(name) + "\n" + build(name, matches, quotes, districts) + "\n" + END
        if START in original and END in original:
            updated = re.sub(re.escape(START) + r"[\s\S]*?" + re.escape(END), lambda _: block, original, count=1)
        else:
            updated = original.replace("</main>", block + "</main>", 1)
        if updated != original:
            page.write_text(updated, encoding="utf-8")
            print(slug, "updated; matching public posts:", len(matches))

if __name__ == "__main__":
    main()
