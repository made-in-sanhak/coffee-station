import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import { registerMenus } from '../../../api/endpoints/menuBoard';
import { Button, Chip, Field, Screen, tokens } from '../../../app/ui';
import type { RootStackScreenProps } from '../../../navigation/types';
import { useMenuBoardStore } from '../../../store/menuBoardStore';
import { rewardColors } from '../../receipt/RewardStyles';
import { ownerOnboardingStyles as o } from '../invite/ownerOnboardingStyles';
import { Asset } from '../ownerUi';
import { MenuToggle, NoticeBox } from './MenuBoardParts';
import {
  blankReviewItem,
  categoryLabel,
  countByCategory,
  digitsOnly,
  MENU_BOARD_CATEGORIES,
  MENU_TEMPERATURES,
  needsCheck,
  reviewSummary,
  temperatureLabel,
  toBulkItems,
  toReviewItems,
  UNKNOWN_TEMPERATURE_MESSAGE,
  validateReviewItems,
  type ReviewItem,
} from './menuBoardLogic';

// 14-4 메뉴판 인식 결과 확인: 이름·카테고리·사이즈·가격을 확인하고, 켠 메뉴만 등록합니다.
export default function MenuBoardReviewScreen({
  navigation,
}: RootStackScreenProps<'MenuBoardReview'>) {
  const cafe = useMenuBoardStore(state => state.cafe);
  const [items, setItems] = useState<ReviewItem[]>(() =>
    toReviewItems(useMenuBoardStore.getState().scanItems),
  );
  const [editing, setEditing] = useState<ReviewItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nextKey = useRef(0);
  const summary = reviewSummary(items);

  const patch = (key: string, change: Partial<ReviewItem>) => {
    setItems(previous => previous.map(item => (item.key === key ? { ...item, ...change } : item)));
    setError(null);
  };
  const addItem = () => {
    nextKey.current += 1;
    setEditing(blankReviewItem(`manual-${nextKey.current}`));
  };
  const saveEditing = () => {
    if (!editing) return;
    const saved = { ...editing, checked: true };
    setItems(previous =>
      previous.some(item => item.key === saved.key)
        ? previous.map(item => (item.key === saved.key ? saved : item))
        : [...previous, saved],
    );
    setEditing(null);
    setError(null);
  };
  const register = async () => {
    if (busy) return;
    const problem = validateReviewItems(items);
    if (problem) {
      setError(problem);
      return;
    }
    if (!cafe) {
      setError('매장 정보를 찾지 못했어요. 처음부터 다시 시도해 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const bulk = toBulkItems(items);
      const result = await registerMenus(cafe.id, bulk);
      navigation.reset({
        index: 1,
        routes: [
          { name: 'Map' },
          { name: 'MenuRegisterDone', params: { count: result.count, counts: countByCategory(bulk) } },
        ],
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '메뉴를 등록하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen navigation={navigation} title="인식 결과 확인" contentStyle={[o.content, styles.content]}>
      <NoticeBox>
        {items.length
          ? `메뉴판에서 메뉴 ${items.length}개를 읽었어요. 가격이 맞는지 확인해 주세요. 누르면 고칠 수 있고, 끈 메뉴는 등록하지 않아요.`
          : '등록할 메뉴를 직접 추가해 주세요. 끈 메뉴는 등록하지 않아요.'}
      </NoticeBox>
      <View style={styles.summaryRow}>
        <View style={styles.summary}>
          <View style={o.badge}>
            <Text style={o.badgeText}>전체 {summary.total}개</Text>
          </View>
          {summary.needsCheck > 0 && (
            <View style={[o.badge, styles.redBadge]}>
              <Text style={[o.badgeText, styles.redText]}>확인 필요 {summary.needsCheck}개</Text>
            </View>
          )}
          {summary.unknownTemperature > 0 && (
            <View style={[o.badge, o.brownBadge]}>
              <Text style={[o.badgeText, o.brownBadgeText]}>온도 미확인 {summary.unknownTemperature}개</Text>
            </View>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          testID="menu-review-add"
          onPress={addItem}
          style={({ pressed }) => [styles.smallButton, styles.softButton, pressed && o.pressed]}
        >
          <Asset name="plus" />
          <Text style={styles.smallButtonText}>메뉴 추가</Text>
        </Pressable>
      </View>
      {items.length > 0 && (
        <View style={o.card}>
          {items.map((item, index) => {
            const warn = needsCheck(item);
            return (
              <React.Fragment key={item.key}>
                {index > 0 && <View style={o.divider} />}
                <View style={styles.itemRow} testID={`menu-review-row-${index}`}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${item.name || '이름 없는 메뉴'} 수정`}
                    testID={`menu-review-edit-${index}`}
                    onPress={() => setEditing(item)}
                    style={styles.itemText}
                  >
                    <View style={styles.nameRow}>
                      <Text style={[o.body, o.bold, !item.include && styles.mutedText]}>
                        {item.name || '이름을 입력해 주세요'}
                      </Text>
                      {warn && (
                        <View style={[o.badge, styles.redBadge]}>
                          <Text style={[o.badgeText, styles.redText]}>확인 필요</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.meta}>
                      {categoryLabel(item.category)} ·{' '}
                      {warn && item.note ? item.note : `${item.size} · ${temperatureLabel(item.temperature)}`}
                    </Text>
                  </Pressable>
                  <View style={[styles.priceBox, warn && styles.priceBoxWarn]}>
                    <TextInput
                      testID={`menu-review-price-${index}`}
                      accessibilityLabel={`${item.name} 가격`}
                      value={item.price ? Number(item.price).toLocaleString('ko-KR') : ''}
                      onChangeText={text => patch(item.key, { price: digitsOnly(text), checked: true })}
                      keyboardType="number-pad"
                      placeholder="가격"
                      placeholderTextColor={tokens.muted}
                      style={styles.priceInput}
                    />
                    <Text style={styles.priceUnit}>원</Text>
                  </View>
                  <MenuToggle
                    testID={`menu-review-toggle-${index}`}
                    label={`${item.name} 등록`}
                    value={item.include}
                    onChange={include => patch(item.key, { include })}
                  />
                </View>
                {item.temperature === null && (
                  <View style={styles.tempHint} testID={`menu-review-temp-hint-${index}`}>
                    <Text style={styles.tempHintText}>{UNKNOWN_TEMPERATURE_MESSAGE}</Text>
                    <View style={styles.tempChoices}>
                      {(['HOT', 'ICE'] as const).map(value => (
                        <Pressable
                          key={value}
                          accessibilityRole="button"
                          accessibilityLabel={`${item.name} ${value}로 선택`}
                          testID={`menu-review-temp-${index}-${value}`}
                          onPress={() => patch(item.key, { temperature: value })}
                          style={({ pressed }) => [styles.smallButton, styles.outlineButton, pressed && o.pressed]}
                        >
                          <Text style={styles.smallButtonText}>{value}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              </React.Fragment>
            );
          })}
        </View>
      )}
      <View style={o.linkRow}>
        <Plus size={20} color={tokens.brown} strokeWidth={2} />
        <View style={styles.flex}>
          <Text style={[o.body, o.bold]}>못 읽은 메뉴가 있나요?</Text>
          <Text style={o.muted}>사이즈별 가격은 등록 후 메뉴 관리에서 추가해요</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="못 읽은 메뉴 추가"
          testID="menu-review-add-missing"
          onPress={addItem}
          style={({ pressed }) => [styles.smallButton, styles.outlineButton, pressed && o.pressed]}
        >
          <Text style={styles.smallButtonText}>추가</Text>
        </Pressable>
      </View>
      {error && (
        <Text accessibilityRole="alert" testID="menu-review-error" style={o.error}>
          {error}
        </Text>
      )}
      <View style={o.spacer} />
      <Button
        testID="menu-review-submit"
        label={`메뉴 ${summary.included}개 등록하기`}
        disabled={summary.included === 0}
        loading={busy}
        onPress={register}
      />
      <Modal visible={editing !== null} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView style={styles.scrim} behavior="height">
          <View style={styles.editor}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.editorContent}>
              <Text style={o.pageTitle}>메뉴 수정</Text>
              {editing && (
                <>
                  <Field
                    label="메뉴 이름"
                    testID="menu-editor-name"
                    value={editing.name}
                    onChangeText={name => setEditing({ ...editing, name })}
                  />
                  <Field
                    label="가격 (원)"
                    testID="menu-editor-price"
                    value={editing.price}
                    keyboardType="number-pad"
                    onChangeText={price => setEditing({ ...editing, price: digitsOnly(price) })}
                  />
                  <Field
                    label="사이즈"
                    value={editing.size}
                    onChangeText={size => setEditing({ ...editing, size })}
                  />
                  <Text style={[o.body, o.bold]}>온도</Text>
                  <View style={styles.chips}>
                    {MENU_TEMPERATURES.map(option => (
                      <Chip
                        key={option.label}
                        testID={`menu-editor-temperature-${option.code ?? 'UNKNOWN'}`}
                        label={option.label}
                        selected={editing.temperature === option.code}
                        onPress={() => setEditing({ ...editing, temperature: option.code })}
                      />
                    ))}
                  </View>
                  {editing.temperature === null && (
                    <Text style={styles.tempHintText}>{UNKNOWN_TEMPERATURE_MESSAGE} 모르면 미확인으로 두세요.</Text>
                  )}
                  <Text style={[o.body, o.bold]}>카테고리</Text>
                  <View style={styles.chips}>
                    {MENU_BOARD_CATEGORIES.map(category => (
                      <Chip
                        key={category.code}
                        testID={`menu-editor-category-${category.code}`}
                        label={category.label}
                        selected={editing.category === category.code}
                        onPress={() => setEditing({ ...editing, category: category.code })}
                      />
                    ))}
                  </View>
                  {items.some(item => item.key === editing.key) && (
                    <Button
                      label="이 메뉴 빼기"
                      variant="quiet"
                      onPress={() => {
                        setItems(previous => previous.filter(item => item.key !== editing.key));
                        setEditing(null);
                      }}
                    />
                  )}
                </>
              )}
              <Button testID="menu-editor-done" label="확인" onPress={saveEditing} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  flex: { flex: 1 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summary: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  redBadge: { backgroundColor: rewardColors.redLight },
  redText: { color: tokens.red },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  softButton: { backgroundColor: tokens.greenLight },
  outlineButton: { borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.white },
  smallButtonText: {
    fontFamily: tokens.font,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: tokens.green,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  meta: { fontFamily: tokens.font, fontSize: 11, lineHeight: 15, color: tokens.muted },
  mutedText: { color: tokens.muted },
  priceBox: {
    width: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.white,
  },
  priceBoxWarn: { borderColor: tokens.red, backgroundColor: rewardColors.redLight },
  priceInput: {
    flex: 1,
    padding: 0,
    textAlign: 'right',
    fontFamily: tokens.font,
    fontSize: 14,
    fontWeight: '700',
    color: tokens.green,
  },
  priceUnit: { fontFamily: tokens.font, fontSize: 14, fontWeight: '700', color: tokens.green },
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  editor: {
    maxHeight: '88%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: tokens.bg,
  },
  editorContent: { gap: 14, padding: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tempHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: tokens.card,
  },
  tempHintText: {
    flex: 1,
    fontFamily: tokens.font,
    fontSize: 12,
    lineHeight: 17,
    color: tokens.brown,
  },
  tempChoices: { flexDirection: 'row', gap: 6 },
});
