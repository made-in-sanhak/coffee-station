import React, { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { api, useResource } from '../../app/api';
import type { Purchase } from '../../app/domain';
import { tokens, Button, Empty, Screen, formatMoney } from '../../app/ui';
import type { RootStackScreenProps } from '../../navigation/types';
import { usePersonalStore } from '../../store/personalStore';
import { useSessionStore } from '../../store/sessionStore';
import { RewardAsset } from '../receipt/RewardVisuals';
import { rewardColors as c, rewardStyles as s } from '../receipt/RewardStyles';
import {
  localDateKey,
  monthCells,
  moveMonth,
  purchaseDateKey,
  purchaseSourceLabel,
  recordsOnDate,
  summarizePurchases,
} from './purchaseMath';

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
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
      caffeineMg: (record.caffeineMg ?? 0) * record.quantity,
    })),
    year,
    month,
  );
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthRecords = purchases.filter(record =>
    purchaseDateKey(record.purchasedAt).startsWith(monthPrefix),
  );
  const noKnownCaffeine =
    monthRecords.length > 0 &&
    monthRecords.every(record => record.caffeineMg === null);
  const selected = recordsOnDate(purchases, selectedKey);
  const total = selected.reduce((sum, item) => sum + item.total, 0);
  const cups = selected.reduce((sum, item) => sum + item.quantity, 0);
  const caffeine = selected.reduce(
    (sum, item) => sum + (item.caffeineMg ?? 0) * item.quantity,
    0,
  );
  const unknown = selected.some(item => item.caffeineMg === null);
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
      resource.reload();
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
      )} · ${
        record.caffeineMg === null
          ? '카페인 미등록'
          : `${record.caffeineMg * record.quantity}mg`
      }\n${purchaseSourceLabel(record)}`,
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
    <Screen navigation={navigation} tab="garage">
      <View style={s.content}>
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
        <View style={s.stats}>
          <View style={s.stat}>
            <Text style={s.small}>이번 달 지출</Text>
            <Text style={s.statValue}>{formatMoney(stats.totalAmount)}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.small}>구매</Text>
            <Text style={s.statValue}>{stats.totalCups}잔</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.small}>카페인 평균</Text>
            <Text style={s.statValue}>
              {noKnownCaffeine ? '—' : `${stats.averageCaffeineMg}mg`}
            </Text>
          </View>
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
        <Text style={s.small}>
          카페인 평균은 구매 기록이 있는 날의 확인된 함량 기준이에요.
        </Text>
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
          <View style={s.gap6}>
            <View style={s.between}>
              <View style={[s.row, s.gap4]}>
                <RewardAsset name="zapSmall" />
                <Text style={s.muted}>
                  {selectedKey === localDateKey(now)
                    ? '오늘 카페인'
                    : '이날 카페인'}
                  {unknown ? ' · 미등록 포함' : ''}
                </Text>
              </View>
              <Text style={[s.small, s.bold, { color: c.brown }]}>
                {caffeine} / 400mg
              </Text>
            </View>
            <View style={st.caffeineTrack}>
              <View
                style={[
                  st.caffeineProgress,
                  { width: `${Math.min((caffeine / 400) * 100, 100)}%` },
                ]}
              />
            </View>
          </View>
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
        <Button
          label="영수증 등록하기"
          onPress={() => navigation.navigate('Receipt')}
        />
        <View style={s.row}>
          <View style={s.flex}>
            <Button
              label="쿠폰함"
              variant="outline"
              onPress={() => navigation.navigate('Coupons')}
            />
          </View>
          <View style={s.flex}>
            <Button
              label="나의 차고"
              variant="outline"
              onPress={() => navigation.navigate('Garage')}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  timeWidth: { width: 33 },
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
  caffeineTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: c.card,
  },
  caffeineProgress: { height: 8, borderRadius: 4, backgroundColor: c.brown },
});
