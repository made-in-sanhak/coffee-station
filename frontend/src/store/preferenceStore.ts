
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserPreferences {
  brands: string[];
  size: string;
  orderMethod: string;
  cafeType: string;
  tastes: string[];
}

interface PreferenceState {
  isCompleted: boolean;
  preferences: UserPreferences | null;
  hasHydrated: boolean;

  completeSetup: (preferences: UserPreferences | null) => void;
  resetPreferences: () => void;
  setHasHydrated: (value: boolean) => void;
}

type PersistedPreferenceState = Pick<
  PreferenceState,
  'isCompleted' | 'preferences'
>;

export const usePreferenceStore = create<PreferenceState>()(
  persist(
    set => ({
      isCompleted: false,
      preferences: null,
      hasHydrated: false,

      completeSetup: preferences =>
        set({
          isCompleted: true,
          preferences,
        }),

      resetPreferences: () =>
        set({
          isCompleted: false,
          preferences: null,
        }),

      setHasHydrated: value => set({ hasHydrated: value }),
    }),
    {
      name: 'coffee-station-preferences',
      storage: createJSONStorage(() => AsyncStorage),

      partialize: (state): PersistedPreferenceState => ({
        isCompleted: state.isCompleted,
        preferences: state.preferences,
      }),

      onRehydrateStorage: () => state => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
