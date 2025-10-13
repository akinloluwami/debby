import { create } from "zustand";

interface AuthState {
  isAuthenticated: boolean;
  isConfigured: boolean;
  setAuthenticated: (value: boolean) => void;
  setConfigured: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  isAuthenticated: false,
  isConfigured: false,
  setAuthenticated: (value: boolean) => set({ isAuthenticated: value }),
  setConfigured: (value: boolean) => set({ isConfigured: value }),
  logout: () => set({ isAuthenticated: false }),
}));
