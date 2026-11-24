// 점주 연결(초대 코드) 관련 타입
// TODO(백엔드 협의): 필드 이름·형식은 임시입니다. docs/api.md 확정 후 맞춰주세요.

export interface OwnerInviteCafe {
  id: string;
  name: string;
  address: string;
}

// POST /api/owner/invites/verify 응답
// 코드가 틀려도 HTTP 오류 대신 valid=false 와 남은 시도 횟수를 돌려준다고 가정합니다.
// 시도 제한·만료 판단은 서버가 하고, 앱은 message·remainingAttempts 를 그대로 보여 줍니다.
export interface OwnerInviteVerifyResult {
  valid: boolean;
  cafe: OwnerInviteCafe | null;
  remainingAttempts: number | null;
  message?: string | null;
}

// POST /api/owner/invites/accept 응답
export interface OwnerInviteAcceptResult {
  cafe: OwnerInviteCafe;
  menuCount: number;
}

// GET /api/owner/me 응답: 로그인한 카카오 계정이 점주로 연결돼 있는지
export interface OwnerLinkStatus {
  linked: boolean;
  cafe: OwnerInviteCafe | null;
  menuCount: number;
}
