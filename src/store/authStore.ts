import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserInfo } from '@/lib/auth/userInfo';

interface AuthState {
  userInfo: UserInfo | null;
  setUserInfo: (info: UserInfo) => void;
  clearUserInfo: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userInfo: null,

      setUserInfo: (info) => set({ userInfo: info }),

      clearUserInfo: () => set({ userInfo: null }),
    }),
    {
      name: 'user-info-storage',
      partialize: (state) => ({ userInfo: state.userInfo }),
    },
  ),
);
