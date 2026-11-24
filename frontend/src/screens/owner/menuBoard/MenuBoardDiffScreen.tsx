import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { applyMenuDiff } from '../../../api/endpoints/menuBoard';
import { Button, Chip, Field, Screen, formatMoney, tokens } from '../../../app/ui';
import type { RootStackScreenProps } from '../../../navigation/types';
import { useMenuBoardStore } from '../../../store/menuBoardStore';
import type { MenuBoardCategory, MenuBoardTemperature, MenuDiffItem } from '../../../types/menuBoard';
import { ownerOnboardingStyles as o } from '../invite/ownerOnboardingStyles';
import { MenuToggle, NoticeBox } from './MenuBoardParts';
import {
  categoryLabel,
  defaultDiffEnabled,
  diffItemMissing,
  diffOptionConflict,
  diffSummary,
  digitsOnly,
  MENU_BOARD_CATEGORIES,
  MENU_TEMPERATURES,
  temperatureLabel,
  UNKNOWN_TEMPERATURE_MESSAGE,
  validateDiffSelection,
} from './menuBoardLogic';

const BADGE: Record<MenuDiffItem['kind'], { label: string; box: object; text: object }> = {
  PRICE_CHANGED: { label: '가격 변경', box: o.brownBadge, text: o.brownBadgeText },
  NEW: { label: '새 메뉴', box: {}, text: {} },
  MISSING: { label: '메뉴판에 없음', box: { backgroundColor: tokens.card }, text: { color: tokens.muted } },
};

// 메뉴명·사이즈·온도가 한 옵션이라 줄마다 사이즈와 온도를 함께 보여 줍니다.
const option = (item: MenuDiffItem) => `${item.size ?? 'Regular'} · ${temperatureLabel(item.temperature)}`;
const detail = (item: MenuDiffItem) => {
  if (item.kind === 'PRICE_CHANGED')
    return `${option(item)} · ${formatMoney(item.previousPrice)} → ${formatMoney(item.price)}`;
  if (item.kind === 'NEW') return `${categoryLabel(item.category)} · ${option(item)} · 새로 등록`;
  return `${option(item)} · 반영하면 판매 중지로 바뀌어요`;
};

interface NewMenuDraft {
  index: number;
  price: string;
  category: MenuBoardCategory | null;
  temperature: MenuBoardTemperature;
}

