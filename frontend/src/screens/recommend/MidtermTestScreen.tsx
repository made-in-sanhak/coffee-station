import React, {useEffect, useRef, useState} from 'react';
import {Button, ScrollView, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {midtermApi, MidtermConditions, MidtermProposal, MidtermResult} from '../../api/endpoints/midterm';

const initial: MidtermConditions = {menu_code:'AMERICANO', temperature:'ICE', size:null,
  max_price_krw:4000, sort_by:'price', limit:10};

// Isolated development screen: never maps synthetic IDs to real cafe/map routes.
export default function MidtermTestScreen() {
  const [conditions, setConditions] = useState(initial);
  const [message, setMessage] = useState('4천 원 이하 아이스 아메리카노 추천해줘.');
  const [proposal, setProposal] = useState<MidtermProposal | null>(null);
  const [result, setResult] = useState<MidtermResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef(true), pending = useRef(false);
  useEffect(() => { active.current = true; return () => {active.current = false;}; }, []);
  const run = async (action: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(''); setResult(null);
    try { await action(); }
    catch (e) { if (active.current) setError(e instanceof Error ? e.message : '요청 실패'); }
    finally { pending.current = false; if (active.current) setBusy(false); }
  };
  const change = (next: MidtermConditions) => {setConditions(next); setResult(null);};
  if (!__DEV__) return null;
  return <SafeAreaView style={{flex:1}}><ScrollView contentContainerStyle={{padding:20, gap:14}}>
    <Text>개발용 MVP 추천 테스트</Text>
    <Text>임시 데이터입니다. 지도·실제 매장 연결은 하지 않습니다. 위치·목적·취향 조건은 지원하지 않습니다.</Text>
    <Text>PC 서버: Android 에뮬레이터 기본 주소 10.0.2.2:8080. 서버 EXTRACTION_MODE=mock으로 실행하세요.</Text>
    <Text>메뉴: {conditions.menu_code ?? '전체'} / 온도: {conditions.temperature ?? '전체'}</Text>
    <View style={{gap:6}}>
      <Button disabled={busy} title="아메리카노" onPress={() => change({...conditions, menu_code:'AMERICANO'})} />
      <Button disabled={busy} title="카페라떼" onPress={() => change({...conditions, menu_code:'CAFE_LATTE'})} />
      <Button disabled={busy} title="ICE" onPress={() => change({...conditions, temperature:'ICE'})} />
      <Button disabled={busy} title="HOT" onPress={() => change({...conditions, temperature:'HOT'})} />
    </View>
    <Text>예산: {conditions.max_price_krw ?? '제한 없음'}원 / 사이즈: {conditions.size ?? '전체'}</Text>
    <Button disabled={busy} title="4천 원 이하" onPress={() => change({...conditions, max_price_krw:4000})} />
    <Button disabled={busy} title="5천 원 미만" onPress={() => change({...conditions, max_price_krw:4999})} />
    <Button disabled={busy} title="선택 조건 검색" onPress={() => {
      setProposal(null);
      void run(async () => {const value = await midtermApi.search(conditions); if (active.current) setResult(value);});
    }} />
    <TextInput accessibilityLabel="MVP 자연어 요청" value={message} editable={!busy}
      onChangeText={value => {setMessage(value); setProposal(null); setResult(null);}} />
    <Text>mock 자연어는 위 기본 예문과 ‘5천 원 미만 따뜻한 카페라떼 추천해줘.’만 지원합니다.</Text>
    <Button disabled={busy} title="자연어 조건 준비" onPress={() => {
      setProposal(null);
      void run(async () => {const value = await midtermApi.prepare(message); if (active.current) {
        setProposal(value); setConditions(value.suggested_constraints);
      }});
    }} />
    {proposal && <>
      <Text>{proposal.status} / 추출: {proposal.extraction_mode}</Text>
      <Text>{JSON.stringify(proposal.proposal.evidence)}</Text>
      <Text>{proposal.proposal.unresolved.join('\n')}</Text>
      <Text>위 조건을 확인하거나 수정한 뒤 확인 버튼을 누르세요.</Text>
      <Button title="확인 후 추천" disabled={busy || proposal.status !== 'AWAITING_CONFIRMATION'} onPress={() => {
        void run(async () => {const value = await midtermApi.confirm(proposal.proposal_id, conditions);
          if (active.current) {setResult(value); setProposal(null);}
        });
      }} />
    </>}
    {busy && <Text>요청 중...</Text>}
    {!!error && <Text accessibilityRole="alert">{error}</Text>}
    {result && <><Text>{result.status} / {result.data_mode}</Text><Text>{result.notice}</Text>
      {!result.recommendations.length && <Text>조건에 맞는 결과가 없습니다.</Text>}
      {result.recommendations.map(item => <Text key={item.offer_id}>
        {item.cafe_name} ({item.cafe_id}) / {item.reason}
      </Text>)}
    </>}
  </ScrollView></SafeAreaView>;
}
