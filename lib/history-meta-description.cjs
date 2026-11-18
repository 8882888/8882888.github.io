'use strict';

const length = value => Array.from(String(value || '')).length;

module.exports = function buildHistoryMetaDescription(record, duplicateCount = 1) {
  const kind = record.service === 'taksong'
    ? '탁송'
    : record.service === 'mixed'
      ? '탁송+대리운전'
      : '대리운전';
  const time = String(record.recordedTime || '').trim();
  const timeLabel = time ? time + ' 기록시각' : '기록시각 미확인';
  const departure = record.departure === '지역 비공개'
    ? '출발지 비공개'
    : String(record.departure || '출발지 비공개').replace(/\s+/g, ' ').trim();
  const destination = record.destination === '지역 비공개'
    ? '도착지 비공개'
    : String(record.destination || '도착지 비공개').replace(/\s+/g, ' ').trim();
  const fare = String(record.fare || '요금 미기재').trim();
  const idSuffix = Number(duplicateCount) > 1 && record.id ? ' · ' + record.id : '';
  const prefix = String(record.date || '날짜 미확인') + ' ' + timeLabel + ' · ' + kind + ' 완료';
  const routeDescription = prefix + ' · ' + departure + '→' + destination + ' · 당시 ' + fare + idSuffix + '.';
  if (length(routeDescription) <= 80) return routeDescription;
  const compactDescription = prefix + ' · 당시 ' + fare + idSuffix + '.';
  if (length(compactDescription) <= 80) return compactDescription;
  const fallback = String(record.date || '날짜 미확인') + ' ' + timeLabel + ' · ' + kind + (record.id ? ' ' + record.id : '') + '.';
  return Array.from(fallback).slice(0, 80).join('');
};
