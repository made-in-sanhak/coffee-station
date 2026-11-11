import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api, useResource } from '../../app/api';
import { native } from '../../app/native';
import { useSessionStore } from '../../store/sessionStore';
import type { Cafe, Deal, Event, Menu } from '../../app/domain';
import {
  Button,
  Card,
  Empty,
  Field,
  Chip,
  Screen,
  formatDate,
  formatMoney,
  tokens,
} from '../../app/ui';
import ExploreIcon from '../../components/map/ExploreIcon';
import type { RootStackScreenProps } from '../../navigation/types';
import { distanceLabel } from '../map/exploreLogic';

export default function CafeDetailScreen({
  navigation,
  route,
}: RootStackScreenProps<'CafeDetail'>) {
  const { cafeId, cafe: suppliedCafe } = route.params;
  const detail = useResource<Cafe>(`/api/cafes/${encodeURIComponent(cafeId)}`);
  const menuResource = useResource<Menu[]>(
    `/api/cafes/${encodeURIComponent(cafeId)}/menus`,
  );
  const dealResource = useResource<Deal[]>('/api/deals');
  const eventResource = useResource<Event[]>('/api/events');
  const event = eventResource.data?.find(
    item =>
      item.cafeId === cafeId &&
      (!item.endsAt || new Date(item.endsAt).getTime() > Date.now()),
  );
  const cafe = detail.data
    ? {
        ...detail.data,
        distance: detail.data.distance ?? suppliedCafe?.distance,
      }
    : suppliedCafe;
  const menus = menuResource.data ?? cafe?.menus ?? [];
  const deal = dealResource.data?.find(
    item =>
      item.cafeId === cafeId &&
      item.active &&
      item.stock > 0 &&
      new Date(item.startsAt).getTime() <= Date.now() &&
      new Date(item.endsAt).getTime() > Date.now(),
  );
  const [opening, setOpening] = useState(false);
  const token = useSessionStore(state => state.accessToken);
  const trackedCafe = useRef<string | null>(null);
  const registered = detail.data?.id === cafeId;
  const recordInteraction = useCallback(
    async (type: 'DETAIL_VIEW' | 'DIRECTIONS') => {
      if (!registered) return;
      try {
        const interactionKey = await native.randomHex(16);
        await api.post(
          `/api/cafes/${encodeURIComponent(cafeId)}/interactions`,
          { type, interactionKey },
        );
      } catch {
        // Analytics failure must not block viewing a cafe or opening directions.
      }
    },
    [cafeId, registered],
  );
  useEffect(() => {
    if (registered && trackedCafe.current !== cafeId) {
      trackedCafe.current = cafeId;
      void recordInteraction('DETAIL_VIEW');
    }
  }, [cafeId, registered, recordInteraction]);
  const [reportMenu, setReportMenu] = useState<Menu | null>(null);
  const [reportPrice, setReportPrice] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const openPriceRequest = () => {
    if (!token) {
      navigation.navigate('Login');
      return;
    }
    if (!menus.length) return;
    setReportMenu(menus[0]);
    setReportPrice('');
    setReportNote('');
    setReportError(null);
    setReportMessage(null);
  };
  const submitPriceRequest = async () => {
    if (!reportMenu || reportBusy) return;
    const price = Number(reportPrice);
    if (
      !/^\d+$/.test(reportPrice) ||
      !Number.isSafeInteger(price) ||
      price < 1 ||
      price > 1000000
    ) {
      setReportError(
        '확인한 가격을 1원 이상 100만 원 이하의 정수로 입력해 주세요.',
      );
      return;
    }
    setReportBusy(true);
    setReportError(null);
    try {
      await api.post(
        `/api/cafes/${encodeURIComponent(cafeId)}/price-requests`,
        {
          menuId: reportMenu.id,
          reportedPrice: price,
          note: reportNote.trim(),
        },
      );
      setReportMenu(null);
      setReportMessage('가격 확인을 요청했습니다.');
    } catch (reason) {
      setReportError(
        reason instanceof Error
          ? reason.message
          : '가격 확인을 요청하지 못했습니다.',
      );
    } finally {
      setReportBusy(false);
    }
  };
  const directions = async () => {
    if (!cafe || opening) return;
    setOpening(true);
    try {
      if (!Number.isFinite(cafe.latitude) || !Number.isFinite(cafe.longitude))
        throw new Error('카페 위치가 등록되지 않았습니다.');
      await Linking.openURL(
        `https://map.kakao.com/link/to/${encodeURIComponent(cafe.name)},${
          cafe.latitude
        },${cafe.longitude}`,
      );
      void recordInteraction('DIRECTIONS');
    } catch (reason) {
      Alert.alert(
        '길찾기',
        reason instanceof Error ? reason.message : '길찾기를 열지 못했습니다.',
      );
    } finally {
      setOpening(false);
    }
  };
  const open = cafe?.tags?.some(tag => tag === '영업 중' || tag === 'OPEN');
  const source = menus.find(menu => menu.source || menu.checkedAt);

  return (
    <Screen
      navigation={navigation}
      title="카페 상세"
      tab="map"
      contentStyle={styles.content}
    >
      {!cafe ? (
        <Empty
          message={
            detail.loading
              ? '카페 정보를 불러오는 중입니다.'
              : detail.error ?? '카페 정보를 찾을 수 없습니다.'
          }
          onRetry={detail.reload}
        />
      ) : (
        <>
          <View style={styles.photo}>
            <ExploreIcon name="coffeeDetail" />
          </View>
          <View style={styles.info}>
            <View style={styles.titleRow}>
              <Text style={styles.name}>{cafe.name}</Text>
              <View style={[styles.badge, !open && styles.mutedBadge]}>
                <Text style={styles.badgeText}>
                  {open ? '영업 중' : '영업 정보 없음'}
                </Text>
              </View>
            </View>
            <View style={styles.rating}>
              <ExploreIcon name="star" />
              <Text style={styles.ratingValue}>
                {cafe.rating == null ? '평점 미등록' : cafe.rating.toFixed(1)}
              </Text>
              <Text style={styles.meta}>
                {cafe.reviewCount == null
                  ? '리뷰 정보 없음'
                  : `리뷰 ${cafe.reviewCount}`}{' '}
                · {distanceLabel(cafe.distance)}
                {cafe.closesAt ? ` · ${cafe.closesAt}까지` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Button
              label="경유 길찾기"
              loading={opening}
              onPress={directions}
              style={styles.action}
            />
            <Button
              label="리뷰 쓰기"
              variant="outline"
              onPress={() => navigation.navigate('ReviewWrite', { cafeId })}
              style={[styles.action, styles.reviewButton]}
            />
          </View>
          <Pressable
            testID="cafe-menu-compare"
            accessibilityRole="button"
            accessibilityLabel="이 카페 메뉴 가격 비교"
            onPress={() =>
              navigation.navigate('Compare', { menu: menus[0]?.name })
            }
          >
            <Card style={styles.menuCard}>
              <View style={styles.cardTitle}>
                <Text style={styles.sectionTitle}>메뉴 가격</Text>
                {cafe.verified ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>점주 확인</Text>
                  </View>
                ) : null}
              </View>
              {menus.length ? (
                menus
                  .filter(menu => menu.available !== false)
                  .map((menu, index) => (
                    <React.Fragment key={menu.id}>
                      {index ? <View style={styles.divider} /> : null}
                      <View style={styles.menuRow}>
                        <View style={styles.menuName}>
                          <Text style={styles.menuTitle}>{menu.name}</Text>
                          <Text style={styles.menuMeta}>
                            {menu.size} ·{' '}
                            {menu.temperature === 'ICE'
                              ? '아이스'
                              : menu.temperature === 'HOT'
                              ? '따뜻하게'
                              : menu.temperature}
                          </Text>
                        </View>
                        <Text style={styles.menuPrice}>
                          {formatMoney(menu.price)}
                        </Text>
                      </View>
                    </React.Fragment>
                  ))
              ) : (
                <View style={styles.unregistered}>
                  <Text style={styles.meta}>등록된 메뉴 가격이 없습니다.</Text>
                  <Text style={styles.menuMeta}>
                    가격이 확인되면 메뉴별로 비교할 수 있어요.
                  </Text>
                </View>
              )}
              <View style={styles.source}>
                <ExploreIcon name="shield" />
                <Text style={styles.sourceText}>
                  {source
                    ? `출처: ${source.source ?? '미확인'}${
                        source.checkedAt
                          ? ` · 확인일 ${formatDate(source.checkedAt)}`
                          : ''
                      }`
                    : '출처와 확인일은 가격 등록 후 표시됩니다.'}
                </Text>
              </View>
            </Card>
          </Pressable>
          {menus.length ? (
            <Button
              label="가격 확인 요청"
              variant="quiet"
              onPress={openPriceRequest}
            />
          ) : null}
          {reportMessage ? (
            <Text accessibilityRole="alert" style={styles.meta}>
              {reportMessage}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="카페 소식 보기"
            onPress={() =>
              event?.dealId
                ? navigation.navigate('Order', { dealId: event.dealId })
                : deal
                ? navigation.navigate('Order', { dealId: deal.id })
                : navigation.navigate('Events')
            }
            style={styles.news}
          >
            <ExploreIcon name="megaphone" />
            <View style={styles.newsText}>
              <Text style={styles.newsTitle}>
                {event?.title ??
                  (deal ? `타임딜 · ${deal.menuName}` : '카페 소식')}
              </Text>
              <Text style={styles.newsSubtitle}>
                {event?.description ??
                  (deal
                    ? `${formatMoney(deal.price)} · ${formatDate(
                        deal.endsAt,
                      )}까지`
                    : '등록된 이벤트를 확인해 보세요')}
              </Text>
            </View>
            <ExploreIcon name="chevronRight" />
          </Pressable>
          {cafe.address ? (
            <Text selectable style={styles.address}>
              {cafe.address}
              {cafe.phone ? ` · ${cafe.phone}` : ''}
            </Text>
          ) : null}
        </>
      )}
      <Modal
        transparent
        visible={reportMenu !== null}
        animationType="slide"
        onRequestClose={() => {
          if (!reportBusy) setReportMenu(null);
        }}
      >
        <View style={styles.reportScrim}>
          <Card style={{ gap: 12 }}>
            <Text style={styles.sectionTitle}>가격 확인 요청</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {menus.map(menu => (
                <Chip
                  key={menu.id}
                  label={`${menu.name} · ${menu.size} · ${menu.temperature}`}
                  selected={menu.id === reportMenu?.id}
                  onPress={() => {
                    if (!reportBusy) setReportMenu(menu);
                  }}
                />
              ))}
            </View>
            <Text style={styles.meta}>
              등록 가격 {formatMoney(reportMenu?.price)}
            </Text>
            <Field
              label="확인한 가격"
              accessibilityLabel="확인한 메뉴 가격"
              value={reportPrice}
              onChangeText={setReportPrice}
              keyboardType="number-pad"
              maxLength={7}
              editable={!reportBusy}
            />
            <Field
              label="메모 (선택)"
              accessibilityLabel="가격 확인 메모"
              value={reportNote}
              onChangeText={setReportNote}
              maxLength={500}
              multiline
              editable={!reportBusy}
            />
            {reportError ? (
              <Text accessibilityRole="alert" style={styles.reportError}>
                {reportError}
              </Text>
            ) : null}
            <Button
              label="요청 보내기"
              onPress={submitPriceRequest}
              loading={reportBusy}
            />
            <Button
              label="닫기"
              variant="quiet"
              disabled={reportBusy}
              onPress={() => setReportMenu(null)}
            />
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  reportScrim: {
    flex: 1,
    backgroundColor: 'rgba(20,13,8,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  reportError: { fontFamily: tokens.font, color: tokens.red, fontSize: 13 },
  content: { paddingTop: 4, paddingBottom: 24, gap: 14 },
  photo: {
    height: 120,
    borderRadius: 16,
    backgroundColor: '#E9D8C4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { gap: 6 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  name: {
    fontFamily: tokens.font,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    color: tokens.text,
  },
  badge: {
    backgroundColor: '#E3EFE6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mutedBadge: { backgroundColor: '#F6F0E8' },
  badgeText: {
    fontFamily: tokens.font,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    color: tokens.green,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  ratingValue: {
    fontFamily: tokens.font,
    fontSize: 13,
    fontWeight: '700',
    color: tokens.text,
  },
  meta: {
    fontFamily: tokens.font,
    fontSize: 13,
    lineHeight: 19,
    color: tokens.muted,
  },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1 },
  reviewButton: { borderColor: tokens.green },
  menuCard: { borderRadius: 16, gap: 12 },
  cardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: tokens.font,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: tokens.text,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  menuName: { flex: 1 },
  menuTitle: {
    fontFamily: tokens.font,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: tokens.text,
  },
  menuMeta: {
    fontFamily: tokens.font,
    fontSize: 11,
    lineHeight: 16,
    color: tokens.muted,
  },
  menuPrice: {
    fontFamily: tokens.font,
    fontSize: 15,
    fontWeight: '700',
    color: tokens.text,
  },
  divider: { height: 1, backgroundColor: '#EAE3D9' },
  unregistered: { paddingVertical: 20, gap: 6 },
  source: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F6F0E8',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceText: {
    flex: 1,
    fontFamily: tokens.font,
    fontSize: 11,
    lineHeight: 16,
    color: tokens.muted,
  },
  news: {
    backgroundColor: '#E3EFE6',
    padding: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  newsText: { flex: 1, gap: 2 },
  newsTitle: {
    fontFamily: tokens.font,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    color: tokens.green,
  },
  newsSubtitle: {
    fontFamily: tokens.font,
    fontSize: 12,
    lineHeight: 17,
    color: '#3E7D5C',
  },
  address: {
    fontFamily: tokens.font,
    color: tokens.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});
