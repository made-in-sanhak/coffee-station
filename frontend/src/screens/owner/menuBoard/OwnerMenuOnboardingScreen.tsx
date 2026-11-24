import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Pencil } from 'lucide-react-native';
import { Button, Screen, tokens } from '../../../app/ui';
import type { RootStackScreenProps } from '../../../navigation/types';
import { useMenuBoardStore } from '../../../store/menuBoardStore';
import { ownerOnboardingStyles as o } from '../invite/ownerOnboardingStyles';
import { CenterTitle, MenuBoardIllustration, OwnerStoreCard } from './MenuBoardParts';
import { pickMenuBoardImage } from './pickMenuBoardImage';
import { useNoBackUntilReset } from './useNoBackUntilReset';

const STEPS = [
  { title: '메뉴판 촬영', description: '메뉴판을 한 장 또는 여러 장 찍어요' },
  { title: '결과 확인', description: '읽은 이름과 가격을 확인하고 고쳐요' },
  { title: '등록 완료', description: '지도와 가격 비교에 바로 보여요' },
];

// 14-1 점주 첫 로그인 · 메뉴판 등록 안내. 등록된 메뉴가 0개면 반드시 이 흐름을 거칩니다. (뒤로 가기 없음)
export default function OwnerMenuOnboardingScreen({
  navigation,
  route,
}: RootStackScreenProps<'OwnerMenuOnboarding'>) {
  useNoBackUntilReset(navigation);
  const { cafe } = route.params;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (camera: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const image = await pickMenuBoardImage(camera);
      if (!image) return;
      const store = useMenuBoardStore.getState();
      store.start('register', cafe);
      store.addImage(image);
      navigation.navigate('MenuBoardCapture', { mode: 'register', cafe });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '사진을 가져오지 못했어요.');
    } finally {
      setBusy(false);
    }
  };
  const manual = () => {
    const store = useMenuBoardStore.getState();
    store.start('register', cafe);
    store.setScanItems([]);
    navigation.navigate('MenuBoardReview');
  };
  return (
    <Screen navigation={navigation} header={false} contentStyle={o.content}>
      <CenterTitle title="점주 센터 시작하기" />
      <View style={styles.titleBlock}>
        <Text style={o.pageTitle}>메뉴판을 찍어 메뉴를 등록해 주세요</Text>
        <Text style={o.pageSubtitle}>
          처음 한 번만 하면 돼요. 등록한 메뉴는 지도와 가격 비교에 바로 보여요
        </Text>
      </View>
      <OwnerStoreCard cafe={cafe} badge="승인 완료" description="점주 인증이 끝났어요 · 등록된 메뉴 0개" />
      <View style={styles.illust}>
        <MenuBoardIllustration />
      </View>
      <View style={[o.card, styles.steps]}>
        {STEPS.map((step, index) => (
          <View key={step.title} style={o.row}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.stepText}>
              <Text style={[o.body, o.bold]}>{step.title}</Text>
              <Text style={o.muted}>{step.description}</Text>
            </View>
          </View>
        ))}
      </View>
      {error && (
        <Text accessibilityRole="alert" style={o.error}>
          {error}
        </Text>
      )}
      <View style={styles.buttons}>
        <Button
          testID="menu-onboarding-camera"
          label="메뉴판 촬영하기"
          disabled={busy}
          onPress={() => pick(true)}
          style={styles.flex}
        />
        <Button
          testID="menu-onboarding-album"
          label="앨범에서 선택"
          variant="outline"
          disabled={busy}
          onPress={() => pick(false)}
          style={styles.flex}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        testID="menu-onboarding-manual"
        disabled={busy}
        onPress={manual}
        style={({ pressed }) => [o.linkRow, pressed && o.pressed]}
      >
        <Pencil size={18} color={tokens.text} strokeWidth={1.8} />
        <Text style={[o.body, styles.flex]}>메뉴판이 없나요? 직접 입력하기</Text>
        <ChevronRight size={18} color={tokens.muted} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleBlock: { gap: 4 },
  flex: { flex: 1 },
  illust: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: tokens.brownLight,
  },
  steps: { gap: 14 },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.green,
  },
  stepNumberText: {
    fontFamily: tokens.font,
    fontSize: 13,
    fontWeight: '700',
    color: tokens.white,
  },
  stepText: { flex: 1, gap: 2 },
  buttons: { flexDirection: 'row', gap: 8 },
});
