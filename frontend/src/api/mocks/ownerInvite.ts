import type {
  OwnerInviteAcceptResult,
  OwnerInviteCafe,
  OwnerInviteVerifyResult,
  OwnerLinkStatus,
} from '../../types/owner';

// 개발용 가짜 초대 코드입니다. 실제 코드는 커피 주유소 팀이 매장마다 발급합니다.
export const MOCK_OWNER_INVITE_CODE = 'K72MQ8';
const MOCK_CAFE: OwnerInviteCafe = {
  id: 'mock-cafe-1',
  name: '메가MGC커피 OO역점',
  address: '서울 중구 세종대로 110',
};
const MAX_ATTEMPTS = 5;

let remainingAttempts = MAX_ATTEMPTS;
let linked = false;

export function resetMockOwnerInvite() {
  remainingAttempts = MAX_ATTEMPTS;
  linked = false;
}

export function mockOwnerLinkStatus(): OwnerLinkStatus {
  return { linked, cafe: linked ? MOCK_CAFE : null, menuCount: 0 };
}

export function mockVerifyOwnerInvite(code: string): OwnerInviteVerifyResult {
  if (remainingAttempts <= 0) {
    return {
      valid: false,
      cafe: null,
      remainingAttempts: 0,
      message: '시도 횟수를 모두 사용했어요. 커피 주유소 팀에 새 코드를 요청해 주세요.',
    };
  }
  if (code === MOCK_OWNER_INVITE_CODE) {
    return { valid: true, cafe: MOCK_CAFE, remainingAttempts };
  }
  remainingAttempts -= 1;
  return { valid: false, cafe: null, remainingAttempts };
}

export function mockAcceptOwnerInvite(code: string): OwnerInviteAcceptResult {
  if (code !== MOCK_OWNER_INVITE_CODE) {
    throw new Error('코드를 다시 확인해 주세요.');
  }
  linked = true;
  return { cafe: MOCK_CAFE, menuCount: 0 };
}
