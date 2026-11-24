import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { applyMenuDiff } from '../../../api/endpoints/menuBoard';
import { Button, Screen, formatMoney, tokens } from '../../../app/ui';
import type { RootStackScreenProps } from '../../../navigation/types';
import { useMenuBoardStore } from '../../../store/menuBoardStore';
import type { MenuDiffItem } from '../../../types/menuBoard';
import { ownerOnboardingStyles as o } from '../invite/ownerOnboardingStyles';
import { MenuToggle, NoticeBox } from './MenuBoardParts';
import { categoryLabel, defaultDiffEnabled, diffSummary } from './menuBoardLogic';

const BADGE: Record<MenuDiffItem['kind'], { label: string; box: object; text: object }> = {
  PRICE_CHANGED: { label: '가격 변경', box: o.brownBadge, text: o.brownBadgeText },
  NEW: { label: '새 메뉴', box: {}, text: {} },
  MISSING: { label: '메뉴판에 없음', box: { backgroundColor: tokens.card }, text: { color: tokens.muted } },
};

const detail = (item: MenuDiffItem) => {
  if (item.kind === 'PRICE_CHANGED') return `${formatMoney(item.previousPrice)} → ${formatMoney(item.price)}`;
  if (item.kind === 'NEW') return `${categoryLabel(item.category)} · ${item.size ?? 'Regular'} · 새로 등록`;
  return '반영하면 판매 중지로 바뀌어요';
};

// 14-8 메뉴판 변경 사항 확인: 등록된 메뉴와 다른 것만 보여 주고, 켠 항목만 반영합니다.
export default function MenuBoardDiffScreen({
  navigation,
}: RootStackScreenProps<'MenuBoardDiff'>) {
  const cafe = useMenuBoardStore(state => state.cafe);
  const diff = useMenuBoardStore(state => state.diff);
  const changes = diff?.changes ?? [];
  const unchanged = diff?.unchanged ?? [];
  const [enabled, setEnabled] = useState<boolean[]>(() => changes.map(defaultDiffEnabled));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const summary = diffSummary(changes);
  const selected = changes.filter((_, index) => enabled[index]);

  const backToMenus = (refreshed: boolean) =>
    navigation.popTo('OwnerMenus', {
      cafeId: cafe?.id,
      ...(refreshed ? { refreshedAt: Date.now() } : {}),
    });
  const apply = async () => {
    if (busy || selected.length === 0 || !cafe) return;
    setBusy(true);
    setError(null);
    try {
      await applyMenuDiff(cafe.id, { changes: selected });
      backToMenus(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '변경 사항을 반영하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen navigation={navigation} title="변경 사항 확인" contentStyle={[o.content, styles.content]}>
      <NoticeBox>
        {changes.length
          ? `등록된 메뉴와 비교해 ${changes.length}건이 달라요. 반영할 항목만 켜 주세요.`
          : '등록된 메뉴와 달라진 곳이 없어요.'}
      </NoticeBox>
      {changes.length > 0 && (
        <View style={styles.summary}>
          {summary.priceChanged > 0 && (
            <View style={[o.badge, o.brownBadge]}>
              <Text style={[o.badgeText, o.brownBadgeText]}>가격 변경 {summary.priceChanged}</Text>
            </View>
          )}
          {summary.added > 0 && (
            <View style={o.badge}>
              <Text style={o.badgeText}>새 메뉴 {summary.added}</Text>
            </View>
          )}
          {summary.missing > 0 && (
            <View style={[o.badge, BADGE.MISSING.box]}>
              <Text style={[o.badgeText, BADGE.MISSING.text]}>메뉴판에 없음 {summary.missing}</Text>
            </View>
          )}
        </View>
      )}
      {changes.length > 0 && (
        <View style={o.card}>
          {changes.map((item, index) => {
            const on = !!enabled[index];
            const badge = BADGE[item.kind];
            return (
              <React.Fragment key={`${item.kind}-${item.menuId ?? item.name}`}>
                {index > 0 && <View style={o.divider} />}
                <View
                  testID={`menu-diff-row-${index}`}
                  style={[styles.row, item.kind === 'MISSING' && !on && styles.dimmed]}
                >
                  <View style={styles.text}>
                    <View style={styles.nameRow}>
                      <Text style={[o.body, o.bold]}>{item.name}</Text>
                      <View style={[o.badge, badge.box]}>
                        <Text style={[o.badgeText, badge.text]}>{badge.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.meta}>{detail(item)}</Text>
                  </View>
                  <View style={[styles.priceBox, item.kind === 'PRICE_CHANGED' && styles.changedPrice]}>
                    <Text style={styles.price}>{formatMoney(item.price)}</Text>
                  </View>
                  <MenuToggle
                    testID={`menu-diff-toggle-${index}`}
                    label={`${item.name} ${badge.label} 반영`}
                    value={on}
                    onChange={value =>
                      setEnabled(previous => previous.map((current, i) => (i === index ? value : current)))
                    }
                  />
                </View>
              </React.Fragment>
            );
          })}
        </View>
      )}
      {unchanged.length > 0 && (
        <View style={o.linkRow}>
          <Check size={20} color={tokens.brown} strokeWidth={2} />
          <View style={styles.text}>
            <Text style={[o.body, o.bold]}>그대로인 메뉴 {unchanged.length}개는 바뀌지 않아요</Text>
            <Text style={o.muted}>{unchanged.map(item => item.name).join(' · ')}</Text>
          </View>
        </View>
      )}
      {error && (
        <Text accessibilityRole="alert" testID="menu-diff-error" style={o.error}>
          {error}
        </Text>
      )}
      <View style={o.spacer} />
      {changes.length ? (
        <Button
          testID="menu-diff-apply"
          label={`변경 ${selected.length}건 반영하기`}
          disabled={selected.length === 0}
          loading={busy}
          onPress={apply}
        />
      ) : (
        <Button testID="menu-diff-back" label="메뉴 관리로 돌아가기" onPress={() => backToMenus(false)} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dimmed: { opacity: 0.7 },
  text: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  meta: { fontFamily: tokens.font, fontSize: 11, lineHeight: 15, color: tokens.muted },
  priceBox: {
    width: 96,
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.white,
  },
  changedPrice: { backgroundColor: tokens.card },
  price: { fontFamily: tokens.font, fontSize: 14, lineHeight: 20, fontWeight: '700', color: tokens.green },
});
