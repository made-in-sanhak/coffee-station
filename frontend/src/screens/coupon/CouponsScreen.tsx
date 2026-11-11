import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { api, useResource } from '../../app/api';
import type { Coupon } from '../../app/domain';
import { tokens, Button, Chip, Empty, Screen, formatMoney } from '../../app/ui';
import type { RootStackScreenProps } from '../../navigation/types';
import { useSessionStore } from '../../store/sessionStore';
import { couponStatus, type CouponStatus } from '../purchase/purchaseMath';
import { RewardAsset } from '../receipt/RewardVisuals';
import { rewardColors as c, rewardStyles as s } from '../receipt/RewardStyles';
import { code128Bars } from './barcode';

function CouponBarcode({ code }: { code: string }) {
  try {
    const bars = code128Bars(code);
    return (
      <View accessibilityLabel={`쿠폰 코드 ${code}`} style={st.barcode}>
        <View style={st.quietZone} />
        {bars.map((bar, index) => (
          <View
            key={index}
            style={[
              st.bar,
              { flex: bar.width, backgroundColor: bar.black ? c.text : c.card },
            ]}
          />
        ))}
        <View style={st.quietZone} />
      </View>
    );
  } catch {
    return null;
  }
}

export default function CouponsScreen({
  navigation,
}: RootStackScreenProps<'Coupons'>) {
  const user = useSessionStore(state => state.user);
  const resource = useResource<Coupon[]>('/api/coupons', undefined, !!user);
  const statistics = useResource<{
    stamps: number;
    receiptReward?: { total: number; progress: number; target: number };
  }>('/api/users/me/statistics', undefined, !!user);
  const [filter, setFilter] = useState<CouponStatus>('available');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updates, setUpdates] = useState<Record<string, Coupon>>({});
  const [using, setUsing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const coupons = (user ? resource.data ?? [] : []).map(
    coupon => updates[coupon.id] ?? coupon,
  );
  const available = coupons.filter(
    coupon => couponStatus(coupon) === 'available',
  );
  const visible = coupons.filter(coupon => couponStatus(coupon) === filter);
  const progress =
    !user || statistics.data === undefined
      ? undefined
      : (statistics.data.receiptReward?.progress ?? statistics.data.stamps) % 3;
  const redeemCoupon = async (coupon: Coupon) => {
    if (using) return;
    setUsing(coupon.id);
    setError(null);
    try {
      const result = await api.post<Coupon>(
        `/api/coupons/${encodeURIComponent(coupon.id)}/use`,
        coupon.cafeId ? { cafeId: coupon.cafeId } : {},
      );
      if (result.status !== 'USED' && !result.usedAt)
        throw new Error(
          '사용 완료 여부를 확인하지 못했습니다. 다시 확인해 주세요.',
        );
      setUpdates(previous => ({ ...previous, [result.id]: result }));
      setFilter('used');
      setExpanded(result.id);
      resource.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : '쿠폰을 사용하지 못했습니다.',
      );
    } finally {
      setUsing(null);
    }
  };
  const confirmUse = (coupon: Coupon) =>
    Alert.alert(
      '쿠폰을 사용할까요?',
      '매장 직원이 쿠폰을 확인한 뒤 사용해 주세요. 사용 완료한 쿠폰은 다시 사용할 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        { text: '직원 확인 후 사용', onPress: () => redeemCoupon(coupon) },
      ],
    );
  return (
    <Screen navigation={navigation} title="쿠폰함" tab="garage">
      <View style={s.content}>
        <View style={s.row}>
          {(
            [
              { key: 'available', label: `사용 가능 ${available.length}` },
              { key: 'used', label: '사용 완료' },
              { key: 'expired', label: '만료' },
            ] as const
          ).map(item => (
            <Chip
              key={item.key}
              label={item.label}
              selected={filter === item.key}
              onPress={() => {
                setFilter(item.key);
                setExpanded(null);
              }}
            />
          ))}
        </View>
        <View style={s.card}>
          <View style={s.between}>
            <Text style={s.heading}>
              {progress === undefined
                ? '영수증 인증 내역'
                : `다음 쿠폰까지 영수증 ${3 - progress}회`}
            </Text>
            <Text style={[s.heading, s.green, s.font13]}>
              {progress === undefined ? '— / 3' : `${progress} / 3`}
            </Text>
          </View>
          <View style={[s.row, s.gap10]}>
            {[0, 1, 2].map(index => (
              <View
                key={index}
                style={[
                  st.stamp,
                  progress !== undefined &&
                    index < progress &&
                    st.completedStamp,
                ]}
              >
                <RewardAsset
                  name={
                    progress !== undefined && index < progress
                      ? 'checkWhite'
                      : 'receipt'
                  }
                />
              </View>
            ))}
            <Text style={[s.muted, s.flex]}>
              인증 3회마다 1,000원 할인 쿠폰이 자동 발급돼요
            </Text>
          </View>
        </View>
        {!user ? (
          <>
            <Empty message="로그인하면 발급받은 쿠폰을 확인할 수 있어요." />
            <Button
              label="로그인하기"
              onPress={() => navigation.navigate('Login')}
            />
          </>
        ) : resource.loading ? (
          <Text style={s.muted}>쿠폰을 불러오고 있어요.</Text>
        ) : visible.length === 0 ? (
          <Empty
            message={
              filter === 'available'
                ? '사용 가능한 쿠폰이 없어요.'
                : filter === 'used'
                ? '사용 완료한 쿠폰이 없어요.'
                : '만료된 쿠폰이 없어요.'
            }
            onRetry={resource.error ? resource.reload : undefined}
          />
        ) : (
          visible.map((coupon, index) => {
            const open =
              expanded === coupon.id || (expanded === null && index === 0);
            const active = couponStatus(coupon) === 'available';
            const discount =
              coupon.type === 'PERCENT'
                ? `${coupon.value}%`
                : coupon.type === 'FREE_ITEM'
                ? '무료'
                : formatMoney(coupon.value);
            return (
              <View key={coupon.id} style={[st.coupon, !active && st.inactive]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${coupon.title} 상세`}
                  testID={`coupon-${coupon.id}`}
                  onPress={() => setExpanded(open ? '' : coupon.id)}
                  style={st.couponHeader}
                >
                  <View
                    style={[
                      st.discount,
                      {
                        backgroundColor:
                          coupon.type === 'PERCENT' ? c.brown : c.green,
                      },
                    ]}
                  >
                    <Text style={st.discountAmount}>{discount}</Text>
                    <Text style={st.discountLabel}>
                      {coupon.type === 'FREE_ITEM' ? '음료' : '할인'}
                    </Text>
                  </View>
                  <View style={st.details}>
                    <Text style={[s.heading, s.font15]}>{coupon.title}</Text>
                    <Text style={s.muted}>
                      {coupon.cafeName || '커피 주유소 제휴 매장'}
                      {coupon.minSpend > 0
                        ? ` · ${formatMoney(coupon.minSpend)} 이상`
                        : ' · 음료 1잔'}
                    </Text>
                    <Text style={s.small}>
                      {coupon.expiresAt.slice(0, 10).replace(/-/g, '.')}까지
                      {!active
                        ? filter === 'used'
                          ? ' · 사용 완료'
                          : ' · 만료'
                        : ''}
                    </Text>
                  </View>
                </Pressable>
                {open && (
                  <View style={st.codePanel}>
                    {coupon.code ? (
                      <>
                        <CouponBarcode code={coupon.code} />
                        <Text selectable style={[s.muted, s.stretch]}>
                          {coupon.code}
                        </Text>
                      </>
                    ) : (
                      <Text style={s.muted}>
                        발급된 쿠폰 코드가 없어요. 다시 불러와 주세요.
                      </Text>
                    )}
                    <Text style={[s.small, s.stretch]}>
                      {active
                        ? '직원에게 보여 주세요 · 확인 후 한 번만 사용돼요'
                        : coupon.usedAt
                        ? `${coupon.usedAt.slice(0, 10)} 사용 완료`
                        : '사용할 수 없는 쿠폰이에요'}
                    </Text>
                    {active && coupon.code && (
                      <Button
                        testID={`coupon-redeem-${coupon.id}`}
                        label="직원 확인 후 사용하기"
                        disabled={!!using}
                        loading={using === coupon.id}
                        onPress={() => confirmUse(coupon)}
                      />
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
        {(error || resource.error) && (
          <Text accessibilityRole="alert" style={s.error}>
            {error || resource.error}
          </Text>
        )}
        {resource.error && (
          <Button
            label="쿠폰 다시 불러오기"
            variant="outline"
            onPress={resource.reload}
          />
        )}
        <View style={[s.row, s.gap6]}>
          <RewardAsset name="shield" />
          <Text style={[s.small, s.flex]}>
            같은 영수증은 한 번만 인증할 수 있어요.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  bar: { height: 48 },
  quietZone: { flex: 10 },
  inactive: { opacity: 0.65 },
  stamp: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedStamp: { backgroundColor: c.green, borderColor: c.green },
  coupon: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    backgroundColor: c.white,
    overflow: 'hidden',
  },
  couponHeader: { flexDirection: 'row' },
  discount: {
    width: 92,
    paddingHorizontal: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  discountAmount: {
    fontFamily: tokens.font,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '900',
    color: c.white,
    textAlign: 'center',
  },
  discountLabel: {
    fontFamily: tokens.font,
    fontSize: 11,
    lineHeight: 16,
    color: c.greenLight,
  },
  details: { flex: 1, padding: 14, gap: 4 },
  codePanel: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: c.card,
    gap: 8,
  },
  barcode: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    height: 48,
    marginVertical: 0,
    backgroundColor: c.card,
  },
});
