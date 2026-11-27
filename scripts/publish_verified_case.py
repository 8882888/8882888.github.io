#!/usr/bin/env python3
"""Publish up to five not-yet-published verified ride cases per scheduled run.

This publishes on the Smart24 website only, not to Naver Blog.
"""
import html
import json
import pathlib
import re
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "public-reviewed-rides-202610.json"
QUEUE = ROOT / "data" / "verified-ride-publication-queue.json"
STATE = ROOT / "data" / "published-ride-case-ids.json"
OUT = ROOT / "reviews" / "verified"
DIRECTORY = OUT / "index.html"
BATCH_SIZE = 5

def esc(s):
    return html.escape(str(s), quote=True)

def identifier(x):
    key = "|".join(str(x.get(k, "")) for k in ("date","service","departure","destination","fare"))
    import hashlib
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]

def complete(x):
    return (x.get("verified") is True and x.get("status") == "completed"
            and x.get("service") in ("taksong", "daeri")
            and all(x.get(k) for k in ("date", "departure", "destination", "fare")))

def shell(title, description, body, canonical):
    return ('<!doctype html><html lang="ko"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width, initial-scale=1">'
            '<title>' + esc(title) + ' | 스마트24</title>'
            '<meta name="description" content="' + esc(description) + '">'
            '<link rel="canonical" href="' + esc(canonical) + '">'
            '<meta name="robots" content="index,follow,max-image-preview:large">'
            '<style>body{font-family:system-ui,sans-serif;margin:0;background:#f4f8fd;color:#18314b;line-height:1.75}'
            'header,footer{padding:16px;background:#154a82;color:white}header a,footer a{color:white}'
            'main{max-width:820px;margin:auto;padding:22px}article{background:white;border:1px solid #c9d9ec;border-radius:12px;padding:20px}'
            'dl{display:grid;grid-template-columns:100px 1fr;gap:8px}dt{font-weight:bold}dd{margin:0}'
            'a{color:#075baa}</style></head><body><header><a href="/">스마트24 홈페이지</a>'
            ' · <a href="/reviews/verified/">운행완료 기록 사례</a></header><main>'
            + body + '</main><footer>스마트24 상담 <a href="tel:18114294">1811-4294</a></footer></body></html>')

PLACE_GROUPS = (
    ("부산", "부산"), ("해운대", "부산"), ("인천", "인천"),
    ("연수구", "인천"), ("검단", "인천"), ("강화", "인천"),
    ("김포", "김포"), ("세종시", "세종"), ("부강면", "세종"),
    ("광산구", "광주"), ("고흥군", "고흥"), ("평택", "평택"),
    ("오산시", "오산"), ("의정부", "의정부"), ("종로", "서울"),
    ("동해시", "동해"), ("원주시", "원주"), ("고양시", "고양"),
    ("안동시", "안동"), ("시흥시", "시흥"), ("구미시", "구미"),
    ("김천시", "김천"), ("용인시", "용인"), ("강릉시", "강릉"),
    ("화성시", "화성"), ("유성구", "대전"), ("마산합포구", "창원"),
    ("지리산", "지리산"), ("설악산", "설악산"),
)

def locality_groups(x):
    route = str(x.get("departure", "")) + " " + str(x.get("destination", ""))
    return {group for token, group in PLACE_GROUPS if token in route}

def related_cases(x, records, published):
    current = identifier(x)
    published_ids = {p.get("id") for p in published}
    current_groups = locality_groups(x)
    candidates = []
    for other in records:
        other_id = identifier(other)
        if (other_id == current or other_id not in published_ids or
                not complete(other) or other.get("service") != x.get("service")):
            continue
        common = current_groups & locality_groups(other)
        if common:
            candidates.append((other, sorted(common)[0]))
    candidates.sort(key=lambda pair: (
        pair[0].get("date", ""), pair[0].get("departure", ""),
        pair[0].get("destination", "")), reverse=True)
    return candidates[:4]


