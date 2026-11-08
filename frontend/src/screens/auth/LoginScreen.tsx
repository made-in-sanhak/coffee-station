
import React from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Coffee,
  Map,
  ReceiptText,
  Sparkles,
} from 'lucide-react-native';

import type { RootStackScreenProps } from '../../navigation/types';
import { env } from '../../utils/env';

const GREEN = '#205C43';
const BACKGROUND = '#FBF8F2';
const YELLOW = '#FFE500';
const BROWN = '#30251F';
const MUTED = '#928980';

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
      <View style={styles.main}>
        <View style={styles.logo}>
          <Coffee
            size={35}
            color="#FFFFFF"
            strokeWidth={1.5}
          />
        </View>

        <Text style={styles.title}>커피 주유소</Text>

        <Text style={styles.subtitle}>
          내 주변 커피 가격을 한눈에 비교하고
          {'\n'}
          영수증 한 장으로 기록과 쿠폰까지
        </Text>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Map size={17} color={GREEN} strokeWidth={2} />
            <Text style={styles.featureText}>가격 비교</Text>
          </View>

          <View style={styles.feature}>
            <ReceiptText
              size={17}
              color={GREEN}
              strokeWidth={2}
            />
            <Text style={styles.featureText}>영수증 기록</Text>
          </View>

          <View style={styles.feature}>
            <Sparkles
              size={17}
              color={GREEN}
              strokeWidth={2}
            />
            <Text style={styles.featureText}>AI 추천</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={handleKakaoLogin}
          style={({ pressed }) => [
            styles.kakaoButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.kakaoLabel}>
            카카오로 시작하기
          </Text>
        </Pressable>

        <Text style={styles.ownerLogin}>
          점주이신가요? 점주 계정으로 로그인
        </Text>

        <Text style={styles.legalNotice}>
          시작하면 서비스 이용약관, 개인정보 처리방침,
          {'\n'}
          위치기반서비스 이용약관에 동의하게 됩니다.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
    paddingHorizontal: 24,
  },
  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 30,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    elevation: 3,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: BROWN,
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 13,
    fontSize: 13,
    lineHeight: 22,
    color: MUTED,
    textAlign: 'center',
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 38,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEE8DF',
    borderRadius: 24,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
    color: BROWN,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  kakaoButton: {
    width: '100%',
    height: 54,
    borderRadius: 10,
    backgroundColor: YELLOW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kakaoLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: BROWN,
  },
  pressed: {
    opacity: 0.75,
  },
  ownerLogin: {
    marginTop: 17,
    fontSize: 13,
    color: '#827970',
  },
  legalNotice: {
    marginTop: 24,
    fontSize: 11,
    lineHeight: 18,
    color: '#A39B92',
    textAlign: 'center',
  },
});
