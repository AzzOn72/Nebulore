import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bookmark, SearchX } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SavedFactItem from '../components/SavedFactItem';
import SearchBar from '../components/SearchBar';
import { useFactStore } from '../store/useFactStore';
import { useDebounce } from '../hooks/useDebounce';

// ─── Tokenise once per fact for O(n·k) filtering ─────────────────────────────
function tokenize(str) {
  return str
    .toLowerCase()
    .split(/[\s,.\-–—]+/)
    .filter(Boolean);
}

function buildIndex(facts) {
  const map = new Map();
  for (const f of facts) {
    const tokens = tokenize(`${f.title} ${f.body} ${f.category}`);
    map.set(f.id, tokens);
  }
  return map;
}

// ─── Empty states ─────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-10">
      <View className="mb-5 h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
        <Bookmark size={32} color="rgba(255,255,255,0.25)" strokeWidth={1.5} />
      </View>
      <Text className="mb-2 text-center font-inter-semibold text-xl text-white/80">
        No saved facts yet
      </Text>
      <Text className="text-center font-inter text-sm leading-6 text-white/40">
        Swipe through Discover and tap Save on any cosmic revelation worth
        revisiting.
      </Text>
    </View>
  );
}

function NoResults({ query }) {
  return (
    <View className="flex-1 items-center justify-center px-10 pt-10">
      <View className="mb-5 h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
        <SearchX size={30} color="rgba(255,255,255,0.25)" strokeWidth={1.5} />
      </View>
      <Text className="mb-2 text-center font-inter-semibold text-lg text-white/80">
        Nothing matches "{query}"
      </Text>
      <Text className="text-center font-inter text-sm leading-6 text-white/40">
        Try a different keyword from your archive.
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const savedFacts = useFactStore((state) => state.savedFacts);
  const [query, setQuery] = useState('');

  // 100 ms debounce — filter only fires after the user pauses typing
  const debouncedQuery = useDebounce(query, 100);

  // Pre-built token index — O(n) rebuild only when savedFacts array changes
  const searchIndex = useMemo(() => buildIndex(savedFacts), [savedFacts]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return savedFacts;

    // Tokenise the query once
    const queryTokens = tokenize(q);

    // A fact matches if every query token appears in its pre-built token list
    return savedFacts.filter((f) => {
      const tokens = searchIndex.get(f.id) ?? [];
      return queryTokens.every((qt) => tokens.some((t) => t.startsWith(qt)));
    });
  }, [savedFacts, debouncedQuery, searchIndex]);

  const hasSaved = savedFacts.length > 0;

  return (
    <View className="flex-1 bg-void">
      <LinearGradient
        colors={['#1A0A2E', '#0F0A1A', '#000000']}
        locations={[0, 0.4, 1]}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />

      <View
        className="flex-1"
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 110,
        }}
      >
        <View className="mb-5 px-6">
          <Text className="font-serif-semibold text-4xl text-white">Saved</Text>
          <Text className="mt-1 font-inter text-sm text-white/45">
            {!hasSaved
              ? 'Your cosmic library awaits'
              : query.trim()
                ? `${filtered.length} of ${savedFacts.length} match${filtered.length === 1 ? '' : 'es'}`
                : `${savedFacts.length} revelation${savedFacts.length === 1 ? '' : 's'} archived`}
          </Text>
        </View>

        {hasSaved && (
          <View className="mb-4 px-6">
            <SearchBar value={query} onChangeText={setQuery} />
          </View>
        )}

        {!hasSaved ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <NoResults query={debouncedQuery.trim()} />
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {filtered.map((fact, index) => (
              <SavedFactItem
                key={fact.id}
                fact={fact}
                index={index}
                query={debouncedQuery}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
