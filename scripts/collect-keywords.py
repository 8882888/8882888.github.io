#!/usr/bin/env python3
"""Collect keyword strings only. No article bodies, search-result clicks or traffic automation."""
import argparse, concurrent.futures, datetime, gzip, hashlib, json, pathlib, re, unicodedata, urllib.request, xml.etree.ElementTree as ET
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/keywords'
TAXONOMY=json.loads((ROOT/'data/keywords/taxonomy.json').read_text())
THEMES={t['name']:t['purpose'] for g in TAXONOMY['groups'] for t in g['topics']}
SOURCES = [
 {'id':'google-trends-kr','url':'https://trends.google.com/trending/rss?geo=KR'},
 {'id':'travel-news-keywords','url':'https://news.google.com/rss/search?q=%EA%B4%80%EA%B4%91+%EC%B6%95%EC%A0%9C&hl=ko&gl=KR&ceid=KR:ko'},
 {'id':'cycling-news-keywords','url':'https://news.google.com/rss/search?q=%EC%9E%90%EC%A0%84%EA%B1%B0+%EC%A2%85%EC%A3%BC&hl=ko&gl=KR&ceid=KR:ko'},
]
SUFFIX = r'(?:해수욕장|해맞이공원|캠핑장|골프장|자전거길|문화제|페스티벌|축제|유원지|계곡|포구|호수|공원|펜션|리조트|해변|항구)'
STOP = re.compile(r'(?:기자|뉴스|논란|사망|사고|혐의|체포|선정|최고|전국|이번|오늘|내일|오는|지난|대통령|연예인|추천|주목)')
def norm(s): return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', str(s))).strip()
def key(s): return re.sub(r'\s+', '', norm(s)).lower()
def short(s): return re.sub(r'(특별자치시|특별시|광역시|특별자치도|도|시|군|구|읍|면|동|리)$', '', s)
def ident(s): return hashlib.sha256(key(s).encode()).hexdigest()[:20]
def category(s):
 if re.search('축제|페스티벌|문화제',s): return '축제'
 if re.search('자전거|종주길|인증센터', s): return '자전거길'
 if re.search('설악산|지리산|덕유산|산행|한계령|육십령|백담사|중산리|성삼재|백무동|대원사', s): return '산행'
 for t in ['해수욕장','해변','골프장','캠핑장','계곡','펜션','리조트','축제','포구','항구','호수','공원','맛집','카페']:
  if t in s: return t
 return '관광지'
def regions():
 rows=[]
 for f in sorted((ROOT/'data/legal-regions').glob('[0-9][0-9].json')):
  for full in json.loads(f.read_text())['full_names']:
   rows.append({'slug':f'area-{len(rows)+1}','full_name':full,'name':full.split()[-1]})
 return rows

def fetch(source):
 try:
  req=urllib.request.Request(source['url'], headers={'User-Agent':'Smart24-KeywordCollector/1.0 (+https://jeongukdaeri.kr/keyword-search/)'})
  with urllib.request.urlopen(req,timeout=18) as response:
   payload=response.read(2_000_001)
  if len(payload)>2_000_000: raise ValueError('feed too large')
  root=ET.fromstring(payload)
  terms=[norm(e.findtext('title') or '') for e in root.findall('./channel/item')][:150]
  return source,terms,None
 except Exception as e: return source,[],type(e).__name__

