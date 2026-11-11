import type { RootStackScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { usePreferenceStore } from '../store/preferenceStore';
import { useSessionStore } from '../store/sessionStore';

type LoginNavigation = Pick<
  RootStackScreenProps<'KakaoLogin'>['navigation'],
  'getState' | 'popTo' | 'reset'
>;

function currentBranch() {
  if (useAuthStore.getState().accessToken === null) return 'guest';
  return useSessionStore.getState().user ? 'service' : 'preview';
}

export function createKakaoLoginContinuation(navigation: LoginNavigation) {
  const branchBefore = currentBranch();
  return () => {
    // Fresh or changed branches are replaced by RootNavigator. Only a login
    // completed inside the same branch needs an explicit auth-stack exit.
    if (branchBefore === 'guest' || currentBranch() !== branchBefore) return;
    const destination = usePreferenceStore.getState().isCompleted
      ? 'Map' : 'Preference';
    const state = navigation.getState();
    if (!state.routeNames.includes(destination)) return;
    if (state.routes.some(route => route.name === destination)) {
      navigation.popTo(destination);
    } else {
      navigation.reset({ index: 0, routes: [{ name: destination }] });
    }
  };
}
