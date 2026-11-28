"""Read-only production URL inspection. Not a Naver index/collection report."""
import concurrent.futures
import json
import os
import time
import urllib.request
import urllib.error
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit

BASE = "https://jeongukdaeri.kr"
PATHS = [
    "/", "/taksong/", "/daeri/", "/설악산탁송/", "/지리산탁송/",
    "/daeri/gangwon/gangreung-si/", "/taksong/gangwon/gangreung-si/",
    "/route-taksong/", "/route-taksong/centers/",
    "/route-taksong/courses/nakdonggang/", "/route-taksong/courses/eastcoast/",
    "/special/national-cycling-tour/", "/special/cycling-trail-transport/",
    "/service/corporate/", "/service/taksong/", "/service/long-distance-taksong/",
]
class Metadata(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.canonicals = []
        self.robots = []
        self.descriptions = []
        self.title = ""
        self.in_title = False
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title":
            self.in_title = True
        if tag == "link" and "canonical" in (a.get("rel") or "").lower().split():
            self.canonicals.append(a.get("href") or "")
        if tag == "meta":
            name = (a.get("name") or "").lower()
            value = a.get("content") or ""
            if name in ("robots", "yeti", "naverbot"):
                self.robots.append(value)
            if name == "description":
                self.descriptions.append(value)
    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
    def handle_data(self, data):
        if self.in_title:
            self.title += data

def inspect(path):
    expected = BASE + path
    result = {"url": expected, "http_status": None, "technical_status": "UNKNOWN",
              "naver_collection": None, "naver_index": None}
    started = time.monotonic()
    try:
        request = urllib.request.Request(BASE + quote(path), headers={
            "User-Agent": "Smart24-Public-URL-Diagnostic/1.0", "Cache-Control": "no-cache"})
        with urllib.request.urlopen(request, timeout=15) as response:
            result["http_status"] = response.status
            result["final_url"] = unquote(response.geturl())
            result["content_type"] = response.headers.get("Content-Type", "")
            result["x_robots_tag"] = response.headers.get_all("X-Robots-Tag") or []
            parser = Metadata()
            parser.feed(response.read(2_000_000).decode("utf-8", errors="replace"))
        result.update(title=parser.title.strip(), canonicals=parser.canonicals,
                      description_count=len(parser.descriptions),
                      robots=parser.robots)
        issues = []
        if result["http_status"] != 200:
            issues.append("non_200")
        if result["final_url"] != expected:
            issues.append("redirect_or_final_url_mismatch")
        if "text/html" not in result["content_type"].lower():
            issues.append("not_html")
        if [unquote(x) for x in parser.canonicals] != [expected]:
            issues.append("canonical_missing_duplicate_or_mismatch")
        if any("noindex" in value.lower() or "none" in value.lower().replace(",", " ").split()
               for value in parser.robots + result["x_robots_tag"]):
            issues.append("noindex_directive")
        if not result["title"]:
            issues.append("missing_title")
        if len(parser.descriptions) != 1 or not parser.descriptions[0].strip():
            issues.append("missing_or_duplicate_description")
        result["issues"] = issues
        result["technical_status"] = "REVIEW" if issues else "PASS"
    except urllib.error.HTTPError as error:
        result.update(http_status=error.code, technical_status="REVIEW", error=str(error))
    except Exception as error:
        result["error"] = str(error)
    result["elapsed_s"] = round(time.monotonic() - started, 3)
    return result

def main():
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        rows = list(pool.map(inspect, PATHS))
    report = {"scope": "public HTTP/HTML technical diagnostic only",
              "commit": os.environ.get("GITHUB_SHA"),
              "naver_official_status": "NOT_INSPECTED",
              "results": rows}
    out = Path("priority-live-url-report.json")
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    lines = ["### Priority public URL diagnostics (not Naver indexing)",
             "| URL | HTTP | Technical status | Issues |", "|---|---:|---|---|"]
    for row in rows:
        lines.append("| {} | {} | {} | {} |".format(
            row["url"], row["http_status"] or "unknown", row["technical_status"],
            ", ".join(row.get("issues", [])) or ("request error" if row.get("error") else "—")))
    lines.append("Naver collection and index status are unknown until checked in Search Advisor.")
    if summary:
        with open(summary, "a", encoding="utf-8") as fp:
            fp.write("\n" + "\n".join(lines) + "\n")
    print(json.dumps(report, ensure_ascii=False))
if __name__ == "__main__":
    main()
