import { apiFetch } from '../client';
import { getMockNearbyStores } from '../mocks/stores';
import type { NearbyStoresParams, Store } from '../../types/store';
import { env } from '../../utils/env';

// 반경 안의 매장과 선택한 메뉴의 가격을 가져옵니다.
// TODO(백엔드 협의): URL·파라미터 이름은 임시입니다. docs/api.md 확정 후 맞춰주세요.
export async function getNearbyStores(
  params: NearbyStoresParams,
): Promise<Store[]> {
  if (env.useMockApi) {
    return getMockNearbyStores(params);
  }
  const query =
    `lat=${params.latitude}&lng=${params.longitude}` +
    `&radius=${params.radius}&menu=${params.menu}`;
  return apiFetch<Store[]>(`/stores/nearby?${query}`);
}
