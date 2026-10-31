#!/usr/bin/env python3
"""Publish at most one not-yet-published verified ride case per scheduled run.

This publishes on the Smart24 website only, not to Naver Blog.
"""
import html
import json
import pathlib
import re
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "public-reviewed-rides-202610.json"
STATE = ROOT / "data" / "published-ride-case-ids.json"
OUT = ROOT / "reviews" / "verified"
DIRECTORY = OUT / "index.html"

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
            '<style>body{font-family:system-ui,sans-serif;margin:0;background:#f4f8fd;color:#18314b;line-height:1.75}'
            'header,footer{padding:16px;background:#154a82;color:white}header a,footer a{color:white}'
            'main{max-width:820px;margin:auto;padding:22px}article{background:white;border:1px solid #c9d9ec;border-radius:12px;padding:20px}'
            'dl{display:grid;grid-template-columns:100px 1fr;gap:8px}dt{font-weight:bold}dd{margin:0}'
            'a{color:#075baa}</style></head><body><header><a href="/">스마트24 홈페이지</a>'
            ' · <a href="/reviews/verified/">운행완료 기록 사례</a></header><main>'
            + body + '</main><footer>스마트24 상담 <a href="tel:18114294">1811-4294</a></footer></body></html>')

def render_case(x):
    label = "자동차탁송" if x["service"] == "taksong" else "대리운전"
    title = f'{x["departure"]} → {x["destination"]} {label} 운행기록'
    slug = identifier(x)
    vehicle = x.get("vehicle")
    facts = [("출발지", x["departure"]),("도착지",x["destination"]),("실제 운행일",x["date"]),
             ("당시 기록요금",x["fare"])]
    if vehicle: facts.append(("확인된 차량",vehicle))
    detail = "".join("<dt>"+esc(k)+"</dt><dd>"+esc(v)+"</dd>" for k,v in facts)
    body = ('<article><h1>'+esc(title)+'</h1><p><strong>기존 운행완료 자료 기반 사례</strong></p>'
            '<dl>'+detail+'</dl><h2>차량 이동 구간</h2><p>'+esc(x["departure"])+'에서 '
            +esc(x["destination"])+'까지 '+label+'으로 기록된 운행입니다. '
            '운행기록에 없는 차량 종류·경유지·상황은 추정하여 작성하지 않습니다.</p>'
            '<h2>차량 인계 및 요금 상담</h2><p>당시 기록요금은 현재 요금표가 아닙니다. '
            '출발지·도착지, 정확한 차량 인계 위치, 차종과 희망 날짜를 확인한 뒤 상담합니다.</p>'
            '<p><a href="tel:18114294">이 구간 상담 1811-4294</a></p></article>')
    return shell(title, title+' · 실제 운행일 '+x["date"]+' · 당시 요금 '+x["fare"],body,
                 'https://jeongukdaeri.kr/reviews/verified/'+slug+'/')

def write_index(published, records):
    by_id={identifier(r):r for r in records if complete(r)}
    rows=[]
    for v in reversed(published):
        key=v["id"]
        if key not in by_id: continue
        x=by_id[key]
        label="자동차탁송" if x["service"]=="taksong" else "대리운전"
        rows.append('<li><a href="/reviews/verified/'+key+'/">'+esc(x["departure"])+' → '
                    +esc(x["destination"])+' '+label+'</a> · 실제 운행일 '+esc(x["date"])
                    +' · 당시 '+esc(x["fare"])+'</li>')
    body='<article><h1>실제 운행기록 기반 탁송·대리운전 사례</h1><p>운행완료로 분류된 원자료에 근거합니다. 게시일과 실제 운행일은 다르며, 이전 기록을 새로운 운행으로 표시하지 않습니다.</p><ul>'+ "".join(rows)+'</ul></article>'
    DIRECTORY.parent.mkdir(parents=True,exist_ok=True)
    DIRECTORY.write_text(shell("실제 운행기록 후기 모음","자동차탁송·대리운전 출발지 도착지별 운행기록",body,
                 "https://jeongukdaeri.kr/reviews/verified/"),encoding="utf-8")

def main():
    records=json.loads(SOURCE.read_text(encoding="utf-8"))
    published=json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else []
    used={p["id"] for p in published}
    candidates=[r for r in records if complete(r) and identifier(r) not in used]
    candidates.sort(key=lambda x:x["date"],reverse=True)
    if candidates:
        # Alternate services when both are available, without inventing records.
        previous=published[-1].get("service") if published else None
        selected=next((x for x in candidates if x["service"]!=previous), candidates[0])
        key=identifier(selected)
        page=OUT / key / "index.html"
        page.parent.mkdir(parents=True,exist_ok=True)
        page.write_text(render_case(selected),encoding="utf-8")
        published.append({"id":key,"service":selected["service"],
                          "published_at":datetime.now(timezone.utc).isoformat()})
        STATE.write_text(json.dumps(published,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        print("Published one verified case",key)
    else:
        print("No new eligible verified cases; no fabricated publication")
    write_index(published,records)

if __name__=="__main__":
    main()
