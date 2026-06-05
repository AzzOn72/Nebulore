import { memo, useCallback } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ChevronDown } from 'lucide-react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import NebulaField from './skia/NebulaField';
import GlassSurface from './GlassSurface';
import { getTeaserHook } from '../utils/getTeaserHook';
import { useUiStore } from '../store/useUiStore';
import { useGyro } from '../hooks/useGyro';
import { C, type as T, radii, space } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MAX_TILT_DEG = 4;
const TILT_SENS = 2.2;
const TILT_DECAY = 0.9;

function clampWorklet(v, min, max) {
  'worklet';
  return Math.min(Math.max(v, min), max);
}

function FactCard({ fact, isActive = false }) {
  const openDeepDive = useUiStore((state) => state.openDeepDive);
  const teaserHook = getTeaserHook(fact.body, 2);

  const { gyroX, gyroY } = useGyro();
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);

  // Gyro-driven 3D tilt (leaky integrator, clamped). Reinforces depth instead
  // of competing with the vertical paging gesture.
  useFrameCallback(() => {
    if (!isActive) {
      tiltX.value *= TILT_DECAY;
      tiltY.value *= TILT_DECAY;
      return;
    }
    tiltX.value = clampWorklet(
      (tiltX.value + gyroX.value * TILT_SENS) * TILT_DECAY,
      -MAX_TILT_DEG,
      MAX_TILT_DEG,
    );
    tiltY.value = clampWorklet(
      (tiltY.value + gyroY.value * TILT_SENS) * TILT_DECAY,
      -MAX_TILT_DEG,
      MAX_TILT_DEG,
    );
  });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateX: `${tiltX.value}deg` },
      { rotateY: `${tiltY.value}deg` },
    ],
  }));

  const handleOpenDeepDive = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openDeepDive(fact);
  }, [openDeepDive, fact]);

  return (
    <Animated.View
      style={[{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }, cardAnimatedStyle]}
    >
      <View style={StyleSheet.absoluteFill}>
        <NebulaField
          mesh={fact.mesh}
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
          animated={isActive}
        />

        {/* Darkening scrim — protects legibility over the nebula. */}
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </View>

      <Pressable
        onPress={handleOpenDeepDive}
        style={styles.teaserPressable}
        accessibilityRole="button"
        accessibilityLabel={`Explore ${fact.title}`}
      >
        <GlassSurface variant="thick" style={styles.teaserContent}>
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
              <Text style={styles.exploreText}>Tap to explore the cosmos</Text>
              <ChevronDown size={16} color={C.textTertiary} strokeWidth={2} />
            </View>
          </Animated.View>
        </GlassSurface>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  teaserPressable: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: space[5],
    paddingBottom: 150,
    paddingTop: 80,
  },
  teaserContent: {
    borderRadius: radii.card,
  },
  teaserInner: {
    paddingHorizontal: 30,
    paddingVertical: 36,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  category: {
    ...T.eyebrow,
    color: C.textTertiary,
  },
  title: {
    ...T.titleCard,
    color: C.textPrimary,
    marginBottom: 18,
  },
  hookDivider: {
    width: 32,
    height: 1,
    backgroundColor: C.hairlineLum,
    marginBottom: 18,
  },
  hook: {
    ...T.body,
    color: C.textSecondary,
  },
  exploreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 26,
  },
  exploreText: {
    ...T.label,
    letterSpacing: 1.5,
    color: C.textTertiary,
  },
});

export default memo(
  FactCard,
  (prev, next) =>
    prev.fact.id === next.fact.id &&
    prev.fact.title === next.fact.title &&
    prev.fact.body === next.fact.body &&
    prev.isActive === next.isActive,
);
