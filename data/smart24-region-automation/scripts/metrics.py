"""Compare manually exported Naver query metrics; missing is unknown, never zero."""
import argparse,csv,json,datetime
from pathlib import Path

def load(filename):
    rows={}; periods=set()
    with open(filename,encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f)
        required={'period_start','period_end','query','impressions','clicks'}
        if not required.issubset(reader.fieldnames or []):raise ValueError('Required columns: '+','.join(sorted(required)))
        for r in reader:
            start=datetime.date.fromisoformat(r['period_start']);end=datetime.date.fromisoformat(r['period_end'])
            if start>end:raise ValueError('Invalid period')
            periods.add((start,end));q=''.join(r['query'].split()).casefold()
            if not q or q in rows:raise ValueError('Empty or duplicate normalized query')
            impressions=int(r['impressions']);clicks=int(r['clicks'])
            if impressions<0 or clicks<0 or clicks>impressions:raise ValueError('Invalid impression/click counts')
            rows[q]={'query':r['query'],'impressions':impressions,'clicks':clicks,'ctr':clicks/impressions if impressions else None}
    if len(periods)!=1:raise ValueError('Exactly one nonempty period per file')
    return rows,next(iter(periods))

def compare(before_file,after_file):
    before,bp=load(before_file);after,ap=load(after_file)
    if (bp[1]-bp[0]).days!=(ap[1]-ap[0]).days:raise ValueError('Periods must have equal lengths')
    if bp[1]>=ap[0]:raise ValueError('Periods must be chronological and non-overlapping')
    out=[]
    for q in sorted(before.keys()|after.keys()):
        b=before.get(q);a=after.get(q)
        status='missing_period_data' if not b or not a else 'observed'
        action='누락 기간 자료 확인' if status!='observed' else '노출 원인 점검' if a['impressions']==0 else '제목·검색 의도 검토' if a['clicks']==0 else '변화 추적'
        out.append({'query':(a or b)['query'],'before':b,'after':a,'status':status,'clickDelta':a['clicks']-b['clicks'] if a and b else None,'ctrDeltaPoints':round((a['ctr']-b['ctr'])*100,4) if a and b and a['ctr'] is not None and b['ctr'] is not None else None,'nextAction':action})
    return {'source':'operator supplied Naver Search Advisor export','beforePeriod':[str(x) for x in bp],'afterPeriod':[str(x) for x in ap],'causationProven':False,'queries':out}

def main():
    p=argparse.ArgumentParser();p.add_argument('before');p.add_argument('after');p.add_argument('--out',default='reports/naver-change.json');a=p.parse_args();r=compare(a.before,a.after);out=Path(a.out);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(r,ensure_ascii=False,indent=2));print(str(out))
if __name__=='__main__':main()
