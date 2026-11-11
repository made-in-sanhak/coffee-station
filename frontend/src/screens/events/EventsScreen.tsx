import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useResource } from '../../app/api';
import { Empty, Screen, formatMoney } from '../../app/ui';
import type { Cafe, Deal, Event } from '../../app/domain';
import type { RootStackScreenProps } from '../../navigation/types';
import { useSessionStore } from '../../store/sessionStore';
import { Asset, Badge, P, Row, Txt, s } from '../owner/ownerUi';
import TimeDealPromotion from './TimeDealPromotion';
import { selectPromotion } from './promotionModel';

export default function EventsScreen({
  navigation,
}: RootStackScreenProps<'Events'>) {
  const events = useResource<Event[]>('/api/events');
  const deals = useResource<Deal[]>('/api/deals');
  const cafes = useResource<Cafe[]>('/api/cafes');
  const user = useSessionStore(state => state.user);
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const { event, deal } = selectPromotion(
    events.data ?? [],
    deals.data ?? [],
    now,
  );
  const selectedCafe = cafes.data?.find(c => c.id === deal?.cafeId);
  const availableEvents = (events.data ?? []).filter(
    e => !e.dealId || selectPromotion([e], deals.data ?? [], now).deal,
  );
  const matchingEvents = availableEvents.filter(e =>
    [
      e.title,
      e.description,
      deals.data?.find(d => d.id === e.dealId)?.menuName ?? '',
      cafes.data?.find(c => c.id === e.cafeId)?.name ?? '',
    ].some(value =>
      value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
    ),
  );
  return (
    <Screen
      navigation={navigation}
      header={false}
      footer={<TimeDealPromotion navigation={navigation} />}
      tab="map"
      contentStyle={{ padding: 0, gap: 20, paddingBottom: 20 }}
    >
      <Row style={styles.homeHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="지역 검색"
          onPress={() => navigation.navigate('PlaceSearch')}
        >
          <Row style={{ gap: 4 }}>
            <Asset name="pin" />
            <Txt size={16} bold>
              {selectedCafe?.address.split(' ').slice(0, 3).join(' ') ||
                '주변 지역 선택'}
            </Txt>
            <Asset name="homeDown" />
          </Row>
        </Pressable>
        <Row style={{ gap: 16 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="내 쿠폰"
            onPress={() => navigation.navigate('Coupons')}
          >
            <Asset name="homeTicket" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이벤트 보기"
            onPress={() => {
              events.reload();
              deals.reload();
            }}
          >
            <Asset name="bell" />
          </Pressable>
        </Row>
      </Row>
      <View style={styles.pad}>
        <View style={{ gap: 12 }}>
          <Txt size={22} bold style={{ lineHeight: 30 }}>
            {user?.nickname ? `${user.nickname}님, ` : ''}오늘은 어떤 커피로
            {'\n'}주유할까요? ☕
          </Txt>
          <View style={styles.search}>
            <Asset name="homeSearch" />
            <TextInput
              accessibilityLabel="이벤트 검색"
              placeholder="카페, 메뉴, 이벤트 검색"
              placeholderTextColor={P.muted}
              value={query}
              onChangeText={setQuery}
              style={{
                flex: 1,
                color: P.text,
                fontFamily: 'NotoSansKR',
                paddingVertical: 8,
              }}
            />
          </View>
        </View>
      </View>
      <View style={styles.pad}>
        <Row>
          <Asset name="sparkles" />
          <Txt size={18} bold>
            오늘의 추천 매장
          </Txt>
          <View style={s.grow} />
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Recommend')}
          >
            <Row style={{ gap: 2 }}>
              <Txt size={13} color={P.muted}>
                전체보기
              </Txt>
              <Asset name="homeRight" />
            </Row>
          </Pressable>
        </Row>
      </View>
      {cafes.error ? (
        <View style={styles.pad}>
          <Empty message={cafes.error} onRetry={cafes.reload} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
        >
          {cafes.data?.slice(0, 8).map(c => (
            <Pressable
              accessibilityRole="button"
              key={c.id}
              onPress={() =>
                navigation.navigate('CafeDetail', { cafeId: c.id, cafe: c })
              }
              style={{ width: 156, gap: 8 }}
            >
              <View style={styles.cafePhoto}>
                <Asset name="homeCoffee" />
                {c.verified && (
                  <View style={{ position: 'absolute', left: 8, top: 8 }}>
                    <Badge>점주 확인</Badge>
                  </View>
                )}
              </View>
              <View style={{ gap: 2 }}>
                <Txt bold>{c.name}</Txt>
                <Row style={{ gap: 3 }}>
                  <Asset name="star" />
                  <Txt size={11} color={P.muted}>
                    {c.rating ?? '평가 전'}
                    {c.distance != null
                      ? ` · ${
                          c.distance < 1000
                            ? `${c.distance}m`
                            : `${(c.distance / 1000).toFixed(1)}km`
                        }`
                      : ''}
                  </Txt>
                </Row>
                <Txt size={13} bold color={P.green}>
                  {c.minPrice != null ? formatMoney(c.minPrice) : '가격 미등록'}
                </Txt>
              </View>
            </Pressable>
          ))}
          {!cafes.loading && cafes.data?.length === 0 && (
            <Empty message="추천할 매장이 없습니다." />
          )}
        </ScrollView>
      )}
      <View style={styles.pad}>
        <Row style={{ gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Receipt')}
            style={[styles.promo, { backgroundColor: P.soft }]}
          >
            <Asset name="gift" />
            <View style={s.grow}>
              <Txt size={13} bold color={P.green}>
                영수증 3번 인증
              </Txt>
              <Txt size={11} color={P.muted}>
                1,000원 쿠폰 받기
              </Txt>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Garage')}
            style={[styles.promo, { backgroundColor: P.brownSoft }]}
          >
            <Asset name="car" />
            <View style={s.grow}>
              <Txt size={13} bold color={P.brown}>
                나의 차고
              </Txt>
              <Txt size={11} color={P.muted}>
                커피 기록 확인
              </Txt>
            </View>
          </Pressable>
        </Row>
      </View>
      {events.error && (
        <View style={styles.pad}>
          <Empty message={events.error} onRetry={events.reload} />
        </View>
      )}
      {!events.loading && !events.error && !events.data?.length && (
        <View style={styles.pad}>
          <Txt size={13} color={P.muted}>
            진행 중인 이벤트가 없습니다.
          </Txt>
        </View>
      )}
      {matchingEvents
        .filter(e => !!query.trim() || !deal || e.id !== event?.id)
        .map(e => (
          <View key={e.id} style={styles.pad}>
            <Pressable
              accessibilityRole="button"
              disabled={!e.dealId && !e.cafeId}
              onPress={() =>
                e.dealId
                  ? navigation.navigate('Order', { dealId: e.dealId })
                  : e.cafeId
                  ? navigation.navigate('CafeDetail', { cafeId: e.cafeId })
                  : undefined
              }
              style={styles.eventCard}
            >
              <Txt size={17} bold>
                {e.title}
              </Txt>
              <Txt size={13} color={P.muted}>
                {e.description}
              </Txt>
            </Pressable>
          </View>
        ))}
    </Screen>
  );
}
const styles = StyleSheet.create({
  pad: { paddingHorizontal: 20 },
  homeHeader: {
    height: 56,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    gap: 8,
  },
  search: {
    height: 50,
    borderWidth: 1.5,
    borderColor: P.green,
    borderRadius: 16,
    backgroundColor: P.white,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cafePhoto: {
    width: 156,
    height: 110,
    borderRadius: 16,
    backgroundColor: P.brownSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  eventCard: {
    backgroundColor: P.white,
    padding: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: P.border,
  },
});
