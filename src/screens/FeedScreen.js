import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { WifiOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CategoryPillMenu from '../components/CategoryPillMenu';
import FactCard from '../components/FactCard';
import { useConnectivityStore } from '../services/connectivity';
import { useFactStore } from '../store/useFactStore';
import { useFactsStore } from '../store/useFactsStore';

function SubwayPill({ top }) {
  return (
    <View style={[styles.subwayPill, { top }]} pointerEvents="none">
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      <WifiOff size={13} color="#C4B5FD" strokeWidth={2} />
      <Text style={styles.subwayText}>Offline · Subway Mode</Text>
    </View>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const LOAD_MORE_THRESHOLD = 3;

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const cardHeight = SCREEN_HEIGHT;
  const currentIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const facts = useFactsStore((state) => state.facts);
  const error = useFactsStore((state) => state.error);
  const hasMore = useFactsStore((state) => state.hasMore);
  const loadingMore = useFactsStore((state) => state.loadingMore);
  const loadMoreFacts = useFactsStore((state) => state.loadMoreFacts);

  const markSeen = useFactStore((state) => state.markSeen);
  const initialized = useFactsStore((state) => state.initialized);
  const isOnline = useConnectivityStore((state) => state.isOnline);

  const renderItem = useCallback(
    ({ item, index }) => <FactCard fact={item} isActive={index === activeIndex} />,
    [activeIndex],
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
        setActiveIndex(newIndex);
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
      <View className="flex-1 bg-void">
        <View style={{ paddingTop: insets.top + 8 }}>
          <CategoryPillMenu />
        </View>
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-center font-inter-semibold text-lg text-white/70">
            The void is empty
          </Text>
          <Text className="mt-2 text-center font-inter text-sm text-white/40">
            {error
              ? 'Unable to reach the cosmos. Check your connection.'
              : "You've explored everything. Check your Saved library."}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-void">
      <View style={[styles.pillOverlay, { top: insets.top + 4 }]}>
        <CategoryPillMenu />
      </View>

      {!isOnline && <SubwayPill top={insets.top + 52} />}

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

const styles = StyleSheet.create({
  pillOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
  },
  subwayPill: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.25)',
    zIndex: 20,
  },
  subwayText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.3,
    color: '#E5E5E5',
  },
});
