import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CustomerState {
  sessionToken: string | null;
  expiresAt: string | null;
  setSession: (token: string, expiresAt: string) => void;
  clearSession: () => void;
  isValid: () => boolean;
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      sessionToken: null,
      expiresAt: null,
      setSession: (token, expiresAt) => set({ sessionToken: token, expiresAt }),
      clearSession: () => set({ sessionToken: null, expiresAt: null }),
      isValid: () => {
        const expiresAt = get().expiresAt;
        if (!expiresAt) return false;
        return new Date(expiresAt).getTime() > Date.now();
      },
    }),
    {
      name: 'tawlax-customer-session',
    }
  )
);
