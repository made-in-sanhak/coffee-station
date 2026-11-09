import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { api, useResource } from '../../app/api';
import type { ReceiptDraft } from '../../app/domain';
import { native } from '../../app/native';
import { Button, Screen } from '../../app/ui';
import type { RootStackScreenProps } from '../../navigation/types';
import { useSessionStore } from '../../store/sessionStore';
import { createManualDraft } from './receiptForm';
import { RewardAsset, ReceiptViewfinder } from './RewardVisuals';
import { rewardColors as c, rewardStyles as s } from './RewardStyles';

export default function ReceiptScreen({
  navigation,
}: RootStackScreenProps<'Receipt'>) {
  const user = useSessionStore(state => state.user);
  const statistics = useResource<{
    stamps: number;
    receiptReward?: { total: number; progress: number; target: number };
  }>('/api/users/me/statistics', undefined, !!user);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string>();
  const stamps = user
    ? statistics.data?.receiptReward?.progress ?? statistics.data?.stamps
    : undefined;
  const scan = async (camera: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const picked = await native.pickImage(camera);
      setImageUri(picked.uri);
      const draft = await api.post<ReceiptDraft>('/api/receipts/scan', {
        base64: picked.base64,
        type: picked.type,
        name: picked.name,
      });
      navigation.navigate('ReceiptReview', {
        draft: { ...draft, imageUri: picked.uri },
      });
    } catch (cause) {
      if ((cause as { code?: string })?.code !== 'E_CANCELLED')
        setError(
          cause instanceof Error
            ? cause.message
            : '영수증을 읽지 못했습니다. 다시 선택하거나 직접 입력해 주세요.',
        );
    } finally {
      setBusy(false);
    }
  };
  const manual = () => {
    const form = createManualDraft();
    navigation.navigate('ReceiptReview', {
      draft: {
        storeName: '',
        purchasedAt: new Date(form.purchasedAt.replace(' ', 'T')).toISOString(),
        total: 0,
        items: [{ menuName: '', quantity: 1, unitPrice: 0, caffeineMg: null }],
        verified: false,
      },
    });
  };
  return (
    <Screen navigation={navigation} title="영수증 등록" tab="garage">
      <View style={s.content}>
        <View style={s.gap4}>
          <Text style={s.title}>영수증을 찍어 주세요</Text>
          <Text style={s.subtitle}>
            매장명, 결제 일시, 메뉴, 금액을 자동으로 읽어요
          </Text>
        </View>
        <ReceiptViewfinder imageUri={imageUri} />
        <View style={s.row}>
          <View style={s.flex}>
            <Button
              label="촬영하기"
              onPress={() => scan(true)}
              disabled={busy}
            />
          </View>
          <View style={s.flex}>
            <Button
              label="앨범에서 선택"
              variant="outline"
              onPress={() => scan(false)}
              disabled={busy}
            />
          </View>
        </View>
        {busy && (
          <View style={s.row}>
            <ActivityIndicator color={c.green} />
            <Text style={s.muted}>영수증을 확인하고 있어요.</Text>
          </View>
        )}
        {error && (
          <Text
            accessibilityRole="alert"
            testID="receipt-scan-error"
            style={s.error}
          >
            {error}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          testID="receipt-manual"
          onPress={manual}
          disabled={busy}
          style={({ pressed }) => [s.linkRow, pressed && s.pressed]}
        >
          <RewardAsset name="edit" />
          <Text style={[s.text, s.flex]}>영수증이 없나요? 직접 입력하기</Text>
          <RewardAsset name="right" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Coupons')}
          style={({ pressed }) => [
            s.linkRow,
            { backgroundColor: c.greenLight, borderWidth: 0 },
            pressed && s.pressed,
          ]}
        >
          <RewardAsset name="ticket" />
          <View style={[s.flex, s.gap2]}>
            <Text style={[s.heading, s.green]}>
              영수증 3번 인증하면 할인 쿠폰!
            </Text>
            <Text style={[s.muted, { color: c.greenMid }]}>
              {stamps === undefined
                ? '인증 내역과 쿠폰을 확인해 주세요'
                : `영수증 ${stamps % 3}/3회 완료 · ${
                    3 - (stamps % 3)
                  }번만 더 올려 주세요`}
            </Text>
          </View>
        </Pressable>
      </View>
    </Screen>
  );
}
