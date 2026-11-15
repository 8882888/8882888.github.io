#!/usr/bin/env python3
"""1000 live checks: 250 localities x 2 services x (HTML SEO + approved v7 WebP).
Only reads production HTTP endpoints; does not change ride records or pricing.
"""
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
import json,os,statistics,sys,time,re
from pathlib import Path
from urllib.parse import quote,unquote,urlencode,urlsplit,parse_qs
from urllib.request import Request,urlopen
from urllib.error import HTTPError,URLError

ROOT=Path(__file__).resolve().parent.parent
BASE=os.environ.get("SMART24_AUDIT_BASE","https://jeongukdaeri.kr").rstrip("/")
OUT=Path(os.environ.get("SMART24_1000_REPORT","/tmp/smart24-live-1000.json"))
HEADERS={"User-Agent":"Smart24-500-Live-SEO-Image-Audit","Accept":"text/html,application/json,image/webp"}
LIMITS={"province":17,"district":67,"town":83,"village":83}
assert sum(LIMITS.values())==250

class Page(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True)
  self.title="";self.in_title=False;self.h1=0;self.meta={};self.canonical=[];self.img=[];self.sources=[];self.links=[]
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if tag=="title":self.in_title=True
  elif tag=="h1":self.h1+=1
  elif tag=="meta":self.meta[d.get("name",d.get("property","")).lower()]=d.get("content","")
  elif tag=="link" and d.get("rel")=="canonical":self.canonical.append(d.get("href",""))
  elif tag=="img":self.img.append(d)
  elif tag=="source":self.sources.append(d)
  elif tag=="a":self.links.append(d.get("href",""))
 def handle_endtag(self,tag):
  if tag=="title":self.in_title=False
 def handle_data(self,data):
  if self.in_title:self.title+=data

def fetch(path):
 request=Request(BASE+quote(path,safe="/%?=&+"),headers=HEADERS)
 last=None
 for attempt in range(2):
  started=time.monotonic()
  try:
   with urlopen(request,timeout=26) as response:
    return response.status,response.url,{k.lower():v for k,v in response.headers.items()},response.read(3_000_000),int((time.monotonic()-started)*1000)
  except (HTTPError,URLError,TimeoutError) as error:
   last=error
   if isinstance(error,HTTPError) and 400<=error.code<500 and error.code!=429:break
   if attempt==0:time.sleep(.3)
 raise RuntimeError(str(last))

def choose():
 files=sorted((ROOT/"data"/"legal-regions").glob("[0-9][0-9].json"))
 if len(files)!=17:raise RuntimeError("need 17 provincial legal-region files")
 docs=[json.loads(f.read_text(encoding="utf-8")) for f in files]
 selected=[(d["province"],"province") for d in docs]
 for d in docs:
  if d["province"] not in d["full_names"]:raise RuntimeError("missing province "+d["province"])
 used={x[0] for x in selected}
 for level,count in (("district",67),("town",83),("village",83)):
  def match(name):
   tail=name.split(" ")[-1]
   return ((level=="district" and tail.endswith(("시","군","구"))) or
           (level=="town" and tail.endswith(("읍","면"))) or
           (level=="village" and tail.endswith(("동","리"))))
  part=[]
  while len(part)<count:
   progress=False
   for doc in docs:
    name=next((n for n in doc["full_names"] if n.startswith(doc["province"]+" ") and n not in used and match(n)),None)
    if name:
     part.append((name,level));used.add(name);progress=True
     if len(part)==count:break
   if not progress:raise RuntimeError("not enough "+level+" regions")
  selected.extend(part)
 if len(selected)!=250 or len(used)!=250:raise RuntimeError("250 unique locality selection failed")
 return selected

