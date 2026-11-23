#!/usr/bin/env python3
"""Read-only canonical, visible evidence and JSON-LD review of 59 curated regional URLs.

Does NOT establish genuine Naver crawler visits, indexing or rank. Never edits
the source, submits IndexNow, publishes content or creates synthetic records.
"""
import concurrent.futures
import html
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parent.parent
BASE=os.environ.get("SMART24_AUDIT_BASE","https://jeongukdaeri.kr").rstrip("/")
OUT=Path(os.environ.get("SMART24_PRIORITY_JSONLD_REPORT","/tmp/smart24-priority-59-jsonld.json"))
RECORDS=json.loads((ROOT/"data"/"priority-regions.json").read_text(encoding="utf-8"))["pages"]
NS={"s":"http://www.sitemaps.org/schemas/sitemap/0.9"}
HEADERS={"User-Agent":"Smart24-Reviewed-JSONLD-Audit/1.0","Accept":"text/html,application/xml"}
SPACES=re.compile(r"\s+")
MARKER=re.compile(r'<section\b[^>]*\bid=["\']priority-region-guide["\'][^>]*>(.*?)</section>',re.I|re.S)

def normalize(value):
    return SPACES.sub(" ",html.unescape(re.sub(r"<[^>]+>"," ",str(value)))).strip()

def fetch(path):
    last=None
    for attempt in range(2):
        try:
            with urlopen(Request(BASE+path,headers=HEADERS),timeout=22) as response:
                return response.status,{k.lower():v for k,v in response.headers.items()},response.read(2_800_000)
        except (HTTPError,URLError,TimeoutError) as ex:
            last=ex
            if isinstance(ex,HTTPError) and ex.code not in (429,503):break
            if attempt==0:time.sleep(.3)
    raise RuntimeError(str(last))

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.meta={}
        self.canonicals=[]
        self.scripts=[]
        self.inside_script=False
        self.inside_title=False
        self.title=""
        self.h1_count=0
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if tag=="meta":
            self.meta[(d.get("name") or d.get("property") or "").lower()]=d.get("content","")
        elif tag=="link" and "canonical" in (d.get("rel","").lower().split()):
            self.canonicals.append(d.get("href",""))
        elif tag=="script" and d.get("type","").lower()=="application/ld+json":
            self.inside_script=True
            self.scripts.append("")
        elif tag=="title":
            self.inside_title=True
        elif tag=="h1":
            self.h1_count+=1
    def handle_data(self,data):
        if self.inside_script:self.scripts[-1]+=data
        if self.inside_title:self.title+=data
    def handle_endtag(self,tag):
        if tag=="script":self.inside_script=False
        elif tag=="title":self.inside_title=False

def nodes_from_ld(raw_json):
    obj=json.loads(raw_json)
    if isinstance(obj,list):
        return [n for graph in obj for n in nodes_from_ld(json.dumps(graph))]
    if not isinstance(obj,dict):raise ValueError("JSON-LD root must be an object")
    return obj.get("@graph",[]) if isinstance(obj.get("@graph"),list) else [obj]