def distinctive_case_title(x, records, published):
    """Distinguish published completed rides with the same route without changing either ride."""
    label = "자동차탁송" if x["service"] == "taksong" else "대리운전"
    route_title = f'{x["departure"]} → {x["destination"]} {label} 운행기록'
    published_ids = {entry.get("id") for entry in published}
    same_route = {
        identifier(other): other for other in records
        if complete(other) and identifier(other) in published_ids
        and other["service"] == x["service"]
        and other["departure"] == x["departure"]
        and other["destination"] == x["destination"]
    }
    if len(same_route) <= 1:
        return route_title
    # Real ride date is a verified source field, not a generated publication date.
    date_title = f'{x["date"]} {route_title}'
    on_date = [other for other in same_route.values() if other["date"] == x["date"]]
    if len(on_date) > 1:
        # Two separately sourced records on the same date can have different real fares.
        return f'{date_title} · 당시 {x["fare"]}'
    return date_title

def render_case(x, records=None, published=None):
    if records is None:
        records = json.loads(SOURCE.read_text(encoding="utf-8"))
    if published is None:
        published = json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else []
    label = "자동차탁송" if x["service"] == "taksong" else "대리운전"
    title = distinctive_case_title(x, records, published)
    slug = identifier(x)
    facts = [("서비스 유형", label), ("출발지", x["departure"]),
             ("도착지", x["destination"]), ("실제 운행일", x["date"]),
             ("당시 기록요금", x["fare"])]
    for condition in x.get("conditions", []):
        if condition in ("통행료 포함", "대기 표기"):
            facts.append(("운행 조건", condition))
    if x.get("vehicle"):
        facts.append(("확인된 차량", x["vehicle"]))
    detail = "".join("<dt>"+esc(k)+"</dt><dd>"+esc(v)+"</dd>" for k, v in facts)
    if x["service"] == "taksong":
        image_source = "/assets/service-taksong-visual.svg"
        image_alt = "자동차탁송 안내용 그림, 번호판 홍보번호 1811-4294, 실제 고객 운행차량 사진 아님"
        service_path, service_text = "/taksong/", "자동차탁송"
        checklist = ("<ul><li>차량이 주차된 정확한 위치와 출차 승인 가능 여부</li>"
            "<li>시동·주행 가능 상태, 차종·변속기 및 운행 전 확인할 특이사항</li>"
            "<li>차량 키를 전달할 담당자와 목적지 수령 담당자</li>"
            "<li>출발·도착지에서 차량을 인수·인계할 수 있는 날짜와 시간</li></ul>")
        handover_intro = "차량을 다른 장소로 이동하는 탁송은 출발지에서 차량을 인수할 수 있는지와 도착지에서 받을 수 있는지를 각각 확인하는 것이 중요합니다."
    else:
        image_source = "/assets/service-daeri-visual.svg"
        image_alt = "대리운전 서비스 안내용 그림, 실제 운행기사나 운행차량 사진 아님"
        service_path, service_text = "/daeri/", "대리운전"
        checklist = ("<ul><li>차량이 있는 건물명, 주차장 층과 실제 출입구</li>"
            "<li>차량 키 전달 방법과 운행 전 차량 상태</li>"
            "<li>목적지의 정확한 주소, 주차 위치와 도착 후 인계 방식</li>"
            "<li>희망 출발 시각과 경유·대기 여부</li></ul>")
        handover_intro = "대리운전은 고객 차량의 실제 주차 위치와 운행을 시작할 장소, 도착 후 차량을 세울 위치를 정확히 전달하는 것이 중요합니다."
    illustration_id = "verified-taksong-illustration" if x["service"] == "taksong" else "verified-daeri-illustration"
    visual = ('<figure id="' + illustration_id + '" style="margin:12px 0"><img src="' + image_source +
        '" alt="' + esc(image_alt) +
        '" loading="lazy" width="960" height="504" style="width:100%;max-width:630px;height:auto">' +
        '<figcaption style="font-size:13px">서비스별 참고 이미지 · 실제 운행 증빙사진 아님</figcaption></figure>')
    related = related_cases(x, records, published)
    if related:
        related_html = "<ul>" + "".join(
            '<li><a href="/reviews/verified/'+identifier(other)+'/">'+
            esc(other["departure"]+" → "+other["destination"]+" "+label)+'</a> · '+
            esc(other["date"])+" · 당시 "+esc(other["fare"])+" · 공통 지역 표기 "+
            esc(group)+"</li>" for other, group in related) + "</ul>" + \
            "<p>아래 기록은 같은 지역 표기가 포함된 별도 운행 사례입니다. 같은 기사·동일 경로·연속 운행을 의미하지 않습니다.</p>"
    else:
        related_html = "<p>같은 서비스의 공개 기록 중 공통 지역 표기가 명확히 확인되는 사례가 없어 임의로 연결하지 않았습니다.</p>"
    # Preserve the specifically reviewed locality bridge on the existing case.
    # Only the exact verified ride identity may receive this link.
    locality_bridge = (
        '<p><a href="/daeri/incheon/ganghwa-gun/ganghwa-eup/gapgot-ri/">강화읍 갑곳리 출발 대리운전 안내</a></p>'
        if slug == "a5da235af0d8d2b5" and x["service"] == "daeri"
        and x["departure"] == "강화갑곳리" and x["destination"] == "선원면"
        else ""
    )
    body = ('<article><h1>'+esc(title)+'</h1><p><strong>기존 운행완료 자료 기반 사례</strong></p>'
        + visual +
        '<section id="record-facts"><h2>기록으로 확인되는 운행 정보</h2><dl>'+detail+'</dl>'
        '<p>위 항목은 공개 가능한 운행기록에서 확인되는 정보입니다. 실제 운행일과 게시일은 다를 수 있습니다.</p></section>'
        '<section id="route-scope"><h2>출발지와 도착지 확인</h2><p>기록상 출발지는 '+esc(x["departure"])+'이며 도착지는 '
        +esc(x["destination"])+'입니다. 출발지·도착지 표기는 원자료에 기록된 범위를 유지했습니다. '
        '동·읍·면 또는 지역명만 기재된 경우 정확한 도로명주소나 실제 주행 경로를 뜻하지 않습니다.</p>'
        '<p>이 페이지는 운행일, 서비스 유형, 출발지, 도착지와 당시 기록요금을 안내합니다. '
        '원자료에 없는 경유지, 이동거리, 소요시간, 차량 세부정보와 현장 상황은 추정해 추가하지 않았습니다.</p></section>'
        '<section id="handover-checklist"><h2>'+esc(service_text)+' 접수 전 확인할 사항</h2><p>'+handover_intro+'</p>'
        + checklist + '</section>'
        '<section id="fare-context"><h2>당시 기록요금과 현재 견적은 구분합니다</h2><p>'+esc(x["date"])+' 운행에 기록된 '
        +esc(x["fare"])+'은 과거 해당 건의 기록요금입니다. 현재 요금표나 다른 구간의 고정요금으로 사용할 수 없습니다. '
        '현재 비용은 출발지와 도착지의 정확한 위치, 차량 조건, 희망 시간과 인수·인계 조건을 확인한 뒤 별도로 상담합니다.</p></section>'
        '<section id="related-cases"><h2>같은 지역 표기가 포함된 다른 공개 운행기록</h2>'+related_html+'</section>'
        '<section id="related-service"><h2>'+esc(service_text)+' 및 지역별 안내</h2>'+locality_bridge+'<p><a href="'+service_path+'">'
        +esc(service_text)+' 전국 안내</a> · <a href="/region/">행정구역별 지역 안내</a> · '
        '<a href="/coverage/">전국 서비스 지역 찾기</a> · <a href="/fare/">현재 예상요금 조회</a></p>'
        '<p><a href="tel:18114294">상담 1811-4294</a> · '
        '<a href="/reviews/verified/#'+x["service"]+'">'+label+' 실제 후기 목록</a></p></section></article>')
    description = (x["date"]+" "+label+" 완료 운행기록 · "+x["departure"]+" → "+
        x["destination"]+" · 당시 기록요금 "+x["fare"]+
        ". 현재 견적은 차량과 인수·인계 조건을 확인한 뒤 별도로 안내합니다.")
    return shell(title, description, body,
        "https://jeongukdaeri.kr/reviews/verified/"+slug+"/")

