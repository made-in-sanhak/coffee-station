import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Coffee } from 'lucide-react-native';
import { tokens } from '../../../app/ui';
import type { OwnerInviteCafe } from '../../../types/owner';
import { Asset } from '../ownerUi';
import { ownerOnboardingStyles as o } from '../invite/ownerOnboardingStyles';

// Figma Illust/MenuBoard: 촬영 안내·인식 중 화면의 메뉴판 그림 (사진 대신 보여 주는 일러스트라 색을 그대로 씁니다)
const BOARD = { board: '#2B2A26', frame: '#735438', chalk: '#F3E9D8', line: 'rgba(199,189,173,0.5)' };
const SAMPLE = [
  ['아메리카노', '2,000'],
  ['카페라떼', '2,900'],
  ['바닐라라떼', '3,400'],
  ['콜드브루', '3,500'],
  ['디카페인 아메리카노', '2,500'],
  ['자몽에이드', '3,800'],
  ['캐모마일티', '3,000'],
];
export function MenuBoardIllustration() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.board}
    >
      <Text style={styles.boardTitle}>MENU</Text>
      <View style={styles.boardLine} />
      {SAMPLE.map(([name, price]) => (
        <View key={name} style={styles.boardRow}>
          <Text style={styles.boardText}>{name}</Text>
          <Text style={[styles.boardText, styles.boardPrice]}>{price}</Text>
        </View>
      ))}
    </View>
  );
}

// 점주 매장 카드 (사진 자리 + 이름 + 배지 + 한 줄 설명)
export function OwnerStoreCard({
  cafe,
  badge,
  description,
}: {
  cafe: OwnerInviteCafe;
  badge: string;
  description: string;
}) {
  return (
    <View style={[o.card, o.row, styles.storeCard]}>
      <View style={o.storePhoto}>
        <Coffee size={22} color={tokens.brown} strokeWidth={1.8} />
      </View>
      <View style={styles.storeText}>
        <View style={styles.nameRow}>
          <Text style={o.storeName}>{cafe.name}</Text>
          <View style={o.badge}>
            <Text style={o.badgeText}>{badge}</Text>
          </View>
        </View>
        <Text style={o.muted}>{description}</Text>
      </View>
    </View>
  );
}

// 켜짐/꺼짐 스위치 (점주 화면 공통 Figma 에셋)
export function MenuToggle({
  value,
  onChange,
  label,
  testID,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      testID={testID}
      hitSlop={8}
      onPress={() => onChange(!value)}
    >
      <Asset name={value ? 'toggleOn' : 'toggleOff'} />
    </Pressable>
  );
}

// 화면 위 가운데 제목 (뒤로 가기가 없는 화면용)
export function CenterTitle({ title }: { title: string }) {
  return (
    <View style={styles.centerTitle}>
      <Text accessibilityRole="header" style={styles.centerTitleText}>
        {title}
      </Text>
    </View>
  );
}

export function NoticeBox({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.notice}>
      <Asset name="shield" />
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    width: 141,
    paddingHorizontal: 11.5,
    paddingTop: 11.5,
    paddingBottom: 13,
    gap: 5.8,
    borderRadius: 7.2,
    borderWidth: 2.9,
    borderColor: BOARD.frame,
    backgroundColor: BOARD.board,
    transform: [{ rotate: '3deg' }],
    elevation: 6,
  },
  boardTitle: {
    fontFamily: tokens.font,
    fontSize: 10.8,
    fontWeight: '700',
    letterSpacing: 2.2,
    color: BOARD.chalk,
  },
  boardLine: { height: 0.72, backgroundColor: BOARD.line },
  boardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  boardText: { fontFamily: tokens.font, fontSize: 7.9, color: BOARD.chalk },
  boardPrice: { fontWeight: '700' },
  storeCard: { padding: 14, gap: 12 },
  storeText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  centerTitle: { height: 56, alignItems: 'center', justifyContent: 'center' },
  centerTitleText: {
    fontFamily: tokens.font,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    color: tokens.text,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: tokens.greenLight,
  },
  noticeText: {
    flex: 1,
    fontFamily: tokens.font,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    color: tokens.green,
  },
});
