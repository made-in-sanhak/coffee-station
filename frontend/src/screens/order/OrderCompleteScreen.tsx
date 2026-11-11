import React, { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { api, useResource } from '../../app/api';
import {
  Button,
  Card,
  Empty,
  Screen,
  formatDate,
  formatMoney,
} from '../../app/ui';
import type { Cafe, Order } from '../../app/domain';
import type { RootStackScreenProps } from '../../navigation/types';
import { Asset, DetailRow, P, Row, Txt, s } from '../owner/ownerUi';
import { canCancelOrder, paymentDestination } from './orderFlow';

export default function OrderCompleteScreen({
  navigation,
  route,
}: RootStackScreenProps<'OrderComplete'>) {
  const order = useResource<Order>(
    `/api/orders/${encodeURIComponent(route.params.orderId)}`,
  );
  const [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const timer = setInterval(order.reload, 4000);
    return () => clearInterval(timer);
  }, [order.reload]);
  useEffect(() => {
    if (order.data?.status === 'CANCELLED' || order.data?.status === 'FAILED')
      navigation.replace('PaymentFailure', {
        orderId: route.params.orderId,
        reason: '주문이 취소되었어요.',
      });
  }, [navigation, order.data?.status, route.params.orderId]);
  async function cancel() {
    setBusy(true);
    try {
      await api.post<Order>(
        `/api/orders/${encodeURIComponent(route.params.orderId)}/cancel`,
      );
      order.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : '취소하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }
  async function directions() {
    if (!order.data) return;
    try {
      const cafe = await api.get<Cafe>(
        `/api/cafes/${encodeURIComponent(order.data.cafeId)}`,
      );
      if (!Number.isFinite(cafe.latitude) || !Number.isFinite(cafe.longitude))
        throw new Error('매장 위치를 확인할 수 없습니다.');
      await Linking.openURL(
        `https://map.kakao.com/link/to/${encodeURIComponent(cafe.name)},${
          cafe.latitude
        },${cafe.longitude}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '길찾기를 열지 못했습니다.');
    }
  }
  const o = order.data;
  if (!o || paymentDestination(o.status) !== 'OrderComplete')
    return (
      <Screen navigation={navigation} title="주문 완료">
        <Empty
          message={order.error ?? '서버에서 결제 승인을 확인하고 있어요.'}
          onRetry={order.reload}
        />
        {o?.status === 'PENDING_PAYMENT' && (
          <Button
            label="결제 상태 확인"
            onPress={() =>
              navigation.replace('PaymentPending', { orderId: o.id })
            }
          />
        )}
      </Screen>
    );
  const current =
    o.status === 'PAID'
      ? 1
      : o.status === 'ACCEPTED'
      ? 2
      : o.status === 'READY'
      ? 3
      : 4;
  return (
    <Screen
      navigation={navigation}
      title="주문 완료"
      scroll={false}
      contentStyle={{ paddingTop: 8 }}
    >
      <View style={[s.center, { gap: 16 }]}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: P.soft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Asset name="checkLarge" />
        </View>
        <Txt size={24} bold>
          결제가 완료됐어요
        </Txt>
        <Txt size={13} color={P.muted}>
          {o.cancellationPending
            ? '환불 처리 결과를 확인하고 있어요'
            : `${o.cafeName}에서 `}
          {!o.cancellationPending &&
            (current === 1
              ? '주문을 확인하고 있어요'
              : current === 2
              ? '제조하고 있어요'
              : current === 3
              ? '픽업을 기다리고 있어요'
              : '픽업을 완료했어요')}
        </Txt>
      </View>
      <View
        style={{
          backgroundColor: P.green,
          borderRadius: 20,
          padding: 18,
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Txt size={13} color={P.white}>
          픽업 번호
        </Txt>
        <Txt size={44} bold color={P.white}>
          {o.pickupCode ?? '발급 대기'}
        </Txt>
        <Txt size={12} color={P.soft}>
          카운터에서 픽업 번호를 말해 주세요
        </Txt>
      </View>
      <Card>
        <View style={{ gap: 12 }}>
          <Row style={{ justifyContent: 'space-around' }}>
            {['결제 완료', '주문 수락', '제조 중', '픽업 대기'].map(
              (label, index) => (
                <View key={label} style={{ alignItems: 'center', gap: 6 }}>
                  <View
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 7,
                      backgroundColor:
                        index < current
                          ? P.green
                          : index === current
                          ? P.white
                          : P.border,
                      borderWidth: index === current ? 3 : 0,
                      borderColor: P.green,
                    }}
                  />
                  <Txt
                    size={11}
                    bold={index <= current}
                    color={index <= current ? P.text : P.muted}
                  >
                    {label}
                  </Txt>
                </View>
              ),
            )}
          </Row>
          <Txt size={12} color={P.muted} style={s.mutedCenter}>
            매장이 주문을 수락하면 알림으로 알려드려요
          </Txt>
        </View>
      </Card>
      <Card>
        <View style={{ gap: 8 }}>
          <DetailRow label="메뉴">
            {o.menuName} × {o.quantity}
          </DetailRow>
          <DetailRow label="결제">
            카카오페이 · {formatMoney(o.total)}
          </DetailRow>
          <DetailRow label="결제 일시">
            {o.paidAt
              ? formatDate(o.paidAt, {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  weekday: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })
              : '서버 확인 중'}
          </DetailRow>
        </View>
      </Card>
      <Row style={{ backgroundColor: P.soft, padding: 12, borderRadius: 12 }}>
        <Asset name="receipt" />
        <Txt size={12} color={P.green}>
          구매 캘린더 · 카페인 기록에 자동 저장돼요
        </Txt>
      </Row>
      {error && (
        <Txt size={12} color={P.red}>
          {error}
        </Txt>
      )}
      <View style={s.grow} />
      <Row>
        <View style={s.grow}>
          <Button
            label="주문 취소"
            variant="outline"
            disabled={!!o.cancellationPending || !canCancelOrder(o.status)}
            loading={busy}
            onPress={() => {
              void cancel();
            }}
          />
        </View>
        <View style={s.grow}>
          <Button label="경유 길찾기" onPress={directions} />
        </View>
      </Row>
      <Txt size={11} color={P.muted} style={s.mutedCenter}>
        주문 취소는 매장 수락 전까지만 가능해요 (자동 환불)
      </Txt>
    </Screen>
  );
}
