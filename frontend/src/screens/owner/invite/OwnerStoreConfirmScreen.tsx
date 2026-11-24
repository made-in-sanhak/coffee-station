import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Coffee } from 'lucide-react-native';
import { acceptOwnerInvite } from '../../../api/endpoints/ownerInvite';
import { Button, Screen, tokens } from '../../../app/ui';
import type { RootStackScreenProps } from '../../../navigation/types';
import { useSessionStore } from '../../../store/sessionStore';
import { ownerOnboardingStyles as o } from './ownerOnboardingStyles';

// 14-0-4 매장 확인: 맞으면 지금 로그인한 카카오 계정을 이 매장의 점주로 연결합니다.
export default function OwnerStoreConfirmScreen({
  navigation,
  route,
}: RootStackScreenProps<'OwnerStoreConfirm'>) {
  const { code, cafe } = route.params;
  const nickname = useSessionStore(state => state.user?.nickname);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await acceptOwnerInvite(code);
      // 연결 뒤에는 뒤로 가기로 코드 입력 화면에 돌아오지 않게 쌓인 화면을 정리합니다.
      navigation.reset({
        index: 1,
        routes: [{ name: 'Map' }, { name: 'Owner' }],
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '매장을 연결하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };
  const details = [
    { label: '상호', value: cafe.name },
    { label: '주소', value: cafe.address },
    { label: '연결할 계정', value: `카카오 · ${nickname ?? '로그인한 계정'}` },
    { label: '권한', value: '메뉴·가격·이벤트 관리, 방문 통계' },
  ];
  return (
    <Screen navigation={navigation} title="매장 확인" scroll={false} contentStyle={o.content}>
      <View style={styles.titleBlock}>
        <Text style={o.pageTitle}>이 매장이 맞나요?</Text>
        <Text style={o.pageSubtitle}>
          코드에 연결된 매장이에요. 맞으면 지금 로그인한 카카오 계정을 이 매장의 점주로 연결할게요
        </Text>
      </View>
      <View style={[o.card, o.row, styles.storeCard]}>
        <View style={o.storePhoto}>
          <Coffee size={22} color={tokens.brown} strokeWidth={1.8} />
        </View>
        <View style={styles.storeText}>
          <View style={styles.nameRow}>
            <Text style={o.storeName}>{cafe.name}</Text>
            <View style={o.badge}>
              <Text style={o.badgeText}>코드 확인됨</Text>
            </View>
          </View>
          <Text style={o.muted}>{cafe.address}</Text>
        </View>
      </View>
      <View style={o.card}>
        {details.map((item, index) => (
          <React.Fragment key={item.label}>
            {index > 0 && <View style={o.divider} />}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{item.label}</Text>
              <Text style={styles.detailValue}>{item.value}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
      {error && (
        <Text accessibilityRole="alert" style={o.error}>
          {error}
        </Text>
      )}
      <View style={o.spacer} />
      <Button testID="owner-store-confirm" label="네, 우리 매장이에요" loading={busy} onPress={confirm} />
      <Button
        testID="owner-store-reject"
        label="아니에요, 다른 매장이에요"
        variant="outline"
        disabled={busy}
        onPress={() => navigation.goBack()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleBlock: { gap: 4 },
  storeCard: { padding: 14, gap: 12 },
  storeText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  detailRow: { flexDirection: 'row', gap: 12 },
  detailLabel: {
    width: 76,
    fontFamily: tokens.font,
    fontSize: 13,
    lineHeight: 18,
    color: tokens.muted,
  },
  detailValue: {
    flex: 1,
    fontFamily: tokens.font,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: tokens.text,
  },
});