def write_index(published, records):
    by_id={identifier(r):r for r in records if complete(r)}
    rows={"taksong": [], "daeri": []}
    for v in reversed(published):
        key=v["id"]
        if key not in by_id: continue
        x=by_id[key]
        label="자동차탁송" if x["service"]=="taksong" else "대리운전"
        rows[x["service"]].append('<li><a href="/reviews/verified/'+key+'/">'+esc(x["departure"])+' → '
                    +esc(x["destination"])+' '+label+'</a> · 실제 운행일 '+esc(x["date"])
                    +' · 당시 '+esc(x["fare"])+'</li>')
    summary = ('<p><strong>현재 공개된 개별 후기 ' + str(sum(map(len, rows.values()))) + '건</strong> · ' +
               '각 후기에는 실제 운행일과 당시 기록요금을 표시합니다.</p>')
    service_labels = (("taksong", "자동차탁송"), ("daeri", "대리운전"))
    navigation = "".join(
        '<li><a href="#'+service+'">'+label+' 후기 '+str(len(rows[service]))+'건</a> · '+
        '<a href="/fare/?service='+service+'">'+label+' 예상요금 조회</a></li>'
        for service, label in service_labels if rows[service]
    )
    if navigation:
        navigation = '<nav aria-label="서비스별 후기와 예상요금"><ul>'+navigation+'</ul></nav>'
    sections = "".join(
        '<section id="'+service+'"><h2>'+label+' 실제 운행 후기 '+str(len(rows[service]))+
        '건</h2><ul>'+"".join(rows[service])+'</ul></section>'
        for service, label in service_labels
        if rows[service]
    )
    body=('<article><h1>실제 운행기록 기반 탁송·대리운전 사례</h1>' +
          '<p>운행완료로 분류된 원자료에 근거합니다. 게시일과 실제 운행일은 다르며, 이전 기록을 새로운 운행으로 표시하지 않습니다.</p>' +
          summary + navigation +
          '<p><a href="/routes/reviewed/">출발지·도착지별 실제 운행 후기</a> · ' +
          '<a href="/taksong/">전국 자동차탁송 지역 안내</a> · ' +
          '<a href="/daeri/">전국 대리운전 지역 안내</a></p>' +
          '<p><a href="/reviews/ride-record-stories/">전체 운행기록 보기</a> · ' +
          '<a href="/fare/">구간별 예상요금 조회</a> · <a href="/service/card-daeri/">카드대리운전 상담</a> · ' +
          '<a href="tel:18114294">전화 상담 1811-4294</a></p>' +
          sections + '</article>')
    DIRECTORY.parent.mkdir(parents=True,exist_ok=True)
    DIRECTORY.write_text(shell("자동차탁송·대리운전 실제 후기 | 운행구간과 당시 요금","실제 완료된 자동차탁송·대리운전의 출발지, 도착지, 운행일과 당시 요금을 확인하세요. 구간별 후기와 현재 예상요금 조회도 제공합니다.",body,
                 "https://jeongukdaeri.kr/reviews/verified/"),encoding="utf-8")

