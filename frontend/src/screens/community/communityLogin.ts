import type { LoginReturnTarget, RootStackScreenProps } from '../../navigation/types';
import { env } from '../../utils/env';

export function requestCommunityLogin(
  navigation: Pick<RootStackScreenProps<'Community'>['navigation'], 'navigate'>,
  returnTo: LoginReturnTarget,
  showMessage: (message: string) => void,
) {
  if (env.useMockApi) {
    showMessage('미리보기에서는 게시와 참여를 할 수 없어요. 서비스 연결 후 이용할 수 있어요.');
    return;
  }
  navigation.navigate('Login', { returnTo });
}
