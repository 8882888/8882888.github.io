#!/usr/bin/env python3
"""Generate useful local service pages for Smart Bunny Driver Service."""
import json
import html
from pathlib import Path
from datetime import date
from urllib.parse import quote, urlsplit, urlunsplit

ROOT = Path(".")
DATA = ROOT / "data" / "regions.json"
SITE_URL = "https://8882888.github.io"
BRAND = "스마트번개대리운전"
PHONE = "1877-3015"
SERVICES = [
    {"name": "대리운전", "slug": "daeri", "keyword": "대리운전"},
    {"name": "자동차탁송", "slug": "taksong", "keyword": "자동차탁송"},
    {"name": "장거리탁송", "slug": "long-distance-taksong", "keyword": "장거리탁송"},
]

def esc(value):
    return html.escape(str(value), quote=True)

def page(title, description, body, canonical):
    return f"""<!doctype html>
<html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title><meta name="description" content="{esc(description)}">
<link rel="canonical" href="{esc(canonical)}">
<meta name="robots" content="index,follow">
<style>
*{{box-sizing:border-box}}body{{margin:0;font-family:Arial,'Malgun Gothic',sans-serif;line-height:1.85;color:#172235}}
header,footer{{background:#102544;color:white;padding:18px max(5%,calc((100% - 1000px)/2))}}
header a,footer a{{color:#ffd166}}main{{max-width:1000px;margin:auto;padding:28px 5% 50px}}
h1{{line-height:1.35;font-size:clamp(28px,5vw,42px)}}h2{{margin-top:32px}}
.card{{border:1px solid #d9e1ea;border-radius:12px;padding:16px;margin:12px 0}}
.btn{{display:inline-block;background:#ffd166;color:#102544;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:bold;margin:6px 8px 6px 0}}
.muted{{color:#536276;font-size:.95rem}}ul{{padding-left:22px}}
</style></head><body>
<header><strong>{BRAND}</strong> · <a href="tel:18773015">대표 상담 {PHONE}</a></header>
<main>{body}
<div class="card"><h2>전화 상담</h2><p>출발지와 도착지, 차량 종류, 이용 날짜와 희망 시간을 알려주시면 상담이 더 정확해집니다.</p>
<p><strong>{PHONE}</strong></p><a class="btn" href="tel:18773015">전화 상담하기</a>
<a class="btn" href="https://open.kakao.com/o/sGV88r7h">카카오톡 오픈채팅</a>
<p class="muted">요금과 배차 가능 여부는 거리, 시간, 차량 및 현장 상황에 따라 달라질 수 있습니다.</p></div>
</main><footer>{BRAND}<br>대표 상담 전화: {PHONE}<br><a href="/">홈페이지 첫 화면</a></footer>
</body></html>"""

