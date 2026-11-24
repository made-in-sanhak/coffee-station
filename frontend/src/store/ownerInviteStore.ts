import { create } from 'zustand';

// 딥링크로 받은 초대 코드를 로그인이 끝날 때까지 잠시 들고 있습니다. (기기에 저장하지 않음)
interface OwnerInviteState {
  pendingCode: string | null;
  setPendingCode: (code: string) => void;
  takePendingCode: () => string | null;
}

export const useOwnerInviteStore = create<OwnerInviteState>((set, get) => ({
  pendingCode: null,
  setPendingCode: code => set({ pendingCode: code }),
  takePendingCode: () => {
    const { pendingCode } = get();
    if (pendingCode) set({ pendingCode: null });
    return pendingCode;
  },
}));
