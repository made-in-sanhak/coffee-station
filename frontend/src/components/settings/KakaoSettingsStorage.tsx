import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useKakaoSettingsStore } from '../../store/kakaoSettingsStore';
import {
  createKakaoStorageBridge,
  KAKAO_STORAGE_HTML,
  KAKAO_STORAGE_ORIGIN,
  setKakaoSettingsWriter,
} from '../../storage/kakaoSettingsStorage';

const source = { html: KAKAO_STORAGE_HTML, baseUrl: KAKAO_STORAGE_ORIGIN };

export default function KakaoSettingsStorage() {
  const webView = useRef<WebView<{}>>(null);
  const bridge = useMemo(
    () =>
      createKakaoStorageBridge(
        script => {
          if (!webView.current) throw new Error('Storage unavailable');
          webView.current.injectJavaScript(script);
        },
        value => useKakaoSettingsStore.getState().loadSettings(value),
        message => useKakaoSettingsStore.getState().storageFailed(message),
      ),
    [],
  );

  useEffect(() => {
    const disconnect = setKakaoSettingsWriter(bridge.write);
    const timeout = setTimeout(() => {
      if (useKakaoSettingsStore.getState().status === 'loading') {
        useKakaoSettingsStore
          .getState()
          .storageFailed(
            '설정을 불러오지 못했습니다. 앱을 다시 실행해 주세요.',
          );
      }
    }, 15000);
    return () => {
      clearTimeout(timeout);
      disconnect();
      bridge.dispose();
    };
  }, [bridge]);

  const fail = () => {
    bridge.dispose();
    useKakaoSettingsStore
      .getState()
      .storageFailed('설정 저장소를 열지 못했습니다. 앱을 다시 실행해 주세요.');
  };

  return (
    <View
      style={styles.hidden}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <WebView
        ref={webView}
        source={source}
        domStorageEnabled
        javaScriptEnabled
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={request =>
          request.url === 'about:blank' ||
          request.url === KAKAO_STORAGE_ORIGIN ||
          request.url === `${KAKAO_STORAGE_ORIGIN}/`
        }
        onMessage={event => bridge.onMessage(event.nativeEvent.data)}
        onError={fail}
        onRenderProcessGone={fail}
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        mixedContentMode="never"
        javaScriptCanOpenWindowsAutomatically={false}
        setSupportMultipleWindows={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    left: 0,
    bottom: 0,
    opacity: 0,
  },
});
