#!/usr/bin/env python3
"""100 live locality+service image checks; no SEO ranking claims, no mutations."""
import concurrent.futures
import json
import os
from pathlib import Path
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT=Path(__file__).resolve().parent.parent
BASE=os.environ.get("SMART24_AUDIT_BASE","https://jeongukdaeri.kr").rstrip("/")
OUT=Path(os.environ.get("SMART24_AUDIT_OUTPUT","/tmp/smart24-live-locality-100.json"))
HEADERS={"User-Agent":"Smart24-Locality-Card-Audit/1.0","Accept":"application/json,image/*"}

def fetch(path):
    req=urllib.request.Request(BASE+path,headers=HEADERS)
    for attempt in range(2):
        try:
            with urllib.request.urlopen(req,timeout=25) as res:
                return res.status,dict(res.headers),res.read()
        except (urllib.error.URLError,TimeoutError):
            if attempt: raise
            time.sleep(0.4)

def choose():
    paths=sorted((ROOT/"data"/"legal-regions").glob("[0-9][0-9].json"))
    if len(paths)!=17: raise RuntimeError("Expected 17 official locality sources")
    docs=[json.loads(path.read_text(encoding="utf-8")) for path in paths]
    selected=[doc["province"] for doc in docs]
    for doc in docs:
        names=doc["full_names"]
        if doc["province"] not in names: raise RuntimeError("Missing province "+doc["province"])
        target=next((n for n in names if len(n.split())==2 and n.endswith(("시","군","구"))),None)
        if not target: target=next((n for n in names if n!=doc["province"]),None)
        if not target: raise RuntimeError("Missing subordinate area "+doc["province"])
        selected.append(target)
    for doc in docs:
        target=next((n for n in doc["full_names"] if n.endswith(("읍","면")) and n not in selected),None)
        if target: selected.append(target)
        if len(selected)>=42: break
    for doc in reversed(docs):
        target=next((n for n in doc["full_names"] if n.endswith(("동","리")) and n not in selected),None)
        if target: selected.append(target)
        if len(selected)>=50: break
    if len(selected)!=50 or len(set(selected))!=50:
        raise RuntimeError(f"Expected 50 distinct localities; got {len(selected)}")
    return selected

def check(item):
    number,area,kind=item
    query=area+("대리운전" if kind=="daeri" else "탁송")
    started=time.perf_counter()
    result={"number":number,"query":query,"region":area,"service":kind,"passed":False}
    try:
        route="/api/region-card-preview?q="+urllib.parse.quote(query)
        status,headers,body=fetch(route)
        if status!=200: raise AssertionError("HTTP "+str(status))
        if "application/json" not in headers.get("Content-Type",""):
            raise AssertionError("Wrong content type")
        if "noindex" not in headers.get("X-Robots-Tag","").lower():
            raise AssertionError("Card JSON unexpectedly indexable")
        data=json.loads(body)
        if data.get("status")!="matched" or data.get("region")!=area:
            raise AssertionError("Wrong match/region: "+str((data.get("status"),data.get("region"))))
        cards=data.get("cards") or []
        if len(cards)!=1 or cards[0].get("kind")!=kind:
            raise AssertionError("Service mismatch or duplicated card")
        card=cards[0]
        image=card.get("image","")
        preview=card.get("previewImage","")
        if not image.startswith("/card/") or not image.endswith("-"+kind+"-brand-v5.png"):
            raise AssertionError("Wrong locality full-resolution image URL: "+image)
        if not preview.startswith("/card/") or not preview.endswith(".webp"):
            raise AssertionError("Missing/incorrect optimized WebP preview: "+preview)
        if not card.get("url","").startswith("/"+kind+"/"):
            raise AssertionError("Wrong service detail URL")
        if not re.match(r"^\d{3,4}-\d{3,4}$",card.get("phone","")):
            raise AssertionError("Invalid consultation number")
        if number%10==0:
            s,h,png=fetch(image)
            if s!=200 or "image/png" not in h.get("Content-Type","") or not png.startswith(b"\x89PNG\r\n\x1a\n"):
                raise AssertionError("Actual rendered PNG unavailable")
            result["verified_image_bytes"]=len(png)
        result["image"]=image
        result["passed"]=True
    except Exception as error:
        result["error"]=str(error)
    result["duration_ms"]=round((time.perf_counter()-started)*1000)
    return result

def main():
    areas=choose()
    cases=[(i+1,place,kind) for i,(place,kind) in enumerate((p,k) for p in areas for k in ("daeri","taksong"))]
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        results=list(pool.map(check,cases))
    passed=sum(x["passed"] for x in results)
    times=sorted(x["duration_ms"] for x in results)
    report={"base":BASE,"checks":100,"passed":passed,"failed":100-passed,
            "median_ms":times[49],"p95_ms":times[94],"results":results}
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    for r in results:
        print(("PASS" if r["passed"] else "FAIL")+f' {r["number"]:03d}/100 {r["query"]}'+
              (": "+r.get("error","") if not r["passed"] else ""),flush=True)
    print(f'SMART24_LOCALITY_CARD_100 {passed}/100 passed; median={times[49]}ms p95={times[94]}ms',flush=True)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"],"a",encoding="utf-8") as f:
            f.write(f'\n## Additional 100 live locality image checks\n\n**{passed}/100 passed**; API response median {times[49]} ms, p95 {times[94]} ms. This tests 50 official localities × 2 service identities, PNG links and 10 actual PNG bytes, **not Naver ranking or screenshot rendering**.\n\n')
            for r in results:
                if not r["passed"]: f.write(f'- FAIL {r["number"]}: {r["query"]} — {r.get("error","unknown")}\n')
    return 0 if passed==100 else 1

if __name__=="__main__":
    sys.exit(main())
