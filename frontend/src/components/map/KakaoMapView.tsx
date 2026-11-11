import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { Coordinate } from '../../types/store';
import { useKakaoSettingsStore } from '../../store/kakaoSettingsStore';
import { colors } from '../../utils/theme';
import { buildKakaoMapHtml } from './kakaoMapHtml';
import { KAKAO_MAP_BASE_URL, KAKAO_MAP_LOAD_TIMEOUT_MS } from './mapConfig';
import ExploreIcon from './ExploreIcon';
import type { MapCommand } from '../../screens/map/exploreSession';

export interface MapMarker extends Coordinate {
  id: number | string;
  label: string;
  title?: string;
}

export interface KakaoPlace extends Coordinate {
  id: string;
  name: string;
  address: string;
  distance?: number;
  phone?: string;
  placeUrl?: string;
}

const coordinateIsValid = (value: Record<string, unknown>) =>
  typeof value.latitude === 'number' &&
  typeof value.longitude === 'number' &&
  Number.isFinite(value.latitude) &&
  Number.isFinite(value.longitude) &&
  Math.abs(value.latitude) <= 90 &&
  Math.abs(value.longitude) <= 180;

function readPlace(value: unknown): KakaoPlace | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const place = value as Record<string, unknown>;
  if (
    typeof place.id !== 'string' ||
    !place.id ||
    typeof place.name !== 'string' ||
    typeof place.address !== 'string' ||
    !coordinateIsValid(place)
  )
    return null;
  return {
    id: place.id,
    name: place.name,
    address: place.address,
    latitude: place.latitude as number,
    longitude: place.longitude as number,
    ...(typeof place.distance === 'number' &&
    Number.isFinite(place.distance) &&
    place.distance >= 0
      ? { distance: place.distance }
      : {}),
    ...(typeof place.phone === 'string' ? { phone: place.phone } : {}),
    ...(typeof place.placeUrl === 'string' ? { placeUrl: place.placeUrl } : {}),
  };
}

type MapFailure = 'sdk-load' | 'sdk-timeout' | 'map-create' | 'network';

const failureMessages: Record<MapFailure, string> = {
  'sdk-load': '지도 서비스에 연결하지 못했습니다. 다시 시도해 주세요.',
  'sdk-timeout':
    '지도 응답 시간이 초과되었습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.',
  'map-create': '지도를 표시하는 중 오류가 발생했습니다. 다시 시도해 주세요.',
  network:
    '지도 서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.',
};

interface Props {
  initialCenter: Coordinate;
  markers: MapMarker[];
  selectedId: number | string | null;
  onMarkerPress: (id: number | string) => void;
  onMapPress: () => void;
  // 지도 이동·확대가 끝났을 때의 중심 좌표
  onCenterChange: (center: Coordinate) => void;
  command?: MapCommand | null;
  browseNearby?: boolean;
  onPlaces?: (places: KakaoPlace[]) => void;
  onSearchResult?: (place: KakaoPlace) => void;
  onSearchError?: (message: string) => void;
  onPlacesError?: (message: string) => void;
}

export default function KakaoMapView(props: Props) {
  const appKey = useKakaoSettingsStore(state => state.settings.kakaoMapJsKey);
  const [attempt, setAttempt] = useState(0);
  return (
    <MapDocument
      key={`${appKey}:${attempt}`}
      {...props}
      appKey={appKey}
      onRetry={() => setAttempt(previous => previous + 1)}
    />
  );
}

