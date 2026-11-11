import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useResource } from '../../app/api';
import type { Cafe } from '../../app/domain';
import { native } from '../../app/native';
import { Chip, Screen, formatMoney, tokens } from '../../app/ui';
import SettingsButton from '../../components/common/SettingsButton';
import TimeDealPromotion from '../events/TimeDealPromotion';
import ExploreIcon from '../../components/map/ExploreIcon';
import KakaoMapView, {
  type KakaoPlace,
} from '../../components/map/KakaoMapView';
import type { RootStackScreenProps } from '../../navigation/types';
import { usePersonalStore } from '../../store/personalStore';
import { useKakaoSettingsStore } from '../../store/kakaoSettingsStore';
import {
  cafePrice,
  cheapestMenu,
  distanceLabel,
  filterCafes,
  MENU_CHOICES,
  type CafeSort,
} from './exploreLogic';
import { useExploreSession } from './exploreSession';

const SORTS: { value: CafeSort; label: string }[] = [
  { value: 'price', label: '가격순' },
  { value: 'distance', label: '거리순' },
];

export default function MapScreen({ navigation }: RootStackScreenProps<'Map'>) {
  const preferences = usePersonalStore(state => state.preferences);
  const center = useExploreSession(state => state.center);
  const command = useExploreSession(state => state.command);
  const placeName = useExploreSession(state => state.placeName);
  const hasMapKey = useKakaoSettingsStore(
    state => !!state.settings.kakaoMapJsKey,
  );
  const [menu, setMenu] = useState(preferences.menus[0] ?? '아이스 아메리카노');
  const [size, setSize] = useState<string | null>(null);
  const [temperature, setTemperature] = useState(preferences.temperatures[0] ?? 'ICE');
  const sizeOptions = useResource<string[]>('/api/cafes/options');
  const [driveThrough, setDriveThrough] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [priceLimit, setPriceLimit] = useState(false);
  const [sort, setSort] = useState<CafeSort>('price');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [listening, setListening] = useState(false);
  const [chooser, setChooser] = useState<'menu' | 'sort' | null>(null);
  const response = useResource<Cafe[]>('/api/cafes', {
    ...center,
    radius: 1000,
    menu,
    size: size ?? undefined,
    temperature,
    sort,
  });
  const cafes = useMemo(
    () => response.data ?? [],
    [response.data],
  );
  useEffect(() => {
    useExploreSession.getState().setCafes(cafes);
  }, [cafes]);
  useEffect(() => {
    setMenu(preferences.menus[0] ?? '아이스 아메리카노');
  }, [preferences.menus]);
  const visible = useMemo(
    () =>
      filterCafes(cafes.filter(cafe => cheapestMenu(cafe, menu, size, temperature) !== null), {
        menu,
        size,
        temperature,
        driveThrough,
        openOnly,
        maxPrice: priceLimit ? 3000 : null,
        sort,
      }),
    [cafes, menu, size, temperature, driveThrough, openOnly, priceLimit, sort],
  );
  const selected = visible.find(cafe => cafe.id === selectedId) ?? visible[0];
  const rows = selected
    ? [selected, ...visible.filter(cafe => cafe.id !== selected.id)]
    : visible;
  const markers = useMemo(
    () =>
      visible.map(cafe => ({
        id: cafe.id,
        latitude: cafe.latitude,
        longitude: cafe.longitude,
        title: cafe.brand ?? cafe.name.split(' ')[0],
        label: formatMoney(cafePrice(cafe, menu, size, temperature)),
      })),
    [visible, menu, size, temperature],
  );
  const onCenterChange = useCallback(
    (next: { latitude: number; longitude: number }) => {
      const current = useExploreSession.getState().center;
      if (
        Math.round(current.latitude * 1000) !==
          Math.round(next.latitude * 1000) ||
        Math.round(current.longitude * 1000) !==
          Math.round(next.longitude * 1000)
      )
        useExploreSession.getState().updateCenter(next);
    },
    [],
  );
  const onSearchResult = useCallback((place: KakaoPlace) => {
    useExploreSession.getState().updateCenter(place);
    useExploreSession.getState().setPlaceName(place.name);
    setSelectedId(null);
    setMessage(null);
  }, []);
  const locate = async () => {
    if (locating) return;
    setLocating(true);
    setMessage(null);
    try {
      const location = await native.requestLocation();
      useExploreSession.getState().recenter(location, true);
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : '현재 위치를 확인하지 못했습니다.',
      );
    } finally {
      setLocating(false);
    }
  };
  const openCafe = (cafe: Cafe) =>
    navigation.navigate('CafeDetail', { cafeId: cafe.id, cafe });
  const voiceSearch = async () => {
    if (listening) return;
    setListening(true);
    setMessage(null);
    try {
      const query = await native.recognizeSpeech();
      if (!query.trim())
        throw new Error(
          '음성에서 검색어를 확인하지 못했습니다. 다시 말하거나 글자로 검색해 주세요.',
        );
      useExploreSession.getState().search(query);
    } catch (reason) {
      if ((reason as { code?: string })?.code !== 'E_CANCELLED')
        setMessage(
          reason instanceof Error
            ? reason.message
            : '음성 검색을 시작하지 못했습니다. 글자로 검색해 주세요.',
        );
    } finally {
      setListening(false);
    }
  };
  const displayMenu =
    menu === '아메리카노' && temperature === 'ICE' ? '아이스 아메리카노' : menu;
  const sortLabel = SORTS.find(item => item.value === sort)?.label ?? '가격순';

  return (
    <Screen
      navigation={navigation}
      tab="map"
      header={false}
      footer={<TimeDealPromotion navigation={navigation} />}
      scroll={false}
      contentStyle={styles.canvas}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="커피 취향 설정"
          onPress={() => navigation.navigate('Preferences')}
          style={styles.logo}
        >
          <ExploreIcon name="coffeeLogo" />
          <Text style={styles.logoText}>커피 주유소</Text>
        </Pressable>
        <View style={styles.headerActions}>
          <SettingsButton onPress={() => navigation.navigate('Settings')} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="지역 검색"
            hitSlop={10}
            onPress={() => navigation.navigate('PlaceSearch')}
          >
            <ExploreIcon name="searchHeader" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="카페 소식과 이벤트"
            hitSlop={10}
            onPress={() => navigation.navigate('Events')}
          >
            <ExploreIcon name="bell" />
          </Pressable>
        </View>
      </View>
      <View style={styles.map} testID="original-map-screen">
        <KakaoMapView
          initialCenter={center}
          markers={markers}
          selectedId={selected?.id ?? null}
          onMarkerPress={id => setSelectedId(String(id))}
          onMapPress={() => setSelectedId(null)}
          onCenterChange={onCenterChange}
          command={command}
          browseNearby
          onSearchResult={onSearchResult}
          onSearchError={setMessage}
          onPlacesError={setMessage}
        />
        <View pointerEvents="box-none" style={styles.topControls}>
          <Pressable
            testID="map-search"
            accessibilityRole="button"
            accessibilityLabel="카페 메뉴 지역 검색"
            onPress={() => navigation.navigate('PlaceSearch')}
            style={styles.searchBar}
          >
            <ExploreIcon name="search" />
            <Text
              numberOfLines={1}
              style={[styles.searchText, !!placeName && styles.searchValue]}
            >
              {placeName || '카페·메뉴·지역 검색 (예: 행신역)'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                listening ? '음성 검색 중' : '음성으로 장소 검색'
              }
              disabled={listening}
              hitSlop={10}
              onPress={voiceSearch}
            >
              <ExploreIcon name="mic" />
            </Pressable>
          </Pressable>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            <Chip
              testID="menu-filter-AMERICANO"
              label={displayMenu}
              selected
              onPress={() => setChooser('menu')}
            />
            <Chip
              label="드라이브스루"
              selected={driveThrough}
              onPress={() => setDriveThrough(value => !value)}
            />
            <Chip
              label="영업 중"
              selected={openOnly}
              onPress={() => setOpenOnly(value => !value)}
            />
            <Chip
              label="3천원 이하"
              selected={priceLimit}
              onPress={() => setPriceLimit(value => !value)}
            />
          </ScrollView>
        </View>
        <Pressable
          testID="map-location"
          accessibilityRole="button"
          accessibilityLabel="현재 위치 권한 안내"
          onPress={() => navigation.navigate('LocationPermission')}
          style={styles.locate}
        >
          <ExploreIcon name="locate" />
        </Pressable>
        {placeName ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="내 위치로 지도 이동"
            disabled={locating}
            onPress={() => {
              return locate();
            }}
            style={styles.returnLocation}
          >
            <ExploreIcon name="returnLocation" />
            <Text style={styles.returnText}>
              {locating ? '확인 중' : '내 위치로'}
            </Text>
          </Pressable>
        ) : null}
        {message ? (
          <Pressable
            accessibilityRole="alert"
            onPress={() => setMessage(null)}
            style={styles.message}
          >
            <Text style={styles.messageText}>{message}</Text>
          </Pressable>
        ) : null}
        <View style={styles.bottomSheet}>
          <View style={styles.handle} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="매장 가격 새로고침"
            onPress={response.reload}
            style={{ paddingHorizontal: 20, paddingVertical: 8 }}
          >
            <Text style={styles.emptyText}>
              {response.error
                ? `가격 정보를 불러오지 못했습니다: ${response.error} (눌러서 재시도)`
                : response.loading
                ? '매장 가격을 불러오고 있습니다.'
                : response.data?.length
                ? `주변 ${response.data.length}개 매장의 가격 정보를 조회했습니다. 선택한 메뉴·사이즈·온도에 등록된 가격을 표시합니다. (새로고침)`
                : '이 지역에 등록된 매장 가격이 없습니다. 행신역 시연 데이터는 행신역 주변에서 확인하세요. (새로고침)'}
            </Text>
          </Pressable>
          <View style={styles.sheetHeading}>
            <Pressable
              testID="map-compare"
              accessibilityRole="button"
              accessibilityLabel="주변 메뉴 가격 비교"
              onPress={() => navigation.navigate('Compare', { menu })}
              style={styles.headingMain}
            >
              <Text numberOfLines={1} style={styles.sheetTitle}>
                {placeName
                  ? `${placeName} 주변 카페 ${visible.length}곳`
                  : `주변 카페 ${visible.length}곳`}
              </Text>
              <Text numberOfLines={1} style={styles.sheetSubtitle}>
                · 내 메뉴({displayMenu}) 기준
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="카페 정렬 방식 선택"
              onPress={() => setChooser('sort')}
              style={styles.sort}
            >
              <Text style={styles.sortText}>{sortLabel}</Text>
              <ExploreIcon name="chevronDown" />
            </Pressable>
          </View>
          <ScrollView
            style={styles.cafeList}
            contentContainerStyle={styles.listContent}
            nestedScrollEnabled
          >
            <ScrollView horizontal>
              <Chip label="전체 사이즈" selected={size === null} onPress={() => setSize(null)} />
              {['ICE','HOT'].map(value => <Chip key={value} label={value} selected={temperature===value} onPress={()=>setTemperature(value)} />)}
              {[...new Set([...(sizeOptions.data ?? []),...cafes.flatMap(c => (c.menus ?? []).map(m => m.size))])].map(value =>
                <Chip key={value} label={value} selected={size === value} onPress={() => setSize(value)} />)}
            </ScrollView>
            {rows.map(cafe => {
              const option = cheapestMenu(cafe,menu,size,temperature);
              return (
              <Pressable
                key={cafe.id}
                testID={`cafe-${cafe.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${cafe.name} 상세 보기`}
                onPress={() => openCafe(cafe)}
                style={styles.cafeRow}
              >
                <View style={styles.cafePhoto}>
                  <ExploreIcon name="coffeeRow" />
                </View>
                <View style={styles.cafeInfo}>
                  <Text numberOfLines={1} style={styles.cafeName}>
                    {cafe.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.cafeMeta}>
                    {distanceLabel(cafe.distance)}
                    {cafe.tags?.includes('영업 중') ? ' · 영업 중' : ''}
                    {cafe.rating == null ? '' : ` · ★${cafe.rating.toFixed(1)}`}
                    {cafe.tags?.includes('드라이브스루')
                      ? ' · 드라이브스루'
                      : ''}
                  </Text>
                </View>
                <View style={styles.cafePrice}>
                  <Text
                    style={
                      cafePrice(cafe, menu, size, temperature) == null
                        ? styles.unknownPrice
                        : styles.price
                    }
                  >
                    {formatMoney(cafePrice(cafe, menu, size, temperature))}
                  </Text>
                  {option && <Text style={styles.cafeMeta}>{option.name} · {option.temperature} · {option.size}</Text>}
                  {option?.isDemo && <Text style={styles.cafeMeta}>시연 가격 · 확인일 미확인</Text>}
                  {option?.priceScope === 'BRAND' && <Text style={styles.cafeMeta}>브랜드 기준 가격</Text>}
                  {cafe.tags?.includes('드라이브스루') ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>DT</Text>
                    </View>
                  ) : cafe.verified ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>점주 확인</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );})}
            {!rows.length ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  {response.loading
                    ? '주변 카페를 찾고 있습니다.'
                    : !hasMapKey
                    ? '설정에서 지도 JavaScript 키를 입력해 주세요.'
                    : driveThrough || openOnly || priceLimit
                    ? '선택한 조건이 확인된 카페가 없습니다.'
                    : '선택한 메뉴·온도·사이즈에 등록된 매장 가격이 없습니다.'}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('Compare', { menu })}
                >
                  <Text style={styles.emptyAction}>메뉴 가격 비교하기</Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
      <Modal
        visible={chooser !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setChooser(null)}
      >
        <Pressable
          style={styles.scrim}
          accessibilityLabel="선택 창 닫기"
          onPress={() => setChooser(null)}
        />
        <View style={styles.choiceSheet} accessibilityViewIsModal>
          <Text style={styles.choiceTitle}>
            {chooser === 'menu' ? '지도에 표시할 메뉴' : '카페 정렬'}
          </Text>
          <ScrollView>
            {chooser === 'menu'
              ? ['아이스 아메리카노', '카페라떼'].map(label => (
                  <Pressable
                    key={label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: menu === label }}
                    onPress={() => {
                      setMenu(label);
                      setChooser(null);
                    }}
                    style={styles.choiceRow}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        menu === label && styles.selectedChoice,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))
              : SORTS.map(item => (
                  <Pressable
                    key={item.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: sort === item.value }}
                    onPress={() => {
                      setSort(item.value);
                      setChooser(null);
                    }}
                    style={styles.choiceRow}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        sort === item.value && styles.selectedChoice,
                      ]}
                    >
                      {item.label}
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
  canvas: { padding: 0, gap: 0 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#FBF8F3',
  },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: {
    fontFamily: tokens.font,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '700',
    color: tokens.text,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  map: { flex: 1, overflow: 'hidden', backgroundColor: '#E9EEE4' },
  topControls: { position: 'absolute', top: 12, left: 0, right: 0, gap: 12 },
  searchBar: {
    height: 48,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#2B1C14',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  searchText: {
    flex: 1,
    fontFamily: tokens.font,
    fontSize: 14,
    lineHeight: 20,
    color: tokens.muted,
  },
  searchValue: { color: tokens.text },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  locate: {
    position: 'absolute',
    right: 20,
    bottom: 268,
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#2B1C14',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  returnLocation: {
    position: 'absolute',
    left: 20,
    bottom: 274,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAE3D9',
    elevation: 3,
  },
  returnText: {
    fontFamily: tokens.font,
    color: tokens.green,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  message: {
    position: 'absolute',
    top: 112,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    elevation: 5,
  },
  messageText: {
    fontFamily: tokens.font,
    color: tokens.red,
    fontSize: 12,
    lineHeight: 18,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 202,
    maxHeight: '45%',
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 5,
    shadowColor: '#2B1C14',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EAE3D9',
  },
  sheetHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  headingMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  sheetTitle: {
    flexShrink: 0,
    maxWidth: '68%',
    fontFamily: tokens.font,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    color: tokens.text,
  },
  sheetSubtitle: {
    flex: 1,
    fontFamily: tokens.font,
    fontSize: 12,
    lineHeight: 17,
    color: tokens.muted,
  },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sortText: {
    fontFamily: tokens.font,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    color: tokens.muted,
  },
  cafeList: { height: 118, maxHeight: 118, flexGrow: 0 },
  listContent: { gap: 14 },
  cafeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
  },
  cafePhoto: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#E9D8C4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cafeInfo: { flex: 1, gap: 2 },
  cafeName: {
    fontFamily: tokens.font,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: tokens.text,
  },
  cafeMeta: {
    fontFamily: tokens.font,
    fontSize: 12,
    lineHeight: 17,
    color: tokens.muted,
  },
  cafePrice: { alignItems: 'flex-end', gap: 4 },
  price: {
    fontFamily: tokens.font,
    color: tokens.green,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
  },
  unknownPrice: {
    fontFamily: tokens.font,
    color: tokens.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#E3EFE6',
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: tokens.font,
    color: tokens.green,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  empty: {
    paddingVertical: 12,
    gap: 12,
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: tokens.font,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    color: tokens.muted,
  },
  emptyAction: {
    fontFamily: tokens.font,
    fontSize: 13,
    fontWeight: '700',
    color: tokens.green,
  },
  scrim: { flex: 1, backgroundColor: 'rgba(43,29,20,0.35)' },
  choiceSheet: {
    backgroundColor: tokens.bg,
    padding: 20,
    paddingBottom: 32,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  choiceTitle: {
    fontFamily: tokens.font,
    fontSize: 18,
    fontWeight: '700',
    color: tokens.text,
    marginBottom: 12,
  },
  choiceRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
  },
  choiceText: { fontFamily: tokens.font, fontSize: 15, color: tokens.text },
  selectedChoice: { color: tokens.green, fontWeight: '700' },
});
