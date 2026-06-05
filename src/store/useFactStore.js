import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const MAX_SEEN_FILTER = 1000;

export const useFactStore = create(
  persist(
    (set, get) => ({
      savedFacts: [],
      seenFactIds: [],
      _hasHydrated: false,

      setHasHydrated: (value) => set({ _hasHydrated: value }),

      isSaved: (id) => get().savedFacts.some((f) => f.id === id),

      isSeen: (id) => get().seenFactIds.includes(id),

      markSeen: (id) =>
        set((state) => {
          if (state.seenFactIds.includes(id)) return state;
          return { seenFactIds: [...state.seenFactIds, id] };
        }),

      getSeenIdsForFilter: () => {
        const ids = get().seenFactIds;
        if (ids.length <= MAX_SEEN_FILTER) return ids;
        return ids.slice(-MAX_SEEN_FILTER);
      },

      saveFact: (fact) =>
        set((state) => {
          if (state.savedFacts.some((f) => f.id === fact.id)) return state;
          return { savedFacts: [...state.savedFacts, fact] };
        }),

      removeFact: (id) =>
        set((state) => ({
          savedFacts: state.savedFacts.filter((f) => f.id !== id),
        })),

      toggleSave: (fact) => {
        if (get().isSaved(fact.id)) {
          get().removeFact(fact.id);
          return false;
        }
        get().saveFact(fact);
        return true;
      },
    }),
    {
      name: 'nebulore-facts',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        savedFacts: state.savedFacts,
        seenFactIds: state.seenFactIds,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
