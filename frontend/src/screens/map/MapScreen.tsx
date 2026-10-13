import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNearbyStores } from '../../api/queries/useNearbyStores';
import KakaoMapView, { MapMarker } from '../../components/map/KakaoMapView';
import StoreCard from '../../components/map/StoreCard';
import { useAuthStore } from '../../store/authStore';
import type { Coordinate, MenuCategory } from '../../types/store';
import { formatPrice } from '../../utils/format';
import { colors } from '../../utils/theme';

// 현재 위치 연동 전까지 쓰는 시작 위치 (서울시청)
const DEFAULT_CENTER: Coordinate = { latitude: 37.5665, longitude: 126.978 };
const SEARCH_RADIUS = 1000;

const MENU_FILTERS: { value: MenuCategory; label: string }[] = [
  { value: 'AMERICANO', label: '아메리카노' },
  { value: 'LATTE', label: '라테' },
  { value: 'DECAF', label: '디카페인' },
];

// 지도를 조금 움직일 때마다 다시 조회하지 않도록 약 100m 단위로 맞춥니다.
const roundCoordinate = (value: number) => Math.round(value * 1000) / 1000;

export default function MapScreen() {
  const logout = useAuthStore(state => state.logout);
  const [menu, setMenu] = useState<MenuCategory>('AMERICANO');
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: stores, isError } = useNearbyStores({
    ...center,
    radius: SEARCH_RADIUS,
    menu,
  });

  const markers = useMemo<MapMarker[]>(
    () =>
      (stores ?? []).map(store => ({
        id: store.id,
        latitude: store.latitude,
        longitude: store.longitude,
        label: `₩${formatPrice(store.price)}`,
      })),
    [stores],
  );
  const selectedStore = stores?.find(store => store.id === selectedId);

  const handleCenterChange = useCallback((next: Coordinate) => {
    const latitude = roundCoordinate(next.latitude);
    const longitude = roundCoordinate(next.longitude);
    setCenter(prev =>
      prev.latitude === latitude && prev.longitude === longitude
        ? prev
        : { latitude, longitude },
    );
  }, []);
  const clearSelection = useCallback(() => setSelectedId(null), []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>커피 주유소</Text>
        <Pressable onPress={logout} hitSlop={8}>
          <Text style={styles.logout}>로그아웃</Text>
        </Pressable>
      </View>

      <View style={styles.filters}>
        {MENU_FILTERS.map(filter => {
          const active = filter.value === menu;
          return (
            <Pressable
              key={filter.value}
              onPress={() => setMenu(filter.value)}
              style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.map}>
        <KakaoMapView
          initialCenter={DEFAULT_CENTER}
          markers={markers}
          selectedId={selectedStore ? selectedStore.id : null}
          onMarkerPress={setSelectedId}
          onMapPress={clearSelection}
          onCenterChange={handleCenterChange}
        />
        {isError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>
              주변 매장을 불러오지 못했습니다.
            </Text>
          </View>
        )}
        {selectedStore && <StoreCard store={selectedStore} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.brown,
  },
  logout: {
    fontSize: 14,
    color: colors.textMuted,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipLabel: {
    fontSize: 14,
    color: colors.text,
  },
  chipLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  map: {
    flex: 1,
  },
  errorBanner: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    elevation: 4,
  },
  errorText: {
    fontSize: 13,
    color: colors.text,
  },
});
