import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { Coordinate } from '../../types/store';
import { env } from '../../utils/env';
import { colors } from '../../utils/theme';
import { buildKakaoMapHtml } from './kakaoMapHtml';

export interface MapMarker extends Coordinate {
  id: number;
  label: string;
}

type MapMessage =
  | { type: 'ready' }
  | { type: 'error' }
  | { type: 'mapPress' }
  | { type: 'markerPress'; id: number }
  | ({ type: 'idle' } & Coordinate);

interface Props {
  initialCenter: Coordinate;
  markers: MapMarker[];
  selectedId: number | null;
  onMarkerPress: (id: number) => void;
  onMapPress: () => void;
  // 지도 이동·확대가 끝났을 때의 중심 좌표
  onCenterChange: (center: Coordinate) => void;
}

export default function KakaoMapView({
  initialCenter,
  markers,
  selectedId,
  onMarkerPress,
  onMapPress,
  onCenterChange,
}: Props) {
  const webViewRef = useRef<WebView<{}>>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );

  // 처음 중심 좌표로 한 번만 만듭니다. (다시 만들면 지도가 새로고침됨)
  const source = useMemo(
    () => ({
      html: buildKakaoMapHtml(env.kakaoMapJsKey, initialCenter),
      // 카카오 개발자 콘솔 > 플랫폼 > Web 에 등록한 도메인과 같아야 합니다.
      baseUrl: 'http://localhost',
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

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

  const handleMessage = (event: WebViewMessageEvent) => {
    const message = JSON.parse(event.nativeEvent.data) as MapMessage;
    switch (message.type) {
      case 'ready':
        setStatus('ready');
        break;
      case 'error':
        setStatus('error');
        break;
      case 'markerPress':
        onMarkerPress(message.id);
        break;
      case 'mapPress':
        onMapPress();
        break;
      case 'idle':
        onCenterChange({
          latitude: message.latitude,
          longitude: message.longitude,
        });
        break;
    }
  };

  if (!env.kakaoMapJsKey || status === 'error') {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>지도를 불러오지 못했습니다</Text>
        <Text style={styles.fallbackText}>
          {env.kakaoMapJsKey
            ? '카카오 개발자 콘솔에서 JavaScript 키와 Web 도메인(http://localhost) 등록을 확인해 주세요.'
            : '루트 .env 에 KAKAO_MAP_JS_KEY 를 넣고 Metro 를 다시 시작해 주세요.'}
        </Text>
      </View>
    );
  }

  return (
    <WebView
      ref={webViewRef}
      style={styles.map}
      originWhitelist={['*']}
      source={source}
      onMessage={handleMessage}
      onError={() => setStatus('error')}
      overScrollMode="never"
    />
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    backgroundColor: colors.background,
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
});
