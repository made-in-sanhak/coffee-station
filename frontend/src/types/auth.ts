export interface User {
  id: number;
  nickname: string;
  profileImageUrl: string | null;
}

export interface KakaoLoginRequest {
  code: string;
  redirectUri: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}
