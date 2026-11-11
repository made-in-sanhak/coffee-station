import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, Linking, View } from 'react-native';
import { api, useResource } from '../../app/api';
import { Button, Card, Empty, Screen, formatMoney } from '../../app/ui';
import type { Order } from '../../app/domain';
import type { RootStackScreenProps } from '../../navigation/types';
import {
  Asset,
  ClockBanner,
  DetailRow,
  P,
  Row,
  Txt,
  s,
} from '../owner/ownerUi';
import {
  isPaymentReturn,
  paymentDestination,
  trustedPaymentUrl,
  paymentDeadline,
} from './orderFlow';

export default function PaymentPendingScreen({
  navigation,
  route,
}: RootStackScreenProps<'PaymentPending'>) {
  const { orderId } = route.params;
  const order = useResource<Order>(
    `/api/orders/${encodeURIComponent(orderId)}`,
  );
  const [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [rotation]);
  const reload = order.reload;
  useEffect(() => {
    const timer = setInterval(reload, 2500);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') reload();
    });
    const links = Linking.addEventListener('url', event => {
      if (isPaymentReturn(event.url, orderId)) reload();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
      links.remove();
    };
  }, [reload, orderId]);
  useEffect(() => {
    if (!order.data) return;
    const destination = paymentDestination(order.data.status);
    if (destination === 'OrderComplete')
      navigation.replace('OrderComplete', { orderId });
    if (destination === 'PaymentFailure')
      navigation.replace('PaymentFailure', {
        orderId,
        reason:
          order.data.status === 'CANCELLED'
            ? '결제가 취소되었어요.'
            : '결제가 승인되지 않았어요.',
      });
  }, [navigation, order.data, orderId]);
  async function reopen() {
    const url = order.data?.paymentUrl ?? route.params.paymentUrl;
    if (!url || !trustedPaymentUrl(url)) {
      setError('다시 열 수 있는 안전한 카카오페이 결제 주소가 없습니다.');
      return;
    }
    try {
      await Linking.openURL(url);
      setError(null);
    } catch {
      setError('카카오페이 결제창을 열지 못했습니다.');
    }
  }
  async function cancel() {
    setBusy(true);
    try {
      await api.post<Order>(
        `/api/orders/${encodeURIComponent(orderId)}/cancel`,
      );
      order.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : '결제를 취소하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      navigation={navigation}
      title="결제 진행 중"
      scroll={false}
      contentStyle={{ paddingTop: 24 }}
    >
      <View style={[s.center, { gap: 18 }]}>
        <Animated.View
          style={{
            transform: [
              {
                rotate: rotation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          }}
        >
          <Asset name="loader" />
        </Animated.View>
        <Txt size={20} bold style={{ textAlign: 'center' }}>
          카카오톡에서 결제를 진행해 주세요
        </Txt>
        <Txt size={13} color={P.muted}>
          결제를 마친 뒤 ‘앱으로 돌아가기’를 선택해 주세요
        </Txt>
      </View>
      <Card>
        <View style={{ gap: 10 }}>
          <DetailRow label="주문번호">{order.data?.id ?? orderId}</DetailRow>
          <DetailRow label="매장">
            {order.data?.cafeName ?? '확인 중'}
          </DetailRow>
          <DetailRow label="결제 금액">
            {order.data ? formatMoney(order.data.total) : '확인 중'}
          </DetailRow>
          {order.data && (
            <ClockBanner
              endsAt={paymentDeadline(order.data.createdAt)}
              label="결제 인증 제한 시간"
              small
            />
          )}
        </View>
      </Card>
      <Card>
        <View style={{ gap: 12 }}>
          {[
            '주문서 생성',
            '카카오페이 결제 준비',
            '카카오톡에서 결제 인증',
            '결제 승인 확인',
          ].map((label, index) => (
            <Row key={label}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: index < 2 ? P.green : undefined,
                  borderWidth: index === 3 ? 2 : 0,
                  borderColor: P.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {index < 2 ? (
                  <Asset name="checkSmall" />
                ) : index === 2 ? (
                  <Asset name="progress" />
                ) : null}
              </View>
              <Txt
                size={14}
                bold={index === 2}
                color={index === 3 ? P.muted : P.text}
              >
                {label}
              </Txt>
              {index === 2 && (
                <Txt size={12} bold color={P.brown} style={s.detailValue}>
                  진행 중
                </Txt>
              )}
            </Row>
          ))}
        </View>
      </Card>
      {(order.error || error) && (
        <Empty message={error ?? order.error!} onRetry={order.reload} />
      )}
      <View style={s.grow} />
      <Button
        label="카카오톡 다시 열기"
        variant="outline"
        onPress={() => {
          void reopen();
        }}
      />
      <Button
        label="결제 취소"
        variant="quiet"
        loading={busy}
        onPress={() => {
          void cancel();
        }}
      />
    </Screen>
  );
}
