import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { api, useResource } from '../../app/api';
import { Button, Card, Chip, Empty, Screen, formatMoney } from '../../app/ui';
import type { Order, OwnerDashboard } from '../../app/domain';
import type { RootStackScreenProps } from '../../navigation/types';
import { Badge, DetailRow, P, Row, Txt, s } from './ownerUi';

export default function OwnerOrdersScreen({
  navigation,
  route,
}: RootStackScreenProps<'OwnerOrders'>) {
  const orders = useResource<Order[]>('/api/owner/orders', {
    cafeId: route.params?.cafeId,
  });
  const dashboard = useResource<OwnerDashboard>('/api/owner/dashboard');
  const [tab, setTab] = useState('new'),
    [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const timer = setInterval(orders.reload, 4000);
    return () => clearInterval(timer);
  }, [orders.reload]);
  async function transition(
    order: Order,
    action: 'accept' | 'reject' | 'ready' | 'complete',
  ) {
    if (busy) return;
    setBusy(order.id);
    setError(null);
    try {
      await api.post<Order>(
        `/api/owner/orders/${encodeURIComponent(order.id)}/${action}`,
      );
      orders.reload();
      dashboard.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : '주문을 변경하지 못했습니다.');
    } finally {
      setBusy(null);
    }
  }
  const list = orders.data ?? [],
    count = (status: Order['status']) =>
      list.filter(o => o.status === status).length;
  const visible = list.filter(o =>
    tab === 'new'
      ? ['PAID', 'ACCEPTED'].includes(o.status)
      : tab === 'making'
      ? o.status === 'ACCEPTED'
      : tab === 'ready'
      ? o.status === 'READY'
      : o.status === 'PICKED_UP',
  );
  return (
    <Screen
      navigation={navigation}
      title="주문 접수"
      contentStyle={{ paddingTop: 8, gap: 12 }}
    >
      <Row>
        {[
          [
            '오늘 주문',
            dashboard.data ? `${dashboard.data.todayOrders}건` : '확인 중',
          ],
          [
            '오늘 매출',
            dashboard.data ? formatMoney(dashboard.data.todaySales) : '확인 중',
          ],
          ['정산 예정', '수수료 차감 후'],
        ].map(([label, value]) => (
          <View key={label} style={s.grow}>
            <Card>
              <Txt size={11} color={P.muted}>
                {label}
              </Txt>
              <Txt
                size={label === '정산 예정' ? 11 : 15}
                bold
                color={label === '정산 예정' ? P.muted : P.text}
              >
                {value}
              </Txt>
            </Card>
          </View>
        ))}
      </Row>
      <Row
        style={{
          backgroundColor: P.card,
          padding: 4,
          borderRadius: 12,
          gap: 4,
        }}
      >
        {[
          ['new', `신규 ${count('PAID')}`],
          ['making', `제조 중 ${count('ACCEPTED')}`],
          ['ready', '픽업 대기'],
          ['done', '완료'],
        ].map(([id, label]) => (
          <View key={id} style={s.grow}>
            <Chip
              label={label}
              selected={tab === id}
              onPress={() => setTab(id)}
            />
          </View>
        ))}
      </Row>
      {(orders.error || error) && (
        <Empty message={error ?? orders.error!} onRetry={orders.reload} />
      )}
      {!orders.loading && !orders.error && !visible.length && (
        <Empty message="해당 상태의 주문이 없습니다." />
      )}
      {visible.map(o => (
        <View
          key={o.id}
          style={{
            borderRadius: 16,
            borderWidth: o.status === 'PAID' ? 1.5 : 1,
            borderColor: o.status === 'PAID' ? P.red : P.border,
            backgroundColor: P.white,
            padding: 16,
            gap: 10,
          }}
        >
          <Row>
            <Txt size={18} bold>
              {o.pickupCode ?? o.id}
            </Txt>
            <Badge
              tone={
                o.status === 'PAID'
                  ? 'red'
                  : o.status === 'ACCEPTED'
                  ? 'brown'
                  : 'green'
              }
            >
              {o.status === 'PAID'
                ? '신규'
                : o.status === 'ACCEPTED'
                ? '제조 중'
                : o.status === 'READY'
                ? '픽업 대기'
                : '완료'}
            </Badge>
            <Txt size={11} color={P.muted} style={s.detailValue}>
              {Math.max(
                0,
                Math.floor((Date.now() - Date.parse(o.createdAt)) / 60000),
              )}
              분 전
            </Txt>
          </Row>
          <Txt bold>
            {o.menuName} × {o.quantity}
          </Txt>
          {o.requestNote && (
            <View
              style={{
                backgroundColor: P.card,
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 10,
              }}
            >
              <Txt size={12}>요청: {o.requestNote}</Txt>
            </View>
          )}
          <DetailRow label="픽업">
            {o.pickupMinutes === 20
              ? '20분 후'
              : o.pickupMinutes === 30
              ? '30분 후'
              : '바로 (약 10분)'}
          </DetailRow>
          <DetailRow label="결제" color={P.green}>
            카카오페이 결제 완료 · {formatMoney(o.total)}
          </DetailRow>
          {o.cancellationPending && (
            <Txt size={13} bold color={P.red}>
              환불 처리 결과를 확인하고 있어요
            </Txt>
          )}
          {o.status === 'PAID' && (
            <Row>
              <View style={s.grow}>
                <Button
                  label="거절 (자동 환불)"
                  variant="outline"
                  loading={busy === o.id}
                  disabled={!!busy || !!o.cancellationPending}
                  onPress={() => {
                    void transition(o, 'reject');
                  }}
                />
              </View>
              <View style={s.grow}>
                <Button
                  label="수락"
                  loading={busy === o.id}
                  disabled={!!busy || !!o.cancellationPending}
                  onPress={() => {
                    void transition(o, 'accept');
                  }}
                />
              </View>
            </Row>
          )}
          {o.status === 'ACCEPTED' && (
            <Button
              label="픽업 준비 완료 알림 보내기"
              variant="quiet"
              loading={busy === o.id}
              disabled={!!busy}
              onPress={() => {
                void transition(o, 'ready');
              }}
            />
          )}
          {o.status === 'READY' && (
            <Button
              label="픽업 완료"
              loading={busy === o.id}
              disabled={!!busy}
              onPress={() => {
                void transition(o, 'complete');
              }}
            />
          )}
        </View>
      ))}
      <Txt size={11} color={P.muted} style={s.mutedCenter}>
        3분 안에 수락하지 않으면 자동 거절 · 환불돼요
      </Txt>
    </Screen>
  );
}
