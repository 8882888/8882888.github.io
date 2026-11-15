import json
import unittest
from unittest.mock import patch
from urllib.parse import urlencode
from tools import audit_live_seo_mobile_50 as audit

BASE=audit.BASE
AREA="서울특별시"
KIND="taksong"
QUERY=AREA+"탁송"
PAGE="/taksong/seoul/"
PNG="/card/area-123-taksong-brand-v7.png"
WEBP=PNG.replace(".png",".webp")
SVG="/api/nationwide-locality-card.svg?"+urlencode({"service":KIND,"q":QUERY})
CARD={"kind":KIND,"url":PAGE,"phone":"1811-4294","image":SVG,"previewImage":SVG}
API={"status":"matched","region":AREA,"cards":[CARD]}
WEBP_BYTES=b"RIFF"+b"ABCD"+b"WEBP"+b"x"*80

def region_html(png=PNG,webp=WEBP):
 return ('<html lang="ko"><head><title>서울탁송 안내 | 스마트24</title>'
 '<meta name="description" content="서울특별시 차량탁송 요금조회와 주차장 차량 인수 인계, 지역 서비스 상담을 안내합니다">'
 '<meta name="robots" content="index,follow"><link rel="canonical" href="'+BASE+PAGE+'"></head>'
 '<body><h1>서울탁송</h1><p>운행 가능 여부는 상담</p>'
 '<picture><source type="image/webp" srcset="'+webp+'"><img src="'+png+'" alt="서울탁송 안내"></picture>'
 '<a href="'+png+'">이미지 확대</a><a href="tel:18114294">상담</a>'
 '<a href="/fare/">요금조회</a></body></html>').encode()

class Live50VisualContractTest(unittest.TestCase):
 def test_api_svg_differs_from_one_canonical_html_png_webp_and_real_bytes(self):
  def fetch(path):
   if path.startswith("/api/region-card-preview?"):
    return 200,BASE+path,{"content-type":"application/json"},json.dumps(API).encode(),1
   if path==PAGE:return 200,BASE+path,{"content-type":"text/html"},region_html(),2
   if path==WEBP:return 200,BASE+path,{"content-type":"image/webp"},WEBP_BYTES,3
   raise AssertionError("unexpected probe "+path)
  with patch.object(audit,"fetch",side_effect=fetch):
   result=audit.inspect_case((5,AREA,KIND))
  self.assertTrue(result["passed"],result)
  self.assertEqual(result["webp_path"],WEBP)
  self.assertEqual(result["webp_bytes"],len(WEBP_BYTES))
 def test_html_locality_png_must_match_webp_and_service(self):
  def fetch(path):
   if path.startswith("/api/region-card-preview?"):
    return 200,BASE+path,{"content-type":"application/json"},json.dumps(API).encode(),1
   if path==PAGE:
    return 200,BASE+path,{"content-type":"text/html"},region_html(webp="/card/area-999-taksong-brand-v7.webp"),2
   raise AssertionError("unexpected probe "+path)
  with patch.object(audit,"fetch",side_effect=fetch):
   result=audit.inspect_case((1,AREA,KIND))
  self.assertFalse(result["passed"])
  self.assertIn("different localities",result["error"])
 def test_mountain_page_requires_approved_real_svg_not_removed_png(self):
  mountain="/설악산탁송/"
  chart="/assets/seoraksan-taksong-fares.svg"
  html=('<html><head><title>설악산탁송 코스별 요금</title>'
        '<meta name="description" content="설악산 오색과 한계령 백담사 코스별 탁송 요금과 차량회수 예약 정보를 안내합니다">'
        '<link rel="canonical" href="'+BASE+mountain+'">'
        '<meta name="robots" content="index,follow"></head>'
        '<body><h1>설악산탁송</h1>1811-4294 '
        '<section id="mountain-route-fare-table-202611"><img src="'+chart+'"></section></body></html>').encode()
  svg='<svg xmlns="http://www.w3.org/2000/svg"><text>설악산탁송 코스별 요금표</text></svg>'.encode('utf-8')
  def fetch(path):
   if path==mountain:return 200,BASE+path,{"content-type":"text/html"},html,1
   if path==chart:return 200,BASE+path,{"content-type":"image/svg+xml"},svg,2
   raise AssertionError("unexpected probe "+path)
  with patch.object(audit,"fetch",side_effect=fetch):
   result=audit.inspect_hub((48,mountain))
  self.assertTrue(result["passed"],result)
  self.assertEqual(result["verified_mountain_chart"],chart)
  self.assertEqual(result["svg_bytes"],len(svg))

if __name__=="__main__":unittest.main()
