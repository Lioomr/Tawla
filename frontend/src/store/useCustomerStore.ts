import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CustomerState {
  sessionToken: string | null;
  // Identifies this device/guest within a shared table session. Public token
  // only — never an internal id. Used for guest-scoped customer actions
  // (display name update, order attribution).
  guestToken: string | null;
  expiresAt: string | null;
  setSession: (token: string, expiresAt: string, guestToken?: string | null) => void;
  setGuestToken: (guestToken: string | null) => void;
  clearSession: () => void;
  isValid: () => boolean;
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      sessionToken: null,
      guestToken: null,
      expiresAt: null,
      setSession: (token, expiresAt, guestToken) =>
        set((state) => ({
          sessionToken: token,
          expiresAt,
          // Only overwrite the guest token when a new one is supplied, so
          // setSession can be reused without clobbering an existing guest.
          guestToken: guestToken !== undefined ? guestToken : state.guestToken,
        })),
      setGuestToken: (guestToken) => set({ guestToken }),
      clearSession: () => set({ sessionToken: null, guestToken: null, expiresAt: null }),
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
