'use strict';
// A single-city-name match must not invent a Gwangju Metropolitan City ride.
// Run offline; no access to Naver, production or dispatch records is necessary.
const assert=require('node:assert/strict');
const {matchingHistoryRegion}=require('../lib/regional-history-evidence');
const metro={name:'광주광역시',full_name:'광주광역시',level:'시도'};
const gyeonggi={name:'광주시',full_name:'경기도 광주시',level:'시'};
const busan={name:'부산광역시',full_name:'부산광역시',level:'시도'};
const regions=[metro,gyeonggi,busan];
const record=(departure,destination='')=>({rawDeparture:departure,rawDestination:destination});
const cases=[
 ['Gyeonggi Gwangju-si Ssangdong-ri is not metropolitan',record('광주시 쌍동리'),metro,false],
 ['Gyeonggi Gwangju-si Chowol-eup is not metropolitan',record('광주시 초월읍','광주시 곤지암읍'),metro,false],
 ['Gyeonggi Gwangju-si Gyeongan-dong is not metropolitan',record('경기도 광주시 경안동'),metro,false],
 ['Abbreviated Gyeonggi Gwangju-si is not metropolitan',record('경기 광주시 오포읍'),metro,false],
 ['Unqualified Gwangju-si is not metropolitan',record('광주시'),metro,false],
 ['Unqualified Gwangju is not metropolitan',record('광주'),metro,false],
 ['Explicit Gwangju Metropolitan City remains eligible',record('광주광역시 동구'),metro,true],
 ['Explicit metropolitan city in destination remains eligible',record('서울특별시 강서구','광주광역시 서구'),metro,true],
 ['Gyeonggi Gwangju-si explicit place still matches its own city',record('경기도 광주시 경안동'),gyeonggi,true],
 ['Gyeonggi Gwangju-si short form still matches its own city',record('광주시 초월읍'),gyeonggi,true],
 ['Unrelated Busan metro still matches valid abbreviation',record('부산시 해운대구'),busan,true]
];
for(const [label,row,region,expected] of cases)
 assert.equal(matchingHistoryRegion(row,region,regions),expected,label);
console.log('PASS: '+cases.length+' geography attribution regressions, preserving authentic regional evidence');
