#!/usr/bin/env python3
"""Check actual HTML gzip transfer savings at 20 important customer routes."""
from urllib.request import Request,urlopen
from urllib.parse import quote
import gzip,json,os,statistics,sys

BASE=os.environ.get("SMART24_AUDIT_BASE","https://jeongukdaeri.kr").rstrip("/")
ROUTES=[
 "/","/daeri/","/taksong/","/service/golf/","/service/daily-driver/",
 "/service/corporate/","/taksong/busan/","/taksong/daegu/",
 "/taksong/ulsan/","/taksong/incheon/","/taksong/jeju/",
 "/taksong/gyeongnam/changwon-si/","/taksong/busan/gijang-gun/",
 "/daeri/busan/","/daeri/daegu/","/business/rental-car/",
 "/business/used-car/","/설악산탁송/","/지리산탁송/",
 "/special/cycling-trail-transport/"
]
assert len(ROUTES)==20
def get(path,encoding):
 url=BASE+quote(path,safe="/%")
 with urlopen(Request(url,headers={"User-Agent":"Smart24-HTML-Compression-Audit/1.0","Accept-Encoding":encoding}),timeout=30) as r:
  return r.status,{k.lower():v for k,v in r.headers.items()},r.read(2_000_000)
def run():
 rows=[]
 for p in ROUTES:
  row={"path":p,"passed":False}
  try:
   status,zhead,zbody=get(p,"gzip")
   identity,head,body=get(p,"identity")
   if status!=200 or identity!=200:raise ValueError("unexpected status")
   if head.get("content-encoding"):raise ValueError("identity unexpectedly compressed")
   if "accept-encoding" not in zhead.get("vary","").lower():raise ValueError("Vary: Accept-Encoding absent")
   if len(body)>=4096:
    if zhead.get("content-encoding")!="gzip":raise ValueError("gzip not served")
    if gzip.decompress(zbody)!=body:raise ValueError("compressed HTML is not identical to original")
    savings=round((1-len(zbody)/len(body))*100,2)
    if savings<15:raise ValueError("less than 15% transfer savings")
    row.update({"passed":True,"saved_pct":savings,"gzip_bytes":len(zbody),"html_bytes":len(body)})
   else:
    if zhead.get("content-encoding"):raise ValueError("small HTML should bypass gzip")
    if zbody!=body:raise ValueError("uncompressed HTML differs")
    row.update({"passed":True,"small_body":True,"html_bytes":len(body)})
  except Exception as exc:row["error"]=str(exc)
  rows.append(row)
 passed=sum(r["passed"] for r in rows)
 compressed=[r["saved_pct"] for r in rows if r.get("saved_pct") is not None]
 report={"checked":20,"passed":passed,"failed":20-passed,
         "median_saving_pct":round(statistics.median(compressed),2) if compressed else None,"results":rows}
 out=os.environ.get("SMART24_COMPRESSION_REPORT","/tmp/smart24-live-gzip-20.json")
 with open(out,"w",encoding="utf-8") as f:json.dump(report,f,ensure_ascii=False,indent=2)
 for r in rows:
  print(("PASS" if r["passed"] else "FAIL"),r["path"],r.get("saved_pct",r.get("error","small HTML")),flush=True)
 print("SMART24_GZIP_20 "+str(passed)+"/20 passed; median saved "+str(report["median_saving_pct"])+"%",flush=True)
 summary=os.environ.get("GITHUB_STEP_SUMMARY")
 if summary:
  with open(summary,"a",encoding="utf-8") as f:
   f.write(f"\n## Live mobile HTML transfer savings\n\n**{passed}/20 passed**; median gzip transfer savings **{report['median_saving_pct']}%** for applicable pages. Decompressed content must be byte-identical. This does not demonstrate faster full page load or Naver ranking.\n")
 return 0 if passed==20 else 1
if __name__=="__main__":sys.exit(run())
