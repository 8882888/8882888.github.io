#!/usr/bin/env python3
"""Regression test for nationwide review-first regional page generation."""
import importlib.util
from pathlib import Path
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("regional_generator",root/"tools/generate_pages.py")
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
source=[{"title":"부산탁송 운행완료 후기｜연산동→경산","url":"https://blog.naver.com/wjdtnr4757/224445300887"},
        {"title":"서구탁송 운행완료 후기","url":"https://blog.naver.com/wjdtnr4757/123456789"},
        {"title":"대구탁송 예약 이용 안내","url":"https://blog.naver.com/wjdtnr4757/123456790"}]
region={"name":"부산광역시","parent_name":"대한민국","level":"시도"}
service={"slug":"taksong","keyword":"자동차탁송"}
result=mod.service_body("대한민국 부산광역시","시도",service,region,source)
assert result.index('id="verified-region-reviews-first"') < result.index("<h1>"),"Review must be before generic heading"
assert "224445300887" in result,"verified original must appear"
assert "123456789" not in result,"ambiguous district must not appear in Busan-wide evidence"
assert "tel:18114294" in result and "/fare/" in result
district={"name":"서구","parent_name":"부산광역시","level":"구"}
ambiguous=mod.verified_regional_review("부산광역시 서구","구",service,district,source)
assert "123456789" not in ambiguous,"unqualified district must not be assigned"
assert "완료 운행 글 제목" not in ambiguous,"no fake successful case"
print("PASS: nationwide region generator prioritizes verified sources; ambiguous districts rejected")
