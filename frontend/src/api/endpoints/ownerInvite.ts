import { apiFetch } from '../client';
import {
  mockAcceptOwnerInvite,
  mockOwnerLinkStatus,
  mockVerifyOwnerInvite,
} from '../mocks/ownerInvite';
import type {
  OwnerInviteAcceptResult,
  OwnerInviteVerifyResult,
  OwnerLinkStatus,
} from '../../types/owner';
import { env } from '../../utils/env';

// 로그인한 카카오 계정이 이미 점주로 연결돼 있는지 확인합니다.
// TODO(백엔드 협의): 엔드포인트·응답 형식 미정. 지금은 GET /api/owner/me 로 가정합니다.
export async function getOwnerLinkStatus(): Promise<OwnerLinkStatus> {
  if (env.useMockApi) return mockOwnerLinkStatus();
  return apiFetch<OwnerLinkStatus>('/api/owner/me');
}

// 6자리 초대 코드가 맞는지 확인하고, 연결될 매장을 받아 옵니다. (아직 연결하지 않음)
// TODO(백엔드 협의): POST /api/owner/invites/verify { code } → { valid, cafe, remainingAttempts, message }
export async function verifyOwnerInvite(code: string): Promise<OwnerInviteVerifyResult> {
  if (env.useMockApi) return mockVerifyOwnerInvite(code);
  return apiFetch<OwnerInviteVerifyResult>('/api/owner/invites/verify', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

// 현재 로그인한 카카오 계정을 코드의 매장 점주로 연결합니다. 코드는 한 번만 쓸 수 있습니다.
// TODO(백엔드 협의): POST /api/owner/invites/accept { code } → { cafe, menuCount }
export async function acceptOwnerInvite(code: string): Promise<OwnerInviteAcceptResult> {
  if (env.useMockApi) return mockAcceptOwnerInvite(code);
  return apiFetch<OwnerInviteAcceptResult>('/api/owner/invites/accept', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}
