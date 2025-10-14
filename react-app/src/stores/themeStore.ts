import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDarkMode: boolean;
  primaryColor: string;
  fontSize: 'small' | 'medium' | 'large';
  toggleDarkMode: () => void;
  setPrimaryColor: (color: string) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  resetTheme: () => void;
}

const defaultTheme = {
  isDarkMode: false,
  primaryColor: '#FFB347',
  fontSize: 'medium' as const,
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      ...defaultTheme,

      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

      setPrimaryColor: (color: string) => set({ primaryColor: color }),

      setFontSize: (size: 'small' | 'medium' | 'large') => set({ fontSize: size }),

      resetTheme: () => set(defaultTheme),
    }),
    {
      name: 'theme-storage',
    }
  )
); 