import { create } from 'zustand';
import { native } from '../../app/native';

const SUPPRESSED = 'coffee.events.hidden-date.v1';
export const promotionDay = () => new Date().toLocaleDateString('en-CA');
interface PromotionPreferences {
  hiddenDay: string | null;
  ready: boolean;
  hydrating: boolean;
  hydrate: () => Promise<void>;
  suppressToday: () => Promise<void>;
}
export const usePromotionPreferences = create<PromotionPreferences>(
  (set, get) => ({
    hiddenDay: null,
    ready: false,
    hydrating: false,
    async hydrate() {
      if (get().ready || get().hydrating) return;
      set({ hydrating: true });
      try {
        const hiddenDay = await native.secureGet(SUPPRESSED);
        if (!get().ready) set({ hiddenDay });
      } catch {
        // A storage failure leaves promotion browsing available.
      } finally {
        set({ ready: true, hydrating: false });
      }
    },
    async suppressToday() {
      const hiddenDay = promotionDay();
      await native.secureSet(SUPPRESSED, hiddenDay);
      set({ hiddenDay, ready: true });
    },
  }),
);
