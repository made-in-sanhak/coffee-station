
import React, { useMemo } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Coffee,
  MapPin,
  Navigation,
  Sparkles,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import BottomTabBar from '../../navigation/BottomTabBar';
import { getMockNearbyStores } from '../../api/mocks/stores';
import type { Store } from '../../types/store';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../utils/theme';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'RecommendationResult'
>;

export default function RecommendationResultScreen({
  navigation,
  route,
}: Props) {
  const conditions = route.params;

  const recommendedStores = useMemo(() => {
    const allStores = getMockNearbyStores({
      latitude: 37.5665,
      longitude: 126.978,
      radius: 5000,
      menu: 'AMERICANO',
    });

    const maxPrice =
      conditions.budget === '3천원 이하'
        ? 3000
        : conditions.budget === '5천원 이하'
          ? 5000
          : Infinity;

    const maxDistance =
      conditions.distance === '도보 5분'
        ? 400
        : conditions.distance === '도보 10분'
          ? 800
          : conditions.distance === '차로 10분'
            ? 5000
            : Infinity;

    return allStores
      .filter(
        store =>
          store.price <= maxPrice &&
          store.distance <= maxDistance,
      )
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);
  }, [conditions]);

  const formatPrice = (price: number) =>
    `${price.toLocaleString('ko-KR')}원`;

  const renderCondition = (text: string) => (
    <View key={text} style={styles.conditionChip}>
      <Text style={styles.conditionText}>{text}</Text>
    </View>
  );

  const renderStoreCard = (store: Store, index: number) => {
    const isFirst = index === 0;

    return (
      <View
        key={store.id}
        style={[
          styles.storeCard,
          isFirst && styles.firstStoreCard,
        ]}
      >
        <View style={styles.storeHeader}>
          <View
            style={[
              styles.rankCircle,
              isFirst && styles.firstRankCircle,
            ]}
          >
            <Text
              style={[
                styles.rankText,
                isFirst && styles.firstRankText,
              ]}
            >
              {index + 1}
            </Text>
          </View>

          <View style={styles.storeMainInfo}>
            <Text style={styles.storeName}>{store.name}</Text>
            <Text style={styles.storeSubInfo}>
              {Math.round(store.distance)}m · {store.menuName}{' '}
              {formatPrice(store.price)} · ★ {store.rating.toFixed(1)}
            </Text>
          </View>

          <View style={styles.coffeeIcon}>
            <Coffee
              size={19}
              color={isFirst ? colors.primary : colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.reasonBox}>
          <View style={styles.reasonIcon}>
            <Sparkles size={16} color={colors.primary} />
          </View>

          <Text style={styles.reasonText}>
            {index === 0
              ? `현재 예시 데이터 중 평점이 ${store.rating.toFixed(1)}점으로 높고, 선택한 예산과 이동 거리 조건에 맞는 매장이에요.`
              : `선택한 조건에 맞는 매장이에요. 평점 ${store.rating.toFixed(1)}점과 ${formatPrice(store.price)}의 가격을 참고해 보세요.`}
          </Text>
        </View>

        <View style={styles.tagContainer}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>예산 적합</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>조건 반영</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>가상 데이터</Text>
          </View>
        </View>

        <View style={styles.cardButtons}>
          <View style={styles.viewButton}>
            <Text style={styles.viewButtonText}>카페 보기</Text>
          </View>

          <Pressable
            style={styles.routeButton}
            onPress={() =>
              Alert.alert(
                '경유 길찾기',
                '실제 길찾기는 지도 및 경로 API 연동 후 사용할 수 있어요.',
              )
            }
          >
            <Navigation size={15} color="#FFFFFF" />
            <Text style={styles.routeButtonText}>경유 길찾기</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>

        <Text style={styles.headerTitle}>추천 결과</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.conditions}>
          {conditions.budget
            ? renderCondition(conditions.budget)
            : null}

          {conditions.purpose
            ? renderCondition(conditions.purpose)
            : null}

          {conditions.tastes.map(renderCondition)}

          {conditions.distance
            ? renderCondition(conditions.distance)
            : null}
        </View>

        {conditions.prompt.trim().length > 0 && (
          <View style={styles.promptSummary}>
            <Text style={styles.promptSummaryLabel}>
              입력한 요청
            </Text>

            <Text style={styles.promptSummaryText}>
              {conditions.prompt}
            </Text>
          </View>
        )}

        <View style={styles.resultHeading}>
          <Text style={styles.resultTitle}>추천 카페</Text>
          <Text style={styles.resultCount}>
            {recommendedStores.length}곳
          </Text>
        </View>

        {recommendedStores.length > 0 ? (
          recommendedStores.map(renderStoreCard)
        ) : (
          <View style={styles.emptyBox}>
            <Coffee size={34} color={colors.textMuted} />

            <Text style={styles.emptyTitle}>
              조건에 맞는 카페가 없어요
            </Text>

            <Text style={styles.emptyDescription}>
              예산이나 이동 거리를 조금 넓혀서 다시 추천받아 보세요.
            </Text>

            <Pressable
              style={styles.retryButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.retryButtonText}>
                조건 다시 설정하기
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.notice}>
          <MapPin size={13} color={colors.textMuted} />

          <Text style={styles.noticeText}>
            현재 결과는 예시 카페 데이터를 이용한 임시 추천입니다.
            실제 매장 정보 및 AI 분석 결과가 아닙니다.
          </Text>
        </View>
      </ScrollView>

      <BottomTabBar activeTab="추천" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 48,
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 34,
    height: 34,
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  headerPlaceholder: {
    width: 34,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 17,
    paddingTop: 9,
    paddingBottom: 15,
  },
  conditions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 13,
  },
  conditionChip: {
    backgroundColor: '#F0E9DE',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  conditionText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
  },
  promptSummary: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 13,
  },
  promptSummaryLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    marginBottom: 5,
  },
  promptSummaryText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
  },
  resultHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 7,
  },
  resultTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  resultCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  storeCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
  },
  firstStoreCard: {
    borderColor: colors.primary,
    borderWidth: 1.3,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 10,
  },
  rankCircle: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#F0E9DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  firstRankCircle: {
    backgroundColor: colors.primary,
  },
  rankText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  firstRankText: {
    color: '#FFFFFF',
  },
  storeMainInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  storeSubInfo: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
  coffeeIcon: {
    width: 31,
    height: 31,
    borderRadius: 8,
    backgroundColor: '#F0E9DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  reasonIcon: {
    paddingTop: 2,
  },
  reasonText: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 9,
    marginBottom: 10,
  },
  tag: {
    backgroundColor: '#EAF2EC',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  tagText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '700',
  },
  cardButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    flex: 1,
    height: 36,
    borderRadius: 7,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '800',
  },
  routeButton: {
    flex: 1,
    height: 36,
    borderRadius: 7,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  routeButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  emptyBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 25,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  emptyDescription: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 7,
    marginTop: 5,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 5,
    paddingHorizontal: 2,
  },
  noticeText: {
    flex: 1,
    fontSize: 10,
    color: colors.textMuted,
    lineHeight: 15,
  },
});
