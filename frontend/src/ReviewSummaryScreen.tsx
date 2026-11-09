import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getReviewSummary, ReviewSummary } from './api/reviewSummary';

export default function ReviewSummaryScreen() {
  const [source, setSource] = useState<'local' | 'server'>('local');
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<ReviewSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    setLoading(true);
    setError('');
    setData(null);
    getReviewSummary(990001, source, controller.signal)
      .then(value => { if (active) { setData(value); } })
      .catch(() => { if (active) { setError('리뷰를 불러오지 못했습니다. 서버 연결을 확인하고 다시 시도하세요.'); } })
      .finally(() => { if (active) { setLoading(false); } clearTimeout(timer); });
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [source, attempt]);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.badge}>모의 데이터 실습</Text>
      <Text style={styles.title}>가상 카페 · 리뷰 요약</Text>
      <Text>현재는 실제 매장 데이터와 Gemini를 사용하지 않습니다.</Text>
      <View style={styles.controls}>
        <Button title="로컬 임시 리뷰" disabled={source === 'local'} onPress={() => setSource('local')} />
        <Button title="모의 서버 조회" disabled={source === 'server'} onPress={() => setSource('server')} />
      </View>
      {loading && <ActivityIndicator accessibilityLabel="리뷰 불러오는 중" />}
      {!!error && <Text accessibilityRole="alert">{error}</Text>}
      {data && <>
        <Text>{data.summary.notice}</Text>
        <Text>대상 리뷰 {data.summary.review_count}개</Text>
        <Text>{source === 'local' ? '로컬 샘플' : data.cache_hit ? '저장된 요약 재사용' : '요약 새로 생성'}</Text>
        {data.status === 'NO_REVIEWS' ? <Text>아직 표시할 리뷰가 없습니다.</Text> :
          data.summary.opinions.map(opinion => (
            <View key={opinion.review_id} style={styles.card}>
              <Text>{opinion.quote}</Text>
              <Text style={styles.reference}>근거 리뷰 #{opinion.review_id}</Text>
            </View>
          ))}
        <Text>상황에 따라 의견이 다를 수 있습니다. 발췌를 매장의 확정된 사실로 판단하지 마세요.</Text>
      </>}
      <Button title="다시 조회" disabled={loading} onPress={() => setAttempt(value => value + 1)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#2D211A' },
  badge: { color: '#79543B', fontWeight: '600' },
  controls: { gap: 8 },
  card: { padding: 16, backgroundColor: '#F2ECE5', borderRadius: 12, gap: 8 },
  reference: { fontSize: 12, color: '#66584E' },
});
