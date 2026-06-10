import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'ar';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
  toggle: () => void;
}

// Customer UI language, persisted for the table session. Drives page direction
// and UI chrome labels only — menu/category content stays as backend data.
export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'en',
      setLanguage: (language) => set({ language }),
      toggle: () => set({ language: get().language === 'ar' ? 'en' : 'ar' }),
    }),
    {
      name: 'tawlax-customer-language',
    }
  )
);
