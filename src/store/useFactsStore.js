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
  activeCategory: null,

  setCategory: (key) => {
    const current = get().activeCategory;
    if (current === key) return;
    set({ activeCategory: key, facts: [], initialized: false, hasMore: true });
    get().fetchFacts();
  },

  fetchFacts: async () => {
    set({ loading: true, error: null });

    try {
      const excludeIds = useFactStore.getState().getSeenIdsForFilter();
      const category = get().activeCategory;
      const facts = await fetchFactsBatch({
        excludeIds,
        category,
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
      const category = get().activeCategory;
      const newFacts = await fetchFactsBatch({
        excludeIds,
        category,
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
