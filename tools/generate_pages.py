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
<nav aria-label="주요 메뉴" style="padding:12px 5%;border-bottom:1px solid #d9e1ea;display:flex;flex-wrap:wrap;gap:12px;justify-content:center">
<a href="/">홈</a><a href="/service/daeri/">대리운전</a><a href="/service/taksong/">자동차탁송</a><a href="/service/long-distance-taksong/">장거리탁송</a><a href="/service/corporate/">법인대리운전</a><a href="/service/golf/">골프대리운전</a><a href="/quote/">빠른 상담 작성</a><a href="/region/">전국 지역 찾기</a>
</nav>
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


def generate_service_pages(urls):
    """Create standalone service landing pages and include them in the sitemap."""
    pages = [
        {
            "slug": "daeri", "name": "대리운전",
            "title": "전국 대리운전 이용 안내",
            "intro": "회식, 모임, 업무, 골프장 이용 후 차량을 안전하게 귀가시키기 위한 대리운전 상담 안내입니다.",
            "sections": [
                ("상담 전에 준비할 내용", ["차량이 있는 정확한 출발 위치", "도착할 주소 또는 건물명", "희망 출발 시간", "차량 종류와 현장 상황"]),
                ("이용 절차", ["출발지와 도착지 확인", "요금 및 배차 가능 여부 상담", "안내 내용을 확인한 뒤 이용 결정"]),
                ("예약 및 배차", ["특정 시간이나 심야 이용은 미리 문의해 주세요.", "지역과 시간대에 따라 배차 가능 여부가 달라질 수 있습니다."])
            ]
        },
        {
            "slug": "taksong", "name": "자동차탁송",
            "title": "전국 자동차탁송 이용 안내",
            "intro": "차량 매매, 정비, 출장, 이사 및 개인 일정에 맞춰 자동차를 출발지에서 목적지까지 이동하는 탁송 상담 안내입니다.",
            "sections": [
                ("탁송 문의 시 확인할 내용", ["차량 인수 장소와 도착 주소", "차종 및 차량 상태", "희망 인수 날짜와 시간", "인수·인계 방법"]),
                ("진행 절차", ["출발지·도착지와 차종 확인", "일정·요금 및 배차 가능 여부 확인", "조건을 확인한 뒤 진행 결정"]),
                ("장거리 탁송", ["장거리 이동은 일정과 지역별 배차 여건을 고려해 사전 상담을 권장합니다.", "확정 요금은 실제 출발지와 도착지를 확인한 뒤 안내합니다."])
            ]
        },
        {
            "slug": "long-distance-taksong", "name": "장거리탁송",
            "title": "전국 장거리탁송 이용 안내",
            "intro": "지역 간 차량 이동이 필요한 경우 출발지와 도착지, 차량 종류, 희망 인수 일정을 확인해 장거리탁송을 상담할 수 있습니다.",
            "sections": [
                ("장거리탁송 상담 전 확인", ["출발지와 도착지의 정확한 주소", "차종 및 차량 상태", "희망 인수 날짜와 시간", "차량 인수·인계 방법"]),
                ("장거리 이동 일정", ["이동 거리와 지역별 배차 여건에 따라 일정 조율이 필요할 수 있습니다.", "희망 일정이 정해졌다면 미리 상담해 주세요."]),
                ("요금 및 진행 절차", ["실제 출발지·도착지와 차량 조건을 확인한 뒤 요금을 안내합니다.", "요금과 배차 가능 여부를 확인한 뒤 진행을 결정해 주세요."])
            ]
        },
        {
            "slug": "corporate", "name": "법인대리운전",
            "title": "법인대리운전 상담 안내",
            "intro": "기업 임직원 이동, 업무 일정, 법인 차량 이용에 필요한 대리운전 상담 정보를 안내합니다.",
            "sections": [
                ("기업 상담 시 확인할 내용", ["이용 빈도와 예상 시간대", "주요 출발지와 도착지", "정산 및 이용 절차에 필요한 조건", "담당 부서에서 원하는 연락 방법"]),
                ("운영 방식 협의", ["반복 이용이나 일정한 업무 패턴은 상담 시 미리 알려주세요.", "정산 방식과 계약 조건은 별도 확인 후 안내합니다."]),
                ("이용 전 확인", ["서비스 범위와 요금, 배차 조건을 확인한 뒤 이용을 결정해 주세요."])
            ]
        },
        {
            "slug": "golf", "name": "골프대리운전",
            "title": "골프대리운전 이용 안내",
            "intro": "골프 라운딩 전후 차량 이동이 필요한 고객을 위한 골프장 출발·도착 대리운전 상담 안내입니다.",
            "sections": [
                ("골프장 이용 전 준비", ["골프장 이름과 차량 주차 위치", "라운딩 종료 예상 시간", "귀가 목적지", "동반자와 차량 인수 장소"]),
                ("예약 상담 팁", ["주말이나 공휴일, 라운딩 종료가 몰리는 시간대는 미리 상담하는 편이 좋습니다.", "현장 위치와 종료 예정 시간을 구체적으로 알려주시면 상담에 도움이 됩니다."]),
                ("배차 확인", ["요금과 배차 가능 여부는 실제 일정과 이동 구간을 확인한 뒤 안내합니다."])
            ]
        }
    ]
    for item in pages:
        slug = item["slug"]
        url = f"{SITE_URL}/service/{slug}/"
        urls.add(url)
        section_html = []
        for heading, bullets in item["sections"]:
            section_html.append("<h2>" + esc(heading) + "</h2><ul>" + "".join("<li>" + esc(b) + "</li>" for b in bullets) + "</ul>")
        body = (
            '<p class="muted">스마트번개대리운전 · 서비스 안내</p>'
            + "<h1>" + esc(item["title"]) + "</h1>"
            + "<p>" + esc(item["intro"]) + "</p>"
            + "".join(section_html)
            + '<div class="card"><h2>상담 안내</h2><p>출발지, 도착지, 차량 종류와 희망 시간을 알려주시면 상담이 더 정확해집니다.</p>'
            + '<p><strong>' + esc(PHONE) + '</strong></p><a class="btn" href="tel:18773015">전화 상담하기</a>'
            + '<a class="btn" href="https://open.kakao.com/o/sGV88r7h">카카오톡 상담</a>'
            + '<p class="muted">요금과 배차 가능 여부는 거리, 시간, 차량 및 현장 상황에 따라 달라질 수 있습니다.</p></div>'
            + '<p><a href="/">홈페이지 첫 화면으로</a> · <a href="/region/">전국 지역별 안내</a></p>'
        )
        description = item["title"] + " 및 이용 절차, 상담 전 확인사항 안내. 대표 전화 " + PHONE + "."
        out = ROOT / "service" / slug / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page(item["title"] + " | " + BRAND, description, body, url), encoding="utf-8")


