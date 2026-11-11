// 시연 UI는 개발 빌드 또는 명시적인 시연 APK에서만 제공합니다.
export const canUseDemo = (development: boolean, demoBuild: boolean) =>
  development || demoBuild;

export class DemoNetworkError extends Error {
  readonly code = 'DEMO_NETWORK_BLOCKED';

  constructor() {
    super('로그인하지 않아 서버 요청을 보내지 않았습니다.');
    this.name = 'DemoNetworkError';
  }
}
