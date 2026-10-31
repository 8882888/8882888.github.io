#!/usr/bin/env python3
"""Build factual route-first case summaries from existing ride records; never invent completion."""
import html
import json
import pathlib
import re
from datetime import date

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "reviews" / "ride-record-stories" / "index.html"
CURATED = ROOT / "data" / "public-reviewed-rides-202610.json"
HISTORY = ROOT / "data" / "ride-history.json"

def esc(v):
    return html.escape(str(v), quote=True)

def tags(origin, destination, service):
    def words(s):
        return re.findall(r"[가-힣]{2,12}", s)
    # Only source-specific terms; do not add unrelated cities for SEO.
    terms = []
    for place in [origin, destination]:
        for word in words(place):
            if word in ("시", "군", "구", "동") or word.isdigit():
                continue
            tag = word + ("탁송" if service == "taksong" else "대리운전")
            if tag not in terms:
                terms.append(tag)
    return " ".join("#" + esc(t) for t in terms[:12])

def case(entry):
    departure, destination = entry["departure"], entry["destination"]
    service = entry["service"]
    label = "자동차탁송" if service == "taksong" else "대리운전"
    title = f"{departure} → {destination} {label} 운행기록"
    vehicle = entry.get("vehicle")
    vehicle_row = ("<dt>차종</dt><dd>" + esc(vehicle) + "</dd>") if vehicle else ""
    return ("<article class='case'><h3>" + esc(title) + "</h3>"
            "<dl class='facts'><dt>출발지</dt><dd>" + esc(departure) +
            "</dd><dt>도착지</dt><dd>" + esc(destination) +
            "</dd><dt>운행일</dt><dd>" + esc(entry["date"]) +
            "</dd><dt>기록요금</dt><dd>" + esc(entry["fare"]) +
            "</dd>" + vehicle_row + "</dl>"
            "<p>기존 운행완료 분류 자료에 근거한 " + label + " 운행사례입니다. "
            "당시 요금은 현재 견적이 아니며 기록에 없는 차종, 시간과 상황은 추가하지 않았습니다.</p>"
            "<p class='tags' aria-label='출발지 도착지 지역 검색어'>" +
            tags(departure, destination, service) + "</p>"
            "<p><a href='tel:18114294'>이 구간 탁송·대리운전 상담 1811-4294</a></p></article>")

def big_vehicle_case(record):
    origin = record["departure"]
    dest = record["destination"]
    # Strip operational shorthand but retain original uncertainty and source trace.
    description = re.sub(r"^(?:탁/확대/|스/탁/확대/)", "", origin).split("/")
    vehicle = next((x for x in description if re.search(r"25\s*톤|9[.]8톤", x)), "대형차")
    return ("<article class='case'><h3>" + esc(vehicle) + " 탁송 배차기록</h3>"
            "<p>기록일 " + esc(record["date"]) + " · 기록요금 " + esc(record["fare"]) + "</p>"
            "<p>기록상 출발정보: " + esc(origin) + "</p><p>기록상 도착정보: " + esc(dest)
            + "</p><p><strong>배차기록 기반 자료</strong>이며 운행완료 여부는 이 원본에서 확인되지 않습니다. "
            "차량 제원과 실제 인수·인계 내용은 확인 후 후기화합니다.</p></article>")

def main():
    curated = json.loads(CURATED.read_text(encoding="utf-8"))
    history = json.loads(HISTORY.read_text(encoding="utf-8"))
    cases = [r for r in curated if r.get("verified") is True and r.get("status") == "completed"
             and r.get("service") in ("taksong", "daeri")
             and all(r.get(k) for k in ("date", "departure", "destination", "fare"))]
    cases.sort(key=lambda r: r["date"], reverse=True)
    taksong = [r for r in cases if r["service"] == "taksong"][:12]
    daeri = [r for r in cases if r["service"] == "daeri"][:8]
    large = [r for r in history if re.search(r"25\s*톤|9[.]8톤", r.get("departure", ""))][:12]
    style = """body{font-family:system-ui,sans-serif;color:#142b46;margin:0;background:#f6f9fd}
main{max-width:1050px;margin:auto;padding:25px 18px 65px}h1{font-size:clamp(27px,4vw,38px)}
h2{margin-top:42px;border-bottom:2px solid #cbdcf0;padding-bottom:10px}
.case{background:white;border:1px solid #d3dfef;border-radius:13px;padding:18px;margin:12px 0;line-height:1.65}
.case h3{margin-top:0;color:#1553a3}.tags{font-size:14px;color:#185b91}.facts{display:grid;grid-template-columns:90px 1fr;gap:8px 12px}.facts dt{font-weight:700}.facts dd{margin:0}
a{color:#0757ae}header{padding:15px 24px;background:#104f96;color:white}
header a{color:white}footer{margin-top:40px}"""
    page = ('<!doctype html><html lang="ko"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>실제 출발지 도착지 탁송·대리운전 운행기록 | 스마트24</title>'
            '<meta name="description" content="운행기록으로 확인된 자동차탁송·장거리대리운전 실제 출발지와 도착지, 기록요금, 25톤 대형차 배차기록을 구분해 소개합니다.">'
            '<link rel="canonical" href="https://jeongukdaeri.kr/reviews/ride-record-stories/">'
            '<style>' + style + '</style></head><body>'
            '<header><a href="/">스마트24 홈</a> · <a href="/reviews/history/">기존 운행기록</a></header><main>'
            '<h1>출발지 → 도착지 중심 탁송·대리운전 운행기록</h1>'
            '<p>실제 출발지역에서 도착지역까지의 차량 이동을 찾는 고객을 위해 운행일·운행구간·당시 요금을 정리했습니다. 기존 자료를 새로운 운행처럼 재발행하지 않으며, 차종은 확인된 경우만 표시합니다.</p><p><a href="/fare/">출발지·도착지 요금 상담</a> · <a href="/blog/">기존 네이버 공개 후기</a></p>'
            '<h2>자동차탁송 운행완료 기록</h2>' + "".join(map(case, taksong))
            + '<h2>대리운전 운행완료 기록</h2>' + "".join(map(case, daeri))
            + '<h2>25톤·대형 화물차 배차기록 (완료 여부 추가 확인 필요)</h2>' +
            "".join(map(big_vehicle_case, large)) +
            '<footer><p>새로운 확인 기록이 데이터 파일에 추가될 때 목록이 갱신됩니다. '
            '콘텐츠 확인일과 운행일은 구분됩니다. 상담은 <a href="tel:18114294">1811-4294</a>.</p></footer>'
            '</main></body></html>')
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != page:
        OUTPUT.write_text(page, encoding="utf-8")
        print(f"Updated case page: taksong={len(taksong)} daeri={len(daeri)} large={len(large)}")
    else:
        print("No new verified ride records; unchanged")

if __name__ == "__main__":
    main()
