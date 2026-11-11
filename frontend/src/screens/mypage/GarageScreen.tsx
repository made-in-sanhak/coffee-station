import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useResource } from '../../app/api';
import type { Cafe, Purchase, Review } from '../../app/domain';
import { tokens, Button, Empty, Screen, formatMoney } from '../../app/ui';
import type { RootStackScreenProps } from '../../navigation/types';
import { usePersonalStore, type CarSkinLevel } from '../../store/personalStore';
import { useSessionStore } from '../../store/sessionStore';
import {
  localDateKey,
  purchaseDateKey,
  purchaseSourceLabel,
} from '../purchase/purchaseMath';
import { RewardAsset } from '../receipt/RewardVisuals';
import { rewardColors as c, rewardStyles as s } from '../receipt/RewardStyles';
import { getLastOrder } from '../order/lastOrder';

interface Statistics {
  nextLevelCups?: number | null;
  levelStartCups?: number;
  maxLevel?: number;
  reviewCount?: number;
  savedAmount?: number;
  count: number;
  total: number;
  caffeineMg: number;
  visitedCafeCount: number;
  stamps: number;
  level: number;
}
const skins = [
  { name: '에스프레소 경차', level: 1 },
  { name: '라떼 세단', level: 3 },
  { name: '콜드브루 SUV', level: 4 },
  { name: '스페셜티 스포츠', level: 6 },
];

function CaffeineGauge({ value }: { value: number }) {
  const progress = Math.min(Math.max(value / 400, 0), 1);
  const segments = Math.round(progress * 90);
  return (
    <View accessibilityLabel={`오늘 확인된 카페인 ${value}mg`} style={st.gauge}>
      <RewardAsset name="gaugeBackground" />
      {value === 300 ? (
        <Image
          source={require('../../assets/figma/rewards/b068b.png')}
          style={st.gauge300}
        />
      ) : (
        Array.from({ length: segments }, (_, index) => {
          const angle = Math.PI + (Math.PI * (index + 0.5)) / 90;
          return (
            <View
              key={index}
              style={[
                st.gaugeSegment,
                {
                  left: 60 + 53 * Math.cos(angle) - 7,
                  top: 60 + 53 * Math.sin(angle) - 1.1,
                  transform: [{ rotate: `${(angle * 180) / Math.PI}deg` }],
                },
              ]}
            />
          );
        })
      )}
      <Text style={st.gaugeNumber}>{Math.round(value)}</Text>
    </View>
  );
}

