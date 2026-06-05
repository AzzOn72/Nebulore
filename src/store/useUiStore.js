import { create } from 'zustand';

/**
 * Lightweight, non-persisted UI store. Hosts a single global Deep Dive modal so
 * it can be opened from anywhere — feed cards, the Saved archive, the Dashboard,
 * or a tapped push notification — instead of each card owning its own modal.
 */
export const useUiStore = create((set) => ({
  deepDiveFact: null,

  openDeepDive: (fact) => {
    if (!fact) return;
    set({ deepDiveFact: fact });
  },

  closeDeepDive: () => set({ deepDiveFact: null }),
}));
