import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getNearbyStores } from '../endpoints/store';
import type { NearbyStoresParams } from '../../types/store';

export function useNearbyStores(params: NearbyStoresParams) {
  return useQuery({
    queryKey: ['stores', 'nearby', params],
    queryFn: () => getNearbyStores(params),
    // 지도를 움직이는 동안 기존 마커가 깜빡이며 사라지지 않도록
    placeholderData: keepPreviousData,
  });
}
