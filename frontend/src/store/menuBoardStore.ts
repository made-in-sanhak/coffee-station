import { create } from 'zustand';
import type { OwnerInviteCafe } from '../types/owner';
import type {
  MenuBoardImage,
  MenuBoardMode,
  MenuBoardScanItem,
  MenuDiffResult,
} from '../types/menuBoard';

// 메뉴판 촬영 → 인식 → 확인 화면 사이에 사진과 결과를 넘깁니다. (사진이 커서 navigation params 대신 메모리에 둠)
interface MenuBoardState {
  mode: MenuBoardMode;
  cafe: OwnerInviteCafe | null;
  images: MenuBoardImage[];
  scanItems: MenuBoardScanItem[];
  diff: MenuDiffResult | null;
  start: (mode: MenuBoardMode, cafe: OwnerInviteCafe) => void;
  addImage: (image: MenuBoardImage) => void;
  removeImage: (uri: string) => void;
  setScanItems: (items: MenuBoardScanItem[]) => void;
  setDiff: (diff: MenuDiffResult) => void;
}

export const useMenuBoardStore = create<MenuBoardState>(set => ({
  mode: 'register',
  cafe: null,
  images: [],
  scanItems: [],
  diff: null,
  start: (mode, cafe) => set({ mode, cafe, images: [], scanItems: [], diff: null }),
  addImage: image =>
    set(state => ({
      images: state.images.some(item => item.uri === image.uri) ? state.images : [...state.images, image],
    })),
  removeImage: uri => set(state => ({ images: state.images.filter(item => item.uri !== uri) })),
  setScanItems: scanItems => set({ scanItems }),
  setDiff: diff => set({ diff }),
}));
