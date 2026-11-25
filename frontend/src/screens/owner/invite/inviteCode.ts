import type { OwnerInviteVerifyResult } from '../../../types/owner';

export const INVITE_CODE_LENGTH = 6;

export const emptyInviteCode = () => Array<string>(INVITE_CODE_LENGTH).fill('');

// 영문 대문자·숫자만 남깁니다. (소문자는 대문자로 바꿈)
export const sanitizeInviteCode = (text: string) =>
  text.toUpperCase().replace(/[^A-Z0-9]/g, '');

export const isCompleteInviteCode = (digits: string[]) =>
  digits.length === INVITE_CODE_LENGTH && digits.every(digit => digit.length === 1);

// index 칸에 text 를 입력했을 때의 결과.
// 한 글자면 그 칸만 채우고 다음 칸으로, 여러 글자(붙여넣기)면 그 칸부터 차례로 채웁니다.
export function applyInviteCodeInput(
  digits: string[],
  index: number,
  text: string,
): { digits: string[]; focusIndex: number } {
  const next = [...digits];
  const chars = sanitizeInviteCode(text);
  if (chars.length === 0) {
    next[index] = '';
    return { digits: next, focusIndex: index };
  }
  // 이미 한 글자가 있는 칸에 새 글자를 치면 text 가 "기존+새" 두 글자로 들어옵니다.
  const typed =
    chars.length === 2 && digits[index] && chars[0] === digits[index] ? chars.slice(1) : chars;
  const start = typed.length >= INVITE_CODE_LENGTH ? 0 : index;
  [...typed].slice(0, INVITE_CODE_LENGTH - start).forEach((char, offset) => {
    next[start + offset] = char;
  });
  const lastFilled = Math.min(start + typed.length, INVITE_CODE_LENGTH) - 1;
  return { digits: next, focusIndex: Math.min(lastFilled + 1, INVITE_CODE_LENGTH - 1) };
}

export function inviteCodeFrom(value: string | undefined | null): string[] {
  const code = sanitizeInviteCode(value ?? '').slice(0, INVITE_CODE_LENGTH);
  return Array.from({ length: INVITE_CODE_LENGTH }, (_, index) => code[index] ?? '');
}

// coffeestation://owner/invite?code=K72MQ8 → 'K72MQ8'
export function parseOwnerInviteUrl(url: string | null | undefined): string | null {
  const match = /^coffeestation:\/\/owner\/invite\/?\?([^#]*)/i.exec(url ?? '');
  if (!match) return null;
  const raw = match[1]
    .split('&')
    .map(part => part.split('='))
    .find(([key]) => key === 'code')?.[1];
  if (!raw) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const code = sanitizeInviteCode(decoded);
  return code.length === INVITE_CODE_LENGTH ? code : null;
}

// 서버가 준 문구를 우선 보여 주고, 없으면 남은 시도 횟수를 붙인 기본 문구를 씁니다.
export function inviteErrorMessage(result: Pick<OwnerInviteVerifyResult, 'message' | 'remainingAttempts'>) {
  if (result.message) return result.message;
  return typeof result.remainingAttempts === 'number'
    ? `코드가 맞지 않아요. 다시 확인해 주세요 (남은 시도 ${result.remainingAttempts}회)`
    : '코드가 맞지 않아요. 다시 확인해 주세요';
}
