import { useEffect } from 'react';
import { Linking } from 'react-native';
import { navigationRef } from '../navigation/navigationRef';
import { parseOwnerInviteUrl } from '../screens/owner/invite/inviteCode';
import { useAuthStore } from '../store/authStore';
import { useOwnerInviteStore } from '../store/ownerInviteStore';

// coffeestation://owner/invite?code=XXXXXX 로 앱이 열리면 초대 코드 화면으로 보냅니다.
// 로그인 전이면 점주 로그인 화면으로 보내고, 코드는 로그인 뒤 초대 코드 화면에서 자동으로 채웁니다.
export function openOwnerInvite(code: string) {
  useOwnerInviteStore.getState().setPendingCode(code);
  const go = () => {
    if (useAuthStore.getState().accessToken !== null) {
      useOwnerInviteStore.getState().takePendingCode();
      navigationRef.navigate('OwnerInvite', { code });
    } else {
      navigationRef.navigate('OwnerLogin');
    }
  };
  if (navigationRef.isReady()) {
    go();
    return;
  }
  const unsubscribe = navigationRef.addListener('state', () => {
    if (!navigationRef.isReady()) return;
    unsubscribe();
    go();
  });
}

export default function OwnerInviteLinkBridge() {
  useEffect(() => {
    const handle = (url: string | null | undefined) => {
      const code = parseOwnerInviteUrl(url);
      if (code) openOwnerInvite(code);
    };
    Linking.getInitialURL().then(handle).catch(() => undefined);
    const subscription = Linking.addEventListener('url', event => handle(event.url));
    return () => subscription.remove();
  }, []);
  return null;
}
