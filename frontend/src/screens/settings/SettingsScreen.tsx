import React, { useEffect, useRef, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../../api/client';
import { Button, Screen, tokens } from '../../app/ui';
import type { RootStackScreenProps } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { useConfigStore } from '../../store/configStore';
import { useSessionStore } from '../../store/sessionStore';
import { CODE128_LICENSE } from '../coupon/barcode';

export default function SettingsScreen({
  navigation,
}: RootStackScreenProps<'Settings'>) {
  const user = useSessionStore(state => state.user);
  const hasKakaoSession = useAuthStore(state => state.accessToken !== null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [license, setLicense] = useState(false);
  const mounted = useRef(true);
  const operating = useRef(false);
  const confirmingLogout = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const logout = () => {
    if (operating.current || confirmingLogout.current || !mounted.current)
      return;
    confirmingLogout.current = true;
    Alert.alert(
      user ? '로그아웃' : '미리보기 종료',
      user
        ? '카카오 서비스에서 로그아웃할까요? 기기에 저장한 개인 기록은 유지됩니다.'
        : '미리보기를 종료할까요? 기기에 저장한 개인 기록은 유지됩니다.',
      [
        {
          text: '취소',
          style: 'cancel',
          onPress: () => {
            confirmingLogout.current = false;
          },
        },
        {
          text: user ? '로그아웃' : '종료',
          onPress: async () => {
            confirmingLogout.current = false;
            if (operating.current || !mounted.current) return;
            operating.current = true;
            setBusy(true);
            const refreshToken = useSessionStore.getState().refreshToken;
            const backendUrl = useConfigStore.getState().backendUrl;
            const revoke =
              backendUrl && refreshToken
                ? apiFetch('/api/auth/logout', {
                    method: 'POST',
                    authentication: 'none',
                    body: JSON.stringify({ refreshToken }),
                  }).catch(() => undefined)
                : Promise.resolve();
            try {
              await useSessionStore.getState().logout();
              await revoke;
              if (mounted.current) setMessage('로그아웃했습니다.');
            } catch (reason) {
              if (mounted.current)
                setMessage(
                  reason instanceof Error
                    ? reason.message
                    : '로그아웃 상태를 저장하지 못했습니다.',
                );
            } finally {
              operating.current = false;
              if (mounted.current) setBusy(false);
            }
          },
        },
      ],
      {
        onDismiss: () => {
          confirmingLogout.current = false;
        },
      },
    );
  };
  return (
    <Screen navigation={navigation} title="설정">
      {message ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {message}
        </Text>
      ) : null}
      {user || hasKakaoSession ? (
        <Button
          label={user ? `${user.nickname} · 로그아웃` : '미리보기 종료'}
          variant="outline"
          disabled={busy}
          onPress={logout}
        />
      ) : (
        <Button
          label="카카오 계정으로 로그인"
          variant="outline"
          disabled={busy}
          onPress={() => navigation.navigate('Login')}
        />
      )}
      <Text style={styles.version}>커피 주유소 1.3</Text>
      <Button
        label="오픈소스 안내"
        variant="quiet"
        onPress={() => setLicense(true)}
      />
      <Modal
        visible={license}
        animationType="slide"
        onRequestClose={() => setLicense(false)}
      >
        <View style={styles.license}>
          <ScrollView>
            <Text style={styles.licenseText}>{CODE128_LICENSE}</Text>
            <Text style={styles.licenseText}>
              Noto Sans KR · SIL Open Font License 1.1{'\n'}전체 글꼴 라이선스는
              앱에 포함된 fonts/OFL.txt에 보존되어 있습니다.
            </Text>
          </ScrollView>
          <Button label="닫기" onPress={() => setLicense(false)} />
        </View>
      </Modal>
    </Screen>
  );
}
const styles = StyleSheet.create({
  error: {
    color: tokens.red,
    fontFamily: tokens.font,
    fontSize: 14,
    lineHeight: 22,
  },
  version: {
    color: tokens.muted,
    fontFamily: tokens.font,
    textAlign: 'center',
    fontSize: 12,
  },
  license: {
    flex: 1,
    backgroundColor: tokens.bg,
    padding: 24,
    paddingTop: 40,
    gap: 20,
  },
  licenseText: {
    color: tokens.text,
    fontSize: 12,
    lineHeight: 19,
    marginBottom: 24,
  },
});
