import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

// 화면 밖(딥링크 처리 등)에서 이동할 때 씁니다. App.tsx 의 NavigationContainer 에 연결돼 있습니다.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
