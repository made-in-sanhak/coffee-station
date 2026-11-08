import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell,
  ChevronUp,
  LocateFixed,
  Mic,
  Search,
  X,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { useNearbyStores } from '../../api/queries/useNearbyStores';
import KakaoMapView, { MapMarker } from '../../components/map/KakaoMapView';
import StoreCard from '../../components/map/StoreCard';
import type { Coordinate, MenuCategory } from '../../types/store';
import { formatDistance, formatPrice } from '../../utils/format';
import { colors } from '../../utils/theme';
import BottomTabBar from '../../navigation/BottomTabBar';

const DEFAULT_CENTER: Coordinate = {
  latitude: 37.5665,
  longitude: 126.978,
};

const SEARCH_RADIUS = 1000;
const SHEET_HEIGHT = 330;
const COLLAPSED_Y = SHEET_HEIGHT - 85;

const MENU_FILTERS: { value: MenuCategory; label: string }[] = [
  { value: 'AMERICANO', label: '아메리카노' },
  { value: 'LATTE', label: '카페라테' },
  { value: 'DECAF', label: '디카페인' },
];

const roundCoordinate = (value: number) =>
  Math.round(value * 1000) / 1000;

export default function MapScreen() {
  const navigation = useNavigation<any>();

  const [menu, setMenu] = useState<MenuCategory>('AMERICANO');
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');

  const translateY = useRef(new Animated.Value(COLLAPSED_Y)).current;
  const currentY = useRef(COLLAPSED_Y);
  const startY = useRef(COLLAPSED_Y);

  const { data: stores, isError } = useNearbyStores({
    ...center,
    radius: SEARCH_RADIUS,
    menu,
  });

  // 검색어에 따라 가상 카페 목록 필터링
  const filteredStores = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return [...(stores ?? [])]
      .filter(store => {
        if (!query) return true;

        return (
          store.name.toLowerCase().includes(query) ||
          store.address.toLowerCase().includes(query) ||
          store.menuName.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => a.price - b.price);
  }, [stores, searchText]);

  // 지도 마커도 검색 결과만 표시
  const markers = useMemo<MapMarker[]>(
    () =>
      filteredStores.map(store => ({
        id: store.id,
        latitude: store.latitude,
        longitude: store.longitude,
        label: `₩${formatPrice(store.price)}`,
      })),
    [filteredStores],
  );

  const selectedStore = filteredStores.find(
    store => store.id === selectedId,
  );

  const handleCenterChange = useCallback((next: Coordinate) => {
    const latitude = roundCoordinate(next.latitude);
    const longitude = roundCoordinate(next.longitude);

    setCenter(prev =>
      prev.latitude === latitude && prev.longitude === longitude
        ? prev
        : { latitude, longitude },
    );
  }, []);

  // 패널 펼치기 / 접기
  const animateSheet = useCallback(
    (toValue: number) => {
      currentY.current = toValue;

      Animated.spring(translateY, {
        toValue,
        useNativeDriver: true,
        tension: 65,
        friction: 12,
      }).start();
    },
    [translateY],
  );

  const toggleSheet = () => {
    animateSheet(currentY.current === 0 ? COLLAPSED_Y : 0);
  };

  // 드래그 동작
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dy) > 5,

        onPanResponderGrant: () => {
          startY.current = currentY.current;
        },

        onPanResponderMove: (_, gesture) => {
          const nextY = Math.max(
            0,
            Math.min(COLLAPSED_Y, startY.current + gesture.dy),
          );

          translateY.setValue(nextY);
        },

        onPanResponderRelease: (_, gesture) => {
          const nextY = startY.current + gesture.dy;
          const targetY =
            nextY < COLLAPSED_Y / 2 ? 0 : COLLAPSED_Y;

          animateSheet(targetY);
        },
      }),
    [translateY, animateSheet],
  );

  const handleLocationPress = () => {
    // 추후 GPS 기능 연결 예정
  };

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    setSelectedId(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 검색창 */}
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <Search size={20} color={colors.textMuted} />

          <TextInput
            value={searchText}
            onChangeText={handleSearchChange}
            placeholder="카페 이름을 검색해 보세요"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
          />

          {searchText.length > 0 ? (
            <Pressable
              onPress={() => handleSearchChange('')}
              hitSlop={8}
            >
              <X size={19} color={colors.textMuted} />
            </Pressable>
          ) : (
            <Pressable
              style={styles.micButton}
              onPress={() => {}}
              hitSlop={8}
            >
              <Mic size={21} color={colors.brown} />
            </Pressable>
          )}
        </View>

        <Pressable
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notification')}
          hitSlop={8}
        >
          <Bell size={23} color={colors.text} />
        </Pressable>
      </View>

      {/* 메뉴 필터 */}
      <View style={styles.filters}>
        {MENU_FILTERS.map(filter => {
          const active = filter.value === menu;

          return (
            <Pressable
              key={filter.value}
              onPress={() => {
                setMenu(filter.value);
                setSelectedId(null);
              }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipLabel,
                  active && styles.chipLabelActive,
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 지도 */}
      <View style={styles.mapArea}>
        <KakaoMapView
          initialCenter={DEFAULT_CENTER}
          markers={markers}
          selectedId={selectedStore ? selectedStore.id : null}
          onMarkerPress={setSelectedId}
          onMapPress={() => setSelectedId(null)}
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

        {/* 현재 위치 버튼 */}
        <Pressable
          style={styles.locationButton}
          onPress={handleLocationPress}
          hitSlop={8}
        >
          <LocateFixed size={23} color={colors.primary} />
        </Pressable>

        {/* 주변 카페 패널 */}
        <Animated.View
          style={[
            styles.bottomSheet,
            { transform: [{ translateY }] },
          ]}
        >
          {/* 패널 손잡이 및 제목 */}
          <View
            style={styles.sheetHandleArea}
            {...panResponder.panHandlers}
          >
            <Pressable onPress={toggleSheet}>
              <View style={styles.handleBar} />

              <View style={styles.sheetTitleRow}>
                <View>
                  <Text style={styles.sheetTitle}>
                    {searchText.trim()
                      ? '검색 결과'
                      : '주변 카페'}
                  </Text>

                  <Text style={styles.sheetSubtitle}>
                    {searchText.trim()
                      ? `${filteredStores.length}개의 카페를 찾았습니다`
                      : '가격이 저렴한 순으로 보여드려요'}
                  </Text>
                </View>

                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: translateY.interpolate({
                          inputRange: [0, COLLAPSED_Y],
                          outputRange: ['180deg', '0deg'],
                        }),
                      },
                    ],
                  }}
                >
                  <ChevronUp size={21} color={colors.textMuted} />
                </Animated.View>
              </View>
            </Pressable>
          </View>

          {/* 카페 목록 */}
          <ScrollView
            style={styles.storeList}
            contentContainerStyle={styles.storeListContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {filteredStores.length === 0 ? (
              <Text style={styles.emptyText}>
                {searchText.trim()
                  ? '검색 결과가 없습니다.'
                  : '주변에 표시할 카페가 없습니다.'}
              </Text>
            ) : (
              filteredStores.map((store, index) => (
                <Pressable
                  key={store.id}
                  style={[
                    styles.storeItem,
                    selectedId === store.id &&
                      styles.selectedStoreItem,
                  ]}
                  onPress={() => setSelectedId(store.id)}
                >
                  <View style={styles.storeRank}>
                    <Text style={styles.storeRankText}>
                      {index + 1}
                    </Text>
                  </View>

                  <View style={styles.storeInfo}>
                    <Text style={styles.storeName} numberOfLines={1}>
                      {store.name}
                    </Text>

                    <Text style={styles.storeMeta} numberOfLines={1}>
                      ★ {store.rating.toFixed(1)} ({store.reviewCount})
                      {' · '}
                      {formatDistance(store.distance)}
                    </Text>

                    <Text
                      style={styles.storeAddress}
                      numberOfLines={1}
                    >
                      {store.address}
                    </Text>
                  </View>

                  <View style={styles.priceArea}>
                    <Text style={styles.storePrice}>
                      {formatPrice(store.price)}원
                    </Text>

                    <Text style={styles.priceSource}>
                      {store.priceSource}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        </Animated.View>
      </View>

      <BottomTabBar activeTab="지도" />
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 12,
  },
  searchBox: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 13,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 13,
    color: colors.text,
  },
  micButton: {
    padding: 5,
    marginLeft: 5,
  },
  notificationButton: {
    width: 42,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 메뉴 필터: 버튼이 남은 가로 공간을 차지하지 않도록 고정
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  chip: {
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipLabelActive: {
    color: '#FFFFFF',
  },
  mapArea: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  errorBanner: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  errorText: {
    color: colors.text,
    fontSize: 12,
    textAlign: 'center',
  },
  locationButton: {
    position: 'absolute',
    right: 16,
    bottom: 145,
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    backgroundColor: colors.background,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -3 },
  },
  sheetHandleArea: {
    paddingHorizontal: 18,
    paddingTop: 9,
    paddingBottom: 12,
  },
  handleBar: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginBottom: 13,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  sheetSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: colors.textMuted,
  },
  storeList: {
    flex: 1,
  },
  storeListContent: {
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  storeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  selectedStoreItem: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
  },
  storeRank: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeRankText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  storeMeta: {
    marginTop: 4,
    fontSize: 11,
    color: colors.textMuted,
  },
  storeAddress: {
    marginTop: 3,
    fontSize: 10,
    color: colors.textMuted,
  },
  priceArea: {
    alignItems: 'flex-end',
  },
  storePrice: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  priceSource: {
    marginTop: 4,
    fontSize: 10,
    color: colors.textMuted,
  },
  emptyText: {
    padding: 24,
    textAlign: 'center',
    fontSize: 13,
    color: colors.textMuted,
  },
});
