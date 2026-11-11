import { useMutation } from '@tanstack/react-query';
import { loginWithKakao } from '../endpoints/auth';
import { useAuthStore } from '../../store/authStore';
import { classifyParkSession } from '../../integration/parkSession';
import type { LoginReturnTarget } from '../../navigation/types';
import { env } from '../../utils/env';

// 성공하면 로그인 상태가 저장되고, 네비게이션이 지도 화면으로 바뀝니다.
export function useKakaoLogin(getReturnTarget?: () => LoginReturnTarget | undefined) {
  const setSession = useAuthStore(state => state.setSession);
  return useMutation({
    mutationFn: async (request: Parameters<typeof loginWithKakao>[0]) => {
      const session = await loginWithKakao(request);
      if (!env.useMockApi && !classifyParkSession(session)) {
        throw new Error('서비스 로그인 응답을 확인하지 못했어요. 다시 시도해 주세요.');
      }
      return session;
    },
    onSuccess: session => setSession(session, getReturnTarget?.()),
  });
}
