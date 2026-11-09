import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { api, useResource } from '../../app/api';
import type { Review, ReviewComment } from '../../app/domain';
import {
  Button,
  Card,
  Empty,
  Field,
  Notice,
  Screen,
  tokens,
} from '../../app/ui';
import type { RootStackScreenProps } from '../../navigation/types';
import { useSessionStore } from '../../store/sessionStore';
import {
  Avatar,
  Badge,
  SocialIcon,
  SocialText as Text,
  socialStyles as s,
} from './SocialParts';
import { readableError, relativeTime } from './socialModel';
import ReviewPhotos from './ReviewPhotos';

export default function ReviewDetailScreen({
  navigation,
  route,
}: RootStackScreenProps<'ReviewDetail'>) {
  const queryClient = useQueryClient();
  const id = encodeURIComponent(route.params.reviewId);
  const resource = useResource<Review>(`/api/reviews/${id}`);
  const comments = useResource<ReviewComment[]>(`/api/reviews/${id}/comments`);
  const token = useSessionStore(state => state.accessToken);
  const [updated, setUpdated] = useState<Review | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<'like' | 'comment' | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setUpdated(null);
  }, [resource.data]);
  const review = updated ?? resource.data;
  const refresh = () => {
    resource.reload();
    comments.reload();
  };
  const like = async () => {
    if (!token) {
      navigation.navigate('Login');
      return;
    }
    if (busy) return;
    setBusy('like');
    setError(null);
    try {
      setUpdated(await api.post<Review>(`/api/reviews/${id}/like`));
      await queryClient.invalidateQueries({ queryKey: ['coffee-api'] });
    } catch (reason) {
      setError(readableError(reason));
    } finally {
      setBusy(null);
    }
  };
  const comment = async () => {
    if (!token) {
      navigation.navigate('Login');
      return;
    }
    if (busy) return;
    if (!text.trim()) {
      setError('댓글 내용을 입력해 주세요.');
      return;
    }
    setBusy('comment');
    setError(null);
    try {
      await api.post<ReviewComment>(`/api/reviews/${id}/comments`, {
        text: text.trim(),
      });
      setText('');
      refresh();
      await queryClient.invalidateQueries({ queryKey: ['coffee-api'] });
    } catch (reason) {
      setError(readableError(reason));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen title="커피 이야기" navigation={navigation}>
      {resource.loading && <ActivityIndicator color={tokens.green} />}
      {resource.error && <Empty message={resource.error} onRetry={refresh} />}
      {review && (
        <>
          <View style={s.row}>
            <Avatar name={review.authorNickname} />
            <View style={s.grow}>
              <View style={s.row}>
                <Text style={s.title}>{review.authorNickname}</Text>
                {review.verified && <Badge label="영수증 인증" />}
              </View>
              <Text style={s.tiny}>{relativeTime(review.createdAt)}</Text>
            </View>
            <Badge label={review.category || '리뷰'} neutral />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${review.cafeName} 카페 보기`}
            onPress={() =>
              navigation.navigate('CafeDetail', { cafeId: review.cafeId })
            }
            style={styles.cafe}
          >
            <SocialIcon name="pin" />
            <Text style={[s.body, s.grow]}>{review.cafeName}</Text>
            <Text style={styles.rating}>★ {review.rating.toFixed(1)}</Text>
          </Pressable>
          <Text style={styles.text}>{review.text}</Text>
          <ReviewPhotos paths={review.imageUrls} large />
          <View style={s.row}>
            <Button
              label={`좋아요 ${review.likes}`}
              variant={review.liked ? 'primary' : 'outline'}
              onPress={like}
              disabled={!!busy}
              loading={busy === 'like'}
            />
            <Text style={s.muted}>댓글 {review.commentCount}개</Text>
          </View>
          <Text style={s.title}>댓글</Text>
          {comments.loading && <ActivityIndicator color={tokens.green} />}
          {comments.error && (
            <Empty message={comments.error} onRetry={comments.reload} />
          )}
          {!comments.loading &&
            !comments.error &&
            comments.data?.length === 0 && (
              <Text style={s.muted}>첫 댓글을 남겨 보세요.</Text>
            )}
          {(comments.data ?? []).map(item => (
            <Card key={item.id} style={styles.comment}>
              <View style={s.row}>
                <Avatar name={item.authorNickname} size={28} />
                <Text style={[s.title, s.grow]}>{item.authorNickname}</Text>
                <Text style={s.tiny}>{relativeTime(item.createdAt)}</Text>
              </View>
              <Text style={s.body}>{item.text}</Text>
            </Card>
          ))}
          <Field
            label="댓글"
            value={text}
            onChangeText={setText}
            placeholder="커피 이야기를 나눠 보세요"
            multiline
            maxLength={1000}
          />
          {error && <Notice>{error}</Notice>}
          <Button
            label={token ? '댓글 등록' : '로그인하고 댓글 쓰기'}
            onPress={comment}
            loading={busy === 'comment'}
            disabled={busy === 'like'}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cafe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: tokens.card,
    borderRadius: 10,
  },
  rating: { color: '#efa133', fontSize: 13, fontWeight: '700' },
  text: { color: tokens.text, fontSize: 14, lineHeight: 24, minHeight: 100 },
  comment: { padding: 14, gap: 10 },
});
