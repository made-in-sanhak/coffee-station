import React, { useEffect, useRef, useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api, useResource } from '../../app/api';
import { Button, Card, Chip, Empty, Screen, formatMoney } from '../../app/ui';
import { native } from '../../app/native';
import { useSessionStore } from '../../store/sessionStore';
import { useConfigStore } from '../../store/configStore';
import type { Cafe, Coupon, Deal, OrderQuote } from '../../app/domain';
import type { RootStackScreenProps } from '../../navigation/types';
import {
  Asset,
  Badge,
  CheckBox,
  ClockBanner,
  DetailRow,
  Line,
  P,
  Row,
  Txt,
  s,
} from '../owner/ownerUi';
import { beginPayment } from './orderFlow';
import { saveLastOrder } from './lastOrder';

export default function OrderScreen({
  navigation,
  route,
}: RootStackScreenProps<'Order'>) {
  const { dealId } = route.params;
  const token = useSessionStore(state => state.accessToken);
  const account = useSessionStore(state => state.user?.id);
  const baseUrl = useConfigStore(state => state.backendUrl);
  const deal = useResource<Deal>(`/api/deals/${encodeURIComponent(dealId)}`);
  const cafe = useResource<Cafe>(
    `/api/cafes/${encodeURIComponent(deal.data?.cafeId ?? '')}`,
    undefined,
    !!deal.data,
  );
  const coupons = useResource<Coupon[]>(
    '/api/coupons',
    { status: 'ACTIVE' },
    !!token,
  );
  const [quantity, setQuantity] = useState(1),
    [pickupMinutes, setPickup] = useState<10 | 20 | 30>(10),
    [requestNote, setNote] = useState('');
  const [coupon, setCoupon] = useState<Coupon>(),
    [couponOpen, setCouponOpen] = useState(false);
  const [terms, setTerms] = useState(false),
    [privacy, setPrivacy] = useState(false),
    [privacyOpen, setPrivacyOpen] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const attempt = useRef<{ orderId?: string }>({}),
    key = useRef<string | null>(null),
    working = useRef(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const quote = useQuery({
    queryKey: ['order-quote', baseUrl, account, dealId, quantity, coupon?.id],
    queryFn: () =>
      api.post<OrderQuote>('/api/orders/quote', {
        dealId,
        quantity,
        couponId: coupon?.id,
      }),
    enabled: !!deal.data && !!token,
    retry: false,
  });
  const valid =
    !!deal.data?.active &&
    deal.data.stock >= quantity &&
    Date.parse(deal.data.startsAt) <= now &&
    Date.parse(deal.data.endsAt) > now;
  async function pay() {
    if (
      !terms ||
      !token ||
      !account ||
      !privacy ||
      !quote.data ||
      quote.isFetching ||
      !valid ||
      working.current
    )
      return;
    working.current = true;
    setBusy(true);
    setError(null);
    try {
      key.current ??= await native.randomHex(20);
      const result = await beginPayment(api, attempt.current, {
        dealId,
        quantity,
        couponId: coupon?.id,
        idempotencyKey: key.current,
        termsAccepted: true,
        pickupMinutes,
        requestNote,
      });
      await saveLastOrder(account!, result.orderId);
      navigation.replace('PaymentPending', result);
      await Linking.openURL(result.paymentUrl);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '결제를 준비하지 못했습니다.';
      if (attempt.current.orderId)
        navigation.replace('PaymentFailure', {
          orderId: attempt.current.orderId,
          reason: message,
        });
      else setError(message);
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  if (!deal.data)
    return (
      <Screen navigation={navigation} title="주문하기">
        <Empty
          message={deal.error ?? '타임딜을 불러오는 중이에요.'}
          onRetry={deal.reload}
        />
      </Screen>
    );
  const d = deal.data,
    q = quote.data;
  const original = q?.originalSubtotal ?? d.originalPrice * quantity;
  const dealDiscount =
    q?.dealDiscount ?? Math.max(0, (d.originalPrice - d.price) * quantity);
  const couponDiscount =
    q?.couponDiscount ?? (q ? Math.max(0, d.price * quantity - q.total) : 0);
  const total = q ? formatMoney(q.total) : '금액 확인 중';
  return (
    <Screen
      navigation={navigation}
      title="주문하기"
      contentStyle={{ paddingTop: 8, gap: 12 }}
    >
      <ClockBanner endsAt={d.endsAt} />
      {!token && (
        <Button
          label="로그인하고 주문하기"
          onPress={() => navigation.navigate('Login')}
        />
      )}
      {!valid && (
        <Empty message="판매가 종료되었거나 재고가 부족한 타임딜이에요." />
      )}
      <Card>
        <View style={{ gap: 12 }}>
          <Row style={{ gap: 12 }}>
            <View style={[s.iconBox, { borderRadius: 20 }]}>
              <Asset name="orderStore" />
            </View>
            <View style={s.grow}>
              <Txt size={15} bold>
                {d.cafeName}
              </Txt>
              <Txt size={12} color={P.muted}>
                {cafe.data?.address ?? '매장 정보 확인 중'}
                {cafe.data?.closesAt ? ` · ${cafe.data.closesAt} 마감` : ''}
              </Txt>
            </View>
            <Badge>매장 픽업</Badge>
          </Row>
          <Line />
          <Txt size={13} bold>
            픽업 시간
          </Txt>
          <Row>
            {([10, 20, 30] as const).map(value => (
              <Chip
                key={value}
                label={value === 10 ? '바로 (약 10분)' : `${value}분 후`}
                selected={pickupMinutes === value}
                onPress={() => setPickup(value)}
              />
            ))}
          </Row>
        </View>
      </Card>
      <Card>
        <View style={{ gap: 12 }}>
          <Txt size={13} bold>
            주문 메뉴
          </Txt>
          <Row style={styles.item}>
            <View style={s.iconBox}>
              <Asset name="orderCoffee" />
            </View>
            <View style={s.grow}>
              <Txt bold>{d.menuName}</Txt>
              <Txt size={11} color={P.muted}>
                {[d.temperature, d.size].filter(Boolean).join(' · ') ||
                  '매장 제공 메뉴'}
              </Txt>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt
                size={11}
                color={P.muted}
                style={{ textDecorationLine: 'line-through' }}
              >
                {formatMoney(d.originalPrice)}
              </Txt>
              <Txt bold>{formatMoney(d.price)}</Txt>
            </View>
          </Row>
          <Row>
            <Txt size={13} color={P.muted}>
              수량
            </Txt>
            <View style={s.grow} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="수량 줄이기"
              disabled={quantity <= 1}
              onPress={() => setQuantity(v => Math.max(1, v - 1))}
              style={styles.step}
            >
              <Txt>−</Txt>
            </Pressable>
            <Txt bold style={{ marginHorizontal: 6 }}>
              {quantity}
            </Txt>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="수량 늘리기"
              disabled={quantity >= Math.min(d.stock, 20)}
              onPress={() => setQuantity(v => Math.min(d.stock, 20, v + 1))}
              style={styles.step}
            >
              <Txt>+</Txt>
            </Pressable>
          </Row>
          <Txt size={13} color={P.muted}>
            요청사항 (선택)
          </Txt>
          <TextInput
            accessibilityLabel="요청사항"
            placeholder="예) 얼음 적게, 포크 2개 주세요"
            placeholderTextColor={P.muted}
            value={requestNote}
            onChangeText={setNote}
            maxLength={300}
            style={styles.note}
          />
        </View>
      </Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="쿠폰 선택"
        onPress={() => setCouponOpen(true)}
      >
        <Card>
          <Row>
            <Asset name="ticket" />
            <Txt size={13} bold>
              쿠폰
            </Txt>
            <Txt size={12} color={P.green} style={s.detailValue}>
              {coupon ? `${coupon.title} 적용됨` : '사용 가능한 쿠폰 선택'}
            </Txt>
            <Asset name="right" />
          </Row>
        </Card>
      </Pressable>
      <Card>
        <View style={{ gap: 8 }}>
          <Txt size={13} bold>
            결제 금액
          </Txt>
          <DetailRow label="상품 금액">{formatMoney(original)}</DetailRow>
          <DetailRow label="타임딜 할인" color={P.red}>
            −{formatMoney(dealDiscount)}
          </DetailRow>
          <DetailRow label="쿠폰 할인" color={P.red}>
            −{formatMoney(couponDiscount)}
          </DetailRow>
          <Line />
          <Row>
            <Txt bold>최종 결제 금액</Txt>
            <Txt size={22} bold color={P.green} style={s.detailValue}>
              {total}
            </Txt>
          </Row>
          {quote.error && (
            <Txt size={12} color={P.red}>
              {quote.error.message}
            </Txt>
          )}
        </View>
      </Card>
      <Card>
        <View style={{ gap: 10 }}>
          <Txt size={13} bold>
            결제 수단
          </Txt>
          <Row style={styles.payment}>
            <View style={styles.payLogo}>
              <Txt size={11} bold>
                pay
              </Txt>
            </View>
            <Txt size={13} bold>
              카카오페이
            </Txt>
            <View style={s.grow} />
            <View style={styles.roundCheck}>
              <Asset name="checkSmall" />
            </View>
          </Row>
          <Txt size={11} color={P.muted}>
            카드 · 토스페이 등 다른 결제 수단은 추후 지원 예정
          </Txt>
        </View>
      </Card>
      <View>
        <CheckBox
          checked={terms}
          label="주문 내용을 확인했으며 결제에 동의합니다 (필수)"
          onPress={() => setTerms(v => !v)}
        />
        <Row>
          <View style={s.grow}>
            <CheckBox
              checked={privacy}
              label={`개인정보 제3자 제공 동의 — ${d.cafeName} (필수)`}
              onPress={() => setPrivacy(v => !v)}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPrivacyOpen(true)}
          >
            <Txt size={12} color={P.muted}>
              보기
            </Txt>
          </Pressable>
        </Row>
      </View>
      {error && (
        <Txt size={12} color={P.red}>
          {error}
        </Txt>
      )}
      <Button
        label={`카카오페이로 ${total} 결제하기`}
        variant="kakao"
        disabled={
          !token || !terms || !privacy || !q || quote.isFetching || !valid
        }
        loading={busy}
        onPress={() => {
          void pay();
        }}
      />
      <Txt size={11} color={P.muted} style={s.mutedCenter}>
        결제 후 매장이 주문을 수락하면 제조를 시작해요
      </Txt>
      <Modal
        transparent
        visible={couponOpen}
        animationType="slide"
        onRequestClose={() => setCouponOpen(false)}
      >
        <View style={styles.modal}>
          <View style={styles.sheet}>
            <Txt size={18} bold>
              쿠폰 선택
            </Txt>
            <ScrollView>
              <View style={{ gap: 10 }}>
                <Button
                  label="쿠폰 적용 안 함"
                  variant="outline"
                  onPress={() => {
                    setCoupon(undefined);
                    setCouponOpen(false);
                  }}
                />
                {coupons.error ? (
                  <Empty message={coupons.error} onRetry={coupons.reload} />
                ) : (
                  coupons.data
                    ?.filter(
                      c =>
                        c.status === 'ACTIVE' &&
                        Date.parse(c.expiresAt) > Date.now() &&
                        (!c.cafeId || c.cafeId === d.cafeId),
                    )
                    .map(c => (
                      <Button
                        key={c.id}
                        label={c.title}
                        variant="outline"
                        onPress={() => {
                          setCoupon(c);
                          setCouponOpen(false);
                        }}
                      />
                    ))
                )}
              </View>
            </ScrollView>
            <Button
              label="닫기"
              variant="quiet"
              onPress={() => setCouponOpen(false)}
            />
          </View>
        </View>
      </Modal>
      <Modal
        transparent
        visible={privacyOpen}
        onRequestClose={() => setPrivacyOpen(false)}
      >
        <View style={styles.modal}>
          <View style={styles.sheet}>
            <Txt size={18} bold>
              개인정보 제3자 제공
            </Txt>
            <Txt>제공받는 자: {d.cafeName}</Txt>
            <Txt>목적: 주문 접수와 매장 픽업 제공</Txt>
            <Txt>항목: 주문 메뉴, 픽업 시간, 요청사항, 픽업 번호</Txt>
            <Txt>
              주문 이행에 필요한 제공 동의를 거부하면 주문할 수 없습니다.
            </Txt>
            <Button label="확인" onPress={() => setPrivacyOpen(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
const styles = StyleSheet.create({
  item: { backgroundColor: P.card, padding: 12, borderRadius: 12, gap: 10 },
  step: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: P.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    backgroundColor: P.bg,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 10,
    padding: 12,
    color: P.text,
    fontSize: 13,
  },
  payment: {
    height: 52,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: P.kakao,
    borderRadius: 12,
  },
  payLogo: {
    backgroundColor: P.kakao,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  roundCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: P.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    flex: 1,
    backgroundColor: 'rgba(20,13,8,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: P.bg,
    padding: 20,
    gap: 18,
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
});
