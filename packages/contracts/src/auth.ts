import { RoleName, UserStatus } from './enums';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: RoleName[];
  sessionId: string;
}

export interface AuthUserResponse {
  id: string;
  email: string;
  isEmailVerified: boolean;
  status: UserStatus;
  roles: RoleName[];
  createdAt: Date;
}

export interface AuthTokenResponse {
  accessToken: string;
  user: AuthUserResponse;
}