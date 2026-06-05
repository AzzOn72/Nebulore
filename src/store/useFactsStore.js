import { create } from 'zustand';
import { fetchFactsBatch } from '../services/factsService';
import { useFactStore } from './useFactStore';

const BATCH_SIZE = 20;

export const useFactsStore = create((set, get) => ({
  facts: [],
  loading: false,
  loadingMore: false,
  initialized: false,
  hasMore: true,
  error: null,

  fetchFacts: async () => {
    set({ loading: true, error: null });

    try {
      const excludeIds = useFactStore.getState().getSeenIdsForFilter();
      const facts = await fetchFactsBatch({
        excludeIds,
        limit: BATCH_SIZE,
        offset: 0,
      });

      set({
        facts,
        loading: false,
        initialized: true,
        hasMore: facts.length === BATCH_SIZE,
        error: null,
      });

      return facts;
    } catch (error) {
      const message = error?.message ?? 'Failed to load facts';
      set({ loading: false, initialized: true, error: message });
      throw error;
    }
  },

  loadMoreFacts: async () => {
    const { facts, loadingMore, hasMore, loading } = get();
    if (loadingMore || !hasMore || loading) return;

    set({ loadingMore: true });

    try {
      const excludeIds = useFactStore.getState().getSeenIdsForFilter();
      const newFacts = await fetchFactsBatch({
        excludeIds,
        limit: BATCH_SIZE,
        offset: facts.length,
      });

      const existingIds = new Set(facts.map((f) => f.id));
      const unique = newFacts.filter((f) => !existingIds.has(f.id));

      set({
        facts: [...facts, ...unique],
        loadingMore: false,
        hasMore: newFacts.length === BATCH_SIZE,
      });
    } catch (error) {
      set({ loadingMore: false });
    }
  },
}));
