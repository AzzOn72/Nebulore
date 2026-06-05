import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Local YYYY-MM-DD key (not UTC) so streaks track the user's calendar day.
function localDayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dayDiff(fromKey, toKey) {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / 86400000);
}

// Cosmic ranks unlocked by total Deep Dives completed.
export const COSMIC_RANKS = [
  { key: 'observer', label: 'Observer', threshold: 0, color: '#8B7CF6' },
  { key: 'navigator', label: 'Navigator', threshold: 25, color: '#38BDF8' },
  { key: 'architect', label: 'Architect', threshold: 100, color: '#34D399' },
  { key: 'luminary', label: 'Luminary', threshold: 250, color: '#FBBF24' },
  { key: 'omniscient', label: 'Omniscient', threshold: 600, color: '#F87171' },
];

export function getRankForCount(count) {
  let current = COSMIC_RANKS[0];
  for (const rank of COSMIC_RANKS) {
    if (count >= rank.threshold) current = rank;
  }
  const idx = COSMIC_RANKS.indexOf(current);
  const next = COSMIC_RANKS[idx + 1] ?? null;
  return { current, next, index: idx };
}

export const useStatsStore = create(
  persist(
    (set, get) => ({
      totalDeepDives: 0,
      perCategory: {}, // { [categoryKey]: count }
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null, // local day key

      // Count one completed Deep Dive (called from the global host on open).
      recordDeepDive: (categoryKey) =>
        set((state) => {
          const key = categoryKey || 'unknown';
          return {
            totalDeepDives: state.totalDeepDives + 1,
            perCategory: {
              ...state.perCategory,
              [key]: (state.perCategory[key] ?? 0) + 1,
            },
          };
        }),

      // Update the daily-open streak. Idempotent within the same calendar day.
      registerActiveDay: () => {
        const today = localDayKey();
        const { lastActiveDate, currentStreak, longestStreak } = get();

        if (lastActiveDate === today) return;

        let nextStreak = 1;
        if (lastActiveDate) {
          const diff = dayDiff(lastActiveDate, today);
          if (diff === 1) nextStreak = currentStreak + 1;
          else if (diff <= 0) nextStreak = currentStreak || 1;
        }

        set({
          lastActiveDate: today,
          currentStreak: nextStreak,
          longestStreak: Math.max(longestStreak, nextStreak),
        });
      },
    }),
    {
      name: 'nebulore-stats',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
