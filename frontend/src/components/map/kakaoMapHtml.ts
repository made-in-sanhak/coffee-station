import type { Coordinate } from '../../types/store';
import { KAKAO_MAP_LOAD_TIMEOUT_MS } from './mapConfig';

// WebView 안에서 카카오 지도 JavaScript SDK 를 띄우는 페이지입니다.
// 앱 → 지도: window.coffeeMap.* 호출 (KakaoMapView 가 injectJavaScript 로 실행)
// 지도 → 앱: window.ReactNativeWebView.postMessage(JSON)
export const buildKakaoMapHtml = (appKey: string, center: Coordinate) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
  .price-marker {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid #eae3d9;
    background: #fff;
    color: #1f5a3e;
    font: 700 13px sans-serif;
    box-shadow: 0 4px 12px rgba(43, 28, 20, 0.12);
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
  }
  .price-marker.selected {
    border-color: #1f5a3e;
    background: #1f5a3e;
    color: #fff;
  }
  .marker-title { color: #7a6e64; font: 500 10px sans-serif; max-width: 88px; overflow: hidden; text-overflow: ellipsis; }
  .price-marker.selected .marker-title { color: #e3efe6; }
</style>
</head>
<body>
<div id="map"></div>
<script>
(function () {
  var settled = false;
  function post(message) {
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }
  function fail(reason) {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    post({ type: 'error', reason: reason });
  }
  var timeout = setTimeout(function () {
    fail('sdk-timeout');
  }, ${KAKAO_MAP_LOAD_TIMEOUT_MS});

  var sdk = document.createElement('script');
  sdk.src = ${JSON.stringify(
    `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
      appKey,
    )}&autoload=false&libraries=services`,
  )};
  sdk.onerror = function () { fail('sdk-load'); };
  sdk.onload = function () {
    if (settled) return;
    if (!window.kakao || !kakao.maps || typeof kakao.maps.load !== 'function') {
      fail('sdk-load');
      return;
    }

  try {
  kakao.maps.load(function () {
    if (settled) return;
    try {
    var map = new kakao.maps.Map(document.getElementById('map'), {
      center: new kakao.maps.LatLng(${center.latitude}, ${center.longitude}),
      level: 4,
    });
    var overlays = {};
    var selectedId = null;
    var browseNearby = false;
    var browseSequence = 0;
    var searchSequence = 0;
    var browseTimer = null;
    var searchedPlace = null;
    var currentLocation = null;
    var places = kakao.maps.services && kakao.maps.services.Places ? new kakao.maps.services.Places() : null;

    function validCoordinate(value) {
      return value && typeof value.latitude === 'number' && typeof value.longitude === 'number' &&
        isFinite(value.latitude) && isFinite(value.longitude) && Math.abs(value.latitude) <= 90 && Math.abs(value.longitude) <= 180;
    }
    function normalizePlace(value) {
      var result = {
        id: String(value.id || ''), name: value.place_name,
        address: value.road_address_name || value.address_name || '',
        latitude: Number(value.y), longitude: Number(value.x)
      };
      if (!result.id || typeof result.name !== 'string' || !validCoordinate(result)) return null;
      if (value.distance !== undefined && value.distance !== '' && isFinite(Number(value.distance))) result.distance = Number(value.distance);
      if (value.phone) result.phone = value.phone;
      if (value.place_url) result.placeUrl = value.place_url;
      return result;
    }
    function publishPositions() {
      var projection = map.getProjection && map.getProjection();
      if (!projection) return;
      if (searchedPlace) {
        var pin = projection.pointFromCoords(new kakao.maps.LatLng(searchedPlace.latitude, searchedPlace.longitude));
        post({ type: 'placePin', x: pin.x, y: pin.y, name: searchedPlace.name });
      }
      if (currentLocation) {
        var point = projection.pointFromCoords(new kakao.maps.LatLng(currentLocation.latitude, currentLocation.longitude));
        post({ type: 'currentLocation', x: point.x, y: point.y });
      }
    }
    function discoverNearby() {
      if (!browseNearby) return;
      if (!places) { post({ type: 'placesError', message: '지도 장소 검색을 사용할 수 없습니다. 카카오맵 설정을 확인해 주세요.' }); return; }
      var request = ++browseSequence;
      places.categorySearch('CE7', function (data, status) {
        if (request !== browseSequence) return;
        if (status === kakao.maps.services.Status.OK) {
          post({ type: 'places', places: data.map(normalizePlace).filter(function (item) { return item !== null; }) });
        } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
          post({ type: 'places', places: [] });
        } else {
          post({ type: 'placesError', message: '주변 카페를 조회하지 못했습니다. 카카오맵 사용 설정과 인터넷 연결을 확인해 주세요.' });
        }
      }, { location: map.getCenter(), radius: 1000, sort: kakao.maps.services.SortBy.DISTANCE });
    }

    function applySelection() {
      Object.keys(overlays).forEach(function (id) {
        var selected = String(selectedId) === id;
        overlays[id].getContent().classList.toggle('selected', selected);
        overlays[id].setZIndex(selected ? 2 : 1);
      });
    }

    window.coffeeMap = {
      setMarkers: function (markers) {
        Object.keys(overlays).forEach(function (id) {
          overlays[id].setMap(null);
        });
        overlays = {};
        markers.forEach(function (marker) {
          if (!validCoordinate(marker)) return;
          var el = document.createElement('div');
          el.className = 'price-marker';
          if (marker.title) {
            var title = document.createElement('span');
            title.className = 'marker-title';
            title.textContent = marker.title;
            el.appendChild(title);
          }
          var label = document.createElement('span');
          label.textContent = marker.label;
          el.appendChild(label);
          el.addEventListener('click', function () {
            post({ type: 'markerPress', id: marker.id });
          });
          overlays[marker.id] = new kakao.maps.CustomOverlay({
            map: map,
            position: new kakao.maps.LatLng(marker.latitude, marker.longitude),
            content: el,
            yAnchor: 1,
            clickable: true,
          });
        });
        applySelection();
      },
      select: function (id) {
        selectedId = id;
        applySelection();
      },
      setBrowseNearby: function (enabled) {
        browseNearby = !!enabled;
        discoverNearby();
      },
      setCenter: function (coordinate, isCurrentLocation) {
        if (!validCoordinate(coordinate)) return;
        ++searchSequence;
        ++browseSequence;
        searchedPlace = null;
        post({ type: 'placePin', clear: true });
        if (isCurrentLocation) currentLocation = coordinate;
        map.setCenter(new kakao.maps.LatLng(coordinate.latitude, coordinate.longitude));
        publishPositions();
        discoverNearby();
      },
      search: function (query) {
        if (!places || typeof query !== 'string' || !query.trim()) {
          post({ type: 'searchError', message: '검색할 장소를 입력해 주세요.' });
          return;
        }
        ++browseSequence;
        var request = ++searchSequence;
        places.keywordSearch(query.trim(), function (data, status) {
          if (request !== searchSequence) return;
          var result = status === kakao.maps.services.Status.OK && data.length ? normalizePlace(data[0]) : null;
          if (!result) {
            post({ type: 'searchError', message: status === kakao.maps.services.Status.ZERO_RESULT ? '검색한 장소를 찾지 못했습니다. 역이나 동네 이름을 확인해 주세요.' : '장소 검색에 실패했습니다. 인터넷 연결과 지도 설정을 확인해 주세요.' });
            return;
          }
          searchedPlace = result;
          map.setCenter(new kakao.maps.LatLng(result.latitude, result.longitude));
          post({ type: 'placeSearch', place: result });
          publishPositions();
          discoverNearby();
        });
      },
    };

    kakao.maps.event.addListener(map, 'click', function () {
      post({ type: 'mapPress' });
    });
    kakao.maps.event.addListener(map, 'center_changed', publishPositions);
    kakao.maps.event.addListener(map, 'idle', function () {
      var c = map.getCenter();
      post({ type: 'idle', latitude: c.getLat(), longitude: c.getLng() });
      publishPositions();
      clearTimeout(browseTimer);
      browseTimer = setTimeout(discoverNearby, 350);
    });

    settled = true;
    clearTimeout(timeout);
    post({ type: 'ready' });
    } catch (_) { fail('map-create'); }
  });
  } catch (_) { fail('sdk-load'); }
  };
  document.head.appendChild(sdk);
})();
</script>
</body>
</html>
`;
