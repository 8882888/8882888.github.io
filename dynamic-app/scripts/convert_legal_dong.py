#!/usr/bin/env python3
"""Convert official Korean legal-dong CSV into a safe public pipe-delimited index.
Usage: python scripts/convert_legal_dong.py source.csv public/regions.txt
Column names are auto-detected from common government CSV headers.
"""
import csv,sys,re,pathlib
if len(sys.argv)!=3:raise SystemExit('Usage: convert_legal_dong.py input.csv output.txt')
source=pathlib.Path(sys.argv[1]);output=pathlib.Path(sys.argv[2]);
with source.open(encoding='utf-8-sig',newline='') as f:
 reader=csv.DictReader(f); rows=list(reader)
print('columns:',list(rows[0]) if rows else [])
def val(row,*names):
 for n in names:
  for k,v in row.items():
   if n in k and str(v or '').strip():return str(v).strip()
 return ''
seen=set();lines=[]
for row in rows:
 code=re.sub(r'[^0-9]','',val(row,'법정동코드','법정동 코드','법정동코드값'))
 name=val(row,'법정동명','법정동 명','법정동전체명','법정동 전체명')
 status=val(row,'폐지여부','폐지 여부','존폐구분')
 if not (len(code)==10) or not name or status in ('폐지','Y','1'):continue
 parts=name.split();province=parts[0];district=parts[1] if len(parts)>1 else '';town=parts[2] if len(parts)>2 else ''
 level='province' if len(parts)==1 else 'district' if len(parts)==2 else 'town' if len(parts)==3 else 'village'
 short=parts[-1]
 if not all('|' not in v and '\n' not in v for v in (short,province,district,town)):continue
 line='|'.join((code,short,province,district,town,level))
 if code not in seen:seen.add(code);lines.append(line)
output.parent.mkdir(parents=True,exist_ok=True);output.write_text('\n'.join(lines)+'\n',encoding='utf-8');print('written:',len(lines))
