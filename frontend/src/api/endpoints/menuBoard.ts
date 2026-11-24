import { apiFetch } from '../client';
import {
  mockMenuBoardDiff,
  mockMenuBoardScan,
  mockRegisterMenus,
  mockUploadTicket,
} from '../mocks/menuBoard';
import type {
  ApplyMenuDiffRequest,
  MenuBoardImage,
  MenuBoardScanResult,
  MenuBoardUploadTicket,
  MenuBulkItem,
  MenuDiffResult,
} from '../../types/menuBoard';
import { env } from '../../utils/env';

// 메뉴판 사진은 앱 서버를 거치지 않고, 서버가 준 Presigned URL 로 S3 에 바로 올립니다.
// 1) requestMenuBoardUpload 로 업로드 주소를 받고 → 2) uploadMenuBoardImage 로 올린 뒤
// → 3) 받은 imageKey 들로 scan / diff 를 요청합니다.

// TODO(백엔드 협의): POST /api/owner/menu-board/upload-url { cafeId, contentType, fileName } → { uploadUrl, imageKey, headers }
export async function requestMenuBoardUpload(
  cafeId: string,
  image: MenuBoardImage,
): Promise<MenuBoardUploadTicket> {
  if (env.useMockApi) return mockUploadTicket();
  return apiFetch<MenuBoardUploadTicket>('/api/owner/menu-board/upload-url', {
    method: 'POST',
    body: JSON.stringify({ cafeId, contentType: image.type, fileName: image.name }),
  });
}

// Presigned URL 로 직접 PUT 합니다. (우리 서버 토큰을 붙이지 않음)
export async function uploadMenuBoardImage(
  ticket: MenuBoardUploadTicket,
  image: MenuBoardImage,
): Promise<void> {
  if (env.useMockApi) return;
  const file = await (await fetch(image.uri)).blob();
  const response = await fetch(ticket.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': image.type, ...(ticket.headers ?? {}) },
    body: file,
  });
  if (!response.ok) throw new Error('메뉴판 사진을 올리지 못했어요. 다시 시도해 주세요.');
}

// TODO(백엔드 협의): POST /api/owner/menu-board/scan { cafeId, imageKeys } → { items: [{ name, category, size, price, confidence, note }] }
export async function scanMenuBoard(cafeId: string, imageKeys: string[]): Promise<MenuBoardScanResult> {
  if (env.useMockApi) return mockMenuBoardScan();
  return apiFetch<MenuBoardScanResult>('/api/owner/menu-board/scan', {
    method: 'POST',
    body: JSON.stringify({ cafeId, imageKeys }),
  });
}

// TODO(백엔드 협의): POST /api/owner/menus/bulk { cafeId, items } → { count }
export async function registerMenus(cafeId: string, items: MenuBulkItem[]): Promise<{ count: number }> {
  if (env.useMockApi) return mockRegisterMenus(items);
  return apiFetch<{ count: number }>('/api/owner/menus/bulk', {
    method: 'POST',
    body: JSON.stringify({ cafeId, items }),
  });
}

// TODO(백엔드 협의): POST /api/owner/menu-board/diff { cafeId, imageKeys } → { changes, unchanged }
export async function diffMenuBoard(cafeId: string, imageKeys: string[]): Promise<MenuDiffResult> {
  if (env.useMockApi) return mockMenuBoardDiff();
  return apiFetch<MenuDiffResult>('/api/owner/menu-board/diff', {
    method: 'POST',
    body: JSON.stringify({ cafeId, imageKeys }),
  });
}

// TODO(백엔드 협의): POST /api/owner/menus/apply-diff { cafeId, changes } → { applied }
export async function applyMenuDiff(
  cafeId: string,
  request: ApplyMenuDiffRequest,
): Promise<{ applied: number }> {
  if (env.useMockApi) return { applied: request.changes.length };
  return apiFetch<{ applied: number }>('/api/owner/menus/apply-diff', {
    method: 'POST',
    body: JSON.stringify({ cafeId, ...request }),
  });
}
