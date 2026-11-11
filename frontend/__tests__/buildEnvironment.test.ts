jest.mock('../config/app-environments.json', () => ({
  development: { apiBaseUrl: 'http://10.0.2.2:8080' },
  production: { apiBaseUrl: 'https://api.coffee.example/' },
}));

import { resolveApiBaseUrl } from '../src/config/buildEnvironment';

test('development defaults to the emulator and permits a USB override', () => {
  expect(resolveApiBaseUrl(true)).toBe('http://10.0.2.2:8080');
  expect(resolveApiBaseUrl(true, 'http://127.0.0.1:8080')).toBe('http://127.0.0.1:8080');
});

test('production uses the release URL even when a developer override exists', () => {
  expect(resolveApiBaseUrl(false, 'http://127.0.0.1:8080')).toBe('https://api.coffee.example');
});
