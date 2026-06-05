import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Headphones, Square } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import GlassSurface from './GlassSurface';
import PressableScale from './PressableScale';
import { C, radii, type as T } from '../theme';
import { spring } from '../theme/motion';

const BAR_COUNT = 18;
const BARS = Array.from({ length: BAR_COUNT }, (_, i) => i);

// ─── Aurora waveform bar ──────────────────────────────────────────────────────
function WaveBar({ index, phase, active, color }) {
  const animatedStyle = useAnimatedStyle(() => {
    const t = phase.value;
    const wave =
      Math.sin(t * 2.4 + index * 0.55) * 0.5 +
      Math.sin(t * 1.3 + index * 0.9) * 0.5;
    const amp = active.value;
    const h = 3 + (0.5 + 0.5 * wave) * 22 * amp;
    return {
      height: h,
      opacity: 0.35 + 0.65 * amp,
    };
  });

  return <Animated.View style={[styles.bar, { backgroundColor: color }, animatedStyle]} />;
}

// ─── Neural Sync mini-player ─────────────────────────────────────────────────
// `glowColor` — the category accent from DeepDiveModal, wires the waveform to
// the article's identity color when playing.
export default function NeuralSyncPlayer({
  isPlaying,
  onToggle,
  speed,
  onCycleSpeed,
  glowColor,
}) {
  const phase = useSharedValue(0);
  const active = useSharedValue(0);
  const playScale = useSharedValue(1);

  useFrameCallback(() => {
    phase.value += 0.05;
  });

  useEffect(() => {
    active.value = withTiming(isPlaying ? 1 : 0, { duration: 320 });
  }, [isPlaying, active]);

  const playButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playScale.value }],
  }));

  const handleToggle = () => {
    // Spring-punch the play button on every tap
    playScale.value = withSpring(0.88, spring.snappy, () => {
      playScale.value = withSpring(1, spring.snappy);
    });
    Haptics.impactAsync(
      isPlaying ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
    );
    onToggle?.();
  };

  const handleSpeed = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCycleSpeed?.();
  };

  // Waveform colour: category glow when playing, muted when idle
  const waveColor = isPlaying ? (glowColor ?? C.accentHi) : C.textTertiary;

  return (
    <GlassSurface variant="thick" style={styles.container}>
      {/* Play / Stop — spring-scaled */}
      <Animated.View style={playButtonStyle}>
        <PressableScale
          onPress={handleToggle}
          style={[styles.playButton, isPlaying && styles.playButtonActive]}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Stop narration' : 'Listen to article'}
        >
          {isPlaying ? (
            <Square size={16} color={glowColor ?? C.accentHi} fill={glowColor ?? C.accentHi} strokeWidth={1.75} />
          ) : (
            <Headphones size={18} color={C.textPrimary} strokeWidth={1.75} />
          )}
        </PressableScale>
      </Animated.View>

      {/* Label + waveform */}
      <View style={styles.middle}>
        <Text style={styles.label}>{isPlaying ? 'Neural Sync' : 'Listen'}</Text>
        <View style={styles.waveRow}>
          {BARS.map((i) => (
            <WaveBar
              key={i}
              index={i}
              phase={phase}
              active={active}
              color={waveColor}
            />
          ))}
        </View>
      </View>

      {/* Speed selector */}
      <PressableScale
        onPress={handleSpeed}
        style={styles.speedButton}
        accessibilityRole="button"
        accessibilityLabel={`Playback speed ${speed}x`}
      >
        <Text style={styles.speedText}>{speed}x</Text>
      </PressableScale>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.hairlineLum,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  playButtonActive: {
    borderColor: 'rgba(196,181,253,0.45)',
    backgroundColor: 'rgba(139,124,246,0.16)',
  },
  middle: {
    flex: 1,
    gap: 6,
  },
  label: {
    ...T.label,
    color: C.textSecondary,
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 26,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 3,
  },
  speedButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.hairline,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  speedText: {
    ...T.label,
    color: C.textSecondary,
    fontVariant: ['tabular-nums'],
  },
});
