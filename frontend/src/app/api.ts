import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { apiFetch, getApiBaseUrl } from '../api/client';
import { useConfigStore } from '../store/configStore';
import { useSessionStore } from '../store/sessionStore';
type Query = Record<string, string | number | boolean | null | undefined>;
function pathWithQuery(path: string, query?: Query): string {
  const entries = Object.entries(query ?? {}).filter(
    ([, value]) => value !== undefined && value !== null,
  );
  return (
    path +
    (entries.length
      ? '?' +
        entries
          .map(
            ([key, value]) =>
              `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
          )
          .join('&')
      : '')
  );
}
export const api = {
  get: <T>(path: string, query?: Query) =>
    apiFetch<T>(pathWithQuery(path, query)),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
export function useResource<T>(path: string, query?: Query, enabled = true) {
  const baseUrl = useConfigStore(getApiBaseUrl);
  const account = useSessionStore(state => state.user?.id ?? 'anonymous');
  const result = useQuery<T>({
    queryKey: ['coffee-api', baseUrl, account, path, query ?? {}],
    queryFn: () => api.get<T>(path, query),
    enabled: enabled && !!baseUrl,
    retry: false,
  });
  const refetch = result.refetch;
  const reload = useCallback(() => {
    void refetch();
  }, [refetch]);
  return {
    data: result.data,
    loading: enabled && !!baseUrl && result.isPending,
    error: !baseUrl
      ? '서비스 서버에 연결할 수 없습니다.'
      : result.error instanceof Error
      ? result.error.message
      : null,
    reload,
  };
}
