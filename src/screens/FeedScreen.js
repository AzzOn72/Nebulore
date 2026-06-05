import { useCallback, useRef } from 'react';
import { ActivityIndicator, Dimensions, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FactCard from '../components/FactCard';
import { useFactStore } from '../store/useFactStore';
import { useFactsStore } from '../store/useFactsStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const LOAD_MORE_THRESHOLD = 3;

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const cardHeight = SCREEN_HEIGHT;
  const currentIndexRef = useRef(0);

  const facts = useFactsStore((state) => state.facts);
  const error = useFactsStore((state) => state.error);
  const hasMore = useFactsStore((state) => state.hasMore);
  const loadingMore = useFactsStore((state) => state.loadingMore);
  const loadMoreFacts = useFactsStore((state) => state.loadMoreFacts);

  const markSeen = useFactStore((state) => state.markSeen);
  const initialized = useFactsStore((state) => state.initialized);

  const renderItem = useCallback(
    ({ item }) => <FactCard fact={item} />,
    [],
  );

  const keyExtractor = useCallback((item) => item.id, []);

  const overrideItemLayout = useCallback(
    (layout) => {
      layout.size = cardHeight;
    },
    [cardHeight],
  );

  const handleMomentumScrollEnd = useCallback(
    (event) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const newIndex = Math.round(offsetY / cardHeight);

      if (newIndex !== currentIndexRef.current) {
        const previousFact = facts[currentIndexRef.current];
        if (previousFact) {
          markSeen(previousFact.id);
        }

        currentIndexRef.current = newIndex;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (hasMore && facts.length - newIndex <= LOAD_MORE_THRESHOLD) {
          loadMoreFacts();
        }
      }
    },
    [cardHeight, facts, markSeen, hasMore, loadMoreFacts],
  );

  if (!initialized) {
    return (
      <View className="flex-1 items-center justify-center bg-void">
        <ActivityIndicator size="large" color="#8B7CF6" />
      </View>
    );
  }

  if (facts.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-void px-10">
        <Text className="text-center font-inter-semibold text-lg text-white/70">
          The void is empty
        </Text>
        <Text className="mt-2 text-center font-inter text-sm text-white/40">
          {error
            ? 'Unable to reach the cosmos. Check your connection.'
            : "You've explored everything. Check your Saved library."}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-void">
      <FlashList
        data={facts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={cardHeight}
        pagingEnabled
        snapToInterval={cardHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        drawDistance={cardHeight * 2}
        overrideItemLayout={overrideItemLayout}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        style={{ marginTop: -insets.top }}
      />

      {loadingMore && (
        <View style={{ position: 'absolute', bottom: 120, alignSelf: 'center' }}>
          <ActivityIndicator size="small" color="#8B7CF6" />
        </View>
      )}
    </View>
  );
}
