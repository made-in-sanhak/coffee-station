import { apiFetch } from '../client';
import { queryClient } from '../../app/queryClient';
import {
  mockMenuBoardDiff,
  mockMenuBoardScan,
  mockRegisterMenus,
} from '../mocks/menuBoard';
import type {
  ApplyMenuDiffRequest,
  MenuBoardImage,
  MenuBoardScanResult,
  MenuBulkItem,
  MenuDiffResult,
} from '../../types/menuBoard';
import { env } from '../../utils/env';

function photos(images: MenuBoardImage[]) {
  const bytes = (base64: string) =>
    (base64.length / 4) * 3 -
    (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
  if (
    images.some(({ base64 }) => !base64 || bytes(base64) > 10 * 1024 * 1024)
  ) {
    throw new Error('10MB 이하의 사진을 선택해 주세요.');
  }
  if (
    images.reduce((sum, image) => sum + bytes(image.base64), 0) >
    20 * 1024 * 1024
  ) {
    throw new Error('사진 용량 합계는 20MB까지 가능해요.');
  }
  return images.map(({ type, base64 }) => ({ type, base64 }));
}

function refreshMenuPrices() {
  void queryClient.invalidateQueries({
    predicate: ({ queryKey }) => {
      const endpoint = queryKey[3];
      return (
        queryKey[0] === 'coffee-api' &&
        typeof endpoint === 'string' &&
        (endpoint === '/api/cafes' ||
          endpoint.startsWith('/api/cafes/') ||
          endpoint === '/api/menus/compare' ||
          endpoint === '/api/owner/dashboard')
      );
    },
  });
}

export async function scanMenuBoard(
  cafeId: string,
  images: MenuBoardImage[],
): Promise<MenuBoardScanResult> {
  if (env.useMockApi) return mockMenuBoardScan();
  return apiFetch<MenuBoardScanResult>('/api/owner/menu-board/scan', {
    method: 'POST',
    body: JSON.stringify({ cafeId, images: photos(images) }),
  });
}

export async function registerMenus(
  cafeId: string,
  items: MenuBulkItem[],
): Promise<{ count: number }> {
  if (env.useMockApi) return mockRegisterMenus(items);
  const result = await apiFetch<{ count: number }>('/api/owner/menus/bulk', {
    method: 'POST',
    body: JSON.stringify({ cafeId, items }),
  });
  refreshMenuPrices();
  return result;
}

export async function diffMenuBoard(
  cafeId: string,
  images: MenuBoardImage[],
): Promise<MenuDiffResult> {
  if (env.useMockApi) return mockMenuBoardDiff();
  return apiFetch<MenuDiffResult>('/api/owner/menu-board/diff', {
    method: 'POST',
    body: JSON.stringify({ cafeId, images: photos(images) }),
  });
}

export async function applyMenuDiff(
  cafeId: string,
  request: ApplyMenuDiffRequest,
): Promise<{ applied: number }> {
  if (env.useMockApi) return { applied: request.changes.length };
  const result = await apiFetch<{ applied: number }>(
    '/api/owner/menus/apply-diff',
    {
      method: 'POST',
      body: JSON.stringify({ cafeId, ...request }),
    },
  );
  refreshMenuPrices();
  return result;
}
