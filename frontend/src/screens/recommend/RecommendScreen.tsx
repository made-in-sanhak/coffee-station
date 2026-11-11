import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Button, Chip, Notice, Screen, tokens } from '../../app/ui';
import { native } from '../../app/native';
import {api} from '../../app/api';
import type { RecommendationRequest } from '../../app/domain';
import type { RootStackScreenProps } from '../../navigation/types';
import { usePersonalStore } from '../../store/personalStore';
import {
  PageTitle,
  SocialIcon,
  SocialText as Text,
} from '../community/SocialParts';
import { makeRecommendationRequest } from './recommendModel';
import {fromProductConditions, type ProductProposal} from './recommendContract';

const purposes = ['드라이브스루'];
const tastes = ['디카페인', '우유 들어간'];

export default function RecommendScreen({
  navigation,
}: RootStackScreenProps<'Recommend'>) {
  const preferences = usePersonalStore(state => state.preferences);
  const onboarded = usePersonalStore(state => state.onboarded);
  const [request, setRequest] = useState<RecommendationRequest>(() => ({
    budget: onboarded ? preferences.priceMax : 5000,
    purposes: onboarded ? preferences.purposes.filter(value => purposes.includes(value)) : [],
    tastes: onboarded ? preferences.tastes.filter(value => tastes.includes(value)) : [],
    travelMinutes: preferences.travelMinutes,
    travelMode: preferences.travelMode,
    query: '',
  }));
  const [locating, setLocating] = useState(false);
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [proposal, setProposal] = useState<ProductProposal | null>(null);
  const mounted = useRef(true);
  const recording = useRef(false);
  const submitting = useRef(false);
  const inputVersion = useRef(0);
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
      setProposal(null);
      inputVersion.current++;
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
  const changeList = (name: 'purposes' | 'tastes', value: string) => {
    inputVersion.current++;
    setProposal(null);
    setRequest(previous => ({
      ...previous,
      [name]: previous[name].includes(value)
        ? previous[name].filter(item => item !== value)
        : [...previous[name], value],
    }));
  };
  const submit = async () => {
    if (submitting.current || recording.current) return;
    submitting.current = true;
    const submittedVersion = inputVersion.current;
    setHint(null);
    setLocating(true);
    let location = {};
    try {
      location = await native.getLocation();
    } catch {
      /* Region-free results remain possible without location permission. */
    }
    try {
      if (request.query.trim()) {
        const prepared = await api.post<ProductProposal>('/api/recommendations/chat/prepare',
          {message: request.query.trim(), location: Object.keys(location).length
            ? {lat:(location as {latitude:number}).latitude,lng:(location as {longitude:number}).longitude}
            : undefined});
        if (mounted.current && inputVersion.current === submittedVersion && navigation.isFocused?.() !== false) setProposal(prepared);
      } else if (mounted.current && inputVersion.current === submittedVersion && navigation.isFocused?.() !== false) {
        navigation.navigate('RecommendationResult', {
          request: makeRecommendationRequest({ ...request, ...location }),
        });
      }
    } catch (reason) {
      if (mounted.current) setHint(reason instanceof Error ? reason.message : '조건을 분석하지 못했습니다.');
    } finally {
      submitting.current = false;
      if (mounted.current) setLocating(false);
    }
  };

  return (
    <Screen
      navigation={navigation}
      tab="recommend"
      contentStyle={styles.content}
    >
      <PageTitle
        title="어떤 커피가 필요하세요?"
        subtitle="예산과 확인 가능한 메뉴 조건으로 카페를 찾아드려요"
      />
      <View style={styles.request}>
        <TextInput
          testID="recommend-query"
          accessibilityLabel="추천 요청"
          value={request.query}
          onChangeText={query => {
            inputVersion.current++;
            setProposal(null);
            setHint(null);
            setRequest(previous => ({ ...previous, query }));
          }}
          placeholder="예: 5천 원 이하 디카페인 메뉴를 찾아줘"
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
      {proposal && <Notice>{proposal.unresolved.length
        ? `추가 확인이 필요합니다: ${proposal.unresolved.join(', ')}`
        : `분석된 조건: ${proposal.conditions.maxPrice === null ? '예산 제한 없음' : `${proposal.conditions.maxPrice}원 이하`}, ${proposal.conditions.purpose === 'DRIVE_THRU' ? '드라이브스루' : '목적 제한 없음'}, ${proposal.conditions.tastes.join(', ') || '취향 제한 없음'}. 원문 근거: ${Object.values(proposal.evidence).join(', ') || '없음'}`}</Notice>}
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
              onPress={() => {
                inputVersion.current++;
                setProposal(null);
                setRequest(previous => ({ ...previous, budget: item.value }));
              }}
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
      <Notice>공부·대화, 맛 취향과 이동 시간은 자료가 준비되면 제공됩니다. 현재는 예산·드라이브스루·디카페인·우유 포함 조건을 검색합니다.</Notice>
      <View style={styles.spacer} />
      {proposal?.status === 'AWAITING_CONFIRMATION' && <Button
        label="분석된 조건 확인 후 검색"
        onPress={() => navigation.navigate('RecommendationResult', {
          request: fromProductConditions(proposal.conditions,request.query), proposalId: proposal.proposalId,
        })}
        disabled={locating || listening}
      />}
      <Button
        label="조건에 맞는 카페 찾기"
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
