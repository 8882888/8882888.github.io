#!/usr/bin/env python3
"""Generate useful local service pages for Smart Bunny Driver Service."""
import json
import html
import os
from pathlib import Path
from datetime import date
from urllib.parse import quote, urlsplit, urlunsplit

ROOT = Path(".")
DATA = ROOT / "data" / "regions.json"
SITE_URL = os.environ.get("SITE_URL", "https://jeongukdaeri.kr").rstrip("/")
BRAND = "스마트전국대리운전 스마트24탁송"
PHONE = "1811-4294"
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
header a,footer a{{color:#ffd166}}body{{padding-top:100px}}@media(max-width:650px){{body{{padding-top:160px}}}}main{{max-width:1000px;margin:auto;padding:28px 5% 50px}}
h1{{line-height:1.35;font-size:clamp(28px,5vw,42px)}}h2{{margin-top:32px}}
.card{{border:1px solid #d9e1ea;border-radius:12px;padding:16px;margin:12px 0}}
.btn{{display:inline-block;background:#ffd166;color:#102544;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:bold;margin:6px 8px 6px 0}}
.muted{{color:#536276;font-size:.95rem}}ul{{padding-left:22px}}
.quick-jump{{position:sticky;top:0;z-index:50;display:flex;gap:8px;overflow-x:auto;padding:10px 5%;background:#102544}}.quick-jump a{{flex-shrink:0;color:#102544;background:#ffd166;text-decoration:none;padding:8px 12px;border-radius:7px;font-weight:bold;white-space:nowrap}}.back-to-top{{position:fixed;right:16px;bottom:18px;z-index:100;background:#ffd166;color:#102544;border:0;border-radius:50%;width:54px;height:54px;font-weight:900;box-shadow:0 3px 12px #0004;cursor:pointer}}.back-to-top[hidden]{{display:none}}html{{scroll-behavior:smooth;scroll-padding-top:75px}}
.service-fixed-nav{{position:fixed;top:0;left:0;right:0;z-index:9999;background:#171717;border-bottom:3px solid #ffd400;box-shadow:0 3px 12px #0003}}.service-nav-inner{{max-width:1200px;margin:auto;display:flex;align-items:center;gap:14px;overflow-x:auto;white-space:nowrap;padding:13px 4%}}.service-nav-inner a{{color:#fff;text-decoration:none;font-weight:700;flex-shrink:0}}.service-nav-inner .kakao-link{{color:#ffd400}}.service-nav-inner span{{color:#ddd;font-size:13px;flex-shrink:0}}body{{padding-top:65px!important}}html{{scroll-padding-top:75px}}
/* Clear and touch-friendly local pages on narrow screens. */
*{{box-sizing:border-box}}
@media(max-width:650px){{
 html{{-webkit-text-size-adjust:100%}}
 body{{font-size:16px;line-height:1.8;overflow-wrap:break-word;padding-top:70px!important}}
 header{{padding:14px 5%;font-size:16px;line-height:1.5}}
 main{{padding:22px 5% 45px}}
 h1{{font-size:clamp(27px,7.3vw,36px);line-height:1.35;overflow-wrap:break-word}}
 h2{{font-size:clamp(21px,5.5vw,26px);line-height:1.4}}
 p,li{{line-height:1.8}}
 .card{{padding:16px;border-radius:12px}}
 .btn{{min-height:48px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;line-height:1.4;max-width:100%}}
 .service-nav-inner{{gap:14px;padding:12px 4%;scrollbar-width:thin}}
 .service-nav-inner a{{font-size:15px;min-height:42px;display:inline-flex;align-items:center}}
 .service-nav-inner span{{font-size:13px}}
 .back-to-top{{width:50px;height:50px;right:12px;bottom:14px}}
 img{{max-width:100%;height:auto}}
 input,select,textarea{{max-width:100%;font-size:16px}}
}}


/* Daylight legibility for generated regional and service pages. */
@media(max-width:650px){{
 body{{background:#fff;color:#111827}}
 main{{background:#fff}}
 h1,h2,h3{{color:#111827}}
 .card{{background:#fff;color:#111827;border:2px solid #cbd5e1;box-shadow:0 1px 3px #00000012}}
 .muted{{color:#374151}}
 .btn,.quick-jump a{{background:#ffdf55;color:#102544;font-weight:900}}
 .service-fixed-nav{{background:#101820;border-bottom-color:#ffdf55}}
 .service-nav-inner a{{color:#fff}}
 .service-nav-inner .kakao-link{{color:#ffe15a}}
 .service-nav-inner span{{color:#f3f4f6}}
 a:focus-visible,button:focus-visible{{outline:3px solid #006fd6;outline-offset:3px}}
}}

</style></head><body>
<header><strong>{BRAND}</strong> · <a href="tel:18114294">대표 상담 {PHONE}</a></header>
<nav class="service-fixed-nav" aria-label="주요 서비스 메뉴"><div class="service-nav-inner"><a href="/special/nationwide-daeri/">전국대리운전</a><a href="/special/24-hour-service/">24시탁송</a><a href="/service/golf/">골프대리운전</a><a href="/service/daily-driver/">일일기사</a><a class="kakao-link" href="https://open.kakao.com/o/sGV88r7h" target="_blank" rel="noopener noreferrer">💬 카카오톡 상담</a><span>상담시간 08:00~20:00</span></div></nav>

<main id="page-start">{body}
<div class="card" id="consultation"><h2>전화 상담</h2><p>출발지와 도착지, 차량 종류, 이용 날짜와 희망 시간을 알려주시면 상담이 더 정확해집니다.</p>
<p><strong>{PHONE}</strong></p><a class="btn" href="tel:18114294">전화 상담하기</a>
<a class="btn" href="https://open.kakao.com/o/sGV88r7h">카카오톡 오픈채팅</a>
<p class="muted">요금과 배차 가능 여부는 거리, 시간, 차량 및 현장 상황에 따라 달라질 수 있습니다.</p></div>
</main><button type="button" class="back-to-top" id="back-to-top" aria-label="맨 위로 이동">↑ TOP</button><script>(function(){{var b=document.getElementById('back-to-top');b.addEventListener('click',function(){{window.scrollTo({{top:0,behavior:'smooth'}})}})}})();</script><footer>{BRAND}<br>대표 상담 전화: {PHONE}<br><a href="/">홈페이지 첫 화면</a></footer>
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
    # Informational guidance is generated for every region, including those without
    # verified completed trips. It must never imply live driver availability or
    # claim a local fare, confirmed booking, or completed ride.
    logistics = f"""
<h2>{esc(location)} 예약과 기사 배차 안내</h2>
<p>{esc(location)}에서 이용 날짜와 시간을 정했다면 출발지·도착지·차종을 미리 알려주세요. 당일 요청도 상담할 수 있지만 특정 시각의 기사 배정을 보장하는 것은 아닙니다. 주말·공휴일·심야·새벽에는 예약 문의를 먼저 진행하는 것이 일정 조율에 도움이 됩니다.</p>
<h2>{esc(location)} 배차요금과 기사 이동비 확인</h2>
<p>탁송·대리운전 요금은 이동 거리뿐 아니라 출발 시각, 차종, 인수·인계 조건, 기사 출발 위치와 복귀 가능 여부 등에 따라 달라질 수 있습니다. 외곽이나 교통편이 제한된 구간에서는 기사 이동·복귀에 필요한 비용이 상담 요금에 반영될 수 있습니다. 해당 지역의 확정 요금이나 추가 비용은 실제 조건을 확인한 뒤 안내합니다.</p>
<h2>{esc(location)} 기사 수급과 배차 지연 가능성</h2>
<p>기사 수급은 실시간 요청량과 기사 위치에 따라 변동됩니다. 산간·농어촌·산업단지 외곽·심야 운행 등에서는 배차까지 시간이 더 걸릴 수 있으나, 이 안내만으로 {esc(location)}의 현재 기사 부족이나 지연이 확인된 것은 아닙니다. 시간 여유를 두고 문의해 주세요.</p>
<h2>{esc(location)} 예약요금과 긴급 호출요금의 차이</h2>
<p>대리운전과 자동차탁송 모두 미리 예약하면 기사 이동 일정과 배차 조건을 조율할 수 있어 요금 변동을 줄이는 데 유리합니다. 반대로 바로 출발해야 하는 긴급 요청은 가까운 기사를 짧은 시간 안에 확보해야 하므로 요금이 높아질 수 있습니다.</p>
<p>대리운전은 고객이 현장에서 기다리는 경우가 많아 약 10분 이내 도착처럼 빠른 배차를 요청하기도 합니다. 이때의 요금은 즉시 출발 가능한 기사 수급과 이동 시간에 영향을 받으며, 10분 도착을 보장하는 것은 아닙니다.</p>
<p>자동차탁송은 차량 인수 시각에 여유가 있다면 기사 일정을 조정하기 쉬워 같은 구간의 긴급 대리운전보다 다소 낮은 요금으로 안내할 수 있는 경우도 있습니다. 다만 탁송이 언제나 저렴하거나 예약요금이 반드시 고정되는 것은 아니며, 실제 금액은 상담 시 확인합니다.</p>
<h2>{esc(location)} 상담 시 빠른 확인 방법</h2>
<ul><li>출발지·도착지의 정확한 주소와 주차 위치</li><li>운행 희망 날짜·시간과 예약 여부</li><li>차종·운행 가능 상태 및 인수·인계 방법</li><li>경유지·대기·심야 운행 여부</li><li>예상 요금, 추가 비용, 배차 가능 여부를 최종 확인</li></ul>
<p class="muted">위 내용은 지역별 공통 예약·배차 안내이며, 확인되지 않은 실제 운행후기·실시간 기사 현황·확정 배차요금이 아닙니다.</p>
"""
    # Region/service-specific information without inventing completed trips.
    service_guidance = {
        "daeri": f"""<h2>{esc(location)} 대리운전 예약·요금·배차</h2>
<p>회식이나 식사 후 귀가, 골프장 이용, 외곽 숙소·펜션에서 이동하는 경우에는 차량 위치와 목적지를 함께 알려주세요. 바로 출발해야 하는 대리운전은 가까운 기사를 빠르게 확보해야 하므로 사전 예약보다 요금이 높아질 수 있습니다. 약 10분 이내 도착을 희망하는 경우도 있으나 실제 도착 시간과 배차 가능 여부는 현장 기사 수급에 따라 달라집니다.</p>
<p>주말·심야·새벽에는 기사 위치와 복귀 교통편을 고려해야 하므로, 특히 외곽 출발이나 장거리 이동은 사전 예약을 권장합니다. 정확한 배차요금은 출발지·도착지·시간대를 확인한 뒤 안내합니다.</p>""",
        "taksong": f"""<h2>{esc(location)} 자동차탁송 예약·기사 수급·배차요금</h2>
<p>개인 차량 이동, 매매·정비 입출고, 렌터카·법인 차량 이동은 차량 인수 장소와 도착지, 차종 및 희망 시간을 기준으로 상담합니다. 차량 인수 시각을 여유 있게 정하면 기사 일정을 조정하기 쉬워 긴급 대리운전보다 요금이 낮아지는 경우도 있습니다.</p>
<p>당일 긴급 탁송이나 외곽 지역 인수는 기사 이동·복귀 여건에 따라 추가 비용이 발생할 수 있습니다. 사전 예약 시 요금 변동을 줄이는 데 도움이 되지만 확정 배차와 요금 고정을 보장하지는 않습니다.</p>""",
        "long-distance-taksong": f"""<h2>{esc(location)} 장거리탁송 예약과 기사 복귀비</h2>
<p>장거리탁송은 출발·도착 지역뿐 아니라 기사 이동 거리, 차량 인수 시간, 운행 후 복귀 교통편에 따라 배차 조건이 달라집니다. 사전 예약을 통해 기사 이동 일정을 조율하면 급한 당일 요청보다 비용과 시간을 조정하기 쉬울 수 있습니다.</p>
<p>심야·주말·산간·농어촌 구간은 기사 수급이 어려워질 가능성이 있으므로 일정이 정해졌다면 미리 문의해 주세요. 실제 기사 부족 여부와 확정 금액은 상담 시 확인합니다.</p>"""
    }
    specialized_html = service_guidance.get(slug, "")
    local_notes = region.get("local_notes", [])
    local_html = ""
    if local_notes:
        local_html = "<h2>지역 이용 참고사항</h2><ul>" + "".join(f"<li>{esc(note)}</li>" for note in local_notes) + "</ul>"
    return f"""<p class="muted">전국 지역별 서비스 안내 · {esc(level)}</p>
<h1>{esc(location)} {esc(service["keyword"])}</h1>
<p>{esc(intro)}</p>
{sections}
{specialized_html}
{logistics}
{local_html}
<div class="card"><h2>{esc(location)} {esc(service["keyword"])} 지역별 이용 사례 안내</h2><p>이 지역 페이지는 공개된 지역 정보와 일반적인 서비스 이용 절차를 참고해 작성한 안내 콘텐츠입니다. 실제 고객 후기나 특정 운행을 확인한 기록이 아니라면 실제 이용 후기 또는 완료 운행으로 표시하지 않습니다.</p><h3>이 지역에서 문의할 수 있는 상황</h3><ul><li>{esc(location)}에서 출발하는 대리운전·차량 이동 상담</li><li>출발지와 도착지를 기준으로 한 요금 및 배차 가능 여부 확인</li><li>심야·주말·예약 이용 시 사전 일정 확인</li></ul><p class="muted">위 내용은 지역별 이용을 돕기 위한 일반 안내 예시이며, 실제 운행 실적이나 고객의 발언을 뜻하지 않습니다.</p></div>
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
            "slug": "daily-driver", "name": "일일기사",
            "title": "전국 일일기사·일일대리운전 상담 안내",
            "intro": "출장, 장거리 이동, 일정이 정해진 차량 운행 등 하루 단위로 기사가 필요한 경우 이용 시간과 이동 경로를 확인해 상담합니다. 기사 배정과 비용은 사전 확인이 필요합니다.",
            "sections": [
                ("일일기사 이용 전 준비사항", ["출발지와 도착지, 방문 예정 장소", "기사 이용 날짜와 시작·종료 예정 시간", "차종과 운행 조건", "대기·경유·복귀 여부"]),
                ("일일기사와 편도 대리운전", ["하루 동안 여러 장소를 이동하는 일정인지, 한 번의 편도 이동인지 구분해 알려주세요.", "편도 장거리 대리운전과 일일기사 이용 조건은 다를 수 있습니다."]),
                ("요금 및 배차 확인", ["일정, 운행 거리, 대기 시간, 지역별 기사 수급을 확인한 뒤 안내합니다.", "상담 전에는 확정 요금이나 배차 가능 여부를 보장하지 않습니다."])
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
            + '<p><strong>' + esc(PHONE) + '</strong></p><a class="btn" href="tel:18114294">전화 상담하기</a>'
            + '<a class="btn" href="https://open.kakao.com/o/sGV88r7h">카카오톡 상담</a>'
            + '<p class="muted">요금과 배차 가능 여부는 거리, 시간, 차량 및 현장 상황에 따라 달라질 수 있습니다.</p></div>'
            + '<p><a href="/">홈페이지 첫 화면으로</a> · <a href="/region/">전국 지역별 안내</a></p>'
        )
        description = item["title"] + " 및 이용 절차, 상담 전 확인사항 안내. 대표 전화 " + PHONE + "."
        out = ROOT / "service" / slug / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        if slug not in {"golf", "daily-driver"} or not out.exists():
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
<a class="btn" href="tel:18114294">전화 상담 1811-4294</a>
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
    text.textContent = '스마트전국대리운전 스마트24탁송 상담 요청\n' + fields.map(function(item) { return item[0] + ': ' + item[1]; }).join('\n');
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


def generate_topic_pages(urls):
    """Generate substantive topic landing pages for high-intent service searches."""
    topics = [
        {
            "slug": "nationwide-daeri",
            "title": "전국대리운전 | 전국 대리운전 이용 안내",
            "description": "전국대리운전·전국대리 상담 안내. 출발지와 목적지, 희망 시간, 예약 여부를 확인하고 대표전화 1811-4294로 문의하세요.",
            "intro": "전국대리운전 상담은 차량이 있는 정확한 위치와 도착할 곳, 희망 출발 시간을 준비하면 편리합니다. 스마트전국대리운전 스마트24탁송은 지역과 시간대별 배차 가능 여부를 확인해 안내합니다. 실제 배차 가능 여부는 현장 상황에 따라 달라질 수 있습니다.",
            "sections": [
                ("전국대리운전 상담 준비", ["차량이 있는 주소나 건물·주차장 이름", "도착지 주소 또는 정확한 목적지", "희망 출발 시간과 대기 필요 여부", "차량 종류와 현장 상황"]),
                ("전국대리운전 이용 키워드", ["전국대리운전", "전국 대리운전", "전국대리", "24시대리운전", "심야대리운전"]),
                ("24시·심야·새벽 대리운전", ["늦은 밤이나 새벽 이용은 지역별 기사 배차 여건이 다를 수 있어 사전 상담을 권장합니다.", "특정 시간 예약은 이용 날짜와 희망 시간을 함께 알려주세요."]),
                ("상담 진행 순서", ["출발지·도착지 확인", "요금과 배차 가능 여부 문의", "안내된 조건 확인 후 진행 결정"])
            ],
            "links": [("/service/daeri/", "대리운전 서비스"), ("/service/corporate/", "법인대리운전"), ("/service/golf/", "골프대리운전"), ("/#contact", "전화 상담")]
        },
        {
            "slug": "24-hour-service",
            "title": "24시탁송 · 24시 대리운전 상담 안내",
            "description": "24시탁송·24시 대리운전·심야탁송 상담 안내. 출발지, 도착지, 이용 날짜와 희망 시간을 확인하고 대표전화 1811-4294로 문의하세요.",
            "intro": "24시탁송 및 24시 대리운전은 야간·심야·새벽 시간대의 차량 이동을 상담하는 서비스입니다. 지역과 당일 배차 상황에 따라 가능 여부가 달라지므로 이용 날짜, 출발지, 도착지와 희망 시간을 구체적으로 알려주세요.",
            "sections": [
                ("야간 상담에 필요한 정보", ["출발지와 도착지의 정확한 위치", "오늘 또는 예약 이용 날짜", "희망 시간과 현장 대기 여부", "탁송이라면 차종과 차량 인수·인계 방법"]),
                ("24시탁송과 자동차탁송", ["24시탁송, 심야탁송, 새벽탁송은 이용 날짜와 출발·도착 위치를 기준으로 상담합니다.", "장거리 이동이나 정해진 시간의 차량 인수는 미리 상담해 주세요.", "확정 요금은 실제 이동 구간과 차량 조건을 확인한 뒤 안내합니다."]),
                ("24시탁송 검색 안내", ["주요 검색어: 24시탁송, 24시간탁송, 심야탁송, 새벽탁송, 24시 대리운전.", "상담 시 차량 이동 서비스 종류와 이동 구간을 알려주세요."])
            ],
            "links": [("/service/daeri/", "대리운전"), ("/service/taksong/", "자동차탁송"), ("/service/long-distance-taksong/", "장거리탁송"), ("/#contact", "전화 상담")]
        },
        {
            "slug": "outskirts-service",
            "title": "외곽대리운전·외곽탁송 상담 안내",
            "description": "서울·경기·인천 외곽대리운전 및 외곽탁송 상담 시 준비할 위치와 이동 정보를 안내합니다.",
            "intro": "도심 외곽, 산업단지, 교외 식당, 골프장, 외곽 주차장 등에서 출발하는 대리운전과 탁송은 정확한 만남 위치가 중요합니다. 건물명만으로 위치가 불분명하다면 도로명 주소나 주차장 입구를 함께 확인해 주세요.",
            "sections": [
                ("외곽 출발 시 확인사항", ["정확한 출발 위치와 만날 장소", "도착 주소 및 예상 이동 방향", "희망 출발 시간", "현장 진입 또는 주차 관련 안내"]),
                ("수도권 외곽 및 장거리 이동", ["서울·경기·인천 외곽에서 출발하는 경우 목적지와 시간대에 따라 배차 확인이 필요할 수 있습니다.", "장거리 차량 이동은 차량 상태와 인수·인계 일정도 함께 알려주세요."]),
                ("요금 확인", ["외곽이라는 이유만으로 고정 요금을 단정하지 않으며, 실제 구간과 시간, 차량 조건을 확인한 뒤 안내합니다."])
            ],
            "links": [("/service/daeri/", "대리운전"), ("/service/taksong/", "자동차탁송"), ("/service/long-distance-taksong/", "장거리탁송"), ("/#contact", "전화 상담")]
        },
        {
            "slug": "nationwide-transport",
            "title": "전국탁송·전국 자동차탁송 안내",
            "description": "전국탁송과 장거리 자동차탁송의 이용 절차, 차량 인수·인계 및 일정 확인사항을 안내합니다.",
            "intro": "전국탁송은 차량 매매, 정비, 출장, 이사 및 개인 일정에 맞춰 차량을 다른 지역으로 이동할 때 상담할 수 있는 서비스입니다. 출발지와 도착지, 차종, 희망 인수 시간을 정확히 준비해 주세요.",
            "sections": [
                ("탁송 상담에 필요한 정보", ["차량 인수 장소와 최종 도착 주소", "차종 및 차량 상태", "희망 인수 날짜와 시간", "키 전달과 인수·인계 방식"]),
                ("장거리탁송과 당일 일정", ["장거리 운행이나 지정 시간 인수는 일정 조율이 필요할 수 있습니다.", "요금은 실제 이동 구간과 차량 조건을 확인한 뒤 안내합니다."]),
                ("진행 순서", ["이동 구간과 차종 확인", "일정·요금·배차 가능 여부 확인", "조건 확인 후 진행 결정"])
            ],
            "links": [("/service/taksong/", "자동차탁송"), ("/service/long-distance-taksong/", "장거리탁송"), ("/#contact", "전화 상담")]
        },
        {
            "slug": "cycling-trail-transport",
            "title": "전국 자전거길 종주 탁송 안내",
            "description": "국토종주와 전국 자전거길 종주를 위한 출발지·도착지 차량 이동 상담 안내입니다.",
            "intro": "자전거길 종주를 계획할 때 출발 지점과 완주 지점이 다르면 차량 이동을 미리 준비하는 것이 편리합니다. 종주 코스, 출발지, 도착지, 희망 날짜와 시간을 정리해 탁송 상담을 진행해 주세요.",
            "sections": [
                ("종주 탁송 예약 전 준비", ["자전거길 또는 종주 코스 이름", "차량을 인수할 출발지와 도착할 장소", "이용 날짜와 예상 종료 시간", "차량 인수·인계 방법"]),
                ("주요 자전거길 관련 상담 키워드", ["국토종주탁송", "한강자전거길탁송", "낙동강자전거길탁송", "금강자전거길탁송", "영산강자전거길탁송", "섬진강자전거길탁송", "동해안자전거길탁송", "제주환상자전거길탁송"]),
                ("일정 확인", ["종주 종료 시간이 달라질 수 있으므로 예상 도착 시간과 대기 여부를 상담 시 알려주세요.", "확정된 코스별 요금이나 실제 운행 사례는 확인된 경우에만 안내합니다."])
            ],
            "links": [("/service/taksong/", "자동차탁송"), ("/service/long-distance-taksong/", "장거리탁송"), ("/#contact", "전화 상담")]
        },
        {
            "slug": "seoraksan-transport",
            "title": "설악산 종주 탁송 안내",
            "description": "설악산 오색·한계령·백담사·소공원 등 산행 출발지와 하산지 간 차량 이동 상담 안내입니다.",
            "intro": "설악산 종주 산행은 출발 지점과 하산 지점이 다를 수 있어 산행 전 차량 이동 계획을 확인하는 것이 중요합니다. 오색, 한계령, 백담사, 소공원 등 실제 이용할 지점과 날짜, 예상 하산 시간을 정리해 주세요.",
            "sections": [
                ("설악산 산행 차량 이동 경로", ["오색·오색그린야드호텔 출발 관련 상담", "한계령휴게소 출발·도착 관련 상담", "백담사와 소공원 사이 이동 상담", "오색·한계령·백담사·소공원 등 실제 지점 확인"]),
                ("예약 시 확인할 내용", ["산행 날짜와 예상 하산 시간", "출발지와 도착지의 정확한 장소", "차량 인수·인계 방법", "주말 및 성수기 사전 예약 필요 여부"]),
                ("경로와 요금", ["경로와 요금은 실제 출발·도착 지점과 일정에 따라 달라지며, 확인되지 않은 운행 사례를 임의로 게시하지 않습니다."])
            ],
            "links": [("/service/taksong/", "자동차탁송"), ("/service/long-distance-taksong/", "장거리탁송"), ("/#contact", "전화 상담")]
        },
        {
            "slug": "jirisan-transport",
            "title": "지리산 종주 탁송 안내",
            "description": "지리산 성삼재·중산리·백무동·노고단·화엄사 등 산행 구간 차량 이동 상담 안내입니다.",
            "intro": "지리산 종주는 산행 시작점과 하산 지점이 달라질 수 있으므로 출발 장소와 종료 장소를 정확히 정해 차량 이동을 상담하는 것이 좋습니다. 성삼재, 중산리, 백무동, 노고단, 화엄사 등 실제 이용 지점을 확인해 주세요.",
            "sections": [
                ("지리산 종주 경로 상담", ["성삼재와 중산리 구간", "성삼재와 백무동 구간", "노고단·화엄사 주변 이동", "대원사 등 실제 산행 시작·종료 지점"]),
                ("산행 전 예약 체크리스트", ["산행 날짜와 예상 하산 시간", "차량 출발지와 도착지", "주차 위치 및 차량 인수·인계 방식", "일정 변동 시 연락 방법"]),
                ("이용 전 확인", ["산행 시간은 날씨와 현장 상황에 따라 달라질 수 있습니다. 요금과 배차 가능 여부는 실제 이동 지점과 날짜를 확인한 뒤 안내합니다."])
            ],
            "links": [("/service/taksong/", "자동차탁송"), ("/service/long-distance-taksong/", "장거리탁송"), ("/#contact", "전화 상담")]
        },
        {
            "slug": "pension-daeri",
            "title": "펜션대리운전·펜션탁송 안내",
            "description": "펜션, 풀빌라, 리조트 이용 후 대리운전이나 차량 이동이 필요할 때 확인할 사항을 안내합니다.",
            "intro": "펜션이나 풀빌라에서 출발하는 대리운전은 숙소 이름뿐 아니라 정확한 주소와 주차 위치를 확인하면 상담이 수월합니다. 탁송이 필요한 경우에는 차량 종류와 인수 장소, 도착 주소도 함께 준비해 주세요.",
            "sections": [
                ("펜션 이용 후 대리운전", ["펜션·풀빌라의 정확한 주소와 주차장 위치", "도착지 주소와 희망 출발 시간", "주말·성수기에는 미리 배차 가능 여부 확인"]),
                ("펜션탁송 상담", ["차량을 인수할 장소와 최종 도착지", "차종과 차량 상태", "인수·인계 날짜와 시간"]),
                ("상담 안내", ["요금과 배차 가능 여부는 실제 구간과 시간대에 따라 확인합니다."])
            ],
            "links": [("/service/daeri/", "대리운전"), ("/service/taksong/", "자동차탁송"), ("/#contact", "전화 상담")]
        },
        {
            "slug": "valley-daeri",
            "title": "계곡대리운전·계곡탁송 안내",
            "description": "계곡, 유원지, 야외 휴양지에서 출발하는 대리운전과 차량 이동 상담 안내입니다.",
            "intro": "계곡이나 유원지처럼 진입로와 주차장이 여러 곳인 장소에서는 정확한 만남 위치를 알려주는 것이 중요합니다. 지도에 표시된 장소명과 주차장 이름, 출발 시간, 도착지를 준비해 주세요.",
            "sections": [
                ("계곡 대리운전 상담", ["계곡·유원지 이름과 실제 주차 위치", "도착지와 희망 출발 시간", "주말·휴일 혼잡 및 현장 접근 상황"]),
                ("계곡탁송·차량 이동", ["차량 인수 장소와 도착 주소", "차량 종류와 인수·인계 방식", "필요한 날짜와 예상 시간"]),
                ("안전한 일정 확인", ["현장 진입 가능 여부와 배차는 지역·시간대별로 확인합니다."])
            ],
            "links": [("/service/daeri/", "대리운전"), ("/service/taksong/", "자동차탁송"), ("/#contact", "전화 상담")]
        },
        {
            "slug": "camping-car-transport",
            "title": "캠핑카탁송·카라반탁송 안내",
            "description": "캠핑카, 모터홈, 카라반 및 캠핑 트레일러 차량 이동 상담 시 확인할 사항을 안내합니다.",
            "intro": "캠핑카와 카라반은 차체 크기와 높이, 중량, 차량 상태에 따라 이동 조건이 달라질 수 있습니다. 상담 전 차량 종류와 제원, 출발지·도착지, 희망 일정을 확인해 주세요.",
            "sections": [
                ("캠핑카탁송 전 확인", ["캠핑카·모터홈·카라반 등 정확한 차종", "차량 높이·길이·중량과 주행 가능 상태", "출발지와 도착지의 진입 여건", "희망 인수 날짜와 시간"]),
                ("차량 조건과 배차", ["특수한 크기나 중량의 차량은 운행 가능 조건을 사전에 확인해야 합니다.", "차량 상태와 이동 구간을 확인한 뒤 요금과 진행 가능 여부를 안내합니다."]),
                ("카라반·트레일러", ["견인 방식과 연결 상태, 관련 법규 및 운행 조건을 확인한 후 상담을 진행합니다."])
            ],
            "links": [("/service/taksong/", "자동차탁송"), ("/service/long-distance-taksong/", "장거리탁송"), ("/#contact", "전화 상담")]
        },
        {
            "slug": "truck-transport",
            "title": "1톤·2.5톤·3.5톤·5톤 화물차탁송 안내",
            "description": "1톤부터 대형 화물차까지 차량 종류와 제원에 따른 탁송 상담 전 확인사항을 안내합니다.",
            "intro": "1톤 탁송을 비롯해 2.5톤, 3.5톤, 5톤 및 대형 화물차량 이동은 차종, 적재 여부, 차량 상태와 이동 구간에 따라 운행 조건이 달라집니다. 차량 정보를 정확히 확인한 뒤 상담해 주세요.",
            "sections": [
                ("차량 종류별 상담", ["1톤·1.2톤·2.5톤·3.5톤·5톤 화물차", "8.5톤·11톤·25톤 등 대형 차량", "탑차·냉동탑차·윙바디 등 특장 차량"]),
                ("탁송 전 준비 정보", ["차량의 정확한 제원과 운행 가능 상태", "적재물 유무와 차량 인수 장소", "출발지·도착지와 희망 일정"]),
                ("운행 가능 여부 확인", ["차량 크기와 종류, 면허·운행 조건, 적재 상태에 따라 가능 여부가 달라질 수 있습니다.", "실제 조건을 확인한 뒤 요금과 배차 여부를 안내합니다."])
            ],
            "links": [("/service/taksong/", "자동차탁송"), ("/service/long-distance-taksong/", "장거리탁송"), ("/#contact", "전화 상담")]
        }
    ]
    for item in topics:
        url = f"{SITE_URL}/special/{item['slug']}/"
        urls.add(url)
        sections = []
        for heading, bullets in item["sections"]:
            sections.append("<h2>" + esc(heading) + "</h2><ul>" + "".join("<li>" + esc(b) + "</li>" for b in bullets) + "</ul>")
        links = "".join('<div class="card"><a href="' + esc(href) + '">' + esc(label) + '</a></div>' for href, label in item["links"])
        body = (
            '<p class="muted">스마트전국대리운전 스마트24탁송 · 서비스별 상세 안내</p>'
            + "<h1>" + esc(item["title"]) + "</h1>"
            + "<p>" + esc(item["intro"]) + "</p>"
            + "".join(sections)
            + '<h2>관련 서비스 바로가기</h2>' + links
            + '<p class="muted">상담 전화 ' + esc(PHONE) + ' · 카카오톡 상담 08:00~20:00</p>'
        )
        out = ROOT / "special" / item["slug"] / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        if item["slug"] not in {"nationwide-daeri", "24-hour-service"} or not out.exists():
            out.write_text(page(item["title"] + " | " + BRAND, item["description"], body, url), encoding="utf-8")

def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    regions = data.get("regions", [])
    if not regions:
        raise SystemExit("data/regions.json에 지역을 입력해야 합니다.")
    urls = {SITE_URL + "/"}
    if (ROOT / "fare" / "index.html").is_file():
        urls.add(SITE_URL + "/fare/")
    generate_service_pages(urls)
    # Never deploy an unmonitored consultation form from an older build.
    # Its contents were only assembled locally, with no operator notification.
    stale_quote = ROOT / "quote" / "index.html"
    if stale_quote.exists():
        stale_quote.unlink()
    stale_quote_dir = ROOT / "quote"
    if stale_quote_dir.exists() and not any(stale_quote_dir.iterdir()):
        stale_quote_dir.rmdir()
    # Disabled: the draft-only quote form sends no notification to operators.
    generate_topic_pages(urls)
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
<h2>{esc(location)} 지역별 이용 안내와 사례 예시</h2>
<p>{esc(location)}에서 대리운전이나 자동차탁송을 알아볼 때는 출발 위치, 도착지, 이용 날짜와 희망 시간을 먼저 정리하면 상담에 도움이 됩니다. 아래 내용은 공개된 지역 정보와 일반적인 서비스 절차를 바탕으로 만든 안내 예시이며, 특정 고객의 실제 후기나 실제 완료 운행을 의미하지 않습니다.</p>
<ul><li>{esc(location)} 대리운전: 주차 위치와 도착 주소를 확인한 뒤 요금 및 배차 가능 여부를 문의합니다.</li><li>{esc(location)} 자동차탁송: 차량 인수 장소, 도착 주소, 차종과 희망 일정을 준비합니다.</li><li>{esc(location)} 장거리탁송: 정확한 이동 구간과 차량 조건을 전달하고 일정과 요금을 확인합니다.</li></ul>
<h2>{esc(location)} 예약·배차요금·기사 수급 안내</h2>
<p>이 지역의 실제 운행후기가 아직 등록되지 않았더라도 예약 상담은 가능합니다. 출발지와 도착지, 희망 시간, 차종을 알려주시면 해당 조건에 맞는 요금과 기사 배차 가능 여부를 확인하는 순서로 안내합니다.</p>
<ul><li><strong>예약:</strong> 일정이 정해진 장거리·주말·심야 요청은 미리 상담하는 편이 좋습니다.</li><li><strong>배차요금:</strong> 거리·차종·시간대·기사 이동 및 복귀 조건에 따라 달라질 수 있으며, 확인 전에는 확정 금액을 표시하지 않습니다.</li><li><strong>기사 수급:</strong> 현재 기사 위치와 요청량에 따라 달라집니다. 외곽 지역이나 새벽에는 배차 지연 가능성을 고려해 주세요.</li></ul>
<p class="muted">이는 일반적인 서비스 안내입니다. 해당 지역에서 실제 기사 부족이나 특정 배차요금이 확인됐다는 뜻은 아닙니다.</p>
<h2>{esc(location)} 예약과 긴급 호출의 요금 차이</h2>
<p>대리운전과 탁송 모두 사전 예약으로 기사 일정이 정리되면 요금 변동을 줄이는 데 도움이 됩니다. 반면 즉시 출발하는 긴급 요청은 빠른 기사 확보가 필요해 요금이 높아질 수 있습니다. 대리운전은 약 10분 이내 도착처럼 빠른 배차를 원하는 경우가 많지만 실제 도착 시간은 보장되지 않습니다. 탁송은 차량 인수 시간에 여유가 있다면 긴급 대리운전보다 다소 저렴하게 조율될 수도 있습니다. 확정 요금은 상담으로 확인해 주세요.</p>
<h2>{esc(location)} 관련 공개 운행기록</h2>
<p>공개 운행기록 중 완료 여부가 별도로 검증된 사례만 표시합니다. 일치하는 기록이 없으면 임의의 후기를 생성하지 않습니다. 지역명이 같더라도 다른 행정구역일 수 있으므로 상세 위치는 상담 시 확인해 주세요.</p>
<div id="verified-local-rides" class="card" data-locality="{esc(name)}">공개된 완료 운행기록을 확인하는 중입니다.</div>
<p><a href="/#ride-history">전체 실제 완료 운행후기 보기 →</a></p>
<script>
(function() {{
  const el=document.getElementById('verified-local-rides');
  if(!el)return;
  const locality=el.dataset.locality.trim();
  if(locality.length<3){{el.textContent='동명이인 지역 혼동을 피하기 위해 전체 운행후기에서 확인해 주세요.';return;}}
  fetch('/smart-bunny-homepage/data/completed_trips.json',{{cache:'no-store'}})
    .then(r=>{{if(!r.ok)throw Error('unavailable');return r.json();}})
    .then(data=>{{
      const trips=Array.isArray(data.trips)?data.trips:[];
      const matched=trips.filter(t=>String(t['출발지']||'').includes(locality)||String(t['도착지']||'').includes(locality)).slice(0,8);
      el.replaceChildren();
      if(!matched.length){{el.textContent='현재 공개된 완료 운행기록 중 해당 지역명과 일치하는 사례가 없습니다.';return;}}
      const ul=document.createElement('ul');
      matched.forEach(t=>{{
        const li=document.createElement('li');
        const fare=Number(t['금액']);
        li.textContent=[t['운행일'],t['출발시간'],String(t['출발지']||'')+' → '+String(t['도착지']||''),Number.isFinite(fare)?fare.toLocaleString('ko-KR')+'원':'요금 확인 필요'].filter(Boolean).join(' · ');
        ul.appendChild(li);
      }});
      el.appendChild(ul);
    }})
    .catch(()=>{{el.textContent='현재 운행기록을 불러올 수 없습니다. 전체 운행후기를 확인해 주세요.';}});
}})();
</script>
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

    # Keep editorially verified regional landing pages in the generated sitemap.
    if (ROOT / "region" / "gangneung-taksong" / "index.html").is_file():
        urls.add(f"{SITE_URL}/region/gangneung-taksong/")
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
      link.href = '/region/' + String(region.slug || '').replace(/^\/+|\/+$/g, '') + '/';
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
    namespace = "http://www.sitemaps.org/schemas/sitemap/0.9"
    sorted_urls = sorted(sitemap_safe_url(url) for url in urls)
    chunk_size = 45000
    sitemap_files = []
    for old_file in ROOT.glob("sitemap-*.xml"):
        old_file.unlink()
    for offset in range(0, len(sorted_urls), chunk_size):
        chunk = sorted_urls[offset:offset + chunk_size]
        sitemap_name = f"sitemap-{len(sitemap_files) + 1}.xml"
        entries = "\n".join(f"  <url><loc>{esc(url)}</loc></url>" for url in chunk)
        content = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="' + namespace + '">\n' + entries + "\n</urlset>\n"
        (ROOT / sitemap_name).write_text(content, encoding="utf-8")
        sitemap_files.append(f"{SITE_URL}/{sitemap_name}")
    index_entries = "\n".join(f"  <sitemap><loc>{esc(url)}</loc></sitemap>" for url in sitemap_files)
    index_content = '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="' + namespace + '">\n' + index_entries + "\n</sitemapindex>\n"
    (ROOT / "sitemap.xml").write_text(index_content, encoding="utf-8")
    print(f"Generated {count} pages from {len(regions)} region records.")
    print(f"Created sitemap index with {len(sitemap_files)} sitemap file(s), at most {chunk_size} URLs each.")
    print("Nationwide expansion requires verified administrative-area data and useful region-specific details.")

if __name__ == "__main__":
    main()
