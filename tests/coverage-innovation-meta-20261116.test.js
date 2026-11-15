'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const server=fs.readFileSync(require('node:path').join(__dirname,'..','server.js'),'utf8');
const subjects=[
  ['전국 안내','const coverageDescription=', '서울·경기·인천·강원','/coverage/'],
  ['혁신도시','/region/innovation-cities/', '세종·원주·진주·나주','/region/innovation-cities/']
];
test('nationwide coverage description is unique, sufficiently descriptive, and used in JSON-LD',()=>{
 const m=server.match(/const coverageDescription='([^']+)';/);
 assert(m,'coverage description exists');
 assert(m[1].length>=70&&m[1].length<=160);
 assert(m[1].includes('실제 완료 운행기록'));
 assert(server.includes('description:coverageDescription'));
 assert(server.includes("'/coverage/'"));
});
test('innovation city hub has region-specific descriptive metadata',()=>{
 const m=server.match(/return respond\(res,200,layout\('세종·지방 혁신도시 대리운전·탁송 지역 안내','([^']+)'/);
 assert(m,'innovation hub description exists');
 assert(m[1].length>=70&&m[1].length<=160);
 assert(m[1].includes('원주')&&m[1].includes('나주')&&m[1].includes('장거리 예약'));
 assert(server.includes("'/region/innovation-cities/'"));
});