def service_body(location, level, service, region):
    slug = service["slug"]
    if slug == "daeri":
        intro = f"{location}에서 모임이나 식사, 업무를 마친 뒤 차량을 직접 운전하기 어려운 상황이라면 출발 위치와 목적지를 정리해 대리운전을 상담할 수 있습니다."
        sections = f"""
<h2>{esc(location)} 대리운전이 필요한 상황</h2>
<p>약속이 끝나는 시간이 늦어지거나, 일행과 헤어진 뒤 주차해 둔 차량으로 귀가해야 할 때는 호출 전에 정확한 위치를 확인해 두는 것이 좋습니다. 건물 이름만으로 위치가 분명하지 않다면 도로명 주소나 가까운 출입구를 함께 알려주세요.</p>
<h2>이용 전 확인할 내용</h2>
<ul><li>차량이 주차된 정확한 위치와 만날 장소</li><li>목적지 주소 또는 알아보기 쉬운 건물명</li><li>차종과 차량 이용에 필요한 특이사항</li><li>원하는 출발 시간과 현장 대기 여부</li></ul>
<h2>이용 흐름</h2>
<p>상담 → 출발지·목적지 확인 → 요금 및 배차 가능 여부 확인 → 진행 결정 순서로 확인하면 됩니다. 지역과 시간대에 따라 배차 상황이 달라질 수 있으므로 급한 호출이나 특정 시간 이용은 미리 문의하는 편이 좋습니다.</p>"""
    elif slug == "taksong":
        intro = f"{location}에서 다른 지역으로 차량을 보내거나 정비·매매·개인 일정에 맞춰 차량을 이동해야 한다면 자동차탁송을 상담할 수 있습니다."
        sections = f"""
<h2>{esc(location)} 자동차탁송 상담 사례를 준비하는 방법</h2>
<p>탁송 상담은 출발지와 도착지를 구체적으로 확인하는 것부터 시작합니다. 같은 지역명이라도 차량 인수 장소와 최종 도착 지점에 따라 이동 경로가 달라질 수 있으므로 주소를 가능한 한 정확하게 준비해 주세요.</p>
<h2>탁송 문의 시 알려주세요</h2>
<ul><li>차량을 인수할 장소와 도착할 주소</li><li>차종 및 운행에 필요한 차량 상태 정보</li><li>희망 인수 시간과 도착 일정</li><li>현장 연락 담당자와 인수·인계 방법</li></ul>
<h2>진행 전 확인 순서</h2>
<p>출발지와 도착지 확인 → 차종 및 일정 확인 → 요금과 배차 가능 여부 안내 → 진행 여부 결정 순서로 상담합니다. 차량 상태나 현장 조건에 따라 추가 확인이 필요할 수 있습니다.</p>"""
    else:
        intro = f"{location}에서 출발해 먼 지역까지 차량을 이동해야 한다면 장거리탁송을 상담할 때 출발지, 도착지, 차량 종류와 희망 일정을 함께 확인하는 것이 중요합니다."
        sections = f"""
<h2>{esc(location)} 장거리탁송에서 중요한 점</h2>
<p>장거리 이동은 단순히 지역명만 전달하기보다 정확한 주소와 원하는 인수 시간을 알려주는 것이 좋습니다. 일정이 정해져 있다면 미리 상담해 가능한 운행 일정과 요금을 확인하세요.</p>
<h2>장거리탁송 상담 체크리스트</h2>
<ul><li>출발지와 도착지의 상세 주소</li><li>차종과 차량 상태</li><li>희망 인수 날짜·시간 및 도착 희망 일정</li><li>차량 인수·인계 담당자 연락 방법</li><li>요금, 운행 조건, 배차 가능 여부</li></ul>
<h2>예약 상담은 미리 진행하세요</h2>
<p>장거리 운행은 거리와 일정, 지역별 배차 여건에 따라 조율이 필요할 수 있습니다. 확정된 운행 사례나 요금은 상담으로 확인하고, 일정에 여유를 두고 문의해 주세요.</p>"""
    local_notes = region.get("local_notes", [])
    local_html = ""
    if local_notes:
        local_html = "<h2>지역 이용 참고사항</h2><ul>" + "".join(f"<li>{esc(note)}</li>" for note in local_notes) + "</ul>"
    return f"""<p class="muted">전국 지역별 서비스 안내 · {esc(level)}</p>
<h1>{esc(location)} {esc(service["keyword"])}</h1>
<p>{esc(intro)}</p>
{sections}
{local_html}
<div class="card"><h2>실제 이용 후기 안내</h2><p>이 페이지는 지역 서비스 이용을 돕기 위한 안내입니다. 실제 운행 후기와 운행 경로, 요금은 확인된 사례가 있을 때에만 추가합니다. 확인되지 않은 고객 경험이나 운행 실적을 임의로 작성하지 않습니다.</p></div>
<p class="muted">지역 정보: {esc(location)} · 안내 업데이트: {date.today().isoformat()}</p>"""

