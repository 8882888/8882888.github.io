#!/usr/bin/env python3
"""50 production SEO/mobile card checks, keeping historic fare and ride records immutable.

40 priority administrative-service HTML pages plus 10 customer-critical hubs.
This checks the actual production HTTP responses, not Naver rankings or a visual screenshot.
"""
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import statistics
import sys
import time
from urllib.parse import quote, unquote, urlencode, urlparse
from urllib.request import Request, urlopen

BASE=os.environ.get("SMART24_AUDIT_BASE","https://jeongukdaeri.kr").rstrip("/")
OUT=Path(os.environ.get("SMART24_AUDIT_OUTPUT","/tmp/smart24-live-seo-mobile-50.json"))
HEADERS={"User-Agent":"Smart24-Fifty-Page-SEO-Audit/1.0","Accept":"text/html,application/json"}
AREAS=[
 "서울특별시","부산광역시","대구광역시","인천광역시","광주광역시",
 "대전광역시","울산광역시","제주특별자치도","부산광역시 기장군",
 "부산광역시 해운대구","대구광역시 수성구","대구광역시 달서구",
 "인천광역시 부평구","울산광역시 남구","울산광역시 울주군",
 "경상남도 창원시","경상남도 김해시","강원특별자치도 속초시",
 "강원특별자치도 강릉시","세종특별자치시 조치원읍"
]
HUBS=[
 "/","/taksong/","/daeri/","/fare/","/service/golf/",
 "/service/daily-driver/","/service/corporate/","/설악산탁송/",
 "/지리산탁송/","/special/cycling-trail-transport/"
]
assert len(AREAS)==20 and len(HUBS)==10
def fetch(route):
    u=BASE+quote(route,safe="/%?=&+")  # Retain form-encoded + as a query separator for spaces
    req=Request(u,headers=HEADERS)
    t0=time.monotonic()
    with urlopen(req,timeout=26) as response:
        status=response.status
        resolved=response.url
        headers={k.lower():v for k,v in response.headers.items()}
        data=response.read(2_500_000)
    return status,resolved,headers,data,round(1000*(time.monotonic()-t0))
class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title=""
        self.in_title=False
        self.h1=0
        self.meta={}
        self.canon=[]
        self.images=[]
        self.sources=[]
        self.links=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=="title":self.in_title=True
        if tag=="h1":self.h1+=1
        if tag=="meta":
            key=a.get("name",a.get("property","")).lower()
            self.meta[key]=a.get("content","")
        if tag=="link" and a.get("rel")=="canonical":
            self.canon.append(a.get("href",""))
        if tag=="img":self.images.append(a)
        if tag=="source":self.sources.append(a)
        if tag=="a":self.links.append(a.get("href",""))
    def handle_endtag(self,tag):
        if tag=="title":self.in_title=False
    def handle_data(self,data):
        if self.in_title:self.title+=data

def inspect_case(t):
    number,area,kind=t
    query=area+("탁송" if kind=="taksong" else "대리운전")
    result={"id":number,"type":"region","query":query,"passed":False}
    try:
        route="/api/region-card-preview?"+urlencode({"q":query})
        code,_,_,payload,api_ms=fetch(route)
        if code!=200:raise ValueError("region API HTTP "+str(code))
        info=json.loads(payload)
        if info.get("status")!="matched":raise ValueError("not matched: "+str(info.get("status")))
        cards=info.get("cards",[])
        if len(cards)!=1 or cards[0].get("kind")!=kind:
            raise ValueError("service visual mismatch")
        c=cards[0]
        if info.get("region") not in (area,area.replace(" 조치원읍"," (직할) 조치원읍")):
            raise ValueError("wrong region: "+str(info.get("region")))
        path=c.get("url","")
        if not path.startswith("/"+kind+"/"):raise ValueError("wrong region URL: "+path)
        code,final,headers,payload,page_ms=fetch(path)
        if code!=200:raise ValueError("page HTTP "+str(code))
        if not headers.get("content-type","").startswith("text/html"):raise ValueError("wrong page media type")
        body=payload.decode("utf-8","replace")
        parsed=Parser();parsed.feed(body)
        expected=BASE+path
        if len(parsed.canon)!=1 or unquote(parsed.canon[0])!=unquote(expected):
            raise ValueError("noncanonical page: "+str(parsed.canon))
        if not parsed.title.strip() or len(parsed.meta.get("description",""))<35:
            raise ValueError("empty/thin metadata")
        if kind=="taksong" and "탁송" not in parsed.title:raise ValueError("wrong taksong title")
        if kind=="daeri" and "대리운전" not in parsed.title:raise ValueError("wrong driver title")
        if "noindex" in parsed.meta.get("robots","").lower() or "noindex" in headers.get("x-robots-tag","").lower():
            raise ValueError("unexpected noindex")
        if parsed.h1!=1:raise ValueError("not exactly one h1")
        if c.get("image") not in [im.get("src") for im in parsed.images]:
            raise ValueError("missing PNG fallback image")
        if c.get("previewImage") not in [im.get("srcset") for im in parsed.sources if im.get("type")=="image/webp"]:
            raise ValueError("missing mobile WebP picture source")
        if c.get("image") not in parsed.links:raise ValueError("PNG zoom link unavailable")
        if "tel:"+str(c.get("phone","")).replace("-","") not in parsed.links:
            raise ValueError("missing local call link")
        if number%5==0:
            image_code,_,image_headers,image_bytes,image_ms=fetch(c.get("previewImage",""))
            if image_code!=200 or "image/webp" not in image_headers.get("content-type",""):
                raise ValueError("WebP mobile image was not served")
            if image_bytes[:4]!=b"RIFF" or image_bytes[8:12]!=b"WEBP":
                raise ValueError("Invalid mobile WebP bytes")
            if len(image_bytes)>1_000_000:
                raise ValueError("Mobile preview exceeds 1 MB")
            result.update({"webp_bytes":len(image_bytes),"webp_ms":image_ms})
        if "/fare/" not in body:raise ValueError("missing fare navigation")
        if "href" not in body or "운행" not in body:raise ValueError("missing service information")
        result.update({"passed":True,"page":path,"title":parsed.title,"api_ms":api_ms,"html_ms":page_ms,"html_bytes":len(payload)})
    except Exception as exc:result["error"]=str(exc)
    return result

