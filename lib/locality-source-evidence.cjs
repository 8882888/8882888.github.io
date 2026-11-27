'use strict';

const localitySources = require('../data/locality-source-evidence-20261127.json');
const addressReferences = require('../data/locality-address-references-20261127.json');
const parkingSource = 'https://bridge.inu.ac.kr/dataset/national_parking-lot-information-standard-data/resource/c30b9f63-f048-4b1c-a650-3c7fd5ccf0d9';
const busSource = 'https://bus.harudiary.com/datasets/locations/';
const boundarySource = 'https://github.com/KnellBalm/kr-admin-geojson/tree/3a859f2a45be8acf8237d9eefd9565f99cc603da';

function mapLink(query, label, esc) {
 return '<a href="https://map.naver.com/p/search/' + encodeURIComponent(query) + '">' + esc(label) + '</a>';
}

function parkingMarkup(places, isTaksong, esc) {
 const items = places.map(place => {
  const location = mapLink(place.area + ' ' + place.name, place.name, esc);
  return '<li>' + location + ' · ' + esc(place.area) + ' · ' + esc(place.type) +
   ' ' + esc(place.spaces) + '면 (자료 기준 ' + esc(place.date) + ')</li>';
 });
 const advice = isTaksong
  ? '차량을 이곳에 주차했다면 차량 위치, 출차 방법과 차키 전달 절차를 알려주세요. 큰 차량은 진입 제한을 별도로 확인합니다.'
  : '차량이 이곳에 있다면 주차한 구역과 고객이 기다릴 출입구를 알려주세요. 출차 요금과 운영시간은 방문 전 확인해 주세요.';
 return '<div class="locality-public-parking"><h4>공영주차장 위치 참고</h4>' +
  '<ul>' + items.join('') + '</ul><p>' + advice + ' <a href="' + parkingSource + '">전국주차장정보표준데이터 보존본</a></p></div>';
}

function busMarkup(stop, region, isTaksong, esc) {
 const name = mapLink(stop.area + ' ' + stop.name, stop.name, esc);
 const scope = stop.area === region ? '법정구역 경계 안에서 확인한 위치' : '상위 행정구역에서 마을 이름으로 확인한 정류장';
 const advice = isTaksong
  ? '기사에게 정류장 이름과 함께 차량이 주차된 도로명주소 및 키 보관 위치를 전달해 주세요.'
  : '같은 이름의 정류장이 맞은편에도 있을 수 있으므로 진행 방향과 고객이 기다릴 장소를 알려주세요.';
 return '<div class="locality-public-transit"><h4>정류장으로 차량 위치 설명하기</h4><p>' + name + ' · ' +
  esc(stop.area) + ' · ' + scope + ' (정류장 자료 기준 ' + esc(stop.date) + ')</p><p>' + advice +
  ' 정류장에서는 정차가 허용되는 별도 차량 위치를 찾아 주세요. <a href="' + busSource +
  '">정류장 위치 원자료</a> · <a href="' + boundarySource + '">법정구역 경계 자료</a></p></div>';
}

function locationMarkup(reference, region, isTaksong, esc) {
 const isRoad = reference.type === '도로';
 const where = mapLink(region + ' ' + reference.name, reference.name, esc);
 const advice = isTaksong
  ? '실제 차량 인수 장소의 건물번호, 차량 위치와 차키 전달 방법을 알려주세요.'
  : '실제 차량 위치의 건물번호와 고객이 기다릴 출입구를 알려주세요.';
 return '<div class="locality-address-reference"><h4>' + (isRoad ? '도로명으로 출발지 확인' : '주변 시설로 출발지 설명') + '</h4><p>' +
  esc(region) + ' · ' + where + ' 위치 참고. ' + advice +
  ' <a href="' + esc(reference.source) + '">주소·시설 정보 출처</a></p></div>';
}

function renderLocalitySources(region, kind, esc) {
 const data = localitySources[region] || {};
 const isTaksong = kind === 'taksong';
 const parking = data.parking?.length ? parkingMarkup(data.parking, isTaksong, esc) : '';
 const bus = data.bus ? busMarkup(data.bus, region, isTaksong, esc) : '';
 const addressReference = addressReferences[region];
 const address = addressReference ? locationMarkup(addressReference, region, isTaksong, esc) : '';
 const completed = data.completed?.[kind];
 const dispatch = completed ? '<div class="locality-dispatch-summary"><h4>완료 배차 집계</h4><p>제공된 배차기록에서 ' +
  esc(region) + '이 출발 또는 도착 행정구역으로 확인된 ' + (isTaksong ? '탁송' : '대리운전') +
  ' 완료 내역 ' + esc(completed) + '건을 집계했습니다. 집계는 제공 자료 범위에 한정합니다.</p></div>' : '';
 const landmark = data.parking?.[0]?.name || data.bus?.name || addressReference?.name;
 const sourceArea = data.parking?.[0]?.area || data.bus?.area || region;
 const scope = sourceArea !== region ? ' (' + esc(sourceArea) + ' 소재 참고 지점)' : '';
 const point = landmark ? esc(landmark) + scope : '';
 const localBooking = point ? '<section class="locality-booking-context"><h4>' + esc(region) + ' ' +
  (isTaksong ? '차량탁송 인수·인계 상담' : '대리운전 출발·도착 상담') + '</h4><p>' +
  point + '은 위치 확인용 참고 지점입니다. ' + (isTaksong
  ? '이 지점에서 차량을 맡기는 경우 실제 주차 구역과 출차 권한, 차종 및 운행 가능 상태를 확인하고 수령인과 인계 시간을 협의합니다.'
  : '이 지점 주변에서 귀가를 요청하는 경우 실제 차량 위치와 탑승 장소를 확인하고 목적지 및 경유 여부를 전달합니다.') +
  '</p><p><a href="/fare/?service=' + (isTaksong ? 'taksong' : 'daeri') + '&amp;from=' + encodeURIComponent(region) +
  '">이 지역 출발 예상요금</a> · <a href="/fare/?service=' + (isTaksong ? 'taksong' : 'daeri') + '&amp;to=' + encodeURIComponent(region) +
  '">이 지역 도착 예상요금</a>. 참고 지점은 실제 배차 실적이나 기사 대기 장소를 의미하지 않습니다.</p></section>' : '';
 const map = mapLink(region, region + ' 지도에서 확인', esc);
 return '<div class="locality-source-evidence"><p>' + map + ' · ' + (isTaksong
  ? '차량을 넘겨줄 위치와 받을 위치를 각각 확인해 주세요.'
  : '차량을 주차한 곳과 탑승 장소를 각각 확인해 주세요.') +
  '</p>' + parking + bus + address + dispatch + localBooking + '</div>';
}

function localitySearchDescription(region, kind, phone) {
 const data = localitySources[region] || {};
 const landmark = data.parking?.[0]?.name || (data.bus?.area === region ? data.bus.name : null) || addressReferences[region]?.name;
 const label = kind === 'taksong' ? '자동차탁송' : '대리운전';
 const checklist = kind === 'taksong' ? '차량 인수·인계 위치와 차종' : '차량 주차 위치와 탑승·하차 장소';
 const location = landmark && landmark.length <= 32 ? landmark + ' 위치 참고. ' : '';
 return region + ' ' + label + ' 예약. ' + location + checklist +
  '로 예상요금과 기사 배차를 확인하세요. 상담 ' + phone + '.';
}

module.exports = {renderLocalitySources, localitySearchDescription};
