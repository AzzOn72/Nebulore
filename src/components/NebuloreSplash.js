import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { C, fonts } from '../theme';

// "First Light" — a cold open. Pure void, then a single point ignites,
// an expanding shell of light blooms, and the serif wordmark resolves.
export default function NebuloreSplash({ visible = true }) {
  const star = useSharedValue(0); // core ignition 0..1
  const ring = useSharedValue(0); // expanding shell 0..1
  const word = useSharedValue(0); // wordmark reveal 0..1
  const twinkle = useSharedValue(1);

  useEffect(() => {
    star.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    ring.value = withDelay(
      260,
      withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }),
    );
    word.value = withDelay(
      560,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );
    twinkle.value = withDelay(
      900,
      withRepeat(withTiming(0.55, { duration: 1500 }), -1, true),
    );
  }, [star, ring, word, twinkle]);

  const coreStyle = useAnimatedStyle(() => ({
    opacity: star.value * twinkle.value,
    transform: [{ scale: 0.2 + star.value * 0.8 }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: (1 - ring.value) * 0.5,
    transform: [{ scale: 0.1 + ring.value * 4.2 }],
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: (1 - word.value) * 14 }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: word.value * 0.6,
  }));

  if (!visible) return null;

  return (
    <Animated.View exiting={FadeOut.duration(500)} style={styles.container}>
      <View style={styles.center}>
        <Animated.View style={[styles.ring, ringStyle]} pointerEvents="none" />
        <Animated.View style={[styles.core, coreStyle]} pointerEvents="none" />
      </View>

      <View style={styles.wordWrap}>
        <Animated.Text style={[styles.title, wordStyle]}>Nebulore</Animated.Text>
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          First Light
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.abyss,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  center: {
    position: 'absolute',
    top: '38%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: C.accentHi,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 22,
  },
  ring: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: C.accent,
  },
  wordWrap: {
    position: 'absolute',
    top: '54%',
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.serifSemibold,
    fontSize: 44,
    letterSpacing: 1,
    color: C.textPrimary,
  },
  tagline: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: C.textTertiary,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginTop: 14,
  },
});