def load_focus_names():
    """Use the current source registry, never match partial or ambiguous names."""
    source = (ROOT / "server.js").read_text(encoding="utf-8")
    marker = "const metroLongDistanceFocus=new Map("
    if marker not in source:
        raise ValueError("Focus registry missing; refusing unreviewed publication ordering")
    rows, end = json.JSONDecoder().raw_decode(source.split(marker, 1)[1])
    if not isinstance(rows, list) or not all(isinstance(r, list) and len(r) >= 7
                                              and isinstance(r[0], str) for r in rows):
        raise ValueError("Invalid focus registry")
    names = {row[0] for row in rows}
    legal = {name for file in (ROOT / "data" / "legal-regions").glob("[0-9][0-9].json")
             for name in json.loads(file.read_text(encoding="utf-8"))["full_names"]}
    if len(names) != len(rows) or not names or not names <= legal:
        raise ValueError("Focus registry does not match exact legal region names")
    return names


def focus_pairs(ride, names):
    if not complete(ride):
        return set()
    return {(ride["service"], ride[key]) for key in ("departure", "destination")
            if ride[key] in names}


def select_case_batch(records, published, focus_names, limit=BATCH_SIZE):
    """Keep service alternation and the five-case cap; use at most two slots
    for previously uncovered exact focus/service pairs in saved public cases.
    Other slots retain the existing newest-first ordering.
    """
    used = {p["id"] for p in published}
    candidates = {identifier(r): r for r in records if complete(r) and identifier(r) not in used}
    candidates = sorted(candidates.values(), key=lambda x: x["date"], reverse=True)
    covered = set().union(*(focus_pairs(r, focus_names) for r in records
                            if identifier(r) in used))
    batch = []
    previous = published[-1]["service"] if published else None
    focus_slots = 2
    for _ in range(min(limit, BATCH_SIZE)):
        if not candidates:
            break
        pool = [r for r in candidates if r["service"] != previous] or candidates
        selected = pool[0]
        if focus_slots:
            best = max(pool, key=lambda r: len(focus_pairs(r, focus_names) - covered))
            if focus_pairs(best, focus_names) - covered:
                selected = best
                focus_slots -= 1
        batch.append((identifier(selected), selected))
        candidates = [r for r in candidates if identifier(r) != identifier(selected)]
        covered.update(focus_pairs(selected, focus_names))
        previous = selected["service"]
    return batch


