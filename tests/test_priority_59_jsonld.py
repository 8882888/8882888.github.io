import json
import unittest
from tools.audit_live_priority_59_jsonld import assess,BASE,RECORDS

class Priority59SchemaValidation(unittest.TestCase):
    def make_html(self,row=None,kind=None,**patch):
        row=row or next(r for r in RECORDS if r["kind"]=="daeri" and r["region"]=="서울특별시")
        kind=kind or row["kind"]
        path="/"+kind+"/sample-region/"
        canon=BASE+path
        text=row["detail"]
        title=row["region"]+("자동차탁송" if kind=="taksong" else "대리운전")
        desc=title+" 출발 위치, 예약 시간과 기사 복귀 동선 등 실제 고객 상담 준비사항을 상세히 안내합니다."
        service={"@type":"Service","serviceType":"자동차탁송" if kind=="taksong" else "대리운전",
                 "areaServed":{"@type":"AdministrativeArea","name":row["region"]},
                 "provider":{"@type":"LocalBusiness","name":"전국대리운전","@id":BASE+"/#organization","telephone":"1877-5245" if row["region"]=="제주특별자치도" and kind=="taksong" else "1811-4294"}}
        web={"@type":"WebPage","@id":canon,"url":canon,"name":title,"description":desc,
             "inLanguage":"ko-KR","breadcrumb":{"@id":canon+"#breadcrumb"},"about":service}
        bread={"@type":"BreadcrumbList","@id":canon+"#breadcrumb",
               "itemListElement":[
                {"@type":"ListItem","position":1,"name":"홈","item":BASE+"/"},
                {"@type":"ListItem","position":2,"name":"전국","item":BASE+"/"+kind+"/"},
                {"@type":"ListItem","position":3,"name":"지역","item":canon}]}
        for key,value in patch.get("web",{}).items():web[key]=value
        if "crumb" in patch:bread.update(patch["crumb"])
        payload=json.dumps({"@context":"https://schema.org","@graph":[web,bread]},ensure_ascii=False)
        robots=patch.get("robots","index,follow")
        detail=patch.get("detail",text)
        src=('<html lang="ko"><head><title>'+title+' | SMART24</title>'
             '<meta name="description" content="'+desc+'">'
             '<meta name="robots" content="'+robots+'">'
             '<link rel="canonical" href="'+canon+'">'
             '</head><body><h1>'+title+'</h1>'
             '<section id="priority-region-guide"><h2>'+row["topic"]+'</h2><p>'+detail+'</p></section>'
             '<script type="application/ld+json">'+payload+'</script></body></html>')
        return path,src

    def test_valid_webpage_service_and_breadcrumb(self):
        row=next(r for r in RECORDS if r["kind"]=="daeri" and r["region"]=="서울특별시")
        path,src=self.make_html(row)
        result=assess(path,src,[row])
        self.assertTrue(result["passed"],result)
        self.assertEqual(result["source_row"],"daeri|서울특별시")

    def test_description_language_and_area_must_match_visible_content(self):
        row=next(r for r in RECORDS if r["kind"]=="daeri" and r["region"]=="서울특별시")
        path,src=self.make_html(row,web={"description":"Unrelated description","inLanguage":"en",
                          "about":{"@type":"Service","serviceType":"자동차탁송",
                                   "areaServed":{"name":"부산광역시"},"provider":{"telephone":"010-0000-0000"}}})
        result=assess(path,src,[row])
        self.assertFalse(result["passed"])
        for error in ["webpage_description_mismatch","webpage_language_missing",
                      "webpage_service_type_wrong","webpage_served_area_wrong","webpage_provider_phone_wrong",
                      "webpage_provider_type_wrong","webpage_provider_id_wrong"]:
            self.assertIn(error,result["errors"])

    def test_wrong_business_name_with_valid_id_is_rejected(self):
        row=RECORDS[0]
        path,src=self.make_html(row)
        old_name=json.dumps("전국대리운전",ensure_ascii=False)
        src=src.replace('"name": '+old_name, '"name": "다른 업체"')
        self.assertIn("webpage_provider_name_wrong",assess(path,src,[row])["errors"])

    def test_noindex_or_nonmatching_editorial_is_rejected(self):
        row=next(r for r in RECORDS if r["kind"]=="daeri" and r["region"]=="서울특별시")
        path,src=self.make_html(row,robots="noindex,follow",detail="Duplicated generic marketing filler.")
        result=assess(path,src,[row])
        self.assertIn("reviewed_page_noindex",result["errors"])
        self.assertIn("missing_or_duplicate_exact_source_description",result["errors"])

    def test_breadcrumb_must_point_to_canonical(self):
        row=next(r for r in RECORDS if r["kind"]=="daeri" and r["region"]=="서울특별시")
        path,src=self.make_html(row,crumb={"itemListElement":[
            {"position":1,"item":BASE+"/"},{"position":2,"item":BASE+"/daeri/"},
            {"position":3,"item":BASE+"/daeri/elsewhere/"}]})
        result=assess(path,src,[row])
        self.assertIn("breadcrumb_does_not_end_at_canonical",result["errors"])

    def test_jeju_dedicated_taksong_phone(self):
        # Synthetic fixture checks the dedicated Jeju provider number; Jeju is
        # not one of the source-backed 59 regions in this specific sitemap.
        row={"kind":"taksong","region":"제주특별자치도",
             "topic":"제주항 차량 인계 준비","detail":"제주항의 차량 선적 위치와 인수 담당자, 도착 시각을 사전에 구분합니다."}
        path,src=self.make_html(row)
        result=assess(path,src,[row])
        self.assertTrue(result["passed"],result)

if __name__=="__main__":
    unittest.main()
