import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { api, useResource } from '../../app/api';
import type { Coordinate, Meetup, Review } from '../../app/domain';
import { native } from '../../app/native';
import {
  Button,
  Card,
  Chip,
  Empty,
  Field,
  Notice,
  Screen,
  formatDate,
  tokens,
} from '../../app/ui';
import type { RootStackScreenProps } from '../../navigation/types';
import { useSessionStore } from '../../store/sessionStore';
import {
  Avatar,
  Badge,
  CommunitySegment,
  PageTitle,
  SocialIcon,
  SocialText as Text,
  socialStyles as s,
} from './SocialParts';
import { readableError, relativeTime } from './socialModel';
import ReviewPhotos from './ReviewPhotos';
import { requestCommunityLogin } from './communityLogin';

export default function CommunityScreen({
  navigation,
  route,
}: RootStackScreenProps<'Community'>) {
  const cafeId = route.params?.cafeId;
  const [selectedTab, setTab] = useState<'reviews' | 'meetups'>(
    route.params?.tab ?? 'reviews',
  );
  const tab = cafeId ? 'reviews' : selectedTab;
  const [reviewCategory, setReviewCategory] = useState('전체');
  const [meetupCategory, setMeetupCategory] = useState('전체');
  const [placeQuery, setPlaceQuery] = useState('');
  const [editingPlace, setEditingPlace] = useState(false);
  const [newestFirst, setNewestFirst] = useState(true);
  const [nearby, setNearby] = useState<Coordinate | null>(null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewUpdates, setReviewUpdates] = useState<Record<string, Review>>(
    {},
  );
  const [meetupUpdates, setMeetupUpdates] = useState<Record<string, Meetup>>(
    {},
  );
  const token = useSessionStore(state => state.accessToken);
  const reviews = useResource<Review[]>(
    '/api/reviews',
    { cafeId, category: reviewCategory === '전체' ? undefined : reviewCategory },
    tab === 'reviews',
  );
  const meetups = useResource<Meetup[]>(
    '/api/meetups',
    {
      category: meetupCategory === '전체' ? undefined : meetupCategory,
      query: placeQuery || undefined,
      sort: newestFirst ? 'latest' : 'startsAt',
      latitude: nearby?.latitude,
      longitude: nearby?.longitude,
      radius: nearby ? 1000 : undefined,
    },
    tab === 'meetups',
  );

  useEffect(() => {
    if (cafeId) setTab('reviews');
    else if (route.params?.tab) setTab(route.params.tab);
  }, [route.params?.tab, cafeId]);
  useEffect(() => {
    setReviewUpdates({});
  }, [reviews.data]);
  useEffect(() => {
    setMeetupUpdates({});
  }, [meetups.data]);

  const like = async (review: Review) => {
    if (!token) {
      requestCommunityLogin(navigation, { name: 'ReviewDetail', params: { reviewId: review.id } }, setError);
      return;
    }
    if (busy) return;
    setBusy(`review-${review.id}`);
    setError(null);
    try {
      const updated = await api.post<Review>(
        `/api/reviews/${encodeURIComponent(review.id)}/like`,
      );
      setReviewUpdates(previous => ({ ...previous, [review.id]: updated }));
    } catch (reason) {
      setError(readableError(reason));
    } finally {
      setBusy(null);
    }
  };
  const join = async (meetup: Meetup) => {
    if (meetup.joined) {
      navigation.navigate('MeetupDetail', { meetupId: meetup.id });
      return;
    }
    if (!token) {
      requestCommunityLogin(navigation, { name: 'MeetupDetail', params: { meetupId: meetup.id } }, setError);
      return;
    }
    if (busy) return;
    setBusy(`meetup-${meetup.id}`);
    setError(null);
    try {
      const updated = await api.post<Meetup>(
        `/api/meetups/${encodeURIComponent(meetup.id)}/join`,
      );
      setMeetupUpdates(previous => ({ ...previous, [meetup.id]: updated }));
    } catch (reason) {
      setError(readableError(reason));
    } finally {
      setBusy(null);
    }
  };
  const write = () => {
    const destination = tab === 'reviews'
      ? { name: 'ReviewWrite' as const, params: cafeId ? { cafeId } : undefined }
      : { name: 'MeetupCreate' as const, params: undefined };
    navigation.navigate(destination);
  };
  const toggleNearby = async () => {
    if (locating) return;
    if (nearby) { setNearby(null); return; }
    setLocating(true);
    setError(null);
    try { setNearby(await native.requestLocation()); }
    catch (reason) { setError(readableError(reason)); }
    finally { setLocating(false); }
  };
  const resource = tab === 'reviews' ? reviews : meetups;
  const meetupItems = meetups.data ?? [];

  return (
    <Screen
      navigation={navigation}
      tab="community"
      scroll={false}
      contentStyle={styles.content}
    >
      <View style={styles.body}>
        <PageTitle
          title={cafeId ? `${route.params?.cafeName ?? '매장'} 리뷰` : '휴게소'}
          subtitle={
            tab === 'reviews'
              ? '커피 이야기 잠깐 쉬어 가요'
              : '동네 사람들과 카페에서 만나요'
          }
        />
        {!cafeId && <CommunitySegment
          active={tab}
          onChange={value => {
            setTab(value);
            setError(null);
          }}
        />}
        {tab === 'meetups' && (
          <>
            <View style={[s.row, styles.locationRow]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="모임 지역 검색"
                onPress={() => setEditingPlace(value => !value)}
                style={s.row}
              >
                <SocialIcon name="groupPin" />
                <Text style={s.title}>{placeQuery || '지역 전체'}</Text>
                <SocialIcon name="down" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="모임 정렬 변경"
                onPress={() => setNewestFirst(value => !value)}
              >
                <Text style={s.muted}>
                  {newestFirst ? '최신순' : '빠른 일정순'}
                </Text>
              </Pressable>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="내 주변 1km" accessibilityState={{ selected: !!nearby, disabled: locating }} disabled={locating} onPress={toggleNearby} style={[styles.nearby, nearby && styles.nearbySelected]}>
              {locating && <ActivityIndicator color={tokens.green} size="small" />}
              <Text style={nearby ? styles.nearbyLabel : s.muted}>내 주변 1km{locating ? ' · 위치 확인 중' : ''}</Text>
            </Pressable>
            {!!nearby && <Text style={s.tiny}>선택한 카페의 위치가 확인되는 모임만 표시합니다.</Text>}
            {editingPlace && (
              <Field
                label="지역 또는 카페"
                value={placeQuery}
                onChangeText={setPlaceQuery}
                placeholder="동네나 카페 이름으로 검색"
                returnKeyType="search"
              />
            )}
          </>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroller}
          contentContainerStyle={styles.filters}
        >
          {(tab === 'reviews'
            ? ['전체', '리뷰', '신메뉴', '질문']
            : ['전체', '카공', '브런치', '커피 투어', '번개']
          ).map(label => (
            <Chip
              key={label}
              label={label}
              selected={
                (tab === 'reviews' ? reviewCategory : meetupCategory) === label
              }
              onPress={() =>
                tab === 'reviews'
                  ? setReviewCategory(label)
                  : setMeetupCategory(label)
              }
            />
          ))}
        </ScrollView>
        {error && <Notice>{error}</Notice>}
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {tab === 'reviews' && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="신메뉴와 이벤트 소식 보기"
              onPress={() => navigation.navigate('Events')}
              style={styles.news}
            >
              <SocialIcon name="news" />
              <View style={s.grow}>
                <Text style={styles.newsTitle}>신메뉴·이벤트 소식</Text>
                <Text style={styles.newsSubtitle}>
                  새로운 커피 소식을 모아보세요
                </Text>
              </View>
              <SocialIcon name="chevron" />
            </Pressable>
          )}
          {resource.loading && (
            <View style={styles.loading}>
              <ActivityIndicator color={tokens.green} />
              <Text style={s.muted}>불러오는 중입니다.</Text>
            </View>
          )}
          {resource.error && (
            <Empty message={resource.error} onRetry={resource.reload} />
          )}
          {!resource.loading &&
            !resource.error &&
            resource.data?.length === 0 && (
              <Empty
                message={
                  tab === 'reviews'
                    ? '아직 등록된 글이 없습니다. 첫 커피 이야기를 남겨 보세요.'
                    : '조건에 맞는 모임이 없습니다. 모임을 만들어 보세요.'
                }
                onRetry={resource.reload}
              />
            )}
          {tab === 'reviews' &&
            (reviews.data ?? []).map(original => {
              const review = { ...original, ...reviewUpdates[original.id] };
              return (
                <Card key={review.id} style={styles.review}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${review.authorNickname}님의 글 보기`}
                    onPress={() =>
                      navigation.navigate('ReviewDetail', {
                        reviewId: review.id,
                      })
                    }
                    style={styles.reviewContent}
                  >
                    <View style={s.row}>
                      <Avatar name={review.authorNickname} />
                      <View style={s.grow}>
                        <View style={s.row}>
                          <Text style={s.title}>{review.authorNickname}</Text>
                          {review.verified && <Badge label="영수증 인증" />}
                        </View>
                        <Text style={s.tiny}>
                          {relativeTime(review.createdAt)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cafe}>
                      <SocialIcon name="pin" />
                      <Text style={[styles.cafeName, s.grow]}>
                        {review.cafeName}
                      </Text>
                      <View style={styles.stars}>
                        {[1, 2, 3, 4, 5].map(value => (
                          <SocialIcon
                            key={value}
                            name={review.rating >= value ? 'star' : 'starEmpty'}
                          />
                        ))}
                      </View>
                    </View>
                    <Text style={s.body}>{review.text}</Text>
                    <ReviewPhotos paths={review.imageUrls} />
                  </Pressable>
                  <View style={[s.row, styles.socialActions]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${review.authorNickname}님의 글 좋아요 ${review.likes}개`}
                      accessibilityState={{
                        selected: review.liked,
                        disabled: !!busy,
                      }}
                      onPress={() => like(review)}
                      disabled={!!busy}
                      style={s.row}
                    >
                      <SocialIcon name="heart" />
                      <Text style={[s.muted, review.liked && styles.liked]}>
                        {review.likes}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`댓글 ${review.commentCount}개 보기`}
                      onPress={() =>
                        navigation.navigate('ReviewDetail', {
                          reviewId: review.id,
                        })
                      }
                      style={s.row}
                    >
                      <SocialIcon name="comment" />
                      <Text style={s.muted}>{review.commentCount}</Text>
                    </Pressable>
                  </View>
                </Card>
              );
            })}
          {tab === 'meetups' &&
            meetupItems.map(original => {
              const meetup = meetupUpdates[original.id] ?? original;
              const remaining = Math.max(
                0,
                meetup.capacity - meetup.memberCount,
              );
              return (
                <Card key={meetup.id} style={styles.meetup}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${meetup.title} 상세 보기`}
                    onPress={() =>
                      navigation.navigate('MeetupDetail', {
                        meetupId: meetup.id,
                      })
                    }
                    style={styles.meetupText}
                  >
                    <View style={s.row}>
                      <Badge label={meetup.category} />
                      <SocialIcon name="clock" />
                      <Text style={[s.muted, s.grow]}>
                        {formatDate(meetup.startsAt, {
                          month: 'numeric',
                          day: 'numeric',
                        })}{' '}
                        {new Date(meetup.startsAt).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })}
                      </Text>
                      <Text
                        style={[
                          styles.status,
                          remaining <= 1 && remaining > 0 && styles.lastSeat,
                        ]}
                      >
                        {remaining === 0
                          ? '모집 완료'
                          : remaining === 1
                          ? '1자리 남음'
                          : '모집 중'}
                      </Text>
                    </View>
                    <Text style={styles.meetupTitle}>{meetup.title}</Text>
                    <View style={s.row}>
                      <SocialIcon name="pin" />
                      <Text style={[s.muted, s.grow]}>{meetup.placeName}</Text>
                      {meetup.distanceMeters !== undefined && <Text style={s.tiny}>{meetup.distanceMeters}m</Text>}
                    </View>
                  </Pressable>
                  <View style={s.row}>
                    <View style={styles.members}>
                      {(meetup.members?.length
                        ? meetup.members.slice(0, 2)
                        : [{ id: 'host', nickname: meetup.hostNickname }]
                      ).map((member, index) => (
                        <View key={member.id} style={styles.member}>
                          <Avatar
                            name={member.nickname}
                            size={26}
                            green={index === 1}
                          />
                        </View>
                      ))}
                      <View style={styles.memberPlus}>
                        <SocialIcon name="detailPlus" />
                      </View>
                    </View>
                    <Text style={[styles.memberCount, s.grow]}>
                      {meetup.memberCount}/{meetup.capacity}명 참여
                    </Text>
                    <Button
                      label={
                        meetup.joined
                          ? '참여 중'
                          : remaining === 0
                          ? '모집 완료'
                          : '참여하기'
                      }
                      onPress={() => join(meetup)}
                      disabled={!!busy || (remaining === 0 && !meetup.joined)}
                      loading={busy === `meetup-${meetup.id}`}
                      style={styles.smallButton}
                      textStyle={styles.smallButtonText}
                    />
                  </View>
                </Card>
              );
            })}
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            tab === 'reviews' ? '커피 리뷰 쓰기' : '모임 만들기'
          }
          onPress={write}
          style={[
            styles.fab,
            tab === 'reviews' ? styles.roundFab : styles.wideFab,
          ]}
        >
          <SocialIcon name={tab === 'reviews' ? 'reviewPlus' : 'groupPlus'} />
          {tab === 'meetups' && <Text style={styles.fabText}>모임 만들기</Text>}
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, paddingBottom: 0 },
  body: { flex: 1, gap: 14 },
  locationRow: { justifyContent: 'space-between' },
  nearby: { alignSelf: 'flex-start', flexDirection: 'row', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: tokens.border, borderRadius: 999 },
  nearbySelected: { backgroundColor: tokens.greenLight, borderColor: tokens.green },
  nearbyLabel: { color: tokens.green, fontWeight: '700', fontSize: 12 },
  filterScroller: { flexGrow: 0, minHeight: 34, maxHeight: 36 },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  list: { flex: 1 },
  listContent: { gap: 14, paddingBottom: 90 },
  loading: { padding: 32, alignItems: 'center', gap: 10 },
  news: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: tokens.greenLight,
  },
  newsTitle: {
    color: tokens.green,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  newsSubtitle: {
    color: tokens.green,
    opacity: 0.8,
    fontSize: 12,
    lineHeight: 17,
  },
  review: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderRadius: 16,
  },
  reviewContent: { gap: 10 },
  cafe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: tokens.card,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cafeName: {
    fontSize: 12,
    lineHeight: 17,
    color: tokens.text,
    fontWeight: '500',
  },
  stars: { flexDirection: 'row', gap: 1 },
  socialActions: { gap: 14 },
  liked: { color: tokens.green, fontWeight: '700' },
  meetup: { padding: 16, gap: 10, borderRadius: 16 },
  meetupText: { gap: 10 },
  meetupTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    color: tokens.text,
  },
  status: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    color: tokens.green,
  },
  lastSeat: { color: '#f34a42' },
  members: { flexDirection: 'row', alignItems: 'center', paddingLeft: 2 },
  member: {
    marginLeft: -2,
    borderWidth: 2,
    borderColor: tokens.white,
    borderRadius: 15,
  },
  memberPlus: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: tokens.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -2,
  },
  memberCount: {
    color: tokens.text,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  smallButton: {
    minHeight: 32,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  smallButtonText: { fontSize: 12, lineHeight: 17 },
  fab: {
    position: 'absolute',
    bottom: 18,
    right: 0,
    backgroundColor: tokens.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 5,
    shadowColor: tokens.text,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  roundFab: { width: 56, height: 56, borderRadius: 28 },
  wideFab: { paddingHorizontal: 18, minHeight: 44, borderRadius: 999 },
  fabText: { fontSize: 14, fontWeight: '700', color: tokens.white },
});
