'use strict';
// Existing pages keep their URL and document head. This module returns one body section.
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localPath = p => typeof p==='string' && /^\/(?!\/)[a-zA-Z0-9/_-]*\/$/.test(p) && !p.includes('//');
const dateOK = d => typeof d==='string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d)) && new Date(d).toISOString().slice(0,10)===d && d<=new Date().toISOString().slice(0,10);
function validateEvidence(data,records){
 if(!Array.isArray(records)) throw Error('운행기록 배열 필요');
 const ids=new Set(),regions=new Set(data.regions.map(r=>r.id));
 for(const t of records){
  if(!t.id||ids.has(t.id)) throw Error('운행기록 id 누락/중복');ids.add(t.id);
  if(!['daeri','taksong'].includes(t.service)||!regions.has(t.fromRegion)||!regions.has(t.toRegion)) throw Error('운행 지역/서비스 코드 확인 필요');
  if(!dateOK(t.date)||!dateOK(t.checkedAt)||t.checkedAt<t.date)throw Error('운행/대조 날짜 오류');
  if(!Number.isInteger(t.fare)||t.fare<=0||typeof t.from!=='string'||!t.from.trim()||typeof t.to!=='string'||!t.to.trim())throw Error('운행 정보 오류');
  const u=new URL(t.sourceUrl);if(u.origin!==data.origin||!u.pathname.startsWith('/reviews/')||u.search||u.hash)throw Error('자사 공개 운행 원문만 허용');
  if(typeof t.verified!=='boolean'||typeof t.publicAllowed!=='boolean')throw Error('원문 대조 및 공개 여부 필요');
 }
 return records;
}
function selectRecords(records,regionId,service){
 return records.filter(t=>t.verified&&t.publicAllowed&&t.service===service&&(t.fromRegion===regionId||t.toRegion===regionId)).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id)).slice(0,8);
}
function renderEnhancement(data,records,regionId,service){
 const r=data.regions.find(r=>r.id===regionId);if(!r||!['daeri','taksong'].includes(service))throw Error('지역/서비스 없음');
 validateEvidence(data,records);
 const p=r.services[service]; const cases=selectRecords(records,r.id,service); const label=service==='daeri'?'대리운전':'자동차탁송';
 const fareURL=new URL('/fare/',data.origin);fareURL.searchParams.set('from',r.fareName||r.name);fareURL.searchParams.set('service',service);
 const rows=cases.map(t=>`<tr><td>${escape(t.date)}</td><td>${escape(t.from)} → ${escape(t.to)}</td><td>${t.fromRegion===r.id?'출발 기록':'도착 기록'}</td><td>${t.fare.toLocaleString('ko-KR')}원</td><td><a href="${escape(t.sourceUrl)}">원문 확인</a></td></tr>`).join('');
 const local=(p.details||[]).map(s=>`<li><strong>${escape(s.place)}</strong> — ${escape(s.guidance)}</li>`).join('');
 return `<section id="smart24-regional-evidence" aria-label="지역 요금과 예약 안내"><style>#smart24-regional-evidence{font:inherit;color:inherit;margin:24px 0;padding:20px;border:1px solid #d8e5f1;border-radius:14px}#smart24-regional-evidence a{color:#075eb4;display:inline-block;padding:10px}#smart24-regional-evidence .table-scroll{overflow-x:auto}#smart24-regional-evidence table{border-collapse:collapse;width:100%;min-width:520px}#smart24-regional-evidence th,#smart24-regional-evidence td{padding:10px;text-align:left;border-bottom:1px solid #d8e5f1}#smart24-regional-evidence summary{padding:12px;cursor:pointer}</style><h2>${escape(r.name+label)} 요금·운행기록·예약</h2><p><a href="${escape(fareURL.href)}">${escape(r.name)} 출발 예상요금 조회</a> <a href="tel:${data.phone.replace(/-/g,'')}">전화상담 ${escape(data.phone)}</a></p>${local?'<h3>출발 장소별 준비</h3><ul>'+local+'</ul>':''}${rows?`<h3>공개 원문에서 확인한 운행기록</h3><div class="table-scroll" role="region" aria-label="운행기록 표" tabindex="0"><table><caption>과거 운행금액이며 현재 확정 견적이 아닙니다.</caption><thead><tr><th scope="col">운행일</th><th scope="col">이동 방향</th><th scope="col">지역과의 관계</th><th scope="col">당시 금액</th><th scope="col">근거</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p>연결할 공개 운행기록이 아직 없습니다. 출발지와 목적지를 알려주시면 현재 요금을 상담해 드립니다.</p>'}<h3>예약 전 확인</h3><details><summary>표에 있는 요금으로 지금 예약되나요?</summary><p>표는 해당 날짜의 완료 기록입니다. 실제 주소·차종·희망시각·경유 여부와 통행료·주차비·대기비 포함 조건을 확인한 뒤 현재 금액을 안내받으세요.</p></details><details><summary>${service==='daeri'?'대리운전을 부를 때 무엇을 알려드리나요?':'차량을 맡길 때 무엇을 준비하나요?'}</summary><p>${service==='daeri'?'주차장 입구와 주차층, 도착지, 출발시각, 경유지 및 동승 여부를 알려주세요.':'차량 인수·인계 주소, 차종, 운행 가능 상태, 키 전달 방식, 담당자와 연락 가능한 시간을 확인하세요.'}</p></details><details><summary>야간이나 장거리도 예약할 수 있나요?</summary><p>일정과 출발·도착지를 먼저 알려주세요. 기사 접근·복귀 여건과 수급에 따라 배차 가능 여부와 요금을 확인합니다.</p></details></section>`;
}
function integrationPlan(data,records){
 validateEvidence(data,records);
 return data.regions.flatMap(r=>Object.entries(r.services).map(([service,p])=>({region:r.id,service,targetPath:p.existingPath||null,action:p.existingPath?'merge-existing-body':p.approved?'new-reviewed-page':'content-needed',recordCount:selectRecords(records,r.id,service).length,detailCount:(p.details||[]).length})));
}
function createEnhancer(regionFile,tripFile){
 const fs=require('node:fs');let last='',byPath=new Map();
 return function blockForPath(requestPath){
  const regionRaw=fs.readFileSync(regionFile,'utf8'),tripRaw=fs.readFileSync(tripFile,'utf8');
  const signature=regionRaw+'\n'+tripRaw;
  if(signature!==last){
   const data=require('./engine').validate(JSON.parse(regionRaw)),records=validateEvidence(data,JSON.parse(tripRaw));const next=new Map();
   for(const r of data.regions)for(const [service,p] of Object.entries(r.services))if(p.existingPath)next.set(p.existingPath,renderEnhancement(data,records,r.id,service));
   byPath=next;last=signature;
  }
  return byPath.get(requestPath)||'';
 };
}
module.exports={createEnhancer,renderEnhancement,selectRecords,validateEvidence,integrationPlan,localPath,dateOK};
