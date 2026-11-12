'use strict';
// Editorial triage only: scores are not search-engine ranking predictions.
const {selectRecords,validateEvidence}=require('./enhance');
const normalize=s=>String(s).normalize('NFKC').toLowerCase().replace(/\s+/g,'');
function shingles(text){const s=normalize(text),out=new Set();for(let i=0;i<s.length-3;i++)out.add(s.slice(i,i+4));return out;}
function similarity(a,b){const x=shingles(a),y=shingles(b);if(!x.size||!y.size)return 0;let n=0;for(const s of x)if(y.has(s))n++;return n/(x.size+y.size-n);}
function plan(data,records,metrics=[]){
 validateEvidence(data,records);
 if(!Array.isArray(metrics))throw Error('metrics 배열 필요');
 const known=new Set(data.regions.flatMap(r=>Object.keys(r.services).map(k=>r.id+'/'+k))),seen=new Set();
 for(const m of metrics){const key=m.region+'/'+m.service;if(!known.has(key)||seen.has(key)||!Number.isInteger(m.impressions)||!Number.isInteger(m.clicks)||m.clicks<0||m.impressions<m.clicks)throw Error('통계 지역·서비스·노출·클릭 또는 중복 오류');seen.add(key);}
 const rows=data.regions.flatMap(r=>Object.entries(r.services).map(([service,p])=>{
 const m=metrics.find(x=>x.region===r.id&&x.service===service),evidence=selectRecords(records,r.id,service).length;
 return {region:r.id,name:r.name,service,path:p.existingPath||'/local-service/'+r.id+'/'+service+'/',approved:p.approved,existing:!!p.existingPath,evidence,details:(p.details||[]).length,impressions:m?.impressions??null,clicks:m?.clicks??null,ctr:m&&m.impressions?m.clicks/m.impressions:null,duplicates:[],actions:[],priority:0};}));
 const body=row=>{const r=data.regions.find(r=>r.id===row.region);let text=r.services[row.service].text;for(const name of [r.name,...r.aliases].sort((a,b)=>b.length-a.length))text=text.split(name).join('지역');return text;};
 for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){if(rows[i].service!==rows[j].service)continue;const score=similarity(body(rows[i]),body(rows[j]));if(score>=0.72){rows[i].duplicates.push(rows[j].path);rows[j].duplicates.push(rows[i].path);}}
 for(const row of rows){
 if(row.duplicates.length)row.actions.push('유사 본문 검토: 지역별 실제 정보 보강 또는 대표 페이지 통합');
 if(row.details<2)row.actions.push('실제 출발 장소·인계 조건 안내 추가');
 if(!row.evidence)row.actions.push('공개 가능한 실제 운행 원문 연결');
 if(!row.approved&&!row.existing)row.actions.push('내용 검토 완료 후 신규 페이지 색인 허용');
 if(row.impressions===null)row.actions.push('서치어드바이저 동일 기간 실측 통계 입력');
 if(row.impressions>=100&&row.ctr<0.03)row.actions.push('검색 의도와 제목·설명 일치 여부 검토');
 row.priority=(row.existing?30:0)+Math.min(30,row.evidence*10)+Math.min(20,row.details*5)+(row.impressions===null?0:Math.min(20,Math.log10(1+row.impressions)*5));
 row.priority=Math.round(row.priority);
 }
 return {scoreMeaning:'작업 순서 참고값. 네이버 순위·색인 확률·경쟁사 우위 예측이 아닙니다.',metricsPeriod:'입력 통계는 같은 기간으로 맞추세요.',summary:{pages:rows.length,existing:rows.filter(r=>r.existing).length,approvedNew:rows.filter(r=>r.approved&&!r.existing).length,similarPages:rows.filter(r=>r.duplicates.length).length,withEvidence:rows.filter(r=>r.evidence).length,measured:rows.filter(r=>r.impressions!==null).length},pages:rows.sort((a,b)=>b.priority-a.priority||a.path.localeCompare(b.path))};
}
module.exports={plan,similarity};
