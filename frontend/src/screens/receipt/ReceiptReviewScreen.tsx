import React, { useRef, useState } from 'react';
import {
  Modal,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '../../app/api';
import type { Purchase } from '../../app/domain';
import { native } from '../../app/native';
import { tokens, Button, Field, Screen, formatMoney } from '../../app/ui';
import type { RootStackScreenProps } from '../../navigation/types';
import { usePersonalStore } from '../../store/personalStore';
import { useSessionStore } from '../../store/sessionStore';
import {
  createManualDraft,
  receiptDraftToForm,
  receiptPurchaseInputs,
  validateReceiptForm,
  type ReceiptFormItem,
} from './receiptForm';
import { RewardAsset } from './RewardVisuals';
import { rewardColors as c, rewardStyles as s } from './RewardStyles';

export default function ReceiptReviewScreen({
  navigation,
  route,
}: RootStackScreenProps<'ReceiptReview'>) {
  const { draft } = route.params;
  const user = useSessionStore(state => state.user);
  const addPurchases = usePersonalStore(state => state.addPurchases);
  const hydrated = usePersonalStore(state => state.hydrated);
  const purchases = usePersonalStore(state => state.purchases);
  const [form, setForm] = useState(() => receiptDraftToForm(draft));
  const [editing, setEditing] = useState<'store' | 'date' | number | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerLocal, setOfferLocal] = useState(false);
  const savedRemote = useRef<Purchase[] | null>(null);
  const busyRef = useRef(false);
  const idempotencyKey = useRef<string | null>(null);
  const localIds = useRef<string[]>([]);
  const amount = form.items.reduce(
    (sum, item) => sum + (Number(item.amount.replace(/,/g, '')) || 0),
    0,
  );
  const caffeine = form.items.reduce(
    (sum, item) =>
      sum + (Number(item.caffeineMg) || 0) * (Number(item.quantity) || 0),
    0,
  );
  const unknownCaffeine = form.items.some(
    item => item.caffeineMg.trim() === '',
  );
  const todayKey = new Date().toDateString();
  const todayCaffeine = purchases
    .filter(
      purchase => new Date(purchase.purchasedAt).toDateString() === todayKey,
    )
    .reduce(
      (sum, purchase) => sum + (purchase.caffeineMg ?? 0) * purchase.quantity,
      0,
    );
  const updateItem = (key: keyof ReceiptFormItem, value: string) => {
    if (typeof editing !== 'number') return;
    const index = editing;
    setForm(previous => ({
      ...previous,
      items: previous.items.map((item, i) =>
        i === index
          ? {
              ...item,
              [key]: value,
              ...(key === 'name' ? { matched: false } : {}),
            }
          : item,
      ),
    }));
    setError(null);
  };
  const save = async (local: boolean) => {
    if (busyRef.current) return;
    const validation = validateReceiptForm(form);
    if (validation) {
      setError(validation);
      return;
    }
    busyRef.current = true;
    setSaving(true);
    setError(null);
    try {
      let records: Purchase[];
      if (local) {
        const inputs = receiptPurchaseInputs(form, draft, true);
        records = await Promise.all(
          inputs.map(async (input, index) => {
            if (!localIds.current[index])
              localIds.current[index] = `local-${await native.randomHex(16)}`;
            return {
              ...input,
              id: localIds.current[index],
              total: input.unitPrice * input.quantity,
              verified: false,
            };
          }),
        );
      } else {
        if (!idempotencyKey.current)
          idempotencyKey.current = await native.randomHex(16);
        if (!savedRemote.current)
          savedRemote.current = await api.post<Purchase[]>(
            '/api/purchases/batch',
            {
              items: receiptPurchaseInputs(form, draft),
              idempotencyKey: idempotencyKey.current,
            },
          );
        records = savedRemote.current;
        setOfferLocal(false);
      }
      await addPurchases(records);
      navigation.replace('Calendar');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : '기록을 저장하지 못했습니다. 다시 시도해 주세요.',
      );
      setOfferLocal(!local && !savedRemote.current);
    } finally {
      busyRef.current = false;
      setSaving(false);
    }
  };
  const addItem = () => {
    const next = form.items.length;
    setForm(previous => ({
      ...previous,
      items: [...previous.items, createManualDraft().items[0]],
    }));
    setEditing(next);
  };
  const selected = typeof editing === 'number' ? form.items[editing] : null;
  return (
    <Screen navigation={navigation} title="인식 결과 확인" tab="garage">
      <View style={s.content}>
        <View style={s.notice}>
          <RewardAsset name="check" />
          <Text style={s.noticeText}>
            {draft.id
              ? '영수증을 읽었어요. 내용이 맞는지 확인해 주세요.'
              : '구매 내용을 직접 입력해 주세요.'}
          </Text>
        </View>
        <View style={s.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="매장명 수정"
            testID="receipt-edit-store"
            disabled={saving || !!savedRemote.current}
            onPress={() => setEditing('store')}
            style={s.row}
          >
            <Text style={st.label}>매장</Text>
            <Text style={[s.text, s.flex]}>
              {form.storeName || '매장명을 입력해 주세요'}
            </Text>
            <RewardAsset name="editSmall" />
          </Pressable>
          <View style={s.divider} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="결제 일시 수정"
            disabled={saving || !!savedRemote.current}
            onPress={() => setEditing('date')}
            style={s.row}
          >
            <Text style={st.label}>결제 일시</Text>
            <Text style={[s.text, s.flex]}>{form.purchasedAt}</Text>
            <RewardAsset name="editSmall" />
          </Pressable>
          <View style={s.divider} />
          <Text style={st.label}>구매 메뉴</Text>
          {form.items.map((item, index) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${index + 1}번째 메뉴 수정`}
              key={index}
              testID={`receipt-edit-item-${index}`}
              disabled={saving || !!savedRemote.current}
              onPress={() => setEditing(index)}
              style={st.menu}
            >
              <View style={s.flex}>
                <View style={s.row}>
                  <Text style={[s.heading, s.shrink]}>
                    {item.name || '메뉴를 입력해 주세요'}
                  </Text>
                  <View style={[s.badge, !item.matched && s.warningBadge]}>
                    <Text
                      style={[s.badgeText, !item.matched && s.warningBadgeText]}
                    >
                      {item.matched ? '메뉴 매칭됨' : '확인 필요'}
                    </Text>
                  </View>
                </View>
                <Text style={[s.muted, s.mt2]}>
                  {item.size || '기본'} · {item.quantity || 0}잔
                </Text>
              </View>
              <Text style={s.heading}>
                {formatMoney(Number(item.amount.replace(/,/g, '')) || 0)}
              </Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            disabled={saving || !!savedRemote.current}
            onPress={addItem}
            style={st.addMenu}
          >
            <Text style={[s.heading, s.green]}>+ 메뉴 추가</Text>
          </Pressable>
          <View style={s.divider} />
          <View style={s.between}>
            <Text style={[s.heading, s.font15]}>결제 금액</Text>
            <Text style={st.total}>{formatMoney(amount)}</Text>
          </View>
        </View>
        <View style={s.linkRow}>
          <View style={st.zap}>
            <RewardAsset name="zap" />
          </View>
          <View style={s.flex}>
            <Text style={s.heading}>
              {unknownCaffeine
                ? `확인된 카페인 ${caffeine}mg`
                : `카페인 약 ${caffeine}mg 기록`}
            </Text>
            <Text style={s.muted}>
              {unknownCaffeine
                ? '카페인 미등록 메뉴가 포함돼 있어요'
                : `오늘 누적 ${todayCaffeine + caffeine}mg · 참고 기준 400mg`}
            </Text>
          </View>
        </View>
        {!user && (
          <Text style={s.muted}>
            기기에 개인 기록으로 저장돼요. 인증 횟수와 쿠폰에는 반영되지 않아요.
          </Text>
        )}
        {!!draft.id && !draft.verified && (
          <Text style={s.muted}>
            구매 내용 인식 결과예요. 영수증 인증 여부는 저장할 때 확인돼요.
          </Text>
        )}
        {error && (
          <Text
            accessibilityRole="alert"
            testID="receipt-save-error"
            style={s.error}
          >
            {error}
          </Text>
        )}
        <View style={s.spacer} />
        <Button
          testID="receipt-save"
          label={
            savedRemote.current
              ? '기기에 저장 다시 시도'
              : user
              ? '기록 저장하기'
              : '기기에 기록 저장하기'
          }
          disabled={saving || !hydrated}
          loading={saving}
          onPress={() => save(!user)}
        />
        {offerLocal && !savedRemote.current && (
          <Button
            testID="receipt-save-local"
            label="기기에 수동 기록으로 저장"
            variant="outline"
            disabled={saving}
            onPress={() => save(true)}
          />
        )}
        <Text style={[s.muted, s.center]}>
          {offerLocal
            ? '기기에 저장한 기록은 쿠폰 인증에 반영되지 않아요'
            : '저장하면 구매 캘린더에서 확인할 수 있어요'}
        </Text>
      </View>
      <Modal
        visible={editing !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        <KeyboardAvoidingView style={st.scrim} behavior="height">
          <View style={st.editor}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.gap14}
            >
              <Text style={[s.title, s.font18]}>
                {editing === 'store'
                  ? '매장명 수정'
                  : editing === 'date'
                  ? '결제 일시 수정'
                  : '구매 메뉴 수정'}
              </Text>
              {editing === 'store' && (
                <Field
                  label="매장명"
                  testID="receipt-store-field"
                  value={form.storeName}
                  onChangeText={value =>
                    setForm(previous => ({ ...previous, storeName: value }))
                  }
                  autoFocus
                />
              )}
              {editing === 'date' && (
                <Field
                  label="결제 일시 (YYYY-MM-DD HH:mm)"
                  value={form.purchasedAt}
                  onChangeText={value =>
                    setForm(previous => ({ ...previous, purchasedAt: value }))
                  }
                  autoFocus
                />
              )}
              {selected && (
                <>
                  <Field
                    label="메뉴명"
                    testID="receipt-menu-field"
                    value={selected.name}
                    onChangeText={value => updateItem('name', value)}
                  />
                  <Field
                    label="수량 (잔)"
                    value={selected.quantity}
                    keyboardType="number-pad"
                    onChangeText={value => updateItem('quantity', value)}
                  />
                  <Field
                    label="이 메뉴의 합계 금액 (원)"
                    value={selected.amount}
                    keyboardType="number-pad"
                    onChangeText={value => updateItem('amount', value)}
                  />
                  <Field
                    label="한 잔의 카페인 (mg, 모르면 비워 두세요)"
                    value={selected.caffeineMg}
                    keyboardType="decimal-pad"
                    onChangeText={value => updateItem('caffeineMg', value)}
                  />
                  <Button
                    label="메뉴 삭제"
                    variant="quiet"
                    onPress={() => {
                      setForm(previous => ({
                        ...previous,
                        items: previous.items.filter(
                          (_, index) => index !== editing,
                        ),
                      }));
                      setEditing(null);
                    }}
                  />
                </>
              )}
              <Button
                label="확인"
                testID="receipt-editor-done"
                onPress={() => setEditing(null)}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const st = StyleSheet.create({
  label: {
    width: 64,
    color: c.muted,
    fontFamily: tokens.font,
    fontSize: 13,
    lineHeight: 19,
  },
  menu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    backgroundColor: c.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addMenu: { alignItems: 'center', paddingVertical: 4 },
  total: {
    color: c.green,
    fontFamily: tokens.font,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '900',
  },
  zap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.brownLight,
  },
  scrim: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  editor: {
    maxHeight: '88%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: c.bg,
    padding: 20,
    paddingBottom: 30,
  },
});
