import { native } from '../../app/native';
function key(accountId: string) {
  if (!accountId) throw new Error('로그인 정보를 확인해 주세요.');
  return `coffee.last-order.${accountId}`;
}
function valid(orderId: string) {
  return /^[A-Za-z0-9_-]{1,128}$/.test(orderId);
}
export async function saveLastOrder(
  accountId: string,
  orderId: string,
): Promise<void> {
  if (!valid(orderId)) throw new Error('주문 정보를 확인할 수 없습니다.');
  await native.secureSet(key(accountId), orderId);
}
export async function getLastOrder(accountId: string): Promise<string | null> {
  const value = await native.secureGet(key(accountId));
  if (value !== null && !valid(value))
    throw new Error('저장된 주문 정보를 읽을 수 없습니다.');
  return value;
}
