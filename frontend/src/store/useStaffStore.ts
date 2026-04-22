import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StaffProfile } from '@/lib/api';

interface StaffState {
  accessToken: string | null;
  refreshToken: string | null;
  profile: StaffProfile | null;
  
  setAuth: (access: string, refresh: string, profile: StaffProfile) => void;
  setAccessToken: (access: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useStaffStore = create<StaffState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      profile: null,
      
      setAuth: (access, refresh, profile) => 
        set({ accessToken: access, refreshToken: refresh, profile }),

      setAccessToken: (access) =>
        set({ accessToken: access }),
        
      clearAuth: () => 
        set({ accessToken: null, refreshToken: null, profile: null }),
        
      isAuthenticated: () => {
        const { accessToken, profile } = get();
        // Since we are not perfectly decoding JWT expiry currently, just check presence
        return !!accessToken && !!profile;
      }
    }),
    {
      name: 'staff-auth-storage',
    }
  )
);
