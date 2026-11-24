import { create } from 'zustand';
import type { Cafe, Coordinate } from '../../app/domain';

export type MapCommand =
  | { id: number; type: 'search'; query: string }
  | {
      id: number;
      type: 'center';
      coordinate: Coordinate;
      currentLocation?: boolean;
    };

// 시연 데이터(DB 시드)가 행신역 주변이라 행신역에서 시작합니다.
export const DEFAULT_MAP_CENTER: Coordinate = {
  latitude: 37.6119,
  longitude: 126.8341,
};

interface ExploreSession {
  center: Coordinate;
  cafes: Cafe[];
  placeName: string;
  command: MapCommand | null;
  updateCenter: (center: Coordinate) => void;
  setCafes: (cafes: Cafe[]) => void;
  setPlaceName: (name: string) => void;
  search: (query: string) => void;
  recenter: (center: Coordinate, currentLocation?: boolean) => void;
}

let sequence = 0;
// 지도 탐색 상태만 메모리에 둡니다. 이동 경로와 검색 이력은 저장하지 않습니다.
export const useExploreSession = create<ExploreSession>(set => ({
  center: DEFAULT_MAP_CENTER,
  cafes: [],
  placeName: '',
  command: null,
  updateCenter: center => set({ center }),
  setCafes: cafes => set({ cafes }),
  setPlaceName: placeName => set({ placeName }),
  search: query =>
    set({ command: { id: ++sequence, type: 'search', query: query.trim() } }),
  recenter: (coordinate, currentLocation = false) =>
    set({
      center: coordinate,
      placeName: '',
      command: { id: ++sequence, type: 'center', coordinate, currentLocation },
    }),
}));
