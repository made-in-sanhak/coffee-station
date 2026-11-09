import { create } from 'zustand';
import { DEMO_AVAILABLE } from './buildMode';

interface DemoState {
  active: boolean;
  startDemo: () => void;
  endDemo: () => void;
}

// 인증 store와 별개인 메모리 상태입니다. 토큰·사용자 계정을 만들지 않습니다.
export const useDemoStore = create<DemoState>(set => ({
  active: false,
  startDemo: () => {
    if (DEMO_AVAILABLE) {
      set({ active: true });
    }
  },
  endDemo: () => set({ active: false }),
}));
