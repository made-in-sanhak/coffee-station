import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '../../navigation/types';
import { env } from '../../utils/env';
import { colors } from '../../utils/theme';

export default function LoginScreen({
  navigation,
}: RootStackScreenProps<'Login'>) {
  const handleKakaoLogin = () => {
    if (!env.kakaoRestApiKey) {
      Alert.alert(
        '카카오 키가 없습니다',
        '루트 .env 에 KAKAO_REST_API_KEY 를 넣고 Metro 를 다시 시작해 주세요.',
      );
      return;
    }
    navigation.navigate('KakaoLogin');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>커피 주유소</Text>
        <Text style={styles.subtitle}>
          내 주변 커피 가격을 한눈에 비교하고{'\n'}마신 커피를 기록해 보세요.
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={handleKakaoLogin}
          style={({ pressed }) => [
            styles.kakaoButton,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.kakaoLabel}>카카오로 시작하기</Text>
        </Pressable>
        <Text style={styles.notice}>
          로그인하면 구매 기록과 쿠폰을 이용할 수 있어요.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.brown,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
  },
  footer: {
    paddingBottom: 24,
  },
  kakaoButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.kakao,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  kakaoLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.kakaoText,
  },
  notice: {
    marginTop: 12,
    fontSize: 13,
    textAlign: 'center',
    color: colors.textMuted,
  },
});
