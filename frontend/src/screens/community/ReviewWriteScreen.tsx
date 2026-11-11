import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { api, useResource } from '../../app/api';
import type { Cafe, Review } from '../../app/domain';
import {
  Button,
  Card,
  Chip,
  Empty,
  Field,
  Notice,
  Screen,
  tokens,
} from '../../app/ui';
import type { RootStackScreenProps } from '../../navigation/types';
import { useSessionStore } from '../../store/sessionStore';
import {
  SocialIcon,
  SocialText as Text,
  socialStyles as s,
} from './SocialParts';
import { makeReviewInput, readableError } from './socialModel';
import { native, type PickedImage } from '../../app/native';
import { env } from '../../utils/env';
import { MAX_REVIEW_IMAGES, reviewPhotoInput } from './reviewImages';
import { requestCommunityLogin } from './communityLogin';

export default function ReviewWriteScreen({
  navigation,
  route,
}: RootStackScreenProps<'ReviewWrite'>) {
  const queryClient = useQueryClient();
  const token = useSessionStore(state => state.accessToken);
  const preview = env.useMockApi && !token;
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Cafe | null>(null);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [category, setCategory] = useState('리뷰');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [picking, setPicking] = useState(false);
  const initial = useResource<Cafe>(
    `/api/cafes/${encodeURIComponent(route.params?.cafeId ?? '')}`,
    undefined,
    !!route.params?.cafeId,
  );
  const cafes = useResource<Cafe[]>(
    '/api/cafes',
    { query: query || undefined },
    !selected,
  );
  useEffect(() => {
    if (initial.data) setSelected(initial.data);
  }, [initial.data]);
  const pickPhoto = async (camera: boolean) => {
    if (picking || saving || images.length >= MAX_REVIEW_IMAGES) return;
    setPicking(true);
    setError(null);
    try {
      const image = await native.pickImage(camera);
      reviewPhotoInput(image);
      setImages(previous => previous.length < MAX_REVIEW_IMAGES ? [...previous, image] : previous);
    } catch (reason) {
      if ((reason as { code?: string })?.code !== 'E_CANCELLED') setError(readableError(reason));
    } finally { setPicking(false); }
  };
  const submit = async () => {
    if (saving) return;
    if (!token) {
      requestCommunityLogin(navigation, { name: 'ReviewWrite', params: route.params }, setError);
      return;
    }
    setError(null);
    try {
      const body = makeReviewInput(selected?.id ?? '', rating, text, category);
      setSaving(true);
      const review = await api.post<Review>('/api/reviews', { ...body, images: images.map(reviewPhotoInput) });
      await queryClient.invalidateQueries({ queryKey: ['coffee-api'] });
      if (navigation.isFocused?.() !== false)
        navigation.replace('ReviewDetail', { reviewId: review.id });
    } catch (reason) {
      setError(readableError(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="커피 리뷰 쓰기" navigation={navigation}>
      <Text style={s.title}>어느 카페에 다녀오셨나요?</Text>
      {selected ? (
        <Card>
          <View style={s.row}>
            <SocialIcon name="groupPin" />
            <Text style={[s.title, s.grow]}>{selected.name}</Text>
            <Button
              label="변경"
              variant="quiet"
              onPress={() => setSelected(null)}
            />
          </View>
          <Text style={s.muted}>{selected.address}</Text>
        </Card>
      ) : (
        <>
          <Field
            label="카페 찾기"
            value={query}
            onChangeText={setQuery}
            placeholder="카페 이름을 입력해 주세요"
            returnKeyType="search"
          />
          {(cafes.error || initial.error) && (
            <Empty
              message={cafes.error ?? initial.error!}
              onRetry={() => {
                cafes.reload();
                if (route.params?.cafeId) initial.reload();
              }}
            />
          )}
          {cafes.data?.slice(0, 8).map(cafe => (
            <Pressable
              key={cafe.id}
              accessibilityRole="button"
              accessibilityLabel={`${cafe.name} 선택`}
              onPress={() => setSelected(cafe)}
              style={styles.cafeOption}
            >
              <Text style={s.title}>{cafe.name}</Text>
              <Text style={s.muted}>{cafe.address}</Text>
            </Pressable>
          ))}
          {!cafes.loading && !cafes.error && cafes.data?.length === 0 && (
            <Notice>
              검색한 카페가 없습니다. 다른 이름으로 검색해 주세요.
            </Notice>
          )}
        </>
      )}
      <View style={s.wrap}>
        {['리뷰', '신메뉴', '질문'].map(label => (
          <Chip
            key={label}
            label={label}
            selected={category === label}
            onPress={() => setCategory(label)}
          />
        ))}
      </View>
      <Text style={s.title}>별점</Text>
      <View style={styles.rating} accessibilityLabel={`별점 ${rating}점`}>
        {[1, 2, 3, 4, 5].map(value => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={`별점 ${value}점`}
            accessibilityState={{ selected: rating === value }}
            onPress={() => setRating(value)}
            style={styles.star}
          >
            <SocialIcon name={rating >= value ? 'star' : 'starEmpty'} />
          </Pressable>
        ))}
      </View>
      <Field
        label="커피 이야기"
        value={text}
        onChangeText={setText}
        multiline
        maxLength={2000}
        placeholder="커피 맛, 공간, 이용 경험을 들려주세요."
        style={styles.input}
      />
      <Text style={s.tiny}>{text.length}/2,000</Text>
      <Text style={s.title}>사진 {images.length}/{MAX_REVIEW_IMAGES}</Text>
      <View style={s.row}>
        <Button label="사진 촬영" variant="outline" onPress={() => pickPhoto(true)} disabled={picking || saving || images.length >= MAX_REVIEW_IMAGES} />
        <Button label="사진 선택" variant="outline" onPress={() => pickPhoto(false)} disabled={picking || saving || images.length >= MAX_REVIEW_IMAGES} />
      </View>
      {!!images.length && <View style={s.wrap}>
        {images.map((image, index) => <View key={`${image.uri}-${index}`} style={styles.photo}>
          <Image source={{ uri: image.uri }} style={styles.preview} accessibilityLabel={`첨부 사진 ${index + 1}`} />
          <Pressable accessibilityRole="button" accessibilityLabel={`리뷰 사진 ${index + 1} 삭제`} disabled={saving} onPress={() => setImages(previous => previous.filter((_, i) => i !== index))} style={styles.remove}>
            <Text style={styles.removeText}>×</Text>
          </Pressable>
        </View>)}
      </View>}
      <Text style={s.tiny}>JPEG·PNG 사진을 최대 3장, 한 장당 2MB까지 첨부할 수 있습니다.</Text>
      <Notice>직접 경험한 커피 맛과 공간의 특징을 남겨 주세요.</Notice>
      {preview && <Notice>게시하려면 서비스에 연결해야 해요.</Notice>}
      {error && <Notice>{error}</Notice>}
      <Button
        label={token || preview ? '리뷰 등록' : '로그인하고 리뷰 쓰기'}
        onPress={submit}
        loading={saving}
        disabled={picking || preview}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cafeOption: {
    paddingVertical: 12,
    gap: 4,
    borderBottomWidth: 1,
    borderColor: tokens.border,
  },
  rating: { flexDirection: 'row', gap: 2 },
  star: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: tokens.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: { minHeight: 160, textAlignVertical: 'top' },
  photo: { position: 'relative' },
  preview: { width: 88, height: 88, borderRadius: 10, backgroundColor: tokens.card },
  remove: { position: 'absolute', right: 3, top: 3, width: 28, height: 28, borderRadius: 14, backgroundColor: tokens.white, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 20, color: tokens.text },
});
