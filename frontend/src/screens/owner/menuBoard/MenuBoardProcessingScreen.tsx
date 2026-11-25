import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check, Clock, Sparkles } from 'lucide-react-native';
import {
  diffMenuBoard,
  scanMenuBoard,
} from '../../../api/endpoints/menuBoard';
import { Button, Screen, tokens } from '../../../app/ui';
import type { RootStackScreenProps } from '../../../navigation/types';
import { useMenuBoardStore } from '../../../store/menuBoardStore';
import { ReceiptViewfinder } from '../../receipt/RewardVisuals';
import { ownerOnboardingStyles as o } from '../invite/ownerOnboardingStyles';
import { MenuBoardIllustration } from './MenuBoardParts';

const STEPS = [
  { label: '사진 올리기', Icon: Check },
  { label: '메뉴 이름·가격 읽는 중', Icon: Clock },
  { label: '커피·디카페인·음료·차로 분류', Icon: Sparkles },
];

// 14-3 메뉴판 인식 중: 업로드 → 읽기 → 분류. 결과가 오면 자동으로 다음 화면으로 갑니다.
export default function MenuBoardProcessingScreen({
  navigation,
}: RootStackScreenProps<'MenuBoardProcessing'>) {
  const images = useMenuBoardStore(state => state.images);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  const run = useCallback(async () => {
    const { cafe, mode, images: selected } = useMenuBoardStore.getState();
    setError(null);
    setStep(0);
    try {
      if (!cafe) throw new Error('매장 정보를 찾지 못했어요. 처음부터 다시 시도해 주세요.');
      if (selected.length === 0) throw new Error('메뉴판 사진을 먼저 골라 주세요.');
      if (mode === 'update') {
        const diff = await diffMenuBoard(cafe.id, selected);
        if (cancelled.current) return;
        setStep(2);
        useMenuBoardStore.getState().setDiff(diff);
        navigation.replace('MenuBoardDiff');
      } else {
        const result = await scanMenuBoard(cafe.id, selected);
        if (cancelled.current) return;
        setStep(2);
        useMenuBoardStore.getState().setScanItems(result.items);
        navigation.replace('MenuBoardReview');
      }
    } catch (cause) {
      if (!cancelled.current)
        setError(cause instanceof Error ? cause.message : '메뉴판을 읽지 못했어요. 다시 시도해 주세요.');
    }
  }, [navigation]);

  useEffect(() => {
    cancelled.current = false;
    run();
    return () => {
      cancelled.current = true;
    };
  }, [run]);

  const cancel = () => {
    cancelled.current = true;
    navigation.goBack();
  };
  const status = (index: number) =>
    index < step ? '완료' : index === step ? (error ? '실패' : '진행 중') : '대기';

  return (
    <Screen navigation={navigation} title="메뉴판 인식" contentStyle={o.content}>
      <View style={styles.titleBlock}>
        <Text style={o.pageTitle}>메뉴판을 읽고 있어요</Text>
        <Text style={o.pageSubtitle}>보통 5~10초 걸려요. 잠시만 기다려 주세요</Text>
      </View>
      <ReceiptViewfinder
        imageUri={images[0]?.uri}
        imageLabel="읽고 있는 메뉴판"
        hint={null}
        corners={false}
        placeholder={
          <View style={styles.placeholder}>
            <MenuBoardIllustration />
          </View>
        }
        overlay={<View style={styles.scanLine} />}
      />
      {STEPS.map(({ label, Icon }, index) => {
        const value = status(index);
        const waiting = value === '대기';
        return (
          <View key={label} testID={`menu-board-step-${index}`} style={[o.linkRow, waiting && styles.waiting]}>
            <Icon size={18} color={waiting ? tokens.muted : tokens.text} strokeWidth={1.8} />
            <Text style={[o.body, styles.flex, waiting && styles.mutedText]}>{label}</Text>
            <Text style={[styles.status, value === '실패' && styles.failed, waiting && styles.mutedText]}>{value}</Text>
          </View>
        );
      })}
      {error && (
        <Text accessibilityRole="alert" testID="menu-board-processing-error" style={o.error}>
          {error}
        </Text>
      )}
      <View style={o.spacer} />
      {error && <Button testID="menu-board-retry" label="다시 시도" onPress={run} />}
      <Button testID="menu-board-cancel" label="취소" variant="outline" onPress={cancel} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleBlock: { gap: 4 },
  flex: { flex: 1 },
  placeholder: { position: 'absolute', top: 44 },
  scanLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '60%',
    height: 3,
    borderRadius: 2,
    backgroundColor: tokens.greenLight,
  },
  waiting: { opacity: 0.6 },
  status: {
    fontFamily: tokens.font,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    color: tokens.green,
  },
  failed: { color: tokens.red },
  mutedText: { color: tokens.muted, fontWeight: '400' },
});
