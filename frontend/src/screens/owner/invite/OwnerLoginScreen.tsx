import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChartColumn, Camera, Coffee, Pencil } from 'lucide-react-native';
import { Button, tokens } from '../../../app/ui';
import type { RootStackScreenProps } from '../../../navigation/types';
import { useOwnerInviteStore } from '../../../store/ownerInviteStore';
import { env } from '../../../utils/env';
import { ownerOnboardingStyles as o } from './ownerOnboardingStyles';

const FEATURES = [
  { label: '메뉴판 등록', Icon: Camera },
  { label: '가격 관리', Icon: Pencil },
  { label: '방문 통계', Icon: ChartColumn },
];

// 14-0-1 점주 로그인: 카카오로 로그인한 뒤 초대 코드 화면으로 이어집니다.
export default function OwnerLoginScreen({
  navigation,
}: RootStackScreenProps<'OwnerLogin'>) {
  const pendingCode = useOwnerInviteStore(state => state.pendingCode);
  const startKakao = () => {
    if (!env.kakaoRestApiKey) {
      Alert.alert('카카오 로그인 연결 오류', '카카오 로그인을 시작할 수 없습니다.');
      return;
    }
    navigation.navigate('KakaoLogin', {
      returnTo: {
        name: 'OwnerInvite',
        params: pendingCode ? { code: pendingCode } : undefined,
      },
    });
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.main}>
        <View style={styles.logo}>
          <Coffee size={48} color={tokens.white} strokeWidth={1.6} />
        </View>
        <Text style={styles.title}>커피 주유소</Text>
        <View style={[o.badge, o.brownBadge, styles.centerBadge]}>
          <Text style={[o.badgeText, o.brownBadgeText]}>점주 센터</Text>
        </View>
        <Text style={styles.subtitle}>
          메뉴판 한 장으로 메뉴를 등록하고{'\n'}우리 매장 가격을 직접 관리하세요
        </Text>
        <View style={styles.features}>
          {FEATURES.map(({ label, Icon }) => (
            <View key={label} style={styles.feature}>
              <Icon size={16} color={tokens.green} strokeWidth={2} />
              <Text style={styles.featureText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.footer}>
        <Button
          testID="owner-login-kakao"
          label="카카오로 시작하기"
          variant="kakao"
          onPress={startKakao}
          style={styles.fullWidth}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="사용자로 로그인"
          testID="owner-login-user"
          hitSlop={8}
          onPress={() =>
            navigation.canGoBack() ? navigation.goBack() : navigation.replace('Login')
          }
        >
          <Text style={styles.userLogin}>일반 사용자이신가요?  사용자로 로그인</Text>
        </Pressable>
        <Text style={styles.notice}>
          점주 계정은 커피 주유소 팀이 확인한 매장에만 연결돼요
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.bg, paddingHorizontal: 20 },
  main: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: tokens.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: tokens.text,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: {
    fontFamily: tokens.font,
    fontSize: 32,
    lineHeight: 45,
    fontWeight: '900',
    color: tokens.text,
  },
  centerBadge: { alignSelf: 'center' },
  subtitle: {
    fontFamily: tokens.font,
    fontSize: 15,
    lineHeight: 24,
    color: tokens.muted,
    textAlign: 'center',
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 20,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.white,
  },
  featureText: {
    fontFamily: tokens.font,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    color: tokens.text,
  },
  footer: { alignItems: 'center', gap: 16, paddingBottom: 40 },
  fullWidth: { alignSelf: 'stretch' },
  userLogin: {
    fontFamily: tokens.font,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: tokens.muted,
  },
  notice: {
    fontFamily: tokens.font,
    fontSize: 11,
    lineHeight: 15,
    color: tokens.muted,
    textAlign: 'center',
  },
});
