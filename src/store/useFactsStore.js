import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { fetchFactsBatch } from '../services/factsService';
import { checkOnlineNow } from '../services/connectivity';
import { useFactStore } from './useFactStore';

const BATCH_SIZE = 20;
const PREFETCH_SIZE = 50; // "Subway Mode" — proactively cache the next N unseen
const CACHE_KEY = 'nebulore-feed-cache';
const CACHE_LIMIT = 200;

async function readCache() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

async function writeCache(facts) {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(facts.slice(0, CACHE_LIMIT)));
  } catch (_) {
    // storage full / unavailable — non-fatal
  }
}

function filterUnseen(facts, category) {
  const isSeen = useFactStore.getState().isSeen;
  return facts.filter(
    (f) => !isSeen(f.id) && (!category || f.categoryKey === category),
  );
}

export const useFactsStore = create((set, get) => ({
  facts: [],
  loading: false,
  loadingMore: false,
  initialized: false,
  hasMore: true,
  error: null,
  activeCategory: null,
  usingCache: false,

  setCategory: (key) => {
    const current = get().activeCategory;
    if (current === key) return;
    set({
      activeCategory: key,
      facts: [],
      initialized: false,
      hasMore: true,
      usingCache: false,
    });
    get().fetchFacts();
  },

  fetchFacts: async () => {
    set({ loading: true, error: null });

    const category = get().activeCategory;
    const online = await checkOnlineNow();

    // Subway Mode: offline → serve the cached queue so reading never breaks.
    if (!online) {
      const cached = filterUnseen(await readCache(), category);
      set({
        facts: cached,
        loading: false,
        initialized: true,
        hasMore: false,
        usingCache: true,
        error: cached.length ? null : 'offline',
      });
      return cached;
    }

    try {
      const excludeIds = useFactStore.getState().getSeenIdsForFilter();
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
        usingCache: false,
        error: null,
      });

      get().prefetchCache();
      return facts;
    } catch (error) {
      // Network blip → fall back to the cached queue if we have one.
      const cached = filterUnseen(await readCache(), category);
      if (cached.length) {
        set({
          facts: cached,
          loading: false,
          initialized: true,
          hasMore: false,
          usingCache: true,
          error: null,
        });
        return cached;
      }

      const message = error?.message ?? 'Failed to load facts';
      set({ loading: false, initialized: true, error: message });
      throw error;
    }
  },

  loadMoreFacts: async () => {
    const { facts, loadingMore, hasMore, loading, usingCache, activeCategory } =
      get();
    if (loadingMore || loading) return;

    // Already reading from cache: pull the next unseen slice from local storage.
    if (usingCache) {
      const existing = new Set(facts.map((f) => f.id));
      const more = filterUnseen(await readCache(), activeCategory).filter(
        (f) => !existing.has(f.id),
      );
      if (more.length) set({ facts: [...facts, ...more] });
      return;
    }

    if (!hasMore) return;
    set({ loadingMore: true });

    try {
      const excludeIds = useFactStore.getState().getSeenIdsForFilter();
      const newFacts = await fetchFactsBatch({
        excludeIds,
        category: activeCategory,
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

      get().prefetchCache();
    } catch (error) {
      // Lost connection mid-scroll → keep the experience alive from cache.
      const current = get().facts;
      const existing = new Set(current.map((f) => f.id));
      const more = filterUnseen(await readCache(), get().activeCategory).filter(
        (f) => !existing.has(f.id),
      );
      if (more.length) {
        set({
          facts: [...current, ...more],
          loadingMore: false,
          usingCache: true,
          hasMore: false,
        });
      } else {
        set({ loadingMore: false, usingCache: true, hasMore: false });
      }
    }
  },

  // Proactively fetch and cache the next PREFETCH_SIZE unseen facts.
  prefetchCache: async () => {
    try {
      const category = get().activeCategory;
      const excludeIds = useFactStore.getState().getSeenIdsForFilter();
      const buffer = await fetchFactsBatch({
        excludeIds,
        category,
        limit: PREFETCH_SIZE,
        offset: 0,
      });
      if (buffer.length) await writeCache(buffer);
    } catch (_) {
      // best-effort prefetch
    }
  },
}));