def inspect(item):
 number,area,level,kind=item
 query=area.replace(" (직할)","")+("탁송" if kind=="taksong" else "대리운전")
 a={"id":number*2-1,"category":"html-seo","area":area,"level":level,"service":kind,"query":query,"passed":False}
 b={"id":number*2,"category":"live-webp","area":area,"level":level,"service":kind,"query":query,"passed":False}
 card=None
 webp=None
 try:
  status,_,headers,raw,api_ms=fetch("/api/region-card-preview?"+urlencode({"q":query}))
  if status!=200 or "application/json" not in headers.get("content-type",""):raise ValueError("region API HTTP or MIME failure")
  if "noindex" not in headers.get("x-robots-tag","").lower():raise ValueError("JSON crawl directive absent")
  data=json.loads(raw)
  if data.get("status")!="matched" or data.get("region")!=area:raise ValueError("wrong matched region: "+str((data.get("status"),data.get("region"))))
  cards=data.get("cards") or []
  if len(cards)!=1 or cards[0].get("kind")!=kind:raise ValueError("service card mismatch")
  card=cards[0]
  page=card.get("url","")
  keyword_svg=card.get("image","")
  keyword_preview=card.get("previewImage","")
  if not page.startswith("/"+kind+"/") or not page.endswith("/"):raise ValueError("wrong service page")
  parsed=urlsplit(keyword_svg)
  params=parse_qs(parsed.query)
  if (parsed.path!="/api/nationwide-locality-card.svg" or
      params.get("service")!=[kind] or params.get("q")!=[query] or
      keyword_preview!=keyword_svg):
   raise ValueError("wrong exact-locality text-only SVG card URL")
  # API search cards are exact-query SVGs; published service pages separately
  # contain an approved, stable per-locality v7 PNG with a v7 WebP source.
  status,_,headers,raw,html_ms=fetch(page)
  if status!=200 or "text/html" not in headers.get("content-type",""):raise ValueError("landing page HTTP or MIME failure")
  p=Page();p.feed(raw.decode("utf-8","replace"))
  if len(p.canonical)!=1 or unquote(p.canonical[0])!=unquote(BASE+page):raise ValueError("canonical mismatch")
  if (kind=="taksong" and "탁송" not in p.title) or (kind=="daeri" and "대리운전" not in p.title):raise ValueError("title missing service")
  if len(p.meta.get("description",""))<35 or p.h1!=1:raise ValueError("SEO description or H1 missing")
  has_noindex="noindex" in p.meta.get("robots","").lower() or "noindex" in headers.get("x-robots-tag","").lower()
  source_empty='id="source-empty-village-20261107"' in raw.decode("utf-8","replace")
  if level!="village" and has_noindex:raise ValueError("indexable region noindexed")
  if source_empty:
   # An evidence-empty 리 must intentionally be a small, noindex quote/
   # phone page, without any synthetic location poster. Checking for WebP
   # on these pages would reward publishing fabricated "local" content.
   html=raw.decode("utf-8","replace")
   if level!="village" or not has_noindex:
    raise ValueError("source-empty village must remain noindex")
   if p.img or any(src.get("srcset") for src in p.sources):
    raise ValueError("unexpected imagery on source-empty village page")
   if '<form action="/fare/"' not in html:
    raise ValueError("source-empty village missing direct fare lookup")
   if "tel:"+str(card.get("phone","")).replace("-","") not in p.links:
    raise ValueError("source-empty village missing phone CTA")
   if "완료 운행내역은 현재 확인되지 않았" not in html:
    raise ValueError("source-empty village missing truthful no-ride disclosure")
   a.update({"passed":True,"path":page,"title":p.title,"api_ms":api_ms,"html_ms":html_ms,
             "html_bytes":len(raw),"noindex":True,"indexability":"intentional-noindex-no-evidence"})
   b.update({"passed":True,"category":"source-empty-noimage","skipped":True,
             "image":None,"reason":"No regional image should be promoted without real locality evidence"})
   return a,b
  pngs=[img.get("src","") for img in p.img if re.fullmatch(r"/card/area-\d+-"+kind+r"-brand-v7\.png",img.get("src",""))]
  webps=[src.get("srcset","") for src in p.sources if src.get("type")=="image/webp" and
         re.fullmatch(r"/card/area-\d+-"+kind+r"-brand-v7\.webp",src.get("srcset",""))]
  if len(pngs)!=1:raise ValueError("expected one approved v7 locality PNG in rendered HTML")
  if len(webps)!=1:raise ValueError("expected one approved v7 locality WebP in rendered HTML")
  png=pngs[0];webp=webps[0]
  if png.replace(".png",".webp")!=webp:raise ValueError("HTML PNG and WebP regions differ")
  if png not in p.links:raise ValueError("large-image link absent")
  if "tel:"+str(card.get("phone","")).replace("-","") not in p.links:raise ValueError("telephone CTA absent")
  if not any(link and link.startswith("/fare/") for link in p.links):raise ValueError("fare link absent")
  if p.meta.get("og:image","")!=BASE+png:raise ValueError("wrong OG region image")
  a.update({"passed":True,"path":page,"title":p.title,"api_ms":api_ms,"html_ms":html_ms,"html_bytes":len(raw),
            "noindex":("noindex" in p.meta.get("robots","").lower())})
 except Exception as error:a["error"]=str(error)
 if card:
  try:
   if not webp:raise ValueError("Could not confirm an approved WebP asset from rendered canonical HTML")
   status,_,headers,raw,webp_ms=fetch(webp)
   if status!=200 or "image/webp" not in headers.get("content-type",""):raise ValueError("WebP HTTP/MIME failure")
   if len(raw)<1000 or raw[:4]!=b"RIFF" or raw[8:12]!=b"WEBP":raise ValueError("bad WebP file signature")
   if len(raw)>1_000_000:raise ValueError("mobile WebP exceeds 1MB")
   if not headers.get("etag") or "max-age" not in headers.get("cache-control",""):raise ValueError("image caching headers absent")
   b.update({"passed":True,"image":webp,"bytes":len(raw),"webp_ms":webp_ms})
  except Exception as error:b["error"]=str(error)
 else:b["error"]="API did not identify a corresponding image"
 return a,b

