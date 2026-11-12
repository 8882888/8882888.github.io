"""Public HTML sample audit. No browser execution, no ranking inference, no recursive crawl."""
import argparse, concurrent.futures, datetime, hashlib, json, time, urllib.request, urllib.error, re
from html.parser import HTMLParser
from urllib.parse import urlsplit, urljoin, quote, urlunsplit
from pathlib import Path

def normalized_url(url):
    p=urlsplit(url)
    encoded=quote(p.path,safe="/%:@!$&'()*+,;=-._~")
    encoded=re.sub(r'%[0-9a-fA-F]{2}',lambda m:m.group(0).upper(),encoded)
    return urlunsplit((p.scheme.lower(),p.netloc.lower(),encoded,p.query,p.fragment))

class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title=[]; self.h1=[]; self.links=[]; self.canonical=[]; self.meta={}; self.schema=[]; self.text=[]
        self.in_title=False; self.in_h1=False; self.ignore=0; self.json_script=False; self.json_text=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='title': self.in_title=True
        if tag=='h1': self.in_h1=True; self.h1.append('')
        if tag in ('script','style'): self.ignore+=1
        if tag=='script' and a.get('type')=='application/ld+json': self.json_script=True; self.json_text=[]
        if tag=='a' and a.get('href'): self.links.append(a['href'])
        if tag=='link' and 'canonical' in a.get('rel','').lower().split(): self.canonical.append(a.get('href',''))
        if tag=='meta': self.meta[a.get('name',a.get('property','')).lower()]=a.get('content','')
    def handle_endtag(self,tag):
        if tag=='title': self.in_title=False
        if tag=='h1': self.in_h1=False
        if tag=='script' and self.json_script:
            try: self.schema.append(json.loads(''.join(self.json_text)))
            except ValueError: self.schema.append({'parseError':True})
            self.json_script=False
        if tag in ('script','style'): self.ignore=max(0,self.ignore-1)
    def handle_data(self,s):
        if self.in_title: self.title.append(s)
        if self.in_h1: self.h1[-1]+=s
        if self.json_script: self.json_text.append(s)
        if not self.ignore: self.text.append(s)

def fetch(url,timeout=12):
    start=time.monotonic()
    # Target list is an operator-owned local configuration, never a public request parameter.
    p=urlsplit(url)
    if p.scheme not in ('https','http') or p.username or p.password: raise ValueError('HTTP(S) URL required')
    encoded=urlunsplit((p.scheme,p.netloc,quote(p.path,safe='/%'),p.query,p.fragment))
    req=urllib.request.Request(encoded,headers={'User-Agent':'Smart24PublicAudit/2.0'})
    try:
        with urllib.request.urlopen(req,timeout=timeout) as r:
            raw=r.read(2_000_001)
            if len(raw)>2_000_000: return {'url':url,'status':r.status,'inspection':'skipped','reason':'body_over_2MB'}
            result={'url':url,'finalUrl':r.url,'status':r.status,'contentType':r.headers.get('Content-Type',''),'xRobotsTag':r.headers.get('X-Robots-Tag',''),'bytes':len(raw),'fetchMs':round((time.monotonic()-start)*1000),'sha256':hashlib.sha256(raw).hexdigest()}
            text=raw.decode(r.headers.get_content_charset() or 'utf-8',errors='replace')
            if 'html' not in result['contentType']:
                result['inspection']='non-html';result['sitemaps']=[line.partition(':')[2].strip() for line in text.splitlines() if line.lower().startswith('sitemap:')];return result
            doc=Parser();doc.feed(text);title=''.join(doc.title).strip();robots=doc.meta.get('robots','')+' '+result['xRobotsTag']
            same=set(urljoin(r.url,x).split('#')[0] for x in doc.links if urlsplit(urljoin(r.url,x)).netloc==urlsplit(r.url).netloc)
            result.update(inspection='html',title=title,description=doc.meta.get('description'),canonical=doc.canonical,h1Count=len(doc.h1),viewport=doc.meta.get('viewport'),robots=robots.strip(),telephoneLinks=sorted(set(x for x in doc.links if x.startswith('tel:'))),internalLinkCount=len(same),jsonLdCount=len(doc.schema),jsonLdErrors=sum(bool(x.get('parseError')) for x in doc.schema if isinstance(x,dict)),visibleTextChars=len(' '.join(doc.text)))
            issues=[]
            if not title: issues.append('missing_title')
            if not result['description']: issues.append('missing_description')
            if len(doc.canonical)!=1: issues.append('canonical_count_not_one')
            elif normalized_url(urljoin(r.url,doc.canonical[0]))!=normalized_url(r.url): issues.append('canonical_differs_from_final_url_review')
            if len(doc.h1)!=1: issues.append('h1_count_not_one_review')
            if not result['viewport']: issues.append('missing_viewport')
            if 'noindex' in robots.lower(): issues.append('noindex_present_review_intent')
            if not result['telephoneLinks']: issues.append('no_tel_link_in_html')
            if result['jsonLdErrors']: issues.append('invalid_json_ld')
            result['reviewItems']=issues
            return result
    except urllib.error.HTTPError as e: return {'url':url,'status':e.code,'inspection':'unavailable','reason':'HTTP error; not a ranking or universal outage finding'}
    except Exception as e: return {'url':url,'status':None,'inspection':'unavailable','reason':type(e).__name__}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--targets',default='data/audit-targets.json');ap.add_argument('--out',default='reports/public-audit.json');args=ap.parse_args()
    targets=json.loads(Path(args.targets).read_text());urls=list(dict.fromkeys(x['url'] for x in targets))
    if len(urls)>30: raise ValueError('Maximum 30 URLs per audit')
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool: rows=list(pool.map(fetch,urls))
    report={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'HTTP HTML sample; no JS execution; fetchMs is NOT Core Web Vitals','naverRankChecked':False,'mobilePhoneAppChecked':False,'results':rows}
    out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps([{'url':x['url'],'status':x['status'],'reviewItems':x.get('reviewItems'),'inspection':x['inspection']} for x in rows],ensure_ascii=False))
if __name__=='__main__': main()