export default function GarageScreen({
  navigation,
}: RootStackScreenProps<'Garage'>) {
  const user = useSessionStore(state => state.user);
  const purchases = usePersonalStore(state => state.purchases);
  const personalError = usePersonalStore(state => state.error);
  const hydratePersonal = usePersonalStore(state => state.hydrate);
  const preferences = usePersonalStore(state => state.preferences);
  const favoriteIds = usePersonalStore(state => state.favoriteIds);
  const statistics = useResource<Statistics>(
    '/api/users/me/statistics',
    undefined,
    !!user,
  );
  const remotePurchases = useResource<Purchase[]>(
    '/api/purchases',
    undefined,
    !!user,
  );
  const favorites = useResource<Cafe[]>(
    '/api/users/me/favorites',
    undefined,
    !!user,
  );
  const reviews = useResource<Review[]>(
    '/api/reviews',
    user ? { authorId: user.id } : undefined,
    !!user,
  );
  const selectedSkin = usePersonalStore(state => state.selectedCarSkinLevel);
  const setSelectedSkin = usePersonalStore(state => state.setCarSkinLevel);
  const personalHydrated = usePersonalStore(state => state.hydrated);
  const [skinError, setSkinError] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showVisits, setShowVisits] = useState(false);
  const [lastOrder, setLastOrder] = useState<string | null>(null);
  const [lastOrderError, setLastOrderError] = useState<string | null>(null);
  const [orderAttempt, setOrderAttempt] = useState(0);
  const accountId = user?.id;
  useEffect(() => {
    let active = true;
    setLastOrder(null);
    setLastOrderError(null);
    if (!accountId) return;
    const read = () => {
      getLastOrder(accountId)
        .then(id => {
          if (active) {
            setLastOrder(id);
            setLastOrderError(null);
          }
        })
        .catch(reason => {
          if (active)
            setLastOrderError(
              reason instanceof Error
                ? reason.message
                : '마지막 주문 정보를 읽지 못했습니다.',
            );
        });
    };
    read();
    const stop = navigation.addListener?.('focus', read);
    return () => {
      active = false;
      stop?.();
    };
  }, [accountId, navigation, orderAttempt]);
  const merged = useMemo(
    () => [
      ...new Map(
        [...purchases, ...(remotePurchases.data ?? [])].map(purchase => [
          purchase.id,
          purchase,
        ]),
      ).values(),
    ],
    [purchases, remotePurchases.data],
  );
  const totalCups = merged.reduce(
    (sum, purchase) => sum + purchase.quantity,
    0,
  );
  const visited = new Map<string, Purchase>();
  for (const purchase of [...merged].sort((a, b) =>
    b.purchasedAt.localeCompare(a.purchasedAt),
  )) {
    const key = purchase.cafeId || purchase.cafeName;
    if (!visited.has(key)) visited.set(key, purchase);
  }
  const today = merged.filter(
    purchase =>
      purchaseDateKey(purchase.purchasedAt) === localDateKey(new Date()),
  );
  const caffeine = today.reduce(
    (sum, purchase) => sum + (purchase.caffeineMg ?? 0) * purchase.quantity,
    0,
  );
  const unknownCaffeine = today.some(purchase => purchase.caffeineMg === null);
  const level = statistics.data?.level ?? 1;
  const serverCups = statistics.data?.count ?? 0;
  const nextBoundary = statistics.data?.nextLevelCups;
  const levelStart = statistics.data?.levelStartCups ?? 0;
  const maxLevel = statistics.data?.maxLevel;
  const progress =
    typeof nextBoundary === 'number' && nextBoundary > levelStart
      ? Math.max(
          0,
          Math.min(1, (serverCups - levelStart) / (nextBoundary - levelStart)),
        )
      : maxLevel !== undefined && level >= maxLevel
      ? 1
      : 0;
  const unlocked = skins.filter(skin => skin.level <= level);
  const skin =
    unlocked.find(item => item.level === selectedSkin) ??
    unlocked[unlocked.length - 1] ??
    skins[0];
  const localFavorites = favoriteIds.filter(
    id => !(favorites.data ?? []).some(cafe => cafe.id === id),
  );
  const reviewCount = statistics.data?.reviewCount ?? reviews.data?.length;
  const chooseSkin = async (requiredLevel: number) => {
    if (maxLevel !== undefined && requiredLevel > maxLevel) {
      Alert.alert(
        '해금 조건 미설정',
        '이 차량의 해금 조건이 정해지면 선택할 수 있어요.',
      );
      return;
    }
    if (requiredLevel > level) {
      Alert.alert(
        '아직 잠겨 있어요',
        `구매 기록으로 Lv.${requiredLevel}에 도달하면 선택할 수 있어요.`,
      );
      return;
    }
    try {
      await setSelectedSkin(requiredLevel as CarSkinLevel);
      setSkinError(null);
    } catch (cause) {
      setSkinError(
        cause instanceof Error
          ? cause.message
          : '차량 선택을 저장하지 못했습니다.',
      );
    }
  };
  const openVisit = (purchase: Purchase) =>
    purchase.cafeId
      ? navigation.navigate('CafeDetail', { cafeId: purchase.cafeId })
      : navigation.navigate('Calendar');
  return (
    <Screen navigation={navigation} tab="garage">
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
          <Text style={s.title}>나의 차고</Text>
          <View style={s.badge}>
            <Text style={s.badgeText}>
              Lv.{level} {skin.name.replace('에스프레소 ', '')}
            </Text>
          </View>
        </View>
        <View style={st.garage}>
          <RewardAsset name="carIllustration" />
          <Text style={st.carName}>{skin.name}</Text>
          <View style={s.xpDetails}>
            <View style={st.xp}>
              <View style={[st.xpFill, { width: `${progress * 100}%` }]} />
            </View>
            <View style={s.between}>
              <Text style={[s.muted, s.green, s.bold]}>주유 {totalCups}잔</Text>
              <Text style={s.muted}>
                {statistics.data
                  ? `${
                      nextBoundary
                        ? `Lv.${level + 1}까지 ${Math.max(
                            0,
                            nextBoundary - serverCups,
                          )}잔`
                        : `인증 ${statistics.data.stamps}회`
                    }`
                  : '영수증 인증으로 차량을 모아 보세요'}
              </Text>
            </View>
          </View>
        </View>
        <View style={s.card}>
          <View style={[s.row, s.gap16]}>
            <CaffeineGauge value={caffeine} />
            <View style={[s.flex, s.gap4]}>
              <View style={[s.row, s.gap4]}>
                <RewardAsset name="gauge" />
                <Text style={s.heading}>카페인 계기판</Text>
              </View>
              <Text style={[s.subtitle, { color: c.brown }]}>
                오늘 {caffeine}mg / 참고 400mg
              </Text>
              <Text style={s.small}>
                {unknownCaffeine
                  ? '함량 미등록 메뉴가 포함돼 있어요'
                  : today.length === 0
                  ? '오늘 구매 기록을 추가해 주세요'
                  : caffeine >= 400
                  ? '오늘 기록이 참고 기준에 도달했어요'
                  : '기록한 메뉴의 함량을 확인해요'}
              </Text>
            </View>
          </View>
        </View>
        <View style={s.stats}>
          {[
            {
              value: `${totalCups}잔`,
              label: '누적 주유',
              press: () => navigation.navigate('Calendar'),
            },
            {
              value: `${visited.size}곳`,
              label: '방문 카페',
              press: () => setShowVisits(previous => !previous),
            },
            {
              value: reviewCount === undefined ? '—' : `${reviewCount}개`,
              label: '작성 리뷰',
              press: () => navigation.navigate('Community', { tab: 'reviews' }),
            },
            {
              value:
                statistics.data?.savedAmount === undefined
                  ? '—'
                  : formatMoney(statistics.data.savedAmount),
              label: '아낀 금액',
              press: () => navigation.navigate('Coupons'),
            },
          ].map(item => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.label}
              key={item.label}
              onPress={item.press}
              style={st.stat}
            >
              <Text style={s.statValue}>{item.value}</Text>
              <Text style={s.small}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={s.gap8}>
          <Text style={s.heading}>차량 컬렉션</Text>
          {skinError && (
            <Text accessibilityRole="alert" style={s.error}>
              {skinError}
            </Text>
          )}
          <View style={s.stats}>
            {skins.map(item => (
              <Pressable
                key={item.level}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, 레벨 ${item.level}${
                  item.level > level ? ', 잠김' : ''
                }`}
                disabled={!personalHydrated}
                accessibilityState={{
                  selected: skin.level === item.level,
                  disabled: !personalHydrated,
                }}
                onPress={() => chooseSkin(item.level)}
                style={[st.carTile, skin.level === item.level && st.activeCar]}
              >
                <RewardAsset name={item.level <= level ? 'car' : 'lock'} />
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[
                    st.carTileName,
                    item.level > level && { color: c.muted },
                  ]}
                >
                  {item.name}
                </Text>
                <Text style={[s.small, s.font10]}>
                  {maxLevel !== undefined && item.level > maxLevel
                    ? '해금 조건 미설정'
                    : `Lv.${item.level}`}
                  {skin.level === item.level ? ' · 현재' : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={s.card}>
          <View style={s.row}>
            {user?.profileImageUrl && (
              <Image source={{ uri: user.profileImageUrl }} style={st.avatar} />
            )}
            <View style={s.flex}>
              <Text style={[s.heading, s.font16]}>
                {user?.nickname || '나의 커피 기록'}
              </Text>
              <Text style={s.muted}>
                {user
                  ? '개인 구매 기록과 취향을 관리해요'
                  : '이 기기에 저장된 개인 기록이에요'}
              </Text>
            </View>
          </View>
          <Button
            label="나의 커피 취향 수정"
            variant="outline"
            onPress={() => navigation.navigate('Preferences')}
          />
          <Text style={s.muted}>
            {[
              ...preferences.menus,
              ...preferences.tastes,
              ...preferences.purposes,
            ].join(' · ') || '커피 취향을 설정해 주세요'}
          </Text>
          <View style={s.row}>
            <View style={s.flex}>
              <Button
                label="구매 캘린더"
                onPress={() => navigation.navigate('Calendar')}
              />
            </View>
            <View style={s.flex}>
              <Button
                label="쿠폰함"
                variant="outline"
                onPress={() => navigation.navigate('Coupons')}
              />
            </View>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowFavorites(previous => !previous)}
          style={s.linkRow}
        >
          <Text style={[s.heading, s.flex]}>
            즐겨찾는 카페{' '}
            {
              new Set([
                ...(favorites.data ?? []).map(cafe => cafe.id),
                ...favoriteIds,
              ]).size
            }
            곳
          </Text>
          <RewardAsset name="right" />
        </Pressable>
        {showFavorites && (
          <View style={s.card}>
            {!(favorites.data?.length || localFavorites.length) ? (
              <Empty message="즐겨찾는 카페가 없어요." />
            ) : (
              <>
                {(favorites.data ?? []).map(cafe => (
                  <Pressable
                    accessibilityRole="button"
                    key={cafe.id}
                    onPress={() =>
                      navigation.navigate('CafeDetail', {
                        cafeId: cafe.id,
                        cafe,
                      })
                    }
                    style={s.between}
                  >
                    <View style={s.flex}>
                      <Text style={s.heading}>{cafe.name}</Text>
                      <Text style={s.muted}>{cafe.address}</Text>
                    </View>
                    <RewardAsset name="right" />
                  </Pressable>
                ))}
                {localFavorites.map(id => (
                  <Pressable
                    accessibilityRole="button"
                    key={id}
                    onPress={() =>
                      navigation.navigate('CafeDetail', { cafeId: id })
                    }
                    style={s.between}
                  >
                    <Text style={s.text}>저장한 카페 보기</Text>
                    <RewardAsset name="right" />
                  </Pressable>
                ))}
              </>
            )}
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowVisits(previous => !previous)}
          style={s.linkRow}
        >
          <Text style={[s.heading, s.flex]}>최근 방문 카페</Text>
          <RewardAsset name="right" />
        </Pressable>
        {showVisits && (
          <View style={s.card}>
            {visited.size === 0 ? (
              <Empty message="구매 기록을 남기면 최근 방문이 표시돼요." />
            ) : (
              [...visited.values()].slice(0, 10).map(purchase => (
                <Pressable
                  accessibilityRole="button"
                  key={purchase.cafeId || purchase.cafeName}
                  onPress={() => openVisit(purchase)}
                  style={s.between}
                >
                  <View style={s.flex}>
                    <Text style={s.heading}>{purchase.cafeName}</Text>
                    <Text style={s.muted}>
                      {new Date(purchase.purchasedAt).toLocaleDateString(
                        'ko-KR',
                      )}{' '}
                      · {purchase.menuName} · {purchaseSourceLabel(purchase)}
                    </Text>
                  </View>
                  <RewardAsset name="right" />
                </Pressable>
              ))
            )}
          </View>
        )}
        {user && lastOrder && (
          <Button
            label="마지막 주문 확인"
            variant="outline"
            onPress={() =>
              navigation.navigate('PaymentPending', { orderId: lastOrder })
            }
          />
        )}
        {user && lastOrderError && (
          <Empty
            message={lastOrderError}
            onRetry={() => setOrderAttempt(value => value + 1)}
          />
        )}
        <Button
          label="영수증 등록하기"
          onPress={() => navigation.navigate('Receipt')}
        />
        <Button
          label="설정"
          variant="outline"
          onPress={() => navigation.navigate('Settings')}
        />
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  garage: {
    backgroundColor: c.cream,
    borderRadius: 20,
    padding: 16,
    gap: 10,
    alignItems: 'center',
  },
  carName: {
    fontFamily: tokens.font,
    fontSize: 18,
    lineHeight: 25,
    color: c.text,
    fontWeight: '700',
  },
  xp: {
    height: 10,
    borderRadius: 5,
    backgroundColor: c.white,
    overflow: 'hidden',
  },
  xpFill: { height: 10, borderRadius: 5, backgroundColor: c.green },
  gauge: { width: 120, height: 66, overflow: 'hidden' },
  gauge300: {
    width: 102.426,
    height: 60,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  gaugeNumber: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 34,
    fontFamily: tokens.font,
    fontSize: 18,
    lineHeight: 25,
    textAlign: 'center',
    color: c.brown,
    fontWeight: '900',
  },
  gaugeSegment: {
    position: 'absolute',
    width: 14,
    height: 2.2,
    backgroundColor: c.brown,
  },
  stat: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.white,
    alignItems: 'center',
  },
  carTile: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 10,
    gap: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.white,
    alignItems: 'center',
  },
  activeCar: { borderColor: c.green, backgroundColor: c.greenLight },
  carTileName: {
    fontFamily: tokens.font,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    color: c.text,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
});