function MapDocument({
  initialCenter,
  markers,
  selectedId,
  onMarkerPress,
  onMapPress,
  onCenterChange,
  appKey,
  onRetry,
  command,
  browseNearby,
  onPlaces,
  onSearchResult,
  onSearchError,
  onPlacesError,
}: Props & { appKey: string; onRetry: () => void }) {
  const webViewRef = useRef<WebView<{}>>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const statusRef = useRef(status);
  const [failure, setFailure] = useState<MapFailure>('sdk-load');
  const [placePin, setPlacePin] = useState<{
    x: number;
    y: number;
    name: string;
  } | null>(null);
  const [pinWidth, setPinWidth] = useState(80);
  const [locationPoint, setLocationPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const fail = (reason: MapFailure) => {
    if (statusRef.current === 'error') return;
    statusRef.current = 'error';
    setFailure(reason);
    setStatus('error');
  };

  // 처음 중심 좌표로 한 번만 만듭니다. (다시 만들면 지도가 새로고침됨)
  const source = useMemo(
    () => ({
      html: buildKakaoMapHtml(appKey, initialCenter),
      // JavaScript 키에 등록한 도메인과 일치해야 합니다.
      baseUrl: KAKAO_MAP_BASE_URL,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (!appKey || status !== 'loading') return;
    const timeout = setTimeout(() => {
      if (statusRef.current === 'loading') {
        statusRef.current = 'error';
        setFailure('sdk-timeout');
        setStatus('error');
      }
    }, KAKAO_MAP_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [appKey, status]);

  useEffect(() => {
    if (status === 'ready') {
      webViewRef.current?.injectJavaScript(
        `window.coffeeMap.setMarkers(${JSON.stringify(markers)}); true;`,
      );
    }
  }, [status, markers]);

  useEffect(() => {
    if (status === 'ready') {
      webViewRef.current?.injectJavaScript(
        `window.coffeeMap.select(${JSON.stringify(selectedId)}); true;`,
      );
    }
  }, [status, selectedId]);

  useEffect(() => {
    if (status === 'ready')
      webViewRef.current?.injectJavaScript(
        `window.coffeeMap.setBrowseNearby(${browseNearby === true}); true;`,
      );
  }, [status, browseNearby]);

  useEffect(() => {
    if (status !== 'ready' || !command) return;
    const script =
      command.type === 'search'
        ? `window.coffeeMap.search(${JSON.stringify(command.query)}); true;`
        : `window.coffeeMap.setCenter(${JSON.stringify(command.coordinate)}, ${
            command.currentLocation === true
          }); true;`;
    webViewRef.current?.injectJavaScript(script);
  }, [status, command]);

  const handleMessage = (event: WebViewMessageEvent) => {
    if (statusRef.current === 'error') return;
    let message: Record<string, unknown>;
    try {
      const value = JSON.parse(event.nativeEvent.data);
      if (!value || typeof value !== 'object' || Array.isArray(value)) return;
      message = value;
    } catch {
      return;
    }
    switch (message.type) {
      case 'ready':
        statusRef.current = 'ready';
        setStatus('ready');
        break;
      case 'error':
        fail(
          message.reason === 'sdk-timeout' || message.reason === 'map-create'
            ? message.reason
            : 'sdk-load',
        );
        break;
      case 'markerPress':
        if (
          statusRef.current === 'ready' &&
          ((typeof message.id === 'number' &&
            Number.isSafeInteger(message.id)) ||
            (typeof message.id === 'string' && message.id.length > 0))
        ) {
          onMarkerPress(message.id);
        }
        break;
      case 'mapPress':
        if (statusRef.current === 'ready') onMapPress();
        break;
      case 'idle':
        if (
          statusRef.current !== 'ready' ||
          typeof message.latitude !== 'number' ||
          typeof message.longitude !== 'number' ||
          !Number.isFinite(message.latitude) ||
          !Number.isFinite(message.longitude) ||
          Math.abs(message.latitude) > 90 ||
          Math.abs(message.longitude) > 180
        )
          return;
        onCenterChange({
          latitude: message.latitude,
          longitude: message.longitude,
        });
        break;
      case 'places':
        if (statusRef.current === 'ready' && Array.isArray(message.places)) {
          onPlaces?.(
            message.places
              .map(readPlace)
              .filter((place): place is KakaoPlace => place !== null),
          );
        }
        break;
      case 'placeSearch': {
        const place = readPlace(message.place);
        if (statusRef.current === 'ready' && place) onSearchResult?.(place);
        break;
      }
      case 'searchError':
        if (typeof message.message === 'string')
          onSearchError?.(message.message);
        break;
      case 'placesError':
        if (typeof message.message === 'string')
          onPlacesError?.(message.message);
        break;
      case 'placePin':
        if (message.clear === true) setPlacePin(null);
        else if (
          typeof message.name === 'string' &&
          typeof message.x === 'number' &&
          typeof message.y === 'number' &&
          Number.isFinite(message.x) &&
          Number.isFinite(message.y)
        )
          setPlacePin({ x: message.x, y: message.y, name: message.name });
        break;
      case 'currentLocation':
        if (
          typeof message.x === 'number' &&
          typeof message.y === 'number' &&
          Number.isFinite(message.x) &&
          Number.isFinite(message.y)
        )
          setLocationPoint({ x: message.x, y: message.y });
        break;
    }
  };

  if (!appKey || status === 'error') {
    return (
      <View style={styles.fallback} accessibilityLiveRegion="polite">
        <Text style={styles.fallbackTitle}>지도를 불러오지 못했습니다</Text>
        <Text style={styles.fallbackText}>
          {appKey
            ? failureMessages[failure]
            : '지도 서비스가 준비되지 않았습니다. 카페 이름으로 검색할 수 있습니다.'}
        </Text>
        {appKey ? (
          <Pressable
            testID="map-retry"
            accessibilityRole="button"
            accessibilityLabel="지도 다시 불러오기"
            onPress={onRetry}
            style={styles.retry}
          >
            <Text style={styles.retryLabel}>다시 시도</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.map}>
      <WebView
        ref={webViewRef}
        style={styles.map}
        originWhitelist={['*']}
        source={source}
        onMessage={handleMessage}
        onError={() => fail('network')}
        onHttpError={() => fail('sdk-load')}
        onRenderProcessGone={() => fail('map-create')}
        mixedContentMode="never"
        overScrollMode="never"
      />
      {status === 'ready' && locationPoint ? (
        <View
          pointerEvents="none"
          style={[
            styles.currentLocation,
            { left: locationPoint.x - 9, top: locationPoint.y - 9 },
          ]}
        >
          <ExploreIcon name="myLocation" />
        </View>
      ) : null}
      {status === 'ready' && placePin ? (
        <View
          pointerEvents="none"
          onLayout={event => setPinWidth(event.nativeEvent.layout.width)}
          style={[
            styles.placePin,
            { left: placePin.x - pinWidth / 2, top: placePin.y - 37 },
          ]}
        >
          <View style={styles.pinBubble}>
            <ExploreIcon name="placePin" />
            <Text numberOfLines={1} style={styles.pinLabel}>
              {placePin.name}
            </Text>
          </View>
          <ExploreIcon name="pinDot" />
        </View>
      ) : null}
      {status === 'loading' ? (
        <View
          testID="map-loading"
          style={styles.loading}
          pointerEvents="none"
          accessibilityLiveRegion="polite"
        >
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.fallbackText}>지도를 불러오는 중입니다.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.background,
  },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  fallbackText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: colors.textMuted,
  },
  loading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  retry: {
    marginTop: 20,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  retryLabel: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  currentLocation: { position: 'absolute', width: 18, height: 18 },
  placePin: {
    position: 'absolute',
    alignItems: 'center',
    gap: 2,
    maxWidth: 200,
  },
  pinBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D0554A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  pinLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    maxWidth: 150,
  },
});
