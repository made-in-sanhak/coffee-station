import { useMutation } from '@tanstack/react-query';
import { loginWithKakao } from '../endpoints/auth';
import { useAuthStore } from '../../store/authStore';

// 성공하면 로그인 상태가 저장되고, 네비게이션이 지도 화면으로 바뀝니다.
export function useKakaoLogin() {
  const setSession = useAuthStore(state => state.setSession);
  return useMutation({
    mutationFn: loginWithKakao,
    onSuccess: setSession,
  });
}
