import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { api } from '../../app/api';
import type {
  RecommendationItem,
  RecommendationResult,
} from '../../app/domain';
import {
  Button,
  Card,
  Empty,
  Notice,
  Screen,
  formatMoney,
  tokens,
} from '../../app/ui';
import type { RootStackScreenProps } from '../../navigation/types';
import {
  Badge,
  SocialIcon,
  SocialText as Text,
  socialStyles as s,
} from '../community/SocialParts';
import { readableError } from '../community/socialModel';
import { recommendationHeading, requestLabels } from './recommendModel';

export default function RecommendationResultScreen({
  navigation,
  route,
}: RootStackScreenProps<'RecommendationResult'>) {
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestKey = JSON.stringify(route.params.request);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setResult(null);
    api
      .post<RecommendationResult>(
        '/api/recommendations',
        JSON.parse(requestKey),
      )
      .then(value => {
        if (!active) return;
        if (
          !value ||
          !Array.isArray(value.items) ||
          !['ai', 'rules'].includes(value.mode)
        ) {
          throw new Error(
            '추천 응답을 확인하지 못했습니다. 다시 시도해 주세요.',
          );
        }
        setResult(value);
      })
      .catch(reason => {
        if (active) setError(readableError(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [requestKey, attempt]);

  const directions = async (item: RecommendationItem) => {
    try {
      await Linking.openURL(
        `https://map.kakao.com/link/to/${encodeURIComponent(item.cafe.name)},${
          item.cafe.latitude
        },${item.cafe.longitude}`,
      );
    } catch (reason) {
      setError(readableError(reason));
    }
  };
  const openCafe = (item: RecommendationItem) =>
    navigation.navigate('CafeDetail', {
      cafeId: item.cafe.id,
      cafe: item.cafe,
    });

  return (
    <Screen
      title={
        result?.mode === 'rules' ? recommendationHeading('rules') : '추천 결과'
      }
      navigation={navigation}
      tab="recommend"
      contentStyle={styles.content}
    >
      <View style={styles.badges}>
        {requestLabels(route.params.request).map((label, index) => (
          <Badge key={`${index}-${label}`} label={label} neutral />
        ))}
      </View>
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator color={tokens.green} />
          <Text style={s.muted}>조건에 맞는 카페를 찾고 있습니다.</Text>
        </View>
      )}
      {error && (
        <Empty
          message={error}
          onRetry={() => setAttempt(previous => previous + 1)}
        />
      )}
      {result && (
        <>
          {(route.params.request.latitude === undefined ||
            route.params.request.longitude === undefined) && (
            <Notice>
              위치 정보가 없어 이동 거리 조건을 확인할 수 없습니다.
            </Notice>
          )}
          {result.mode === 'rules' && (
            <Notice>
              AI 연결 대신 실제 카페 데이터와 선택한 조건을 기준으로
              정렬했습니다.
            </Notice>
          )}
          {result.items.length === 0 && (
            <Empty
              message="조건에 맞는 카페가 없습니다. 예산이나 이동 거리를 넓혀 보세요."
              onRetry={() => navigation.goBack()}
            />
          )}
          {result.items.map((item, index) => (
            <Card
              key={item.cafe.id}
              style={[styles.card, index === 0 && styles.firstCard]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${index + 1}위 ${
                  item.cafe.name
                } 카페 보기`}
                onPress={() => openCafe(item)}
                style={s.row}
              >
                <View style={[styles.rank, index === 0 && styles.firstRank]}>
                  <Text
                    style={[
                      styles.rankText,
                      index === 0 && styles.firstRankText,
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>
                <View style={s.grow}>
                  <Text style={styles.cafeName}>{item.cafe.name}</Text>
                  <Text style={s.muted}>
                    {item.cafe.distance === undefined
                      ? '거리 정보 없음'
                      : `${Math.round(item.cafe.distance)}m`}
                    {item.matchedMenu
                      ? ` · ${item.matchedMenu.name} ${formatMoney(
                          item.matchedMenu.price,
                        )}`
                      : ''}
                    {item.cafe.rating == null
                      ? ''
                      : ` · ★${item.cafe.rating.toFixed(1)}`}
                  </Text>
                </View>
                {index === 0 && (
                  <View style={styles.photo}>
                    <SocialIcon name="coffee" />
                  </View>
                )}
              </Pressable>
              {item.reasons.length > 0 && (
                <View
                  style={[styles.reason, index === 0 && styles.firstReason]}
                >
                  <SocialIcon name="sparkles" />
                  <Text style={[s.body, s.grow]}>{item.reasons.join(' ')}</Text>
                </View>
              )}
              {index === 0 && (
                <>
                  {!!item.cafe.tags?.length && (
                    <View style={styles.badges}>
                      {item.cafe.tags.map(tag => (
                        <Badge key={tag} label={tag} />
                      ))}
                    </View>
                  )}
                  <View style={styles.buttons}>
                    <Button
                      label="카페 보기"
                      variant="outline"
                      onPress={() => openCafe(item)}
                      style={styles.smallButton}
                      textStyle={styles.smallButtonText}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${item.cafe.name} 길찾기`}
                      onPress={() => directions(item)}
                      style={styles.directions}
                    >
                      <SocialIcon name="navigation" />
                      <Text style={styles.directionsText}>길찾기</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </Card>
          ))}
          <View style={[s.row, styles.explanation]}>
            <SocialIcon name="shield" />
            <Text style={[s.tiny, s.grow]}>
              {result.mode === 'ai'
                ? '순위는 가격·거리·리뷰 데이터로 정하고, AI는 추천 이유만 설명해요.'
                : '가격·거리·리뷰 데이터와 선택한 조건을 바탕으로 추천합니다.'}
            </Text>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingTop: 8, paddingBottom: 24 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  loading: { alignItems: 'center', gap: 12, paddingVertical: 48 },
  card: { padding: 16, gap: 10, borderRadius: 16 },
  firstCard: { borderWidth: 1.5, borderColor: tokens.green },
  rank: {
    height: 28,
    width: 28,
    borderRadius: 14,
    backgroundColor: tokens.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  firstRank: { backgroundColor: tokens.green },
  rankText: { color: tokens.text, fontWeight: '700', fontSize: 14 },
  firstRankText: { color: tokens.white },
  cafeName: {
    fontWeight: '700',
    color: tokens.text,
    fontSize: 16,
    lineHeight: 23,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: tokens.brownLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reason: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: tokens.card,
    borderRadius: 12,
  },
  firstReason: { backgroundColor: tokens.greenLight },
  buttons: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  smallButton: {
    flex: 1,
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  smallButtonText: { color: tokens.green, fontSize: 13, lineHeight: 18 },
  directions: {
    flex: 1,
    minHeight: 38,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: tokens.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  directionsText: { color: tokens.white, fontSize: 13, fontWeight: '700' },
  explanation: { gap: 6 },
});
