import type { Coordinate } from '../../types/store';
import { colors } from '../../utils/theme';

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
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid ${colors.border};
    background: ${colors.surface};
    color: ${colors.text};
    font: 700 14px sans-serif;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
  }
  .price-marker.selected {
    border-color: ${colors.primary};
    background: ${colors.primary};
    color: #fff;
  }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
  appKey,
)}&autoload=false"></script>
<script>
(function () {
  function post(message) {
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }

  if (!window.kakao || !kakao.maps) {
    post({ type: 'error' });
    return;
  }

  kakao.maps.load(function () {
    var map = new kakao.maps.Map(document.getElementById('map'), {
      center: new kakao.maps.LatLng(${center.latitude}, ${center.longitude}),
      level: 4,
    });
    var overlays = {};
    var selectedId = null;

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
          var el = document.createElement('div');
          el.className = 'price-marker';
          el.textContent = marker.label;
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
    };

    kakao.maps.event.addListener(map, 'click', function () {
      post({ type: 'mapPress' });
    });
    kakao.maps.event.addListener(map, 'idle', function () {
      var c = map.getCenter();
      post({ type: 'idle', latitude: c.getLat(), longitude: c.getLng() });
    });

    post({ type: 'ready' });
  });
})();
</script>
</body>
</html>
`;
