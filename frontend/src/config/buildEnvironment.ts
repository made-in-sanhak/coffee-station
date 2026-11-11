import environments from '../../config/app-environments.json';

export function resolveApiBaseUrl(development: boolean, override = ''): string {
  if (development) return override || environments.development.apiBaseUrl;
  // Release builds never use a developer's saved server override.
  return environments.production.apiBaseUrl.replace(/\/+$/, '');
}

export const DEFAULT_API_BASE_URL = resolveApiBaseUrl(__DEV__);
