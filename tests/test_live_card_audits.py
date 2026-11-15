import json
import unittest
from unittest.mock import patch
from urllib.parse import urlencode
from tools import audit_live_100_regional_cards as local100
from tools import audit_live_1000 as local1000

AREA="세종특별자치시"
KIND="daeri"
QUERY=AREA+"대리운전"
PAGE="/daeri/sejong/"
PNG="/card/area-123-daeri-brand-v7.png"
WEBP="/card/area-123-daeri-brand-v7.webp"
SVG="/api/nationwide-locality-card.svg?"+urlencode({"service":KIND,"q":QUERY})
CARD={"kind":KIND,"url":PAGE,"phone":"1811-4294","image":SVG,"previewImage":SVG}
API={"status":"matched","region":AREA,"cards":[CARD]}
SVG_BYTES=('<svg xmlns="http://www.w3.org/2000/svg"><title>'+QUERY+'</title></svg>').encode("utf-8")

class SafeRegionalImageAuditTests(unittest.TestCase):
    def test_one_hundred_audit_accepts_exact_service_svg_and_checks_svg_bytes(self):
        def fetch(url):
            if url.startswith("/api/region-card-preview?"):
                return 200,{"content-type":"application/json","x-robots-tag":"noindex,nofollow"},json.dumps(API).encode()
            if url==SVG:
                return 200,{"content-type":"image/svg+xml; charset=utf-8"},SVG_BYTES
            raise AssertionError("Unexpected fetch "+url)
        with patch.object(local100,"fetch",side_effect=fetch):
            item=local100.check((10,AREA,KIND))
        self.assertTrue(item["passed"],item)
        self.assertEqual(item["image"],SVG)
        self.assertEqual(item["verified_image_bytes"],len(SVG_BYTES))

    def test_one_hundred_audit_rejects_keyword_svg_for_another_service(self):
        mismatched=dict(CARD,image=SVG.replace("service=daeri","service=taksong"),
                        previewImage=SVG.replace("service=daeri","service=taksong"))
        with patch.object(local100,"fetch",return_value=(200,
             {"content-type":"application/json","x-robots-tag":"noindex,nofollow"},
             json.dumps({**API,"cards":[mismatched]}).encode())):
            item=local100.check((1,AREA,KIND))
        self.assertFalse(item["passed"])
        self.assertIn("Wrong exact-keyword SVG",item["error"])

    def test_one_thousand_audit_uses_distinct_html_v7_webp_and_search_svg(self):
        html=('<html><head><title>세종대리운전 예약 안내</title>'
            '<meta name="description" content="세종특별자치시 대리운전 실제 출발 위치와 예약 안내를 확인하고 현재 예상요금과 수령 장소를 상담합니다">'
            '<meta name="robots" content="index,follow">'
            '<meta property="og:image" content="https://jeongukdaeri.kr'+PNG+'">'
            '<link rel="canonical" href="https://jeongukdaeri.kr'+PAGE+'">'
            '</head><body><h1>세종대리운전</h1>'
            '<a href="'+PNG+'">명함 확대</a><picture>'
            '<source type="image/webp" srcset="'+WEBP+'">'
            '<img src="'+PNG+'" alt="세종대리운전 텍스트 안내 명함"></picture>'
            '<a href="tel:18114294">상담</a><a href="/fare/">요금조회</a></body></html>').encode()
        webp=b"RIFF"+b"ABCD"+b"WEBP"+b"x"*1600
        def fetch(url):
            if url.startswith("/api/region-card-preview?"):
                return 200,"https://jeongukdaeri.kr"+url,{"content-type":"application/json","x-robots-tag":"noindex,nofollow"},json.dumps(API).encode(),3
            if url==PAGE:
                return 200,"https://jeongukdaeri.kr"+PAGE,{"content-type":"text/html; charset=utf-8"},html,5
            if url==WEBP:
                return 200,"https://jeongukdaeri.kr"+WEBP,{"content-type":"image/webp","etag":'"safe-v7"',"cache-control":"public, max-age=3600"},webp,2
            raise AssertionError("Unexpected fetch "+url)
        with patch.object(local1000,"fetch",side_effect=fetch):
            seo,image=local1000.inspect((1,AREA,"province",KIND))
        self.assertTrue(seo["passed"],seo)
        self.assertTrue(image["passed"],image)
        self.assertEqual(image["image"],WEBP)
        self.assertEqual(seo["path"],PAGE)
        self.assertNotEqual(SVG,WEBP)

if __name__=="__main__":
    unittest.main()
