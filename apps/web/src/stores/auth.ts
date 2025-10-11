import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
	isAuthenticated: boolean;
	isConfigured: boolean;
	setAuthenticated: (value: boolean) => void;
	setConfigured: (value: boolean) => void;
	logout: () => void;
}

export const useAuthStore = create<AuthState>()(
	persist(
		(set) => ({
			isAuthenticated: false,
			isConfigured: false,
			setAuthenticated: (value: boolean) => set({ isAuthenticated: value }),
			setConfigured: (value: boolean) => set({ isConfigured: value }),
			logout: () => set({ isAuthenticated: false }),
		}),
		{
			name: "debby-auth",
		}
	)
);