// 14-8 메뉴판 변경 사항 확인: 등록된 메뉴와 다른 것만 보여 주고, 켠 항목만 반영합니다.
export default function MenuBoardDiffScreen({
  navigation,
}: RootStackScreenProps<'MenuBoardDiff'>) {
  const cafe = useMenuBoardStore(state => state.cafe);
  const diff = useMenuBoardStore(state => state.diff);
  const unchanged = diff?.unchanged ?? [];
  // 새 메뉴의 온도·가격·분류를 점주가 고칠 수 있어 변경 목록을 화면 상태로 들고 있습니다.
  const [changes, setChanges] = useState<MenuDiffItem[]>(() => diff?.changes ?? []);
  const [enabled, setEnabled] = useState<boolean[]>(() => (diff?.changes ?? []).map(defaultDiffEnabled));
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [draft, setDraft] = useState<NewMenuDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const summary = diffSummary(changes);
  const selected = changes.filter((_, index) => enabled[index]);

  const setRowError = (index: number, message: string | null) =>
    setRowErrors(previous => {
      const next = { ...previous };
      if (message) next[index] = message;
      else delete next[index];
      return next;
    });
  const setOne = (list: boolean[], index: number, value: boolean) =>
    list.map((current, i) => (i === index ? value : current));

  // 켜기 전에 빠진 정보와, 지금 켜 둔 항목·등록된 옵션과의 중복을 최신 목록으로 검사합니다.
  const enableIfValid = (index: number, list: MenuDiffItem[]) => {
    const nextEnabled = setOne(enabled, index, true);
    const problem = diffItemMissing(list[index]) ?? diffOptionConflict(index, list, nextEnabled, unchanged);
    if (problem) {
      setEnabled(setOne(enabled, index, false));
      setRowError(index, problem);
      return;
    }
    setEnabled(nextEnabled);
    setRowError(index, null);
  };
  const toggle = (index: number, value: boolean) => {
    setError(null);
    if (!value) {
      setEnabled(setOne(enabled, index, false));
      setRowError(index, null);
      return;
    }
    enableIfValid(index, changes);
  };
  const chooseTemperature = (index: number, temperature: 'HOT' | 'ICE') => {
    setError(null);
    const next = changes.map((item, i) => (i === index ? { ...item, temperature } : item));
    const conflict = diffOptionConflict(index, next, setOne(enabled, index, true), unchanged);
    if (conflict) {
      setRowError(index, conflict);
      return;
    }
    setChanges(next);
    enableIfValid(index, next);
  };
  const saveDraft = () => {
    if (!draft) return;
    const { index } = draft;
    const price = draft.price.trim() ? Number(draft.price) : null;
    const next = changes.map((item, i) =>
      i === index ? { ...item, price, category: draft.category, temperature: draft.temperature } : item,
    );
    setChanges(next);
    setDraft(null);
    setError(null);
    // 켜 둔 항목이면 고친 값으로 다시 검사하고, 문제가 있으면 끕니다.
    if (enabled[index]) enableIfValid(index, next);
    else setRowError(index, diffItemMissing(next[index]));
  };

  const backToMenus = (refreshed: boolean) =>
    navigation.popTo('OwnerMenus', {
      cafeId: cafe?.id,
      ...(refreshed ? { refreshedAt: Date.now() } : {}),
    });
  const apply = async () => {
    if (busy || selected.length === 0 || !cafe) return;
    // 반영 직전에 켜 둔 전체 항목을 다시 검증합니다.
    const problem = validateDiffSelection(changes, enabled, unchanged);
    if (problem) {
      setError(problem);
      return;
    }
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
            const isNew = item.kind === 'NEW';
            const missing = isNew ? diffItemMissing(item) : null;
            const openDraft = () =>
              setDraft({
                index,
                price: item.price === null ? '' : String(item.price),
                category: item.category,
                temperature: item.temperature,
              });
            return (
              <React.Fragment key={`${item.kind}-${item.menuId ?? item.name}-${index}`}>
                {index > 0 && <View style={o.divider} />}
                <View
                  testID={`menu-diff-row-${index}`}
                  style={[styles.row, item.kind === 'MISSING' && !on && styles.dimmed]}
                >
                  <Pressable
                    accessibilityRole={isNew ? 'button' : undefined}
                    accessibilityLabel={isNew ? `${item.name} 새 메뉴 정보 수정` : undefined}
                    testID={isNew ? `menu-diff-edit-${index}` : undefined}
                    disabled={!isNew}
                    onPress={openDraft}
                    style={styles.text}
                  >
                    <View style={styles.nameRow}>
                      <Text style={[o.body, o.bold]}>{item.name}</Text>
                      <View style={[o.badge, badge.box]}>
                        <Text style={[o.badgeText, badge.text]}>{badge.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.meta}>{detail(item)}</Text>
                  </Pressable>
                  <View style={[styles.priceBox, item.kind === 'PRICE_CHANGED' && styles.changedPrice]}>
                    <Text style={styles.price}>{formatMoney(item.price)}</Text>
                  </View>
                  <MenuToggle
                    testID={`menu-diff-toggle-${index}`}
                    label={`${item.name} ${badge.label} 반영`}
                    value={on}
                    onChange={value => toggle(index, value)}
                  />
                </View>
                {isNew && item.temperature === null && (
                  <View style={styles.hint} testID={`menu-diff-temp-hint-${index}`}>
                    <Text style={styles.hintText}>
                      {UNKNOWN_TEMPERATURE_MESSAGE} 모르면 꺼 두거나 미확인으로 등록돼요.
                    </Text>
                    <View style={styles.choices}>
                      {(['HOT', 'ICE'] as const).map(value => (
                        <Pressable
                          key={value}
                          accessibilityRole="button"
                          accessibilityLabel={`${item.name} ${value}로 선택`}
                          testID={`menu-diff-temp-${index}-${value}`}
                          onPress={() => chooseTemperature(index, value)}
                          style={({ pressed }) => [styles.smallButton, pressed && o.pressed]}
                        >
                          <Text style={styles.smallButtonText}>{value}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
                {missing && (
                  <View style={styles.hint} testID={`menu-diff-missing-${index}`}>
                    <Text style={styles.hintText}>가격·분류를 입력해야 반영할 수 있어요.</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${item.name} 가격·분류 입력`}
                      testID={`menu-diff-fix-${index}`}
                      onPress={openDraft}
                      style={({ pressed }) => [styles.smallButton, pressed && o.pressed]}
                    >
                      <Text style={styles.smallButtonText}>입력</Text>
                    </Pressable>
                  </View>
                )}
                {rowErrors[index] && (
                  <Text accessibilityRole="alert" testID={`menu-diff-row-error-${index}`} style={o.error}>
                    {rowErrors[index]}
                  </Text>
                )}
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
            <Text style={o.muted}>
              {unchanged
                .map(item => (item.temperature ? `${item.name} ${item.temperature}` : item.name))
                .join(' · ')}
            </Text>
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
      <Modal visible={draft !== null} transparent animationType="slide" onRequestClose={() => setDraft(null)}>
        <KeyboardAvoidingView style={styles.scrim} behavior="height">
          <View style={styles.editor}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.editorContent}>
              {draft && (
                <>
                  <Text style={o.pageTitle}>{changes[draft.index]?.name} 새 메뉴</Text>
                  <Field
                    label="가격 (원)"
                    testID="menu-diff-editor-price"
                    value={draft.price}
                    keyboardType="number-pad"
                    onChangeText={price => setDraft({ ...draft, price: digitsOnly(price) })}
                  />
                  <Text style={[o.body, o.bold]}>분류</Text>
                  <View style={styles.chips}>
                    {MENU_BOARD_CATEGORIES.map(category => (
                      <Chip
                        key={category.code}
                        testID={`menu-diff-editor-category-${category.code}`}
                        label={category.label}
                        selected={draft.category === category.code}
                        onPress={() => setDraft({ ...draft, category: category.code })}
                      />
                    ))}
                  </View>
                  <Text style={[o.body, o.bold]}>온도</Text>
                  <View style={styles.chips}>
                    {MENU_TEMPERATURES.map(choice => (
                      <Chip
                        key={choice.label}
                        testID={`menu-diff-editor-temperature-${choice.code ?? 'UNKNOWN'}`}
                        label={choice.label}
                        selected={draft.temperature === choice.code}
                        onPress={() => setDraft({ ...draft, temperature: choice.code })}
                      />
                    ))}
                  </View>
                </>
              )}
              <Button testID="menu-diff-editor-done" label="확인" onPress={saveDraft} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: tokens.card,
  },
  hintText: { flex: 1, fontFamily: tokens.font, fontSize: 12, lineHeight: 17, color: tokens.brown },
  choices: { flexDirection: 'row', gap: 6 },
  smallButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.white,
  },
  smallButtonText: { fontFamily: tokens.font, fontSize: 13, lineHeight: 18, fontWeight: '700', color: tokens.green },
  price: { fontFamily: tokens.font, fontSize: 14, lineHeight: 20, fontWeight: '700', color: tokens.green },
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  editor: {
    maxHeight: '88%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: tokens.bg,
  },
  editorContent: { gap: 14, padding: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
