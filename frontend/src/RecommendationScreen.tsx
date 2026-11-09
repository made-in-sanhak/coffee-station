import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { confirm, Conditions, parseBudget, prepare, Prepared, Result, SAMPLE, Source } from './api/recommendations';

export default function RecommendationScreen() {
  const [source, setSource] = useState<Source>('local');
  const [message, setMessage] = useState(SAMPLE);
  const [proposal, setProposal] = useState<Prepared | null>(null);
  const [budget, setBudget] = useState('4000');
  const [category, setCategory] = useState<string | null>('COFFEE');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  const reset = () => { setProposal(null); setResult(null); setError(''); };
  async function run(action: (signal: AbortSignal) => Promise<void>) {
    if (pending.current) { return; }
    const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError('');
    const timeout = setTimeout(() => controller.abort(), 95000);
    try { await action(controller.signal); }
    catch (e) { if (!controller.signal.aborted) { setError(e instanceof Error ? e.message : '요청 실패'); }
      else { setError('요청 시간이 초과되었거나 취소됐습니다. 다시 준비해 주세요.'); } }
    finally { clearTimeout(timeout); pending.current = null; setBusy(false); }
  }
  return <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <Text style={styles.title}>커피 추천 · 모의 실습</Text>
    <Text>실제 매장 데이터가 아닙니다. 기본 모드는 API를 호출하지 않습니다.</Text>
    <Button title={source === 'local' ? '모의 서버로 전환' : '로컬 모드로 전환'} disabled={busy}
      onPress={() => { reset(); setSource(source === 'local' ? 'server' : 'local'); }} />
    <Text style={styles.heading}>1. 원하는 메뉴 입력</Text>
    <TextInput accessibilityLabel="추천 요청" style={styles.input} multiline value={message} editable={!busy}
      onChangeText={text => { setMessage(text); reset(); }} />
    <Button title="예시 문장 불러오기" disabled={busy} onPress={() => { setMessage(SAMPLE); reset(); }} />
    <Button title="조건 추출" disabled={busy || !message.trim()} onPress={() => run(async signal => {
      reset(); const value = await prepare(message, source, signal);
      if (signal.aborted) { return; }
      setProposal(value); setBudget(value.suggested_constraints.max_price_krw?.toString() ?? '');
      setCategory(value.suggested_constraints.category);
    })} />
    {proposal && <View style={styles.section}>
      <Text style={styles.heading}>2. 조건 확인·수정</Text>
      <Text>근거: {Object.values(proposal.proposal.evidence).join(' / ')}</Text>
      {proposal.proposal.unresolved.map(item => <Text key={item}>{item}</Text>)}
      {proposal.status === 'AWAITING_CONFIRMATION' && <>
        <Text>최대 가격(원) · 비우면 상한 없음</Text>
        <TextInput accessibilityLabel="최대 가격" style={styles.input} keyboardType="number-pad" value={budget}
          editable={!busy} onChangeText={text => { setBudget(text); setResult(null); }} />
        <Text>종류: {category ?? '전체'}</Text>
        {(['COFFEE', 'LATTE', 'TEA', null] as const).map(value => <Button key={value ?? 'all'}
          title={value ?? '전체'} disabled={busy || category === value}
          onPress={() => { setCategory(value); setResult(null); }} />)}
        <Text>정렬: 가격 낮은 순 · 최대 20개</Text>
        <Button title="이 조건으로 확인·추천" disabled={busy} onPress={() => run(async signal => {
          const constraints: Conditions = { max_price_krw: parseBudget(budget), category, sort_by: 'price', limit: 20 };
          setResult(null);
          try { const value = await confirm(proposal, constraints, source, signal); if (!signal.aborted) { setResult(value); } }
          finally { if (source === 'server') { setProposal(null); } }
        })} />
      </>}
    </View>}
    {busy && <ActivityIndicator accessibilityLabel="추천 처리 중" />}
    {!!error && <Text accessibilityRole="alert">{error} 서버 확인 요청 후 실패했다면 조건 추출부터 다시 실행하세요.</Text>}
    {result && <View style={styles.section}>
      <Text style={styles.heading}>3. 추천 결과</Text><Text>{result.message}</Text>
      {result.recommendations.map(m => <View style={styles.card} key={m.offer.id}>
        <Text>{m.offer.name} · {m.offer.price_krw.toLocaleString()}원</Text><Text>{m.cafe.name}</Text>
      </View>)}
      <Text>조건을 자동으로 완화하지 않습니다. 원하면 조건을 수정하거나 새로 추출하세요.</Text>
    </View>}
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { padding: 20, gap: 12 }, title: { fontSize: 24, fontWeight: '700' },
  heading: { fontSize: 18, fontWeight: '600' }, section: { gap: 10 },
  input: { borderWidth: 1, borderColor: '#8A8179', borderRadius: 8, padding: 12, color: '#211A15', backgroundColor: '#FFFFFF' },
  card: { backgroundColor: '#F2ECE5', padding: 14, borderRadius: 10, gap: 6 } });