def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    regions = data.get("regions", [])
    if not regions:
        raise SystemExit("data/regions.json에 지역을 입력해야 합니다.")
    urls = {SITE_URL + "/"}
    # Keep hand-authored specialist transport landing pages in the sitemap.
    special_root = ROOT / "special"
    if special_root.exists():
        if (special_root / "index.html").exists():
            urls.add(f"{SITE_URL}/special/")
        for special_page in special_root.glob("*/index.html"):
            urls.add(f"{SITE_URL}/special/{special_page.parent.name}/")
    count = 0
    location_by_name = {}
    children_by_parent = {}
    for item in regions:
        full_name = " ".join(part for part in [item.get("parent_name", ""), item["name"]] if part).strip()
        location_by_name[full_name] = item
        parent_name = item.get("parent_name", "")
        if parent_name:
            children_by_parent.setdefault(parent_name, []).append(item)
    for r in regions:
        name = r["name"]
        slug = r["slug"].strip("/")
        level = r.get("level", "지역")
        parent = r.get("parent_name", "")
        location = f"{parent} {name}".strip()
        region_url = f"{SITE_URL}/region/{slug}/"
        urls.add(region_url)
        child_items = sorted(children_by_parent.get(location, []), key=lambda x: (x.get("level", ""), x.get("name", "")))
        child_links = "".join(
            f'<li><a href="/region/{esc(item["slug"].strip("/"))}/">{esc(item["name"])} ({esc(item.get("level", "지역"))})</a></li>'
            for item in child_items
        )
        child_section = f'<h2>하위 행정구역</h2><ul>{child_links}</ul>' if child_items else ""
        parent_item = location_by_name.get(parent)
        parent_section = (
            f'<p><a href="/region/{esc(parent_item["slug"].strip("/"))}/">← {esc(parent)} 상위 지역으로</a></p>'
            if parent_item and parent_item.get("slug", "").strip("/") != slug else ""
        )
        local_services = r.get("services", [s["slug"] for s in SERVICES])
        links = []
        for s in SERVICES:
            if s["slug"] not in local_services:
                continue
            href = f"/region/{slug}/{s['slug']}/"
            links.append(f'<div class="card"><h3><a href="{href}">{esc(location)} {esc(s["keyword"])}</a></h3><p>{esc(location)} 지역의 이용 상황, 상담 전 확인사항과 진행 순서를 안내합니다.</p></div>')
            service_url = f"{SITE_URL}/region/{slug}/{s['slug']}/"
            urls.add(service_url)
            body = service_body(location, level, s, r)
            title = f"{location} {s['keyword']} 이용 안내 | {BRAND}"
            description = f"{location} {s['keyword']} 이용 상황과 상담 전 확인사항 안내. 대표 전화 {PHONE}."
            out = ROOT / "region" / slug / s["slug"] / "index.html"
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(page(title, description, body, service_url), encoding="utf-8")
            count += 1
        body = f"""<p class="muted">전국 지역별 서비스 안내 · {esc(level)}</p>
<h1>{esc(location)} 대리운전 · 자동차탁송</h1>
<p>{esc(location)}에서 대리운전이나 차량 이동이 필요할 때 확인할 상담 정보를 정리했습니다. 실제 배차 가능 여부와 요금은 출발지, 목적지, 차종, 희망 시간에 따라 달라질 수 있습니다.</p>
<h2>{esc(location)} 서비스 안내</h2>
{parent_section}
{child_section}
{''.join(links)}
<h2>상담 전에 준비하면 좋은 정보</h2>
<ul><li>출발지와 도착지의 정확한 위치</li><li>차량 종류 및 차량 상태</li><li>이용 날짜와 희망 시간</li><li>현장 연락 담당자와 인수·인계 방법(탁송 시)</li></ul>
<h2>지역별 후기 콘텐츠 운영 기준</h2>
<p>실제 이용 후기가 확인되면 해당 지역, 운행 경로, 차량 정보와 상담 과정 등 공개 가능한 사실을 바탕으로 추가합니다. 실제 사례가 없는 경우에는 이용 안내를 제공하며, 고객 후기나 운행 실적을 만들어 쓰지 않습니다.</p>
<p class="muted">지역 정보: {esc(location)} · 안내 업데이트: {date.today().isoformat()}</p>"""
        out = ROOT / "region" / slug / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page(f"{location} 대리운전·탁송 이용 안내 | {BRAND}", f"{location} 대리운전, 자동차탁송, 장거리탁송 상담 전 확인사항. 대표 전화 {PHONE}.", body, region_url), encoding="utf-8")
        count += 1
    # Build a navigable nationwide directory and one landing page per province.
    region_root = ROOT / "region"
    region_root.mkdir(parents=True, exist_ok=True)
    provinces = {}
    for r in regions:
        parts = r["slug"].strip("/").split("/")
        if parts:
            provinces.setdefault(parts[0], []).append(r)

    province_cards = []
    for province_slug, items in sorted(provinces.items()):
        province_name = next((x["name"] for x in items if x.get("level") == "시·도"), None)
        if not province_name:
            province_name = items[0].get("parent_name", "").split()[0] or items[0]["name"]
        province_url = f"{SITE_URL}/region/{province_slug}/"
        urls.add(province_url)
        province_cards.append(
            f'<div class="card"><h3><a href="./{esc(province_slug)}/">{esc(province_name)} 지역 안내</a></h3>'
            f'<p>해당 시·도 내 대리운전·자동차탁송·장거리탁송 지역을 찾아보세요.</p></div>'
        )
        district_links = []
        seen = set()
        for item in sorted(items, key=lambda x: (x.get("level", ""), x.get("name", ""), x.get("slug", ""))):
            if item.get("level") != "시·군·구":
                continue
            item_slug = item["slug"].strip("/")
            item_url = f"{SITE_URL}/region/{item_slug}/"
            if item_url in seen:
                continue
            seen.add(item_url)
            label = " ".join(part for part in [item.get("parent_name", ""), item["name"]] if part)
            district_links.append(f'<li><a href="/region/{esc(item_slug)}/">{esc(label)}</a></li>')
        province_body = f"""<p class="muted">전국 지역별 서비스 안내</p>
<h1>{esc(province_name)} 대리운전·자동차탁송 지역 안내</h1>
<p>{esc(province_name)}의 법정동 데이터를 바탕으로 지역별 서비스 페이지를 구성했습니다. 원하는 시·군·구를 선택한 뒤 세부 지역과 서비스를 확인하세요.</p>
<h2>시·군·구 찾아보기</h2>
<ul>{''.join(district_links) if district_links else '<li>세부 지역 정보는 데이터 갱신 후 표시됩니다.</li>'}</ul>
<p><a href="/region/">전국 지역 안내로 돌아가기</a></p>"""
        out = region_root / province_slug / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page(f"{province_name} 대리운전·탁송 지역 안내 | {BRAND}", f"{province_name} 대리운전, 자동차탁송, 장거리탁송 지역별 안내. 대표 전화 {PHONE}.", province_body, province_url), encoding="utf-8")

    directory_url = f"{SITE_URL}/region/"
    directory_body = f"""<p class="muted">전국 지역별 서비스 안내</p>
<h1>전국 대리운전·자동차탁송 지역 찾기</h1>
<p>시·도를 선택한 뒤 시·군·구, 읍·면·동 등 세부 지역 페이지로 이동할 수 있습니다. 실제 운행 사례와 요금은 확인된 정보만 별도로 안내합니다.</p>
<div class="cards">{''.join(province_cards)}</div>
<p class="muted">지역 데이터 출처: 국토교통부 전국 법정동 데이터. 지역별 배차 가능 여부와 요금은 상담을 통해 확인해 주세요.</p>"""
    directory_path = region_root / "index.html"
    directory_path.write_text(page("전국 대리운전·자동차탁송 지역 안내 | " + BRAND, "전국 시·도별 대리운전·자동차탁송·장거리탁송 지역 안내. 대표 전화 " + PHONE + ".", directory_body, directory_url), encoding="utf-8")
    urls.add(directory_url)

    def sitemap_safe_url(url):
        parts = urlsplit(url)
        encoded_path = quote(parts.path, safe="/-._~")
        return urlunsplit((parts.scheme, parts.netloc, encoded_path, parts.query, parts.fragment))
    entries = "\n".join(f"  <url><loc>{esc(sitemap_safe_url(url))}</loc></url>" for url in sorted(urls))
    (ROOT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + entries + "\n</urlset>\n", encoding="utf-8")
    print(f"Generated {count} pages from {len(regions)} region records.")
    print("Nationwide expansion requires verified administrative-area data and useful region-specific details.")

if __name__ == "__main__":
    main()
