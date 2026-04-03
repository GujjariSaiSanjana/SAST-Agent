import { create } from 'zustand';
import { authApi } from '../lib/api';

interface User {
    id: string;
    username: string;
    email: string | null;
    avatarUrl: string | null;
    stats?: {
        projectCount: number;
        scanCount: number;
    };
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    checkAuth: () => Promise<void>;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    checkAuth: async () => {
        try {
            set({ isLoading: true });
            const res = await authApi.get('/me');
            set({ user: res.data.data, isAuthenticated: true, isLoading: false });
        } catch {
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
    },
    logout: async () => {
        try {
            await authApi.post('/logout');
            set({ user: null, isAuthenticated: false });
            window.location.href = '/login';
        } catch {
            // ignore
        }
    },
}));
