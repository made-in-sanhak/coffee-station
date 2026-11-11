import type { Order, OrderStatus } from '../../app/domain';

export interface OrderInput {
  dealId: string;
  quantity: number;
  couponId?: string;
  idempotencyKey: string;
  termsAccepted: true;
  pickupMinutes?: 10 | 20 | 30;
  requestNote?: string;
}
interface Transport {
  post<T>(path: string, body?: unknown): Promise<T>;
}
export interface PaymentAttempt {
  orderId?: string;
  pending?: Promise<{ orderId: string; paymentUrl: string }>;
}
export function paymentDestination(
  status: OrderStatus,
): 'OrderComplete' | 'PaymentFailure' | null {
  if (['PAID', 'ACCEPTED', 'READY', 'PICKED_UP'].includes(status))
    return 'OrderComplete';
  if (status === 'FAILED' || status === 'CANCELLED') return 'PaymentFailure';
  return null;
}
export function canCancelOrder(status: OrderStatus) {
  return status === 'PENDING_PAYMENT' || status === 'PAID';
}
export function trustedPaymentUrl(url: string) {
  return /^https:\/\/online-payment\.kakaopay\.com\/(?!\/)[^\s\\]*$/i.test(url);
}
export function isPaymentReturn(url: string, orderId: string) {
  const match = /^coffeestation:\/\/payment-return\?([^#]*)$/.exec(url);
  if (!match) return false;
  try {
    const values = match[1]
      .split('&')
      .map(part => {
        const [key, ...value] = part.split('=');
        return [
          decodeURIComponent(key),
          decodeURIComponent(value.join('=').replace(/\+/g, ' ')),
        ];
      })
      .filter(([key]) => key === 'orderId');
    return values.length === 1 && values[0][1] === orderId;
  } catch {
    return false;
  }
}
export function remainingTime(endsAt?: string, now = Date.now()) {
  const end = endsAt ? Date.parse(endsAt) : NaN;
  if (!Number.isFinite(end)) return '--:--';
  const seconds = Math.max(0, Math.ceil((end - now) / 1000));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}
export function paymentDeadline(createdAt?: string): string | undefined {
  const created = createdAt ? Date.parse(createdAt) : NaN;
  return Number.isFinite(created)
    ? new Date(created + 15 * 60 * 1000).toISOString()
    : undefined;
}
export async function beginPayment(
  transport: Transport,
  state: PaymentAttempt,
  input: OrderInput,
): Promise<{ orderId: string; paymentUrl: string }> {
  if (state.pending) return state.pending;
  const pending = preparePayment(transport, state, input);
  state.pending = pending;
  try {
    return await pending;
  } finally {
    delete state.pending;
  }
}
async function preparePayment(
  transport: Transport,
  state: PaymentAttempt,
  input: OrderInput,
): Promise<{ orderId: string; paymentUrl: string }> {
  if (!state.orderId) {
    const order = await transport.post<Order>('/api/orders', input);
    state.orderId = order.id;
  }
  const result = await transport.post<{ orderId: string; paymentUrl: string }>(
    `/api/orders/${encodeURIComponent(state.orderId)}/pay`,
    { idempotencyKey: `${input.idempotencyKey}-payment` },
  );
  if (result.orderId !== state.orderId || !trustedPaymentUrl(result.paymentUrl))
    throw new Error('안전한 카카오페이 결제 주소를 확인하지 못했습니다.');
  return result;
}
