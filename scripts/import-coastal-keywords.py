import csv,json,pathlib,hashlib,re
root=pathlib.Path(__file__).resolve().parents[1]
regions=[]
for p in sorted((root/'data/legal-regions').glob('[0-9][0-9].json')):
 for f in json.loads(p.read_text())['full_names']:
  if f not in regions:regions.append(f)
byfull={f:'area-'+str(i+1) for i,f in enumerate(regions)}
normalize={'충남':'충청남도','강원도':'강원특별자치도','전라북도':'전북특별자치도','부산시':'부산광역시','인천시':'인천광역시','울산시':'울산광역시','제주도':'제주특별자치도'}
def norm(s):
 for a,b in normalize.items():s=s.replace(a,b)
 return ' '.join(s.split())
def resolve(address):
 address=address.replace('인천광역시 중구 무의동','인천광역시 영종구 무의동')
 parts=norm(address).split()
 for n in range(len(parts),0,-1):
  f=' '.join(parts[:n])
  if f in byfull:return f
 return None
source_records=json.loads((root/'data/coastal/source-records.json').read_text())
def read(name):return source_records[name]
sources=[{'id':'beaches','url':'https://www.data.go.kr/data/15056087/fileData.do','date':'2021-05-01','records':277}, {'id':'national-harbors','url':'https://www.data.go.kr/data/3083027/fileData.do','date':'2019-12-31','records':113},{'id':'local-harbors','url':'https://www.data.go.kr/data/15147449/fileData.do','date':'source survey years vary','records':242}]
items={};unresolved=[]
def add(name,address,aliases,category,source):
 name=name.strip();f=resolve(address)
 if not f or len(f.split())<2:unresolved.append({'name':name,'address':address,'source':source});return
 key=f+'|'+name
 if key not in items:items[key]={'id':hashlib.sha256(key.encode()).hexdigest()[:20],'term':name,'regionFull':f,'regions':[byfull[f]],'aliases':[], 'category':category,'sources':[]}
 x=items[key];x['aliases']=sorted(set(x['aliases']+[name]+aliases));x['sources']=sorted(set(x['sources']+[source]))
for r in read('beaches'):
 name=r['해수욕장명'].strip();address=r['지자체']+' '+r['관리청'];aliases=[]
 if r['지자체']=='인천시' and r['관리청']=='중구':address='인천광역시 영종구'
 if any(k in name for k in ['캠핑장','리조트','콘도']):category='해변'
 else:
  bare=re.sub('(해수욕장|해변)$','',name);name=bare+'해수욕장';aliases=[bare,bare+'해변'];category='해수욕장'
 add(name,address,aliases,category,'beaches')
for src,col in [('national-harbors','어항주소'),('local-harbors','항구지번주소')]:
 for r in read(src):add(r['어항명'],r[col],[],'항구',src)
# User-requested conventional names: explicit current legal-region mapping.
manual=[
 ('인구해수욕장','강원특별자치도 양양군 현남면 인구리',['인구','인구해변'],'해수욕장'),
 ('인구항','강원특별자치도 양양군 현남면 인구리',[],'항구'),
 ('대포항','강원특별자치도 속초시 대포동',[],'항구'),
 ('소래포구','인천광역시 남동구 논현동',[],'포구'),
 ('삼길포항','충청남도 서산시 대산읍 화곡리',['삼길포'],'항구'),
 ('삼천포항','경상남도 사천시',['삼천포'],'항구'),
 ('을왕리해수욕장','인천광역시 영종구 을왕동',['을왕리','을왕리해변'],'해수욕장')]
# Replace coarser source matches with the verified detailed mappings; preserve source references.
for name,address,aliases,cat in manual:
 old=[k for k,x in items.items() if x['term']==name and norm(address).startswith(x['regionFull'])]
 inherited=[]
 for k in old:
  x=items.pop(k);aliases+=x['aliases'];inherited+=x['sources']
 add(name,address,aliases,cat,'user-request-verified-region')
 for x in items.values():
  if x['term']==name and x['regionFull']==resolve(address):x['sources']=sorted(set(x['sources']+inherited))
# Merge repeated source records for the same named place within the same city.
for k,x in list(items.items()):
 if k not in items:continue
 city=' '.join(x['regionFull'].split()[:2])
 matches=[(kk,xx) for kk,xx in items.items() if xx['term']==x['term'] and ' '.join(xx['regionFull'].split()[:2])==city]
 if len(matches)>1:
  keep=max(matches,key=lambda pair:len(pair[1]['regionFull'].split()))[1]
  for kk,xx in matches:
   keep['aliases']=sorted(set(keep['aliases']+xx['aliases']));keep['sources']=sorted(set(keep['sources']+xx['sources']))
   if xx is not keep:items.pop(kk)
doc={'sources':sources,'coverageNote':'Official source snapshots, not a complete current list of every coastal place. Unmapped entries are withheld. Village harbors without addresses excluded.','items':sorted(items.values(),key=lambda x:(x['regionFull'],x['term'])),'unresolved':unresolved}
(root/'data/coastal/places.json').write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'places':len(items),'unresolved':unresolved,'aliases':sum(len(x['aliases']) for x in items.values())},ensure_ascii=False))