def generate_quote_page(urls):
    """Create a client-side quote-preparation page; it does not submit to a server."""
    url = f"{SITE_URL}/quote/"
    urls.add(url)
    body = """
<p class="muted">스마트번개대리운전 · 빠른 상담 준비</p>
<h1>빠른 상담 정보 작성</h1>
<p>상담에 필요한 이동 정보만 입력하면 문의 내용을 정리할 수 있습니다. 이 양식은 서버로 전송되지 않으며, 이름·전화번호 등 개인정보는 입력하지 마세요.</p>
<div class="card">
<form id="quote-form">
<label for="service"><strong>서비스 종류</strong></label>
<select id="service" required style="display:block;width:100%;padding:12px;margin:8px 0 16px">
<option value="대리운전">대리운전</option><option value="자동차탁송">자동차탁송</option><option value="장거리탁송">장거리탁송</option><option value="법인대리운전">법인대리운전</option><option value="골프대리운전">골프대리운전</option>
</select>
<label for="departure"><strong>출발지</strong></label>
<input id="departure" required maxlength="120" placeholder="예: 서울역 또는 상세 주소" style="display:block;width:100%;padding:12px;margin:8px 0 16px">
<label for="destination"><strong>도착지</strong></label>
<input id="destination" required maxlength="120" placeholder="예: 인천 송도" style="display:block;width:100%;padding:12px;margin:8px 0 16px">
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
<div><label for="date"><strong>이용 날짜</strong></label><input id="date" type="date" style="display:block;width:100%;padding:12px;margin:8px 0 16px"></div>
<div><label for="time"><strong>희망 시간</strong></label><input id="time" type="time" style="display:block;width:100%;padding:12px;margin:8px 0 16px"></div>
</div>
<label for="vehicle"><strong>차량 종류 (선택)</strong></label>
<input id="vehicle" maxlength="80" placeholder="예: 승용차, SUV" style="display:block;width:100%;padding:12px;margin:8px 0 16px">
<label for="memo"><strong>추가 요청 (선택)</strong></label>
<textarea id="memo" maxlength="300" rows="3" placeholder="예: 주차 위치, 차량 인수 관련 안내" style="display:block;width:100%;padding:12px;margin:8px 0 16px"></textarea>
<button class="btn" type="submit">상담 내용 만들기</button>
</form>
</div>
<div id="quote-result" class="card" hidden>
<h2>상담 내용 확인</h2><pre id="quote-text" style="white-space:pre-wrap;overflow-wrap:anywhere;font:inherit"></pre>
<button class="btn" id="copy-quote" type="button">내용 복사</button>
<a class="btn" href="https://open.kakao.com/o/sGV88r7h" target="_blank" rel="noopener noreferrer">카카오톡 상담 열기</a>
<a class="btn" href="tel:18773015">전화 상담 1877-3015</a>
<p class="muted">복사한 내용을 카카오톡 상담창에 붙여넣어 보내세요. 이 페이지에서 상담이 자동 접수되지는 않습니다.</p>
</div>
<script>
(function() {
  var form = document.getElementById('quote-form');
  var result = document.getElementById('quote-result');
  var text = document.getElementById('quote-text');
  var copy = document.getElementById('copy-quote');
  form.addEventListener('submit', function(event) {
    event.preventDefault();
    var fields = [
      ['서비스', document.getElementById('service').value],
      ['출발지', document.getElementById('departure').value.trim()],
      ['도착지', document.getElementById('destination').value.trim()],
      ['이용 날짜', document.getElementById('date').value || '미정'],
      ['희망 시간', document.getElementById('time').value || '미정'],
      ['차량 종류', document.getElementById('vehicle').value.trim() || '미기재'],
      ['추가 요청', document.getElementById('memo').value.trim() || '없음']
    ];
    text.textContent = '스마트번개대리운전 상담 요청\n' + fields.map(function(item) { return item[0] + ': ' + item[1]; }).join('\n');
    result.hidden = false;
    result.scrollIntoView({behavior:'smooth', block:'start'});
  });
  copy.addEventListener('click', function() {
    var content = text.textContent;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(content).then(function() {
        copy.textContent = '복사 완료'; 
      }).catch(function() { window.prompt('아래 내용을 복사해 주세요.', content); });
    } else {
      window.prompt('아래 내용을 복사해 주세요.', content);
    }
  });
})();
</script>
<p><a href="/">홈페이지 첫 화면으로</a> · <a href="/region/">전국 지역별 안내</a></p>
"""
    description = "대리운전·자동차탁송 상담에 필요한 출발지, 도착지, 날짜와 시간을 정리하는 빠른 상담 작성 페이지."
    out = ROOT / "quote" / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page("빠른 상담 작성 | " + BRAND, description, body, url), encoding="utf-8")

