import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Notice, Screen, tokens } from '../../app/ui';
import { native } from '../../app/native';
import type { RootStackScreenProps } from '../../navigation/types';
import ExploreIcon, {
  type ExploreIconName,
} from '../../components/map/ExploreIcon';
import { useExploreSession } from '../map/exploreSession';

const benefits: { icon: ExploreIconName; text: string }[] = [
  { icon: 'permissionMap', text: '현재 위치 기준 지도와 가격 마커' },
  { icon: 'permissionNav', text: '카페까지 경유 길찾기' },
  { icon: 'permissionSparkles', text: '걸어서 갈 수 있는 카페 AI 추천' },
];

export default function LocationPermissionScreen({
  navigation,
}: RootStackScreenProps<'LocationPermission'>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allow = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const location = await native.requestLocation();
      useExploreSession.getState().recenter(location, true);
      navigation.popTo('Map');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : '현재 위치를 확인하지 못했습니다.',
      );
    } finally {
      setLoading(false);
    }
  };
  const search = () => {
    navigation.navigate('PlaceSearch');
  };

  return (
    <Screen
      navigation={navigation}
      header={false}
      scroll={false}
      contentStyle={styles.canvas}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroIcon}>
          <ExploreIcon name="permissionLocate" />
        </View>
        <Text style={styles.title}>내 주변 카페를 보여 드릴게요</Text>
        <Text style={styles.subtitle}>
          {
            '위치 권한을 허용하면 지금 있는 곳 주변의\n카페와 메뉴 가격을 바로 볼 수 있어요'
          }
        </Text>
        <View style={styles.benefits}>
          {benefits.map(benefit => (
            <View key={benefit.icon} style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <ExploreIcon name={benefit.icon} />
              </View>
              <Text style={styles.benefitText}>{benefit.text}</Text>
            </View>
          ))}
        </View>
        <View style={styles.privacy}>
          <ExploreIcon name="permissionShield" />
          <Text style={styles.privacyText}>
            {
              '위치는 주변 카페를 찾을 때만 사용하고,\n이동 기록은 저장하지 않아요'
            }
          </Text>
        </View>
        {error ? <Notice>{error}</Notice> : null}
        <View style={styles.spacer} />
        <View style={styles.actions}>
          <Button
            label="위치 권한 허용하기"
            loading={loading}
            onPress={() => {
              return allow();
            }}
          />
          <Pressable
            testID="location-later"
            accessibilityRole="button"
            disabled={loading}
            onPress={search}
            hitSlop={10}
          >
            <Text style={styles.later}>
              나중에 하기 · 역·동네 검색으로 둘러보기
            </Text>
          </Pressable>
          <Text style={styles.footnote}>
            허용하기를 누르면 휴대폰의 위치 권한 창이 열려요
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  canvas: { padding: 0, gap: 0 },
  content: {
    flexGrow: 1,
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: 'center',
    gap: 16,
  },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E3EFE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: tokens.font,
    fontSize: 22,
    lineHeight: 31,
    fontWeight: '700',
    color: tokens.text,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: tokens.font,
    fontSize: 14,
    lineHeight: 21,
    color: tokens.muted,
    textAlign: 'center',
  },
  benefits: {
    padding: 16,
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderColor: '#EAE3D9',
    borderWidth: 1,
    borderRadius: 16,
    width: '100%',
  },
  benefit: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E9D8C4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    fontFamily: tokens.font,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: tokens.text,
  },
  privacy: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#F6F0E8',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
  },
  privacyText: {
    flex: 1,
    fontFamily: tokens.font,
    fontSize: 12,
    lineHeight: 18,
    color: tokens.muted,
  },
  spacer: { flex: 1, minHeight: 36 },
  actions: { width: '100%', alignItems: 'stretch', gap: 16 },
  later: {
    fontFamily: tokens.font,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: tokens.muted,
    textAlign: 'center',
  },
  footnote: {
    fontFamily: tokens.font,
    fontSize: 11,
    color: tokens.muted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
