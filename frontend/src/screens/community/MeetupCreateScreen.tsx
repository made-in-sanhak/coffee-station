import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { api, useResource } from '../../app/api';
import type { Cafe, Meetup } from '../../app/domain';
import { Button, Card, Chip, Empty, Field, Notice, Screen, tokens } from '../../app/ui';
import type { RootStackScreenProps } from '../../navigation/types';
import { useSessionStore } from '../../store/sessionStore';
import { SocialText as Text, socialStyles as s } from './SocialParts';
import {
  initialMeetupDraft,
  makeMeetupInput,
  readableError,
  type MeetupDraft,
} from './socialModel';

export default function MeetupCreateScreen({
  navigation,
}: RootStackScreenProps<'MeetupCreate'>) {
  const queryClient = useQueryClient();
  const token = useSessionStore(state => state.accessToken);
  const [draft, setDraft] = useState(initialMeetupDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placeMode, setPlaceMode] = useState<'search' | 'manual'>('search');
  const [cafeQuery, setCafeQuery] = useState('');
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const cafes = useResource<Cafe[]>('/api/cafes', { query: cafeQuery || undefined }, placeMode === 'search' && !selectedCafe);
  const change = (name: keyof MeetupDraft, value: string) =>
    setDraft(previous => ({ ...previous, [name]: value }));
  const submit = async () => {
    if (saving) return;
    if (!token) {
      navigation.navigate('Login');
      return;
    }
    setError(null);
    try {
      if (placeMode === 'search' && !selectedCafe) throw new Error('만날 카페를 선택해 주세요.');
      const body = makeMeetupInput(draft);
      setSaving(true);
      const meetup = await api.post<Meetup>('/api/meetups', body);
      await queryClient.invalidateQueries({ queryKey: ['coffee-api'] });
      if (navigation.isFocused?.() !== false)
        navigation.replace('MeetupDetail', { meetupId: meetup.id });
    } catch (reason) {
      setError(readableError(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="모임 만들기" navigation={navigation}>
      <Text style={s.title}>어떤 모임인가요?</Text>
      <View style={s.wrap}>
        {['카공', '브런치', '커피 투어', '번개'].map(label => (
          <Chip
            key={label}
            label={label}
            selected={draft.category === label}
            onPress={() => change('category', label)}
          />
        ))}
      </View>
      <Field
        label="모임 제목"
        value={draft.title}
        onChangeText={value => change('title', value)}
        placeholder="조용히 각자 공부하실 분"
        maxLength={100}
      />
      <Field
        label="모임 소개"
        value={draft.description}
        onChangeText={value => change('description', value)}
        placeholder="함께할 활동과 모임 안내를 적어 주세요."
        multiline
        maxLength={2000}
        style={styles.description}
      />
      <View style={s.wrap}>
        <Chip label="등록 카페 찾기" selected={placeMode === 'search'} onPress={() => { setPlaceMode('search'); setSelectedCafe(null); setDraft(previous => ({ ...previous, cafeId: undefined, placeName: '', address: '' })); }} />
        <Chip label="직접 입력" selected={placeMode === 'manual'} onPress={() => { setPlaceMode('manual'); setSelectedCafe(null); setDraft(previous => ({ ...previous, cafeId: undefined, placeName: '', address: '' })); }} />
      </View>
      {placeMode === 'search' && (selectedCafe ? <Card>
        <View style={s.row}>
          <Text style={[s.title, s.grow]}>{selectedCafe.name}</Text>
          <Button label="카페 변경" variant="quiet" onPress={() => { setSelectedCafe(null); setDraft(previous => ({ ...previous, cafeId: undefined, placeName: '', address: '' })); }} />
        </View>
        <Text style={s.muted}>{selectedCafe.address}</Text>
      </Card> : <>
        <Field label="카페·주소 검색" value={cafeQuery} onChangeText={setCafeQuery} placeholder="카페 이름이나 동네·주소" returnKeyType="search" maxLength={100} />
        {cafes.loading && <ActivityIndicator color={tokens.green} />}
        {cafes.error && <Empty message={cafes.error} onRetry={cafes.reload} />}
        {(cafes.data ?? []).slice(0, 8).map(cafe => <Pressable key={cafe.id} accessibilityRole="button" accessibilityLabel={`${cafe.name} 선택`} onPress={() => { setSelectedCafe(cafe); setDraft(previous => ({ ...previous, cafeId: cafe.id, placeName: cafe.name, address: cafe.address })); }} style={styles.cafeOption}>
          <Text style={s.title}>{cafe.name}</Text>
          <Text style={s.muted}>{cafe.address}</Text>
        </Pressable>)}
        {!cafes.loading && !cafes.error && cafes.data?.length === 0 && <Notice>검색한 카페가 없습니다. 다른 이름이나 주소로 검색해 주세요.</Notice>}
      </>)}
      {placeMode === 'manual' && <>
      <Field
        label="만날 카페·장소"
        value={draft.placeName}
        onChangeText={value => change('placeName', value)}
        placeholder="공개된 카페나 장소 이름"
        maxLength={150}
      />
      <Field
        label="주소·만날 위치"
        value={draft.address}
        onChangeText={value => change('address', value)}
        placeholder="주소나 만날 자리를 알려 주세요"
        maxLength={300}
      />
      </>}
      <View style={styles.row}>
        <View style={s.grow}>
          <Field
            label="날짜"
            value={draft.date}
            onChangeText={value => change('date', value)}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
        </View>
        <View style={s.grow}>
          <Field
            label="시간"
            value={draft.time}
            onChangeText={value => change('time', value)}
            placeholder="HH:mm"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
        </View>
      </View>
      <Field
        label="전체 인원 · 모임장 포함"
        value={draft.capacity}
        onChangeText={value => change('capacity', value)}
        keyboardType="number-pad"
        maxLength={2}
      />
      <Notice>
        처음 만나는 사람과는 카페 같은 공개된 장소에서 만나요. 음료는 각자
        주문해 주세요.
      </Notice>
      {error && <Notice>{error}</Notice>}
      <Button
        label={token ? '모임 만들기' : '로그인하고 모임 만들기'}
        onPress={submit}
        loading={saving}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  description: { minHeight: 120, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  cafeOption: { paddingVertical: 12, gap: 4, borderBottomWidth: 1, borderColor: tokens.border },
});
