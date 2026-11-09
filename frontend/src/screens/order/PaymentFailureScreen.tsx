import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { api, useResource } from '../../app/api';
import { native } from '../../app/native';
import { Button, Card, Empty, Screen, formatMoney } from '../../app/ui';
import type { Deal, Order } from '../../app/domain';
import type { RootStackScreenProps } from '../../navigation/types';
import { Asset, ClockBanner, DetailRow, P, Txt, s } from '../owner/ownerUi';
import { beginPayment, paymentDeadline, paymentDestination } from './orderFlow';
import { saveLastOrder } from './lastOrder';
import { useSessionStore } from '../../store/sessionStore';

export default function PaymentFailureScreen({
  navigation,
  route,
}: RootStackScreenProps<'PaymentFailure'>) {
  const { orderId, reason } = route.params ?? {};
  const account = useSessionStore(state => state.user?.id);
  const order = useResource<Order>(
    `/api/orders/${encodeURIComponent(orderId ?? '')}`,
    undefined,
    !!orderId,
  );
  const deal = useResource<Deal>(
    `/api/deals/${encodeURIComponent(order.data?.dealId ?? '')}`,
    undefined,
    !!order.data,
  );
  const [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  async function retry() {
    if (!order.data || busy) return;
    setBusy(true);
    setError(null);
    try {
      const fresh = await api.get<Order>(
        `/api/orders/${encodeURIComponent(order.data.id)}`,
      );
      if (paymentDestination(fresh.status) === 'OrderComplete') {
        navigation.replace('OrderComplete', { orderId: fresh.id });
        return;
      }
      const result = await beginPayment(
        api,
        { orderId: fresh.status === 'PENDING_PAYMENT' ? fresh.id : undefined },
        {
          dealId: fresh.dealId,
          quantity: fresh.quantity,
          couponId: fresh.couponId,
          termsAccepted: true,
          idempotencyKey: await native.randomHex(20),
          pickupMinutes: fresh.pickupMinutes,
          requestNote: fresh.requestNote,
        },
      );
      if (!account) throw new Error('로그인 정보를 확인해 주세요.');
      await saveLastOrder(account, result.orderId);
      navigation.replace('PaymentPending', result);
      await Linking.openURL(result.paymentUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : '다시 결제하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      navigation={navigation}
      title="결제 결과"
      scroll={false}
      contentStyle={{ paddingTop: 8 }}
    >
      <View style={[s.center, { gap: 16 }]}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: P.redSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Asset name="failure" />
        </View>
        <Txt size={23} bold>
          결제가 완료되지 않았어요
        </Txt>
        <Txt size={13} color={P.muted} style={{ textAlign: 'center' }}>
          {reason ?? '카카오페이 결제가 취소되었거나 승인되지 않았어요.'}
        </Txt>
      </View>
      <Card>
        <View style={{ gap: 10 }}>
          <Txt bold>이런 경우 결제가 중단돼요</Txt>
          <Txt size={13}>· 카카오톡 결제창에서 닫기를 눌렀을 때</Txt>
          <Txt size={13}>· 카카오페이 잔액 · 카드 한도가 부족할 때</Txt>
          <Txt size={13}>· 결제 인증 시간이 지났을 때</Txt>
        </View>
      </Card>
      {order.data?.status === 'PENDING_PAYMENT' ? (
        <ClockBanner
          endsAt={paymentDeadline(order.data.createdAt)}
          label="결제 인증 제한 시간"
        />
      ) : deal.data ? (
        <ClockBanner endsAt={deal.data.endsAt} />
      ) : null}
      <Card>
        <View style={{ gap: 8 }}>
          <DetailRow label="주문번호">
            {order.data?.id ?? orderId ?? '주문 생성 전'}
          </DetailRow>
          <DetailRow label="결제 예정 금액">
            {order.data ? formatMoney(order.data.total) : '확인할 수 없음'}
          </DetailRow>
        </View>
      </Card>
      {(error || order.error) && (
        <Empty message={error ?? order.error!} onRetry={order.reload} />
      )}
      <View style={s.grow} />
      <Button
        label="카카오페이로 다시 결제하기"
        variant="kakao"
        disabled={!order.data}
        loading={busy}
        onPress={() => {
          void retry();
        }}
      />
      <Button
        label="주문서로 돌아가기"
        variant="outline"
        onPress={() =>
          order.data
            ? navigation.replace('Order', { dealId: order.data.dealId })
            : navigation.popTo('Map')
        }
      />
    </Screen>
  );
}
