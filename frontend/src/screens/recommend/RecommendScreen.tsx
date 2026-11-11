import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Button, Chip, Notice, Screen, tokens } from '../../app/ui';
import { native } from '../../app/native';
import type { RecommendationRequest } from '../../app/domain';
import type { RootStackScreenProps } from '../../navigation/types';
import { usePersonalStore } from '../../store/personalStore';
import {
  PageTitle,
  SocialIcon,
  SocialText as Text,
} from '../community/SocialParts';
import { makeRecommendationRequest } from './recommendModel';

const purposes = ['테이크아웃', '공부·작업', '대화', '드라이브스루'];
const tastes = ['산미 적은', '고소한', '달달한', '디카페인', '우유 들어간'];

export default function RecommendScreen({
  navigation,
}: RootStackScreenProps<'Recommend'>) {
  const preferences = usePersonalStore(state => state.preferences);
  const onboarded = usePersonalStore(state => state.onboarded);
  const [request, setRequest] = useState<RecommendationRequest>(() => ({
    budget: onboarded ? preferences.priceMax : 5000,
    purposes: [],
    tastes: [],
    travelMinutes: preferences.travelMinutes,
    travelMode: preferences.travelMode,
    query: '',
  }));
  const [locating, setLocating] = useState(false);
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const mounted = useRef(true);
  const recording = useRef(false);
  const submitting = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const voiceInput = async () => {
    if (recording.current || submitting.current) return;
    recording.current = true;
    setListening(true);
    setHint(null);
    try {
      const words = await native.recognizeSpeech();
      if (!mounted.current || navigation.isFocused?.() === false) return;
      const query = words.trim().slice(0, 200);
      if (!query)
        throw new Error(
          '음성을 확인하지 못했습니다. 다시 말하거나 글자로 입력해 주세요.',
        );
      setRequest(previous => ({ ...previous, query }));
    } catch (reason) {
      if (
        mounted.current &&
        navigation.isFocused?.() !== false &&
        (reason as { code?: string })?.code !== 'E_CANCELLED'
      )
        setHint(
          reason instanceof Error
            ? reason.message
            : '음성 입력을 시작하지 못했습니다. 글자로 입력해 주세요.',
        );
    } finally {
      recording.current = false;
      if (mounted.current) setListening(false);
    }
  };
  const changeList = (name: 'purposes' | 'tastes', value: string) =>
    setRequest(previous => ({
      ...previous,
      [name]: previous[name].includes(value)
        ? previous[name].filter(item => item !== value)
        : [...previous[name], value],
    }));
  const submit = async () => {
    if (submitting.current || recording.current) return;
    submitting.current = true;
    setLocating(true);
    let location = {};
    try {
      location = await native.getLocation();
    } catch {
      /* Region-free results remain possible without location permission. */
    }
    submitting.current = false;
    if (!mounted.current) return;
    setLocating(false);
    if (navigation.isFocused?.() === false) return;
    navigation.navigate('RecommendationResult', {
      request: makeRecommendationRequest({ ...request, ...location }),
    });
  };

  return (
    <Screen
      navigation={navigation}
      tab="recommend"
      contentStyle={styles.content}
    >
      <PageTitle
        title="어떤 커피가 필요하세요?"
        subtitle="조건을 고르면 AI가 주변 카페를 골라 드려요"
      />
      <View style={styles.request}>
        <TextInput
          testID="recommend-query"
          accessibilityLabel="추천 요청"
          value={request.query}
          onChangeText={query =>
            setRequest(previous => ({ ...previous, query }))
          }
          placeholder="회의 전에 30분 정도 조용히 앉아 있을 수 있는 곳, 5천원 이하로 찾아줘"
          placeholderTextColor={tokens.muted}
          multiline
          editable={!listening && !locating}
          style={styles.query}
          maxLength={200}
        />
        <Pressable
          testID="recommend-voice"
          accessibilityLabel={
            listening ? '음성 입력 중' : '음성으로 추천 조건 입력'
          }
          accessibilityRole="button"
          accessibilityState={{
            busy: listening,
            disabled: listening || locating,
          }}
          disabled={listening || locating}
          onPress={voiceInput}
          hitSlop={12}
        >
          <SocialIcon name="mic" />
        </Pressable>
      </View>
      {hint && <Notice>{hint}</Notice>}
      <View style={styles.group}>
        <Text style={styles.label}>예산</Text>
        <View style={styles.chips}>
          {[
            { label: '3천원 이하', value: 3000 },
            { label: '5천원 이하', value: 5000 },
            { label: '상관없음', value: null },
          ].map(item => (
            <Chip
              key={item.label}
              label={item.label}
              selected={request.budget === item.value}
              onPress={() =>
                setRequest(previous => ({ ...previous, budget: item.value }))
              }
            />
          ))}
        </View>
      </View>
      <View style={styles.group}>
        <Text style={styles.label}>이용 목적</Text>
        <View style={styles.chips}>
          {purposes.map(label => (
            <Chip
              key={label}
              label={label}
              selected={request.purposes.includes(label)}
              onPress={() => changeList('purposes', label)}
            />
          ))}
        </View>
      </View>
      <View style={styles.group}>
        <Text style={styles.label}>취향</Text>
        <View style={styles.chips}>
          {tastes.map(label => (
            <Chip
              key={label}
              label={label}
              selected={request.tastes.includes(label)}
              onPress={() => changeList('tastes', label)}
            />
          ))}
        </View>
      </View>
      <View style={styles.group}>
        <Text style={styles.label}>이동 거리</Text>
        <View style={styles.chips}>
          {[
            { label: '도보 5분', mode: 'walk' as const, minutes: 5 },
            { label: '도보 10분', mode: 'walk' as const, minutes: 10 },
            { label: '차로 10분', mode: 'drive' as const, minutes: 10 },
          ].map(item => (
            <Chip
              key={item.label}
              label={item.label}
              selected={
                request.travelMode === item.mode &&
                request.travelMinutes === item.minutes
              }
              onPress={() =>
                setRequest(previous => ({
                  ...previous,
                  travelMode: item.mode,
                  travelMinutes: item.minutes,
                }))
              }
            />
          ))}
        </View>
      </View>
      <View style={styles.spacer} />
      <Button
        label="AI 추천 받기"
        onPress={submit}
        loading={locating}
        disabled={listening}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 18, flexGrow: 1, paddingTop: 8, paddingBottom: 14 },
  request: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderWidth: 1.5,
    borderColor: tokens.green,
    borderRadius: 16,
    backgroundColor: tokens.white,
  },
  query: {
    flex: 1,
    fontFamily: tokens.font,
    fontSize: 14,
    lineHeight: 22,
    color: tokens.text,
    minHeight: 44,
    padding: 0,
    textAlignVertical: 'top',
  },
  group: { gap: 10 },
  label: {
    color: tokens.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  spacer: { flexGrow: 1, minHeight: 2 },
});
