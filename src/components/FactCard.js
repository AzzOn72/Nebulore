import { memo, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ChevronDown } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import DeepDiveModal from './DeepDiveModal';
import { getTeaserHook } from '../utils/getTeaserHook';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function FactCard({ fact }) {
  const [deepDiveVisible, setDeepDiveVisible] = useState(false);

  const teaserHook = getTeaserHook(fact.body, 2);

  const handleOpenDeepDive = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDeepDiveVisible(true);
  };

  const handleCloseDeepDive = () => {
    setDeepDiveVisible(false);
  };

  return (
    <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }} className="bg-void">
      <LinearGradient
        colors={fact.accent}
        locations={[0, 0.5, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          styles.glowOrb,
          {
            backgroundColor: fact.glow,
            shadowColor: fact.glow,
            top: SCREEN_HEIGHT * 0.08,
            right: -SCREEN_WIDTH * 0.25,
            width: SCREEN_WIDTH * 0.8,
            height: SCREEN_WIDTH * 0.8,
          },
        ]}
      />

      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />

      <LinearGradient
        colors={['rgba(5,5,5,0.3)', 'rgba(5,5,5,0.7)', 'rgba(5,5,5,0.92)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Pressable
        onPress={handleOpenDeepDive}
        style={styles.teaserPressable}
        accessibilityRole="button"
        accessibilityLabel={`Explore ${fact.title}`}
      >
        <View style={styles.teaserContent}>
          <Animated.View entering={FadeIn.duration(600)} style={styles.teaserInner}>
            <View style={styles.categoryRow}>
              <View style={[styles.categoryDot, { backgroundColor: fact.glow }]} />
              <Text style={styles.category}>{fact.category}</Text>
            </View>

            <Text style={styles.title}>{fact.title}</Text>

            <View style={styles.hookDivider} />

            <Text style={styles.hook} numberOfLines={2}>
              {teaserHook}
            </Text>

            <View style={styles.exploreRow}>
              <Text style={styles.exploreText}>Tap to explore the cosmos...</Text>
              <ChevronDown size={16} color="rgba(229,229,229,0.35)" strokeWidth={2} />
            </View>
          </Animated.View>
        </View>
      </Pressable>

      <DeepDiveModal
        visible={deepDiveVisible}
        fact={fact}
        onClose={handleCloseDeepDive}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  glowOrb: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.25,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 100,
  },
  teaserPressable: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 140,
    paddingTop: 80,
  },
  teaserContent: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  teaserInner: {
    paddingHorizontal: 32,
    paddingVertical: 40,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  category: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: 'rgba(229,229,229,0.4)',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.3,
    color: '#E5E5E5',
    marginBottom: 20,
  },
  hookDivider: {
    width: 32,
    height: 1,
    backgroundColor: 'rgba(229,229,229,0.12)',
    marginBottom: 20,
  },
  hook: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 26,
    color: 'rgba(229,229,229,0.55)',
    letterSpacing: 0.15,
  },
  exploreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 28,
  },
  exploreText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    letterSpacing: 1.5,
    color: 'rgba(229,229,229,0.35)',
  },
});

export default memo(
  FactCard,
  (prev, next) =>
    prev.fact.id === next.fact.id &&
    prev.fact.title === next.fact.title &&
    prev.fact.body === next.fact.body,
);
