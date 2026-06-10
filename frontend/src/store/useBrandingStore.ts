import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RestaurantBranding } from '@/lib/api';

interface BrandingState {
  branding: RestaurantBranding | null;
  setBranding: (branding: RestaurantBranding) => void;
  clearBranding: () => void;
}

// Customer-facing branding is only returned by GET /menu/. We persist it so the
// order-status and session-expired pages (whose APIs don't carry branding) keep
// the same look, and so the theme is applied instantly on reload.
export const useBrandingStore = create<BrandingState>()(
  persist(
    (set) => ({
      branding: null,
      setBranding: (branding) => set({ branding }),
      clearBranding: () => set({ branding: null }),
    }),
    {
      name: 'tawlax-branding',
    }
  )
);
