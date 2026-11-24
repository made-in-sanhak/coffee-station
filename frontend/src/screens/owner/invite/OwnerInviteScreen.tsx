import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronRight, MessageCircle } from 'lucide-react-native';
import { getOwnerLinkStatus, verifyOwnerInvite } from '../../../api/endpoints/ownerInvite';
import { Button, Screen, tokens } from '../../../app/ui';
import type { RootStackScreenProps } from '../../../navigation/types';
import { useOwnerInviteStore } from '../../../store/ownerInviteStore';
import {
  applyInviteCodeInput,
  INVITE_CODE_LENGTH,
  inviteCodeFrom,
  inviteErrorMessage,
  isCompleteInviteCode,
} from './inviteCode';
import { ownerOnboardingStyles as o } from './ownerOnboardingStyles';

// 14-0-2 초대 코드 입력 / 14-0-3 코드 오류
export default function OwnerInviteScreen({
  navigation,
  route,
}: RootStackScreenProps<'OwnerInvite'>) {
  const [digits, setDigits] = useState(() =>
    inviteCodeFrom(
      route.params?.code ?? useOwnerInviteStore.getState().takePendingCode(),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputs = useRef<Array<React.ComponentRef<typeof TextInput> | null>>([]);
  const complete = isCompleteInviteCode(digits);

  // 딥링크로 이 화면이 다시 열리면 새 코드로 바꿉니다.
  const linkedCode = route.params?.code;
  useEffect(() => {
    if (linkedCode) {
      setDigits(inviteCodeFrom(linkedCode));
      setError(null);
    }
  }, [linkedCode]);

  // 이미 점주로 연결된 계정이면 바로 점주 센터로 보냅니다.
  useEffect(() => {
    let active = true;
    getOwnerLinkStatus()
      .then(status => {
        if (active && status.linked) navigation.replace('Owner');
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [navigation]);

  const change = (index: number, text: string) => {
    const result = applyInviteCodeInput(digits, index, text);
    setDigits(result.digits);
    setError(null);
    if (result.focusIndex !== index || text.length > 0) {
      inputs.current[result.focusIndex]?.focus();
    }
  };
  const backspace = (index: number) => {
    if (digits[index] === '' && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      inputs.current[index - 1]?.focus();
    }
  };
  const submit = async () => {
    if (!complete || busy) return;
    const code = digits.join('');
    setBusy(true);
    setError(null);
    try {
      const result = await verifyOwnerInvite(code);
      if (result.valid && result.cafe) {
        navigation.navigate('OwnerStoreConfirm', { code, cafe: result.cafe });
      } else {
        setError(inviteErrorMessage(result));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '코드를 확인하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen navigation={navigation} title="초대 코드 입력" scroll={false} contentStyle={o.content}>
      <View style={styles.titleBlock}>
        <Text style={o.pageTitle}>초대 코드를 입력해 주세요</Text>
        <Text style={o.pageSubtitle}>
          커피 주유소 팀에서 받은 6자리 코드예요. 코드는 매장마다 달라요
        </Text>
      </View>
      <View style={styles.code}>
        {digits.map((digit, index) => (
          <TextInput
            key={index}
            ref={input => {
              inputs.current[index] = input;
            }}
            testID={`owner-invite-digit-${index}`}
            accessibilityLabel={`초대 코드 ${index + 1}번째 자리`}
            value={digit}
            onChangeText={text => change(index, text)}
            onKeyPress={event => {
              if (event.nativeEvent.key === 'Backspace') backspace(index);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            maxLength={INVITE_CODE_LENGTH}
            selectTextOnFocus
            textAlign="center"
            style={[styles.digit, digit !== '' && styles.filledDigit, error !== null && styles.errorDigit]}
          />
        ))}
      </View>
      {error ? (
        <Text accessibilityRole="alert" testID="owner-invite-error" style={o.error}>
          {error}
        </Text>
      ) : (
        <Text style={o.muted}>영문 대문자와 숫자 6자리 · 한 번만 쓸 수 있고 7일 뒤 만료돼요</Text>
      )}
      <View style={o.spacer} />
      <Button
        testID="owner-invite-submit"
        label={error ? '다시 확인' : '확인'}
        disabled={!complete}
        loading={busy}
        onPress={submit}
      />
      <Pressable
        accessibilityRole="button"
        testID="owner-invite-inquiry"
        onPress={() =>
          Alert.alert(
            '입점 문의',
            '커피 주유소 팀이 매장을 확인한 뒤 초대 코드를 보내 드려요. 문의 창구는 곧 열릴 예정이에요.',
          )
        }
        style={({ pressed }) => [o.linkRow, pressed && o.pressed]}
      >
        <MessageCircle size={18} color={tokens.text} strokeWidth={1.8} />
        <Text style={[o.body, styles.flex]}>코드가 없나요? 입점 문의하기</Text>
        <ChevronRight size={18} color={tokens.muted} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleBlock: { gap: 4 },
  flex: { flex: 1 },
  code: { flexDirection: 'row', gap: 8 },
  digit: {
    flex: 1,
    height: 58,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.white,
    fontFamily: tokens.font,
    fontSize: 22,
    fontWeight: '700',
    color: tokens.text,
    padding: 0,
  },
  filledDigit: { borderWidth: 2, borderColor: tokens.green },
  errorDigit: { borderWidth: 2, borderColor: tokens.red },
});
