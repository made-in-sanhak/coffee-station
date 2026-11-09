import React, { useEffect, useRef, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../../api/client';
import { Button, Field, Notice, Screen, tokens } from '../../app/ui';
import { KAKAO_MAP_BASE_URL } from '../../components/map/mapConfig';
import type { RootStackScreenProps } from '../../navigation/types';
import { useConfigStore, normalizeBackendUrl } from '../../store/configStore';
import {
  useKakaoSettingsStore,
  type KakaoSettings,
} from '../../store/kakaoSettingsStore';
import { useSessionStore } from '../../store/sessionStore';
import { CODE128_LICENSE } from '../coupon/barcode';

export default function SettingsScreen({
  navigation,
}: RootStackScreenProps<'Settings'>) {
  const settings = useKakaoSettingsStore(state => state.settings);
  const status = useKakaoSettingsStore(state => state.status);
  const storageError = useKakaoSettingsStore(state => state.error);
  const backendUrl = useConfigStore(state => state.backendUrl);
  const configHydrated = useConfigStore(state => state.hydrated);
  const user = useSessionStore(state => state.user);
  const [draft, setDraft] = useState<KakaoSettings>({ ...settings });
  const [url, setUrl] = useState(backendUrl);
  const [waiting, setWaiting] = useState(status !== 'ready');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [license, setLicense] = useState(false);
  const mounted = useRef(true);
  const operating = useRef(false);
  const confirmingLogout = useRef(false);
  const hydrating = waiting || !configHydrated;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (waiting && status === 'ready') {
      setDraft({ ...settings });
      setWaiting(false);
    }
  }, [status, settings, waiting]);
  useEffect(() => {
    setUrl(backendUrl);
  }, [backendUrl]);
  const edit = (key: keyof KakaoSettings, value: string) => {
    setDraft(old => ({ ...old, [key]: value }));
    setMessage(null);
  };
  const save = async () => {
    if (operating.current || hydrating || status !== 'ready') return;
    operating.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const nextUrl = normalizeBackendUrl(url);
      if (nextUrl !== backendUrl) await useSessionStore.getState().logout();
      await useKakaoSettingsStore.getState().saveSettings(draft);
      await useConfigStore.getState().setBackendUrl(nextUrl);
      if (mounted.current && navigation.isFocused?.() !== false)
        navigation.goBack();
    } catch (reason) {
      if (mounted.current)
        setMessage(
          reason instanceof Error
            ? reason.message
            : '설정을 저장하지 못했습니다.',
        );
    } finally {
      operating.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const logout = () => {
    if (operating.current || confirmingLogout.current || !mounted.current)
      return;
    confirmingLogout.current = true;
    Alert.alert(
      '로그아웃',
      '카카오 서비스에서 로그아웃할까요? 기기에 저장한 개인 기록은 유지됩니다.',
      [
        {
          text: '취소',
          style: 'cancel',
          onPress: () => {
            confirmingLogout.current = false;
          },
        },
        {
          text: '로그아웃',
          onPress: async () => {
            confirmingLogout.current = false;
            if (operating.current || !mounted.current) return;
            operating.current = true;
            setBusy(true);
            const refreshToken = useSessionStore.getState().refreshToken;
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
    <Screen navigation={navigation} title="카카오 설정">
      <Text style={styles.intro}>
        지도와 개인 기록은 카카오 계정 연결 없이 이용할 수 있습니다.
      </Text>
      <Field
        testID="settings-map-key"
        label="JavaScript 키 · 지도"
        value={draft.kakaoMapJsKey}
        onChangeText={value => edit('kakaoMapJsKey', value)}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        editable={!busy && !hydrating}
      />
      <Notice>
        이 JavaScript 키의 카카오맵 사용을 활성화하고 웹 도메인을 등록해 주세요.
      </Notice>
      <Text testID="settings-map-domain" selectable style={styles.domain}>
        {KAKAO_MAP_BASE_URL}
      </Text>
      <View style={styles.divider} />
      <Field
        testID="settings-server-url"
        label="서비스 서버 주소"
        value={url}
        onChangeText={setUrl}
        placeholder="https://서버주소"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        editable={!busy && !hydrating}
      />
      <Text style={styles.hint}>
        리뷰·모임·점주 관리·REST 로그인은 서비스 서버를 사용합니다.
      </Text>
      <Field
        testID="settings-rest-key"
        label="REST API 키 · 로그인"
        value={draft.kakaoRestApiKey}
        onChangeText={value => edit('kakaoRestApiKey', value)}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        editable={!busy && !hydrating}
      />
      <Text style={styles.hint}>
        서버에 등록된 카카오 앱과 일치하는 공개 키입니다. 서버가 설정한 키를
        사용하려면 비워둘 수 있습니다.
      </Text>
      {hydrating ? <Notice>저장한 설정을 불러오는 중입니다.</Notice> : null}
      {message || storageError ? (
        <Text
          testID="settings-error"
          accessibilityRole="alert"
          style={styles.error}
        >
          {message ?? storageError}
        </Text>
      ) : null}
      <Button
        testID="settings-save"
        label="저장"
        loading={busy}
        disabled={hydrating || status !== 'ready'}
        onPress={save}
      />
      <Button
        testID="settings-cancel"
        label="취소"
        variant="quiet"
        disabled={busy}
        onPress={() => navigation.goBack()}
      />
      {user ? (
        <Button
          label={`${user.nickname} · 로그아웃`}
          variant="outline"
          disabled={busy}
          onPress={logout}
        />
      ) : (
        <Button
          label="카카오 계정으로 로그인"
          variant="outline"
          disabled={busy || hydrating}
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
  intro: {
    fontFamily: tokens.font,
    color: tokens.muted,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  hint: {
    fontFamily: tokens.font,
    color: tokens.muted,
    fontSize: 12,
    lineHeight: 19,
  },
  domain: { color: tokens.text, fontSize: 14, fontFamily: 'monospace' },
  divider: { height: 1, backgroundColor: tokens.border, marginVertical: 12 },
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
