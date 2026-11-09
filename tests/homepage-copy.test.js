'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {removeRetiredHomepageCopy}=require('../lib/homepage-copy');

const oldPage='<!doctype html><html><head><title>전국탁송</title></head><body>'+
 '<section id="dynamic-service-card-search-20261103">'+
 '<h2 class="hero-title">지역·코스·서비스 키워드별 동적 명함 자동보기</h2>'+
 '<p>서비스별 상담 이미지를 보여드립니다.</p>'+
 '<form id="existing-keyword-form" action="/region/" method="get">'+
 '<label>지역·코스·서비스 키워드<input name="q" placeholder="대구대리운전"></label>'+
 '<button type="submit">지역별 명함 자동확장 보기</button></form>'+
 '<div data-card-preview-output></div></section>'+
 '<section><h2>실제 운행기록 안내</h2><p>2,591건</p></section></body></html>';
const cleaned=removeRetiredHomepageCopy(oldPage);
assert.ok(!cleaned.includes('지역·코스·서비스 키워드별 동적 명함 자동보기'));
assert.ok(!cleaned.includes('지역별 명함 자동확장 보기'));
assert.ok(cleaned.includes('지역·서비스 검색어'));
assert.ok(cleaned.includes('<button type="submit">지역 검색</button>'));
assert.ok(cleaned.includes('id="existing-keyword-form"')&&cleaned.includes('action="/region/"'));
assert.ok(cleaned.includes('name="q"')&&cleaned.includes('data-card-preview-output'));
assert.ok(cleaned.includes('2,591건')&&cleaned.includes('실제 운행기록 안내'));
assert.equal(removeRetiredHomepageCopy(cleaned),cleaned,'copy filter must be idempotent');

const oldStatic='<h2>지역·코스·서비스 키워드별 동적 이미지 자동보기</h2><form action="/region/"><input name="q"></form>';
const fixedStatic=removeRetiredHomepageCopy(oldStatic);
assert.ok(!fixedStatic.includes('동적 이미지 자동보기'));
assert.ok(fixedStatic.includes('<form action="/region/"><input name="q">'));
const currentHome=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert.ok(!/지역·코스·서비스 키워드별 동적 (명함|이미지) 자동보기/.test(currentHome));
assert.ok(currentHome.includes('id="nationwide-live-locality-form-20261107"'));
assert.ok(currentHome.includes('data-card-preview-output'));
console.log('PASS retired homepage wording removed, search and contact functionality preserved');
