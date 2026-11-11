import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useResource } from '../../app/api';
import { Button, formatMoney } from '../../app/ui';
import type { Cafe, Deal, Event } from '../../app/domain';
import { Asset, Badge, P, Row, Txt, s } from '../owner/ownerUi';
import { remainingTime } from '../order/orderFlow';
import { selectPromotion } from './promotionModel';

import { promotionDay, usePromotionPreferences } from './promotionPreferences';
type PromotionNavigation = {
  navigate: (...args: any[]) => void;
  isFocused?: () => boolean;
  addListener?: (event: 'focus' | 'blur', listener: () => void) => () => void;
};
export default function TimeDealPromotion({
  navigation,
}: {
  navigation: PromotionNavigation;
}) {
  const [focused, setFocused] = useState(navigation.isFocused?.() ?? true);
  useEffect(() => {
    const focus = navigation.addListener?.('focus', () => setFocused(true));
    const blur = navigation.addListener?.('blur', () => setFocused(false));
    return () => {
      focus?.();
      blur?.();
    };
  }, [navigation]);
  const events = useResource<Event[]>('/api/events');
  const deals = useResource<Deal[]>('/api/deals');
  const cafes = useResource<Cafe[]>('/api/cafes');
  const timerStarted = useRef(Date.now());
  const [open, setOpen] = useState(false),
    [now, setNow] = useState(Date.now()),
    [error, setError] = useState<string | null>(null);
  const storageReady = usePromotionPreferences(state => state.ready);
  const hiddenDay = usePromotionPreferences(state => state.hiddenDay);
  const hydrate = usePromotionPreferences(state => state.hydrate);
  const suppressToday = usePromotionPreferences(state => state.suppressToday);
  const hiddenToday = hiddenDay === promotionDay();
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const { event, deal } = selectPromotion(
    events.data ?? [],
    deals.data ?? [],
    now,
  );
  const activeDealId = deal?.id;
  useEffect(() => {
    if (storageReady && !hiddenToday && activeDealId) setOpen(true);
  }, [storageReady, hiddenToday, activeDealId]);
  const selectedCafe = cafes.data?.find(c => c.id === deal?.cafeId);
  const percent =
    deal && deal.originalPrice > 0
      ? Math.round((1 - deal.price / deal.originalPrice) * 100)
      : 0;
  const time = remainingTime(deal?.endsAt, now);
  const handAngle = (Math.floor((now - timerStarted.current) / 1000) % 12) * 30;
  async function hideToday() {
    try {
      await suppressToday();
      setOpen(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : '닫기 설정을 저장하지 못했습니다.',
      );
    }
  }
  return (
    <>
      {deal && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="타임딜 주문"
          onPress={() => navigation.navigate('Order', { dealId: deal.id })}
          style={[styles.countdown, styles.gradient]}
        >
          <TimerClock angle={handAngle} />
          <View style={{ marginRight: 4 }}>
            <Txt size={17} bold color={P.white}>
              {time}
            </Txt>
            <Txt size={11} color={P.soft}>
              남음
            </Txt>
          </View>
          <View style={s.grow}>
            <Txt size={12} color={P.soft}>
              {deal.cafeName}
            </Txt>
            <Txt size={15} bold color={P.white}>
              {deal.menuName} {percent}%
            </Txt>
          </View>
          <View style={styles.orderPill}>
            <Txt size={13} bold color={P.green}>
              주문
            </Txt>
          </View>
        </Pressable>
      )}
      <Modal
        transparent
        visible={focused && open && !hiddenToday && !!deal}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.dim}>
          <View style={styles.popup}>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              {deal && (
                <>
                  <View style={[styles.hero, styles.gradient]}>
                    <View style={{ position: 'absolute', left: 200, top: -40 }}>
                      <Asset name="popupEllipse" />
                    </View>
                    <View style={{ position: 'absolute', left: 214, top: 60 }}>
                      <Asset name="popupCoffee" />
                    </View>
                    <Row style={styles.dealTag}>
                      <Asset name="zap" />
                      <Txt size={12} bold>
                        타임 딜
                      </Txt>
                    </Row>
                    <Txt
                      size={14}
                      color={P.soft}
                      style={{ position: 'absolute', left: 20, top: 70 }}
                    >
                      {deal.cafeName}
                      {selectedCafe?.distance != null
                        ? ` · ${selectedCafe.distance}m`
                        : ''}
                    </Txt>
                    <Txt
                      size={52}
                      bold
                      color={P.white}
                      style={{
                        position: 'absolute',
                        left: 18,
                        top: 110,
                        lineHeight: 58,
                      }}
                    >
                      {percent}% OFF
                    </Txt>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="이벤트 팝업 닫기"
                      onPress={() => setOpen(false)}
                      style={styles.close}
                    >
                      <Asset name="close" />
                    </Pressable>
                  </View>
                  <View style={styles.popupBody}>
                    <View style={{ gap: 4 }}>
                      <Txt size={21} bold>
                        {deal.menuName}
                      </Txt>
                      <Txt size={13} color={P.muted}>
                        {event?.description || `${percent}% 할인 · 매장 픽업`}
                      </Txt>
                    </View>
                    <Row
                      style={{
                        backgroundColor: P.card,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: 14,
                        gap: 10,
                      }}
                    >
                      <View style={[s.iconBox, { width: 36, height: 36 }]}>
                        <Asset name="setCoffee" />
                      </View>
                      <View style={s.grow}>
                        <Txt size={12} bold>
                          {deal.menuName}
                        </Txt>
                        <Txt size={11} color={P.muted}>
                          {[deal.temperature, deal.size]
                            .filter(Boolean)
                            .join(' · ')}
                        </Txt>
                      </View>
                    </Row>
                    <Row
                      style={{
                        backgroundColor: P.redSoft,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        borderRadius: 16,
                        gap: 14,
                      }}
                    >
                      <TimerClock popup angle={handAngle} />
                      <View style={s.grow}>
                        <Txt size={30} bold color={P.red}>
                          {time}
                        </Txt>
                        <Txt size={12} color={P.muted}>
                          남음 · 이 시간 안에 주문하면 할인
                        </Txt>
                      </View>
                    </Row>
                    <Row style={{ flexWrap: 'wrap' }}>
                      <Txt
                        size={14}
                        color={P.muted}
                        style={{ textDecorationLine: 'line-through' }}
                      >
                        {formatMoney(deal.originalPrice)}
                      </Txt>
                      <Txt size={24} bold color={P.red}>
                        {formatMoney(deal.price)}
                      </Txt>
                      <Badge tone="red">
                        {formatMoney(deal.originalPrice - deal.price)} 할인
                      </Badge>
                    </Row>
                    <Button
                      label="주문하기"
                      onPress={() => {
                        setOpen(false);
                        navigation.navigate('Order', { dealId: deal.id });
                      }}
                    />
                    <Row>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          void hideToday();
                        }}
                      >
                        <Txt size={13} color={P.muted}>
                          오늘 하루 보지 않기
                        </Txt>
                      </Pressable>
                      <View style={s.grow} />
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setOpen(false)}
                      >
                        <Txt size={13} bold>
                          닫기
                        </Txt>
                      </Pressable>
                    </Row>
                    {error && (
                      <Txt size={12} color={P.red}>
                        {error}
                      </Txt>
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
function TimerClock({
  popup = false,
  angle = 0,
}: {
  popup?: boolean;
  angle?: number;
}) {
  const size = popup ? 72 : 44;
  return (
    <View style={{ width: size, height: size }}>
      <View style={StyleSheet.absoluteFill}>
        <Asset name={popup ? 'popupFace' : 'timerFace'} />
      </View>
      <View style={StyleSheet.absoluteFill}>
        <Asset name={popup ? 'popupTrack' : 'timerTrack'} />
      </View>
      <View style={StyleSheet.absoluteFill}>
        <Asset name={popup ? 'popupProgress' : 'timerProgress'} />
      </View>
      {Array.from({ length: 12 }, (_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            transform: [{ rotate: `${i * 30}deg` }],
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: size / 2 - 0.75,
              top: size * 0.22,
              width: 1.5,
              height: size * 0.07,
              backgroundColor: P.border,
            }}
          />
        </View>
      ))}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          transform: [{ rotate: `${angle}deg` }],
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: size / 2 - 1,
            top: size * 0.2,
            width: 2,
            height: size * 0.3,
            borderRadius: 1,
            backgroundColor: popup ? P.red : P.star,
          }}
        />
      </View>
      <View
        style={{ position: 'absolute', left: size * 0.44, top: size * 0.44 }}
      >
        <Asset name={popup ? 'popupPin' : 'timerPin'} />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  gradient: {
    backgroundColor: P.green,
    experimental_backgroundImage: 'linear-gradient(90deg, #1F5A3E, #3E7D5C)',
  },
  countdown: {
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 12,
    padding: 14,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 8,
  },
  orderPill: {
    backgroundColor: P.white,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  dim: {
    flex: 1,
    backgroundColor: 'rgba(20,13,8,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  popup: {
    width: '100%',
    maxWidth: 390,
    maxHeight: '92%',
    alignSelf: 'center',
    borderRadius: 24,
    backgroundColor: P.white,
    overflow: 'hidden',
    elevation: 12,
  },
  hero: { height: 214, overflow: 'hidden' },
  dealTag: {
    position: 'absolute',
    left: 20,
    top: 20,
    backgroundColor: P.star,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 4,
  },
  close: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: P.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupBody: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 14,
  },
});
