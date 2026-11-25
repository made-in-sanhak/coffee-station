import React, { useRef, useState, useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useKakaoLogin } from '../../api/queries/useKakaoLogin';
import type { RootStackScreenProps } from '../../navigation/types';
import {
  startKakaoLogin,
  type KakaoLoginStart,
} from '../../api/endpoints/auth';
import { isKakaoAuthorizeUrl, parseOAuthRedirect } from '../../app/oauth';
import { colors } from '../../utils/theme';

// 카카오 로그인 페이지를 WebView 로 띄우고, Redirect URI 로 돌아오는 순간을 가로채
// 인가 코드를 서버에 넘깁니다. (Redirect URI 페이지 자체는 열지 않습니다)
export default function KakaoLoginScreen({
  navigation,
  route,
}: RootStackScreenProps<'KakaoLogin'>) {
  const { mutate: login, isPending } = useKakaoLogin(() => {
    const returnTo = route.params?.returnTo;
    return returnTo && navigation.isFocused() ? returnTo : undefined;
  });
  const handled = useRef(false);
  const [flow, setFlow] = useState<KakaoLoginStart | null>(null);
  useEffect(() => {
    let active = true;
    void startKakaoLogin()
      .then(value => {
        if (
          !isKakaoAuthorizeUrl(
            value.authorizeUrl,
            value.redirectUri,
            value.state,
          )
        )
          throw new Error('로그인 주소를 확인할 수 없습니다.');
        if (active) setFlow(value);
      })
      .catch(error => {
        if (active) {
          Alert.alert(
            '로그인 실패',
            error instanceof Error
              ? error.message
              : '로그인을 시작하지 못했습니다.',
          );
          navigation.goBack();
        }
      });
    return () => {
      active = false;
    };
  }, [navigation]);

  const fail = (message: string) => {
    Alert.alert('로그인 실패', message);
    navigation.goBack();
  };

  const handleUrl = (url: string): boolean => {
    if (!flow) return false;
    let result: { code: string } | null;
    try {
      result = parseOAuthRedirect(url, flow.redirectUri, flow.state);
    } catch (error) {
      if (!handled.current) {
        handled.current = true;
        fail(
          error instanceof Error
            ? error.message
            : '로그인 응답이 올바르지 않습니다.',
        );
      }
      return false;
    }
    if (!result) {
      // 카카오톡 앱 실행(intent://) 같은 주소는 WebView 가 열 수 없어서 막습니다.
      return /^https?:\/\//.test(url);
    }
    if (!handled.current) {
      handled.current = true;
      login(
        {
          code: result.code,
          redirectUri: flow.redirectUri,
          state: flow.state,
          flowToken: flow.flowToken,
        },
        { onError: error => fail(error.message) },
      );
    }
    return false;
  };

  return (
    <View style={styles.container}>
      {flow && (
        <WebView
          source={{ uri: flow.authorizeUrl }}
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
      )}
      {(!flow || isPending) && <Loading />}
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