def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    regions = data.get("regions", [])
    if not regions:
        raise SystemExit("data/regions.json에 지역을 입력해야 합니다.")
    urls = {SITE_URL + "/"}
    generate_service_pages(urls)
    generate_quote_page(urls)
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
<p>시·도를 선택하거나 아래 검색창에 시·군·구, 읍·면·동, 리 이름을 입력해 원하는 지역을 바로 찾아보세요. 실제 운행 사례와 요금은 확인된 정보만 별도로 안내합니다.</p>
<div class="card">
<label for="region-search"><strong>전국 행정구역 검색</strong></label>
<p><input id="region-search" type="search" placeholder="예: 강남구, 역삼동, 속초시" autocomplete="off" style="width:100%;padding:13px;border:1px solid #b8c5d4;border-radius:8px;font-size:16px"></p>
<p id="region-search-status" class="muted">지역명을 두 글자 이상 입력하세요.</p>
<ul id="region-search-results" aria-live="polite"></ul>
</div>
<div class="cards">{''.join(province_cards)}</div>
<p class="muted">지역 데이터 출처: 국토교통부 전국 법정동 데이터. 지역별 배차 가능 여부와 요금은 상담을 통해 확인해 주세요.</p>
<script>
(function() {{
  var input = document.getElementById('region-search');
  var results = document.getElementById('region-search-results');
  var status = document.getElementById('region-search-status');
  var regions = [];
  fetch('/data/regions.json')
    .then(function(response) {{ if (!response.ok) throw new Error('지역 데이터를 불러오지 못했습니다.'); return response.json(); }})
    .then(function(data) {{ regions = Array.isArray(data.regions) ? data.regions : []; }})
    .catch(function() {{ status.textContent = '지역 검색 데이터를 불러오지 못했습니다. 시·도 목록에서 찾아주세요.'; }});
  input.addEventListener('input', function() {{
    var query = input.value.trim().toLocaleLowerCase('ko-KR');
    results.replaceChildren();
    if (query.length < 2) {{ status.textContent = '지역명을 두 글자 이상 입력하세요.'; return; }}
    if (!regions.length) {{ status.textContent = '지역 데이터를 불러오는 중입니다. 잠시 후 다시 입력해 주세요.'; return; }}
    var matches = regions.filter(function(region) {{
      var label = ((region.parent_name || '') + ' ' + (region.name || '')).toLocaleLowerCase('ko-KR');
      return label.indexOf(query) !== -1;
    }}).slice(0, 40);
    if (!matches.length) {{ status.textContent = '일치하는 지역이 없습니다. 다른 지역명으로 검색해 주세요.'; return; }}
    status.textContent = '검색 결과 ' + matches.length + '개 표시 (최대 40개)';
    matches.forEach(function(region) {{
      var item = document.createElement('li');
      var link = document.createElement('a');
      link.href = '/region/' + String(region.slug || '').replace(/^\\/+|\\/+$/g, '') + '/';
      link.textContent = ((region.parent_name || '') + ' ' + (region.name || '')).trim() + ' (' + (region.level || '지역') + ')';
      item.appendChild(link);
      results.appendChild(item);
    }});
  }});
}})();
</script>"""
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