def main():
 samples=choose()
 cases=[(i+1,area,level,kind) for i,(area,level,kind) in enumerate((area,level,kind) for area,level in samples for kind in ("taksong","daeri"))]
 with ThreadPoolExecutor(max_workers=5) as pool:groups=list(pool.map(inspect,cases))
 results=[row for pair in groups for row in pair]
 if len(results)!=1000:raise RuntimeError("not exactly 1000 independent checks")
 titles={}
 for row in results:
  if row["category"]=="html-seo" and row["passed"]:
   prior=titles.get(row["title"])
   if prior:
    prior.update({"passed":False,"error":"duplicate SEO title with "+str(row["id"])})
    row.update({"passed":False,"error":"duplicate SEO title with "+str(prior["id"])})
   else:titles[row["title"]]=row
 passed=sum(r["passed"] for r in results)
 html=[r["html_ms"] for r in results if r["category"]=="html-seo" and r["passed"]]
 webp=[r["bytes"] for r in results if r["category"]=="live-webp" and r["passed"]]
 policy_noimage=sum(r["category"]=="source-empty-noimage" and r["passed"] for r in results)
 actual_webp=sum(r["category"]=="live-webp" and r["passed"] for r in results)
 report={"base":BASE,"checks":1000,"passed":passed,"failed":1000-passed,"localities":250,
         "service_combinations":500,"approved_webp_verified":actual_webp,"source_empty_noindex_noimage":policy_noimage,
         "levels":{k:sum(1 for x in samples if x[1]==k) for k in LIMITS},
         "html_median_ms":round(statistics.median(html)) if html else None,
         "webp_median_bytes":round(statistics.median(webp)) if webp else None,"results":results}
 OUT.parent.mkdir(parents=True,exist_ok=True)
 OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 for row in results:
  if not row["passed"]:print(f'FAIL {row["id"]:04d}/1000 {row["category"]} {row["query"]}: {row.get("error","unknown")}',flush=True)
 print(f'SMART24_LIVE_1000 {passed}/1000 policy checks passed; {1000-passed} failed; {actual_webp} actual WebP verified; {policy_noimage} intentionally noimage/noindex',flush=True)
 if os.environ.get("GITHUB_STEP_SUMMARY"):
  with open(os.environ["GITHUB_STEP_SUMMARY"],"a",encoding="utf-8") as f:
   f.write(f'\n## 1000 live locality SEO and image-policy checks\n\n**{passed}/1000 passed**; {1000-passed} failed. **{actual_webp} actual WebP** responses verified, **{policy_noimage} intentionally noindex/noimage** checks. 250 localities × 2 services × 2 distinct contracts. This does not establish Naver indexing or ranking.\n\n')
   for row in results:
    if not row["passed"]:f.write(f'- {row["id"]}: {row["query"]} {row["category"]} — {row.get("error","unknown")}\n')
 return 0 if passed==1000 else 1
if __name__=="__main__":sys.exit(main())