def main():
 parser=argparse.ArgumentParser(); parser.add_argument('--offline',action='store_true'); args=parser.parse_args()
 OUT.mkdir(parents=True,exist_ok=True)
 now=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
 rr=regions(); byname={}
 for r in rr:
  if r['full_name'].count(' ')>2 or re.search(r'[읍면동리]$',r['name']): continue
  for n in {r['name'],short(r['name'])}:
   if len(n)>=2: byname.setdefault(n,[]).append(r)
 known=json.loads((OUT/'catalog.json').read_text()) if (OUT/'catalog.json').exists() else {'items':[]}
 items={key(x['term']):x for x in known['items'] if x.get('origin')!='generated'}
 # Existing human-named destination keywords; never copy a source page body.
 server=(ROOT/'server.js').read_text(); block=server.split('const landmarks=[',1)[1].split('];',1)[0]
 seeds=[]
 for name,areas in re.findall(r"\['([^']+)',\[([^\]]+)\]\]",block):
  names=re.findall(r"'([^']+)'",areas)
  # Multiple hints with a city/province intersection resolve ambiguous districts.
  matched=[r for r in rr if r['name'] in names and (len(names)==1 or any(n!=r['name'] and n in r['full_name'] for n in names))]
  if not matched and len(names)==1: matched=[r for r in rr if r['name']==names[0]]
  seeds.append((name,[r['slug'] for r in matched]))
 user_seeds=[('설악산',['속초시','양양군','인제군']),('지리산',['구례군','남원시','산청군','함양군']),('덕유산',['무주군','장수군','거창군']),('영산강 자전거길 종주',['담양군','목포시']),('섬진강 자전거길 종주',['임실군','광양시']),('금강 자전거길 종주',['군산시','부여군']),('동해안 자전거길 종주',['고성군','강릉시','울진군','영덕군']),('통일전망대 자전거 종주',['강원특별자치도 고성군']),('영덕해맞이공원 자전거 종주',['영덕군']),('영종도',['인천광역시 중구'])]
 for term,names in user_seeds:
  matches=[r['slug'] for r in rr if r['full_name'] in names or (r['name'] in names and not (r['name']=='고성군' and '경상남도' in r['full_name']))]
  seeds.append((term,matches))
 for term,slugs in seeds:
  old=items.get(key(term),{})
  items[key(term)]={**old,'id':ident(term),'term':term,'category':category(term),'regions':slugs,'origin':'existing-destination','state':'linked' if slugs else 'review','firstSeen':old.get('firstSeen',now),'lastSeen':now}
 reports=[]; observed=0
 results=[] if args.offline else list(concurrent.futures.ThreadPoolExecutor(max_workers=3).map(fetch,SOURCES))
 for source,titles,error in results:
  reports.append({'id':source['id'],'url':source['url'],'status':'error' if error else 'ok','received':len(titles),'error':error,'checkedAt':now})
  for title in titles:
   # Trends titles are keyword strings already; news titles are only scanned for names.
   candidates=[title] if source['id']=='google-trends-kr' else re.findall(r'[가-힣A-Za-z0-9·]{2,24}'+SUFFIX,title)
   for term in candidates:
    term=norm(term)
    if len(term)>60 or len(term)<2: continue
    observed+=1
    old=items.get(key(term),{})
    matches=[]
    if re.search(SUFFIX,term) and not STOP.search(term):
     for n,rs in byname.items():
      # Prefix match avoids accidentally matching an administrative name inside another noun.
      if term.startswith(n) and len(rs)==1: matches.extend(r['slug'] for r in rs)
    slugs=old.get('regions',[]) if old.get('origin')=='existing-destination' else sorted(set(matches))
    items[key(term)]={**old,'id':ident(term),'term':term,'category':category(term),'regions':slugs,'origin':old.get('origin','public-feed'),'state':'linked' if slugs else 'review','firstSeen':old.get('firstSeen',now),'lastSeen':now,'source':source['id']}
 # Retain failed-source observations, expire dated feed-only terms from public use, never drop storage history.
 for x in items.values():
  if x['origin']=='public-feed' and (datetime.datetime.fromisoformat(now)-datetime.datetime.fromisoformat(x['lastSeen'])).days>30: x['state']='archived'
 # Real stored records, compact gzip JSONL, deterministic ordering and bounded topic expansion.
 archive=OUT/'inventory.jsonl.gz'; count=0; generated=0
 with gzip.GzipFile(filename=str(archive)+'.tmp',mode='wb',mtime=0) as gz:
  for r in rr:
   for topic in THEMES:
    row={'term':r['full_name']+' '+topic,'region':r['slug'],'category':topic,'origin':'generated','state':'linked'}
    gz.write((json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n').encode());count+=1;generated+=1
  for x in sorted(items.values(),key=lambda x:x['id']):
   gz.write((json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n').encode()); count+=1
 pathlib.Path(str(archive)+'.tmp').replace(archive)
 catalog={'version':1,'updatedAt':now,'themes':THEMES,'items':sorted(items.values(),key=lambda x:x['term'])}
 (OUT/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+'\n')
 summary={'version':1,'updatedAt':now,'stored':count,'generated':generated,'collected':len(items),'feedKeywords':sum(x['origin']=='public-feed' for x in items.values()),'seedKeywords':sum(x['origin']=='existing-destination' for x in items.values()),'linkedCollected':sum(x['state']=='linked' for x in items.values()),'review':sum(x['state']=='review' for x in items.values()),'archived':sum(x['state']=='archived' for x in items.values()),'observationsThisRun':observed,'sources':reports or known.get('sources',[]),'scheduledIntervalHours':6,'naverDirect':'not-connected','snsDirect':'not-connected','searchExposure':'not-measured'}
 if args.offline and (OUT/'summary.json').exists(): summary['sources']=json.loads((OUT/'summary.json').read_text()).get('sources',[])
 (OUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(summary,ensure_ascii=False))
if __name__=='__main__': main()
