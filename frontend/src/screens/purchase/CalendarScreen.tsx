import React, { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { api, useResource } from '../../app/api';
import type { Coupon, Purchase } from '../../app/domain';
import { tokens, Button, Empty, Screen, formatMoney } from '../../app/ui';
import type { RootStackScreenProps } from '../../navigation/types';
import { usePersonalStore } from '../../store/personalStore';
import { useSessionStore } from '../../store/sessionStore';
import { RewardAsset } from '../receipt/RewardVisuals';
import { rewardColors as c, rewardStyles as s } from '../receipt/RewardStyles';
import {
  averagePerCup,
  couponStatus,
  localDateKey,
  monthCells,
  moveMonth,
  purchaseDateKey,
  purchaseSourceLabel,
  RECEIPTS_PER_COUPON,
  receiptCouponProgress,
  recordsOnDate,
  summarizePurchases,
  type ReceiptRewardStatistics,
} from './purchaseMath';

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
type PurchaseStatistics = ReceiptRewardStatistics & { reviewCount?: number };
const time = (value: string) => {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
};

export default function CalendarScreen({
  navigation,
}: RootStackScreenProps<'Calendar'>) {
  const now = new Date();
  const user = useSessionStore(state => state.user);
  const local = usePersonalStore(state => state.purchases);
  const removePurchase = usePersonalStore(state => state.removePurchase);
  const personalError = usePersonalStore(state => state.error);
  const hydratePersonal = usePersonalStore(state => state.hydrate);
  const [{ year, month }, setMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [selectedKey, setSelectedKey] = useState(localDateKey(now));
  const [error, setError] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const remoteDeleted = useRef(new Set<string>());
  const resource = useResource<Purchase[]>(
    '/api/purchases',
    { month: `${year}-${String(month + 1).padStart(2, '0')}` },
    !!user,
  );
  const statistics = useResource<PurchaseStatistics>(
    '/api/users/me/statistics',
    undefined,
    !!user,
  );
  const coupons = useResource<Coupon[]>('/api/coupons', undefined, !!user);
  const purchases = useMemo(
    () =>
      [
        ...new Map(
          [...local, ...(resource.data ?? [])].map(record => [
            record.id,
            record,
          ]),
        ).values(),
      ].filter(record => !deletedIds.includes(record.id)),
    [local, resource.data, deletedIds],
  );
  const stats = summarizePurchases(
    purchases.map(record => ({
      purchasedAt: record.purchasedAt,
      totalAmount: record.total,
      totalCups: record.quantity,
    })),
    year,
    month,
  );
  const selected = recordsOnDate(purchases, selectedKey);
  const total = selected.reduce((sum, item) => sum + item.total, 0);
  const cups = selected.reduce((sum, item) => sum + item.quantity, 0);
  const perCup = averagePerCup(stats.totalAmount, stats.totalCups);
  const monthStats = [
    { label: '이번 달 지출', value: formatMoney(stats.totalAmount) },
    { label: '구매', value: `${stats.totalCups}잔` },
    {
      label: '작성 리뷰',
      value:
        statistics.data?.reviewCount === undefined
          ? '—'
          : `${statistics.data.reviewCount}개`,
    },
    { label: '한 잔 평균', value: perCup === null ? '—' : formatMoney(perCup) },
  ];
  const availableCoupons = (user ? coupons.data ?? [] : []).filter(
    coupon => couponStatus(coupon) === 'available',
  ).length;
  const progress = user ? receiptCouponProgress(statistics.data) : undefined;
  const couponSummary = !user
    ? '로그인하면 영수증 인증으로 쿠폰을 받아요 · 눌러서 쿠폰 보기'
    : progress === undefined
    ? '눌러서 쿠폰 보기'
    : `다음 쿠폰까지 영수증 ${RECEIPTS_PER_COUPON - progress}회 · 눌러서 쿠폰 보기`;
  const cells = monthCells(year, month);
  const weeks = Array.from({ length: cells.length / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  );
  const selectedDate = new Date(`${selectedKey}T12:00:00`);
  const changeMonth = (direction: number) => {
    const next = moveMonth(year, month, direction);
    setMonth(next);
    setSelectedKey(localDateKey(new Date(next.year, next.month, 1)));
  };
  const deleteRecord = async (record: Purchase) => {
    setError(null);
    try {
      if (
        !record.id.startsWith('local-') &&
        !remoteDeleted.current.has(record.id)
      ) {
        await api.delete(`/api/purchases/${encodeURIComponent(record.id)}`);
        remoteDeleted.current.add(record.id);
      }
      await removePurchase(record.id);
      setDeletedIds(previous => [...previous, record.id]);
      if (!record.id.startsWith('local-') && user) {
        resource.reload();
        statistics.reload();
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : '기록을 삭제하지 못했습니다.',
      );
    }
  };
  const openRecord = (record: Purchase) => {
    Alert.alert(
      record.cafeName,
      `${record.menuName} · ${record.quantity}잔\n${formatMoney(
        record.total,
      )}\n${purchaseSourceLabel(record)}`,
      [
        { text: '닫기', style: 'cancel' },
        ...(record.cafeId
          ? [
              {
                text: '매장 보기',
                onPress: () =>
                  navigation.navigate('CafeDetail', { cafeId: record.cafeId! }),
              },
            ]
          : []),
        {
          text: '기록 삭제',
          style: 'destructive',
          onPress: () => deleteRecord(record),
        },
      ],
    );
  };
  return (
    <Screen
      navigation={navigation}
      tab="record"
      contentStyle={st.fabClearance}
      floating={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="영수증 등록"
          testID="calendar-receipt-fab"
          onPress={() => navigation.navigate('Receipt')}
          style={({ pressed }) => [st.fab, pressed && st.pressed]}
        >
          <Plus size={18} color={tokens.white} strokeWidth={2.5} />
          <Text style={st.fabLabel}>영수증 등록</Text>
        </Pressable>
      }
    >
      <View style={s.content}>
        {personalError && (
          <View style={s.card}>
            <Text accessibilityRole="alert" style={s.error}>
              {personalError}
            </Text>
            <Button
              label="개인 기록 다시 불러오기"
              variant="outline"
              onPress={hydratePersonal}
            />
          </View>
        )}
        <View style={s.between}>
          <Text style={s.title}>구매 캘린더</Text>
          <View style={s.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이전 달"
              testID="calendar-previous-month"
              onPress={() => changeMonth(-1)}
              hitSlop={10}
            >
              <RewardAsset name="left" />
            </Pressable>
            <Text style={[s.heading, s.font15]}>
              {year}년 {month + 1}월
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="다음 달"
              testID="calendar-next-month"
              onPress={() => changeMonth(1)}
              hitSlop={10}
            >
              <RewardAsset name="right" />
            </Pressable>
          </View>
        </View>
        <Button
          label="나의 커피 취향 수정"
          variant="outline"
          onPress={() => navigation.navigate('Preferences')}
        />
        <View style={s.stats}>
          {monthStats.map(({ label, value }) => (
            <View key={label} style={s.stat}>
              <Text style={s.small}>{label}</Text>
              <Text style={s.statValue} numberOfLines={1} adjustsFontSizeToFit>
                {value}
              </Text>
            </View>
          ))}
        </View>
        <View style={st.calendar}>
          <View style={st.week}>
            {weekdays.map((day, index) => (
              <View key={day} style={st.weekday}>
                <Text style={[s.small, index === 0 && { color: c.red }]}>
                  {day}
                </Text>
              </View>
            ))}
          </View>
          {weeks.map((week, wi) => (
            <View key={wi} style={st.week}>
              {week.map((day, di) => {
                if (day === null)
                  return <View key={`empty-${di}`} style={st.day} />;
                const key = localDateKey(new Date(year, month, day));
                const dayRecords = recordsOnDate(purchases, key);
                const isSelected = key === selectedKey;
                const future = key > localDateKey(now);
                return (
                  <Pressable
                    key={day}
                    accessibilityRole="button"
                    accessibilityLabel={`${month + 1}월 ${day}일, 구매 ${
                      dayRecords.length
                    }건`}
                    accessibilityState={{ selected: isSelected }}
                    testID={`calendar-day-${day}`}
                    onPress={() => setSelectedKey(key)}
                    style={st.day}
                  >
                    <View style={[st.dayCircle, isSelected && st.selected]}>
                      <Text
                        style={[
                          st.dayText,
                          di === 0 && { color: c.red },
                          future && { color: c.muted },
                          isSelected && st.selectedText,
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                    {dayRecords.length > 0 && (
                      <RewardAsset
                        name={dayRecords.length > 1 ? 'twoDots' : 'oneDot'}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`쿠폰함, 사용 가능 쿠폰 ${availableCoupons}장. ${couponSummary}`}
          testID="calendar-coupon-shortcut"
          onPress={() => navigation.navigate('Coupons')}
          style={({ pressed }) => [st.couponShortcut, pressed && st.pressed]}
        >
          <RewardAsset name="ticket" />
          <View style={[s.flex, s.gap2]}>
            <Text style={st.couponTitle}>
              쿠폰함 · 사용 가능 쿠폰 {availableCoupons}장
            </Text>
            <Text style={st.couponSummary}>{couponSummary}</Text>
          </View>
          <RewardAsset name="right" />
        </Pressable>
        <View style={s.card}>
          <View style={s.between}>
            <Text style={[s.heading, s.font15]}>
              {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 (
              {weekdays[selectedDate.getDay()]})
            </Text>
            <Text style={[s.text, s.green, s.font13]}>
              {cups}잔 · {formatMoney(total)}
            </Text>
          </View>
          {selected.length === 0 ? (
            <Empty message="이날의 구매 기록이 없어요." />
          ) : (
            selected.map(record => (
              <Pressable
                key={record.id}
                accessibilityRole="button"
                testID={`purchase-${record.id}`}
                onPress={() => openRecord(record)}
                style={s.row}
              >
                <Text style={[s.muted, st.timeWidth]}>
                  {time(record.purchasedAt)}
                </Text>
                <View style={s.flex}>
                  <Text style={s.heading}>{record.cafeName}</Text>
                  <Text style={s.muted}>
                    {record.menuName}
                    {record.quantity > 1 ? ` · ${record.quantity}잔` : ''}
                  </Text>
                </View>
                <Text style={s.heading}>{formatMoney(record.total)}</Text>
              </Pressable>
            ))
          )}
        </View>
        {(error || resource.error) && (
          <Text accessibilityRole="alert" style={s.error}>
            {error || resource.error}
          </Text>
        )}
        {resource.error && (
          <Button
            label="서버 기록 다시 불러오기"
            variant="outline"
            onPress={resource.reload}
          />
        )}

      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  timeWidth: { width: 33 },
  // 플로팅 버튼이 마지막 카드를 가리지 않도록 아래 여백을 둡니다.
  fabClearance: { paddingBottom: 88 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: c.green,
    shadowColor: c.text,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabLabel: {
    fontFamily: tokens.font,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: c.white,
  },
  pressed: { opacity: 0.8 },
  couponShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: c.greenLight,
  },
  couponTitle: {
    fontFamily: tokens.font,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: c.green,
  },
  couponSummary: {
    fontFamily: tokens.font,
    fontSize: 12,
    lineHeight: 17,
    color: c.greenMid,
  },
  calendar: {
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 4,
  },
  week: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: { flex: 1, height: 44, gap: 2, alignItems: 'center' },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontFamily: tokens.font,
    fontSize: 13,
    lineHeight: 19,
    color: c.text,
    fontWeight: '500',
  },
  selected: { backgroundColor: c.green },
  selectedText: { color: c.white, fontWeight: '700' },
});