def assess(path,page,records=RECORDS):
    result={"path":path,"passed":False,"source_row":None}
    errors=[]
    canonical=BASE+path
    parsed=Page();parsed.feed(page)
    if len(parsed.canonicals)!=1 or parsed.canonicals[0]!=canonical:errors.append("wrong_or_duplicate_canonical")
    if parsed.h1_count!=1 or not parsed.title:errors.append("missing_or_duplicate_h1_title")
    if "noindex" in parsed.meta.get("robots","").lower():errors.append("reviewed_page_noindex")
    description=parsed.meta.get("description","")
    if len(description)<40:errors.append("short_meta_description")
    block=MARKER.search(page)
    visible=normalize(block.group(1)) if block else ""
    if not block:errors.append("missing_priority_guide_section")
    candidates=[r for r in records if normalize(r["detail"]) in visible and r["kind"]==path.strip("/").split("/")[0]]
    if len(candidates)!=1:errors.append("missing_or_duplicate_exact_source_description")
    else:
        row=candidates[0]
        result["source_row"]=row["kind"]+"|"+row["region"]
        if normalize(row["topic"]) not in visible:errors.append("missing_region_topic")
    nodes=[]
    for script in parsed.scripts:
        try:nodes.extend(nodes_from_ld(script))
        except Exception as ex:errors.append("invalid_jsonld_"+type(ex).__name__)
    if not nodes:errors.append("no_jsonld")
    web=[n for n in nodes if isinstance(n,dict) and n.get("@type")=="WebPage" and n.get("url")==canonical]
    if len(web)!=1:errors.append("missing_or_duplicate_webpage")
    else:
        node=web[0]
        if node.get("@id")!=canonical:errors.append("webpage_id_mismatch")
        if node.get("description")!=description:errors.append("webpage_description_mismatch")
        if node.get("inLanguage")!="ko-KR":errors.append("webpage_language_missing")
        if node.get("name") not in parsed.title:errors.append("webpage_title_mismatch")
        if node.get("breadcrumb",{}).get("@id")!=canonical+"#breadcrumb":
            errors.append("webpage_breadcrumb_reference_wrong")
        service=node.get("about",{})
        if not isinstance(service,dict) or service.get("@type")!="Service":
            errors.append("webpage_service_missing")
        else:
            kind=path.strip("/").split("/")[0]
            if service.get("serviceType")!=("자동차탁송" if kind=="taksong" else "대리운전"):
                errors.append("webpage_service_type_wrong")
            if result["source_row"] and service.get("areaServed",{}).get("name")!=row["region"]:
                errors.append("webpage_served_area_wrong")
            expected_phone="1877-5245" if result["source_row"]=="taksong|제주특별자치도" else "1811-4294"
            provider=service.get("provider")
            if not isinstance(provider,dict):
                provider={}
            if provider.get("name")!="전국대리운전":
                errors.append("webpage_provider_name_wrong")
            if provider.get("@type")!="LocalBusiness":
                errors.append("webpage_provider_type_wrong")
            if provider.get("@id")!=BASE+"/#organization":
                errors.append("webpage_provider_id_wrong")
            if provider.get("telephone")!=expected_phone:
                errors.append("webpage_provider_phone_wrong")
        image=node.get("primaryImageOfPage",{})
        if image and "@id" in image and not str(image["@id"]).startswith(BASE+"/card/"):
            errors.append("unapproved_primary_image_reference")
    crumbs=[n for n in nodes if isinstance(n,dict) and n.get("@type")=="BreadcrumbList" and n.get("@id")==canonical+"#breadcrumb"]
    if len(crumbs)!=1:errors.append("missing_or_duplicate_breadcrumb")
    else:
        steps=crumbs[0].get("itemListElement",[])
        if len(steps)<3 or [x.get("position") for x in steps]!=list(range(1,len(steps)+1)):
            errors.append("invalid_breadcrumb_positions")
        elif steps[-1].get("item")!=canonical:
            errors.append("breadcrumb_does_not_end_at_canonical")
    result.update({"passed":not errors,"errors":errors,"schema_count":len(nodes),
                   "html_bytes":len(page.encode("utf-8"))})
    return result

def main():
    if len(RECORDS)!=59 or len({r["kind"]+"|"+r["region"] for r in RECORDS})!=59:
        raise RuntimeError("Expected 59 distinct reviewed source region/service rows")
    status,headers,payload=fetch("/sitemap-focused-regions.xml")
    if status!=200 or "xml" not in headers.get("content-type",""):
        raise RuntimeError("Cannot read current reviewed-only region sitemap")
    tree=ET.fromstring(payload)
    urls=[n.text for n in tree.findall(".//s:loc",NS)]
    if len(urls)!=59 or len(set(urls))!=59:
        raise RuntimeError("Expected 59 unique focused sitemap URLs, got "+str(len(urls)))
    if any(not x.startswith(BASE+"/") for x in urls):
        raise RuntimeError("Unexpected off-domain or malformed focused sitemap URLs")
    def inspect(url):
        path=url[len(BASE):]
        try:
            code,head,raw=fetch(path)
            if code!=200 or "text/html" not in head.get("content-type",""):
                return {"path":path,"passed":False,"errors":["bad_html_status_or_type"]}
            return assess(path,raw.decode("utf-8","replace"))
        except Exception as ex:
            return {"path":path,"passed":False,"errors":["fetch_error: "+str(ex)[:120]]}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results=list(pool.map(inspect,urls))
    rows=[r["source_row"] for r in results if r.get("source_row")]
    if len(set(rows))!=59:
        for entry in results:
            if not entry.get("source_row"):
                entry["passed"]=False
                entry.setdefault("errors",[]).append("unmapped_to_one_of_59_source_rows")
    passed=sum(x["passed"] for x in results)
    report={"site":BASE,"checked_at":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),
            "source_rows":len(RECORDS),"focused_sitemap_urls":len(urls),
            "checked":len(results),"passed":passed,"failed":len(results)-passed,
            "naver_official_indexed":None,
            "scope":"read-only schema.org WebPage+Service+BreadcrumbList, canonical and visible source text",
            "results":results}
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    for result in results:
        if not result["passed"]:print("FAIL "+result["path"]+" — "+", ".join(result["errors"]),flush=True)
    print(f'SMART24_PRIORITY_JSONLD {passed}/{len(results)} schema, canonical and source-backed pages valid; official Naver indexing unknown',flush=True)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"],"a",encoding="utf-8") as fd:
            fd.write(f'\n## 59 source-backed priority pages: schema.org live check\n\n**{passed}/59 validated**, {59-passed} failed. This audits technical HTML, visible editorial, WebPage/Service/BreadcrumbList JSON-LD, and canonical alignment—not Naver indexed count.\n')
            for result in results:
                if not result["passed"]:fd.write(f'- {result["path"]}: {", ".join(result["errors"])}\n')
    return 0 if passed==59 else 1

if __name__=="__main__":sys.exit(main())
