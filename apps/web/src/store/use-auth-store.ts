import { create } from 'zustand';
import { AuthUserResponse, RoleName } from '@mercantix/contracts';

interface AuthState {
  user: AuthUserResponse | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUserResponse, accessToken: string) => void;
  logout: () => void;
  hasRole: (role: RoleName) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  setAuth: (user: AuthUserResponse, accessToken: string) => {
    set({
      user,
      accessToken,
      isAuthenticated: true,
    });
  },

  logout: () => {
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },

  hasRole: (role: RoleName) => {
    const user = get().user;
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  },
}));
