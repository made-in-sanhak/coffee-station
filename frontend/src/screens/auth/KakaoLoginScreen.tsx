import React, { useRef } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useKakaoLogin } from '../../api/queries/useKakaoLogin';
import type { RootStackScreenProps } from '../../navigation/types';
import { env } from '../../utils/env';
import { buildKakaoAuthorizeUrl, parseKakaoRedirect } from '../../utils/kakaoAuth';
import { colors } from '../../utils/theme';

// 카카오 로그인 페이지를 WebView 로 띄우고, Redirect URI 로 돌아오는 순간을 가로채
// 인가 코드를 서버에 넘깁니다. (Redirect URI 페이지 자체는 열지 않습니다)
export default function KakaoLoginScreen({
  navigation,
}: RootStackScreenProps<'KakaoLogin'>) {
  const { mutate: login, isPending } = useKakaoLogin();
  const handled = useRef(false);

  const fail = (message: string) => {
    Alert.alert('로그인 실패', message);
    navigation.goBack();
  };

  const handleUrl = (url: string): boolean => {
    const result = parseKakaoRedirect(url);
    if (!result) {
      // 카카오톡 앱 실행(intent://) 같은 주소는 WebView 가 열 수 없어서 막습니다.
      return /^https?:\/\//.test(url);
    }
    if (!handled.current) {
      handled.current = true;
      if (result.type === 'code') {
        login(
          { code: result.code, redirectUri: env.kakaoRedirectUri },
          { onError: error => fail(error.message) },
        );
      } else {
        fail(result.message);
      }
    }
    return false;
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: buildKakaoAuthorizeUrl() }}
        // 다른 계정으로 다시 로그인할 수 있도록 로그인 쿠키를 남기지 않습니다.
        incognito
        onShouldStartLoadWithRequest={request => handleUrl(request.url)}
        onError={() => {
          if (!handled.current) {
            handled.current = true;
            fail('카카오 로그인 페이지를 열지 못했습니다.');
          }
        }}
        startInLoadingState
        renderLoading={() => <Loading />}
      />
      {isPending && <Loading />}
    </View>
  );
}

function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
});