def inspect_hub(t):
    number,path=t
    result={"id":number,"type":"hub","page":path,"passed":False}
    try:
        code,final,headers,payload,ms=fetch(path)
        body=payload.decode("utf-8","replace")
        p=Parser();p.feed(body)
        if code!=200:raise ValueError("HTTP "+str(code))
        if len(p.canon)!=1 or unquote(p.canon[0])!=unquote(BASE+path):
            raise ValueError("missing or wrong canonical "+str(p.canon))
        if not p.title.strip() or len(p.meta.get("description",""))<28:
            raise ValueError("missing title/description")
        if "noindex" in p.meta.get("robots","").lower() or "noindex" in headers.get("x-robots-tag","").lower():
            raise ValueError("hub accidentally noindexed")
        if p.h1<1:raise ValueError("no visible h1")
        if "1811-4294" not in body:raise ValueError("missing consultation number")
        if path=="/설악산탁송/" and ("mountain-route-fare-table-202611" not in body or "seoraksan-taksong-original-fare.png" not in body):
            raise ValueError("Seoraksan historic fare/visual missing")
        if path=="/지리산탁송/" and ("mountain-route-fare-table-202611" not in body or "jirisan-taksong-original-fare.png" not in body):
            raise ValueError("Jirisan historic fare/visual missing")
        if path=="/special/cycling-trail-transport/" and "cycling-route-fare-table-202611" not in body:
            raise ValueError("Cycling historic fares missing")
        if path=="/" and "data-card-preview-form" not in body:
            raise ValueError("homepage search form absent")
        result.update({"passed":True,"html_ms":ms,"html_bytes":len(payload),"title":p.title})
    except Exception as exc:result["error"]=str(exc)
    return result

def main():
    reg=[(i+1,area,kind) for i,(area,kind) in enumerate((a,k) for a in AREAS for k in ("taksong","daeri"))]
    hubs=[(i+41,path) for i,path in enumerate(HUBS)]
    with ThreadPoolExecutor(max_workers=4) as pool:
        regional=list(pool.map(inspect_case,reg))
        hub=list(pool.map(inspect_hub,hubs))
    results=regional+hub
    assert len(results)==50
    titles=[r.get("title") for r in regional if r["passed"]]
    if len(titles)!=len(set(titles)):
        duplicate={x for x in titles if titles.count(x)>1}
        for r in regional:
            if r.get("title") in duplicate:
                r["passed"]=False;r["error"]="duplicate regional SEO title"
    passed=sum(1 for x in results if x["passed"])
    timings=sorted(x["html_ms"] for x in results if x["passed"])
    report={"base":BASE,"checked":50,"passed":passed,"failed":50-passed,
        "html_median_ms":round(statistics.median(timings)) if timings else None,
        "html_p95_ms":timings[int((len(timings)-1)*.95)] if timings else None,
        "results":results}
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    for r in results:
        print(("PASS " if r["passed"] else "FAIL ")+f'{r["id"]:03d}/050 '+(r.get("query") or r.get("page",""))+(" — "+r["error"] if not r["passed"] else ""),flush=True)
    print("SMART24_LIVE_SEO_MOBILE_50 "+str(passed)+"/50 passed",flush=True)
    summary=os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary,"a",encoding="utf-8") as f:
            f.write(f"\n## Live SEO + mobile 50-page audit\n\n**{passed}/50 passed**. Verified 40 region/service pages and 10 priority hubs against actual production. No Naver ranking claim.\n\n")
            for r in results:
                if not r["passed"]:f.write(f'- FAIL {r["id"]}: {r.get("query",r.get("page"))}: {r.get("error")}\n')
    return 0 if passed==50 else 1
if __name__=="__main__":
    sys.exit(main())
