import { apiFetch } from '../src/api/client';
import { queryClient } from '../src/app/queryClient';
import { useAuthStore } from '../src/store/authStore';
import { useSessionStore } from '../src/store/sessionStore';

const session = { accessToken: 'service-token', refreshToken: 'service-refresh',
  user: { id: 42, nickname: '회원', profileImageUrl: null } };
const originalFetch = globalThis.fetch;
beforeEach(() => { useAuthStore.getState().logout(); });
afterEach(() => { globalThis.fetch = originalFetch; useAuthStore.getState().logout(); });

test('mock preview cannot send a review or read private purchases', async () => {
  useAuthStore.getState().setSession({ ...session, accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' });
  const requests: string[] = [];
  globalThis.fetch = jest.fn(async (url: string | URL | Request) => { requests.push(String(url)); throw new Error('unexpected network'); });
  await expect(apiFetch('/api/reviews', { method: 'POST', body: '{}' })).rejects.toThrow('실제 서비스 로그인');
  await expect(apiFetch('/api/purchases')).rejects.toThrow('실제 서비스 로그인');
  expect(requests).toEqual([]);
  expect(useSessionStore.getState().user).toBeNull();
});

test('public preview reads strip mock bearer credentials including caller headers', async () => {
  useAuthStore.getState().setSession({ ...session, accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' });
  let authorization: string | null | undefined;
  globalThis.fetch = jest.fn(async (_url: string | URL | Request, options?: RequestInit) => {
    authorization = new Headers(options?.headers).get('Authorization');
    return { ok: true, json: async () => ({ success: true, data: [], message: null }) } as Response;
  });
  await expect(apiFetch('/api/cafes', { headers: { Authorization: 'Bearer mock-access-token' } })).resolves.toEqual([]);
  expect(authorization).toBeNull();
});

test('real Park session is visible to feature screens and logout clears private cache', async () => {
  useAuthStore.getState().setSession(session);
  expect(useSessionStore.getState().user?.id).toBe('42');
  let authorization: string | null | undefined;
  globalThis.fetch = jest.fn(async (_url: string | URL | Request, options?: RequestInit) => {
    authorization = new Headers(options?.headers).get('Authorization');
    return { ok: true, json: async () => ({ success: true, data: { id: 'review' }, message: null }) } as Response;
  });
  await expect(apiFetch('/api/reviews', { method: 'POST', body: '{}' })).resolves.toEqual({ id: 'review' });
  expect(authorization).toBe('Bearer service-token');
  queryClient.setQueryData(['private-record'], { id: 'private' });
  await useSessionStore.getState().logout();
  expect(useAuthStore.getState().accessToken).toBeNull();
  expect(useSessionStore.getState().user).toBeNull();
  expect(queryClient.getQueryData(['private-record'])).toBeUndefined();
});

test.each([
  '/api/recommendations/search',
  '/api/recommendations/chat/prepare',
  '/api/recommendations/chat/confirm',
])('development preview can POST %s without mock credentials', async path => {
  useAuthStore.getState().setSession({ ...session, accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' });
  globalThis.fetch = jest.fn(async (_url: string | URL | Request, options?: RequestInit) => {
    expect(new Headers(options?.headers).has('Authorization')).toBe(false);
    expect(options?.method).toBe('POST');
    return { ok: true, json: async () => ({ success: true, data: { accepted: true }, message: null }) } as Response;
  });
  await expect(apiFetch(path, {
    method: 'POST', body: '{}', headers: { Authorization: 'Bearer mock-access-token' },
  })).resolves.toEqual({ accepted: true });
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  expect(useSessionStore.getState().user).toBeNull();
});

test.each([
  ['/api/recommendations/search', 'DELETE'],
  ['/api/recommendations/search/extra', 'POST'],
  ['/api/recommendations', 'POST'],
  ['/api/orders', 'POST'],
  ['/api/purchases', 'POST'],
])('preview still blocks %s with %s', async (path, method) => {
  useAuthStore.getState().setSession({ ...session, accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' });
  globalThis.fetch = jest.fn();
  await expect(apiFetch(path, { method, body: '{}' })).rejects.toThrow('실제 서비스 로그인');
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

test('release preview cannot POST any development recommendation endpoint', async () => {
  useAuthStore.getState().setSession({ ...session, accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' });
  globalThis.fetch = jest.fn();
  const previous = __DEV__;
  try {
    (globalThis as typeof globalThis & { __DEV__: boolean }).__DEV__ = false;
    for (const path of ['/api/recommendations/search', '/api/recommendations/chat/prepare', '/api/recommendations/chat/confirm']) {
      await expect(apiFetch(path, { method: 'POST', body: '{}' })).rejects.toThrow('실제 서비스 로그인');
    }
    expect(globalThis.fetch).not.toHaveBeenCalled();
  } finally {
    (globalThis as typeof globalThis & { __DEV__: boolean }).__DEV__ = previous;
  }
});

