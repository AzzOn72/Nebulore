import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export default function NebuloreSplash({ visible = true }) {
  const opacity = useSharedValue(0.6);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 1800 }),
      -1,
      true,
    );
    glowScale.value = withRepeat(
      withTiming(1.08, { duration: 1800 }),
      -1,
      true,
    );
  }, [opacity, glowScale]);

  const textStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    textShadowRadius: 12 + (opacity.value - 0.6) * 20,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: 0.15 + (opacity.value - 0.6) * 0.3,
  }));

  if (!visible) return null;

  return (
    <Animated.View exiting={FadeOut.duration(400)} style={styles.container}>
      <LinearGradient
        colors={['#1A1035', '#0F0A1A', '#050505']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.glowOrb, glowStyle]} />

      <Animated.Text style={[styles.title, textStyle]}>
        Nebulore
      </Animated.Text>

      <Text style={styles.tagline}>Scanning the cosmos</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  glowOrb: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#6B4C9A',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 42,
    letterSpacing: 6,
    color: '#FFFFFF',
    textShadowColor: '#8B7CF6',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 16,
  },
});
