import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useResource } from '../src/app/api';
import { getApiBaseUrl } from '../src/api/client';
import { useConfigStore } from '../src/store/configStore';
import { useAuthStore } from '../src/store/authStore';

jest.mock('../src/app/native', () => ({ native: { secureSet: async () => {} } }));
const originalFetch = globalThis.fetch;
const clients: QueryClient[] = [];
const trees: Renderer.ReactTestRenderer[] = [];
const requests: string[] = [];
let enabled = true;
let result: ReturnType<typeof useResource<string[]>>;
function Probe() { result = useResource<string[]>('/api/cafes', undefined, enabled); return null; }
async function open() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  await act(async () => {
    trees.push(Renderer.create(<QueryClientProvider client={client}><Probe /></QueryClientProvider>));
  });
  await act(async () => { await new Promise<void>(resolve => setTimeout(resolve, 20)); });
}
beforeEach(() => {
  requests.length = 0; enabled = true;
  useAuthStore.getState().setSession({ accessToken: 'service-token', refreshToken: 'service-refresh',
    user: { id: 42, nickname: '회원', profileImageUrl: null } });
  useConfigStore.setState({ backendUrl: '', hydrated: true });
  globalThis.fetch = jest.fn(async (url: string | URL | Request) => {
    requests.push(String(url));
    return { ok: true, json: async () => ({ success: true, data: ['actual-service-response'], message: null }) } as Response;
  });
});
afterEach(async () => {
  await act(() => { trees.splice(0).forEach(tree => tree.unmount()); });
  clients.splice(0).forEach(client => client.clear());
  globalThis.fetch = originalFetch; useAuthStore.getState().logout();
});

test('fresh Park default enables real GET resources without a settings override', async () => {
  await open();
  expect(requests).toEqual(['http://10.0.2.2:8080/api/cafes']);
  expect(result!.data).toEqual(['actual-service-response']);
  expect(result!.error).toBeNull();
});

test('custom HTTPS base is shared by resource gating and transport', async () => {
  await useConfigStore.getState().setBackendUrl('https://coffee.example/');
  await open();
  expect(requests).toEqual(['https://coffee.example/api/cafes']);
  expect(result!.data).toEqual(['actual-service-response']);
});

test('emulator address can replace a saved USB server override', async () => {
  await useConfigStore.getState().setBackendUrl('http://127.0.0.1:8080');
  await useConfigStore.getState().setBackendUrl('http://10.0.2.2:8080');
  await open();
  expect(requests).toEqual(['http://10.0.2.2:8080/api/cafes']);
  expect(result!.data).toEqual(['actual-service-response']);
});

test('invalid override is rejected and disabled resources do not make default requests', async () => {
  await expect(useConfigStore.getState().setBackendUrl('not-a-service-url')).rejects.toThrow();
  expect(getApiBaseUrl()).toBe('http://10.0.2.2:8080');
  enabled = false;
  await open();
  expect(requests).toEqual([]);
  expect(result!.loading).toBe(false);
});
