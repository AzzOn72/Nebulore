/**
 * CacheManagerService
 *
 * Singleton that listens to AppState transitions and proactively keeps the
 * offline article cache warm. This means users ALWAYS have content during
 * network drops — even if they've never manually triggered a fetch.
 *
 * Strategy:
 *   • App → background  →  fire prefetchCache() immediately (20 articles)
 *   • App → active      →  if cache has < LOW_WATER_MARK unseen items, top up
 *
 * All operations are fire-and-forget; errors are silently swallowed so this
 * service never disrupts the user experience.
 */

import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFactsStore } from '../store/useFactsStore';
import { useFactStore } from '../store/useFactStore';

const CACHE_KEY = 'nebulore-feed-cache';
const LOW_WATER_MARK = 10; // top-up when fewer than this many unseen items cached
let _subscription = null;
let _started = false;

// Count how many cached items have not been seen yet
async function countUnseenCached() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return 0;
    const cached = JSON.parse(raw);
    if (!Array.isArray(cached)) return 0;
    const isSeen = useFactStore.getState().isSeen;
    return cached.filter((f) => !isSeen(f.id)).length;
  } catch (_) {
    return 0;
  }
}

async function handleStateChange(nextState) {
  try {
    if (nextState === 'background' || nextState === 'inactive') {
      // Going to background — proactively warm the cache
      await useFactsStore.getState().prefetchCache();
    } else if (nextState === 'active') {
      // Becoming active — check water level and top up if low
      const unseen = await countUnseenCached();
      if (unseen < LOW_WATER_MARK) {
        await useFactsStore.getState().prefetchCache();
      }
    }
  } catch (_) {
    // Non-fatal — never surface errors from background prefetch
  }
}

/**
 * startCacheManager()
 * Call once after the app is fully initialised. Safe to call multiple times
 * (idempotent — subsequent calls are no-ops).
 */
export function startCacheManager() {
  if (_started) return;
  _started = true;

  // Register AppState listener
  _subscription = AppState.addEventListener('change', handleStateChange);

  // Immediate warm-up on first launch (non-blocking)
  countUnseenCached().then((unseen) => {
    if (unseen < LOW_WATER_MARK) {
      useFactsStore.getState().prefetchCache().catch(() => {});
    }
  });
}

/**
 * stopCacheManager()
 * Teardown — only needed in tests or hot-reload scenarios.
 */
export function stopCacheManager() {
  if (_subscription) {
    _subscription.remove();
    _subscription = null;
  }
  _started = false;
}