def main():
    records=json.loads(SOURCE.read_text(encoding="utf-8"))
    if QUEUE.exists():
        records.extend(json.loads(QUEUE.read_text(encoding="utf-8")))
    published=json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else []
    batch = select_case_batch(records, published, load_focus_names())
    for key, selected in batch:
        published.append({"id": key, "service": selected["service"],
                          "published_at": datetime.now(timezone.utc).isoformat()})

    for key, selected in batch:
        page = OUT / key / "index.html"
        page.parent.mkdir(parents=True, exist_ok=True)
        page.write_text(render_case(selected, records, published), encoding="utf-8")
    if batch:
        # When a new verified case repeats an older published route, refresh
        # the older page too: both titles must carry their real ride dates.
        new_routes = {
            (selected["service"], selected["departure"], selected["destination"])
            for _, selected in batch
        }
        new_ids = {key for key, _ in batch}
        by_id = {identifier(row): row for row in records if complete(row)}
        for previous in published:
            old_id = previous["id"]
            if old_id in new_ids:
                continue
            old_ride = by_id.get(old_id)
            if old_ride is None:
                continue
            route = (old_ride["service"], old_ride["departure"], old_ride["destination"])
            if route not in new_routes:
                continue
            old_page = OUT / old_id / "index.html"
            if not old_page.is_file():
                raise SystemExit("Published same-route page missing; refusing silent recreation: " + old_id)
            old_page.write_text(render_case(old_ride, records, published), encoding="utf-8")
        STATE.write_text(json.dumps(published, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
        print("Published verified cases:", len(batch), *(key for key, _ in batch))
    else:
        print("No new eligible verified cases; no fabricated publication")
    write_index(published,records)

if __name__=="__main__":
    main()
