import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useResource } from '../../app/api';
import type { Comparison, ComparisonItem } from '../../app/domain';
import {
  Card,
  Chip,
  Empty,
  Notice,
  Screen,
  formatMoney,
  tokens,
} from '../../app/ui';
import ExploreIcon from '../../components/map/ExploreIcon';
import type { RootStackScreenProps } from '../../navigation/types';
import { usePersonalStore } from '../../store/personalStore';
import {
  cafePrice,
  distanceLabel,
  MENU_CHOICES,
  priceSummary,
  type CafeSort,
} from '../map/exploreLogic';
import { useExploreSession } from '../map/exploreSession';

const SORTS: { value: CafeSort; label: string }[] = [
  { value: 'price', label: '가격순' },
  { value: 'distance', label: '거리순' },
  { value: 'rating', label: '평점순' },
];

export default function CompareScreen({
  navigation,
  route,
}: RootStackScreenProps<'Compare'>) {
  const preferences = usePersonalStore(state => state.preferences);
  const center = useExploreSession(state => state.center);
  const cafes = useExploreSession(state => state.cafes);
  const [menu, setMenu] = useState(
    route.params?.menu ?? preferences.menus[0] ?? '아이스 아메리카노',
  );
  const [size, setSize] = useState(
    preferences.sizes[0] === 'Large' ? 'Large' : 'Regular',
  );
  const [sort, setSort] = useState<CafeSort>('price');
  const [choosingMenu, setChoosingMenu] = useState(false);
  const temperature = preferences.temperatures[0] ?? 'ICE';
  const result = useResource<Comparison>('/api/menus/compare', {
    menu,
    size,
    temperature,
    ...center,
    radius: 1000,
    sort,
  });
  const items = useMemo<ComparisonItem[]>(() => {
    const actual =
      result.data?.items ??
      cafes.flatMap(cafe => {
        const price = cafePrice(cafe, menu, size, temperature);
        return price === null
          ? []
          : [
              {
                cafeId: cafe.id,
                cafeName: cafe.name,
                rating: cafe.rating,
                distance: cafe.distance,
                price,
                size,
                temperature,
              },
            ];
      });
    return [...actual]
      .filter(item => Number.isFinite(item.price) && item.price >= 0)
      .sort((left, right) =>
        sort === 'price'
          ? left.price - right.price
          : sort === 'rating'
          ? (right.rating ?? -1) - (left.rating ?? -1) ||
            (left.distance ?? Infinity) - (right.distance ?? Infinity) ||
            left.price - right.price
          : (left.distance ?? Infinity) - (right.distance ?? Infinity),
      );
  }, [result.data, cafes, menu, size, temperature, sort]);
  const summary = priceSummary(items.map(item => item.price));
  const unknown = cafes.filter(
    cafe => !items.some(item => item.cafeId === cafe.id),
  );
  const today = new Date().toLocaleDateString('en-CA');
  const todayCount = items.filter(
    item =>
      item.checkedAt &&
      new Date(item.checkedAt).toLocaleDateString('en-CA') === today,
  ).length;
  const openCafe = (id: string) =>
    navigation.navigate('CafeDetail', {
      cafeId: id,
      cafe: cafes.find(cafe => cafe.id === id),
    });
  return (
    <Screen
      navigation={navigation}
      title="가격 비교"
      tab="map"
      contentStyle={styles.content}
    >
      <Pressable
        testID="compare-menu"
        accessibilityRole="button"
        accessibilityLabel="비교할 메뉴 선택"
        onPress={() => setChoosingMenu(true)}
        style={styles.menuSelector}
      >
        <ExploreIcon name="coffeeCompare" />
        <Text style={styles.menuName}>{menu}</Text>
        <ExploreIcon name="compareChevronDown" />
      </Pressable>
      <View style={styles.sizeRow}>
        {['Regular', 'Large'].map(label => (
          <Chip
            key={label}
            label={label}
            selected={size === label}
            onPress={() => setSize(label)}
          />
        ))}
        <View style={styles.radius}>
          <ExploreIcon name="comparePin" />
          <Text style={styles.radiusText}>
            반경 1km · {items.length + unknown.length}곳
          </Text>
        </View>
      </View>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>주변 평균 가격</Text>
        <Text testID="comparison-average" style={styles.average}>
          {formatMoney(summary.average)}
        </Text>
        <Text style={styles.summaryMeta}>
          {summary.count
            ? `최저 ${formatMoney(summary.min)} · 최고 ${formatMoney(
                summary.max,
              )} · 오늘 확인 ${todayCount}곳`
            : '등록된 메뉴 가격을 기다리고 있어요'}
        </Text>
      </View>
      <View style={styles.sorts}>
        {SORTS.map(item => (
          <Chip
            key={item.value}
            label={item.label}
            selected={sort === item.value}
            onPress={() => setSort(item.value)}
          />
        ))}
      </View>
      <Card style={styles.chart}>
        {items.map((item, index) => (
          <Pressable
            key={item.cafeId}
            accessibilityRole="button"
            accessibilityLabel={`${item.cafeName} ${formatMoney(
              item.price,
            )} 상세`}
            onPress={() => openCafe(item.cafeId)}
            style={styles.chartRow}
          >
            <View style={styles.cafeName}>
              <Text numberOfLines={1} style={styles.rowName}>
                {item.cafeName}
              </Text>
              <Text style={styles.distance}>
                {distanceLabel(item.distance)}
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.bar,
                  {
                    width: `${
                      summary.max ? (item.price / summary.max) * 100 : 0
                    }%`,
                  },
                  item.price === summary.min
                    ? styles.minimumBar
                    : item.price <= (summary.average ?? 0)
                    ? styles.averageBar
                    : styles.expensiveBar,
                ]}
              />
            </View>
            <Text
              style={[
                styles.price,
                index === 0 && sort === 'price' && styles.lowest,
              ]}
            >
              {formatMoney(item.price)}
            </Text>
          </Pressable>
        ))}
        {unknown.map(cafe => (
          <Pressable
            key={cafe.id}
            accessibilityRole="button"
            accessibilityLabel={`${cafe.name} 가격 미등록 상세`}
            onPress={() => openCafe(cafe.id)}
            style={styles.chartRow}
          >
            <View style={styles.cafeName}>
              <Text numberOfLines={1} style={styles.rowName}>
                {cafe.name}
              </Text>
              <Text style={styles.distance}>
                {distanceLabel(cafe.distance)}
              </Text>
            </View>
            <View style={styles.track} />
            <Text style={styles.unregistered}>가격 미등록</Text>
          </Pressable>
        ))}
        {!items.length && !unknown.length ? (
          <Empty
            message={
              result.loading
                ? '메뉴 가격을 불러오는 중입니다.'
                : '아직 비교할 메뉴 가격이 없습니다.'
            }
            onRetry={result.reload}
          />
        ) : null}
      </Card>
      <View style={styles.source}>
        <ExploreIcon name="shield" />
        <Text style={styles.sourceText}>
          가격은 지점마다 다를 수 있어요. 출처·확인일은 카페 상세에서 볼 수
          있어요.
        </Text>
      </View>
      {result.error && !items.length ? <Notice>{result.error}</Notice> : null}
      <Modal
        visible={choosingMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setChoosingMenu(false)}
      >
        <Pressable
          style={styles.scrim}
          accessibilityLabel="메뉴 선택 닫기"
          onPress={() => setChoosingMenu(false)}
        />
        <View style={styles.menuSheet} accessibilityViewIsModal>
          <Text style={styles.sheetTitle}>비교할 메뉴</Text>
          <ScrollView>
            {MENU_CHOICES.map(label => (
              <Pressable
                key={label}
                accessibilityRole="button"
                accessibilityState={{ selected: menu === label }}
                onPress={() => {
                  setMenu(label);
                  setChoosingMenu(false);
                }}
                style={styles.menuOption}
              >
                <Text
                  style={[styles.optionLabel, menu === label && styles.lowest]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, paddingBottom: 24, gap: 12 },
  menuSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#EAE3D9',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  menuName: {
    flex: 1,
    fontFamily: tokens.font,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    color: tokens.text,
  },
  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radius: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 8,
  },
  radiusText: { fontFamily: tokens.font, color: tokens.muted, fontSize: 12 },
  summary: {
    padding: 18,
    backgroundColor: '#1F5A3E',
    borderRadius: 16,
    gap: 6,
  },
  summaryLabel: {
    fontFamily: tokens.font,
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 19,
    color: '#E3EFE6',
  },
  average: {
    fontFamily: tokens.font,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 42,
    color: '#FFFFFF',
  },
  summaryMeta: {
    fontFamily: tokens.font,
    fontSize: 12,
    lineHeight: 17,
    color: '#E3EFE6',
  },
  sorts: { flexDirection: 'row', gap: 8 },
  chart: { padding: 16, borderRadius: 16, gap: 8 },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 33,
  },
  cafeName: { width: 84 },
  rowName: {
    fontFamily: tokens.font,
    color: tokens.text,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  distance: {
    fontFamily: tokens.font,
    color: tokens.muted,
    fontSize: 11,
    lineHeight: 15,
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F6F0E8',
    overflow: 'hidden',
  },
  bar: { height: 10, borderRadius: 5 },
  minimumBar: { backgroundColor: '#1F5A3E' },
  averageBar: { backgroundColor: '#3E7D5C' },
  expensiveBar: { backgroundColor: '#E9D8C4' },
  price: {
    width: 62,
    fontFamily: tokens.font,
    color: tokens.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  lowest: { color: tokens.green },
  unregistered: {
    width: 62,
    fontFamily: tokens.font,
    fontSize: 11,
    color: tokens.muted,
    textAlign: 'right',
  },
  source: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sourceText: {
    flex: 1,
    fontFamily: tokens.font,
    fontSize: 11,
    lineHeight: 16,
    color: tokens.muted,
  },
  scrim: { flex: 1, backgroundColor: 'rgba(43,29,20,0.35)' },
  menuSheet: {
    backgroundColor: tokens.bg,
    padding: 20,
    paddingBottom: 32,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  sheetTitle: {
    fontFamily: tokens.font,
    fontSize: 18,
    color: tokens.text,
    fontWeight: '700',
    marginBottom: 14,
  },
  menuOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
  },
  optionLabel: { fontFamily: tokens.font, fontSize: 15, color: tokens.text },
});
