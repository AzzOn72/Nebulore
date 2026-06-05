import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { spring } from '../theme';

// Press-and-hold "charges" the core (glow blooms); release fires a brief
// supernova flash before invoking onPress.
export default function CosmosSubmitButton({
  onPress,
  disabled = false,
  label = 'Submit to the Cosmos',
}) {
  const scale = useSharedValue(1);
  const charge = useSharedValue(0); // 0..1 build-up while pressed
  const flash = useSharedValue(0); // momentary supernova burst

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.4 : 1,
  }));

  const chargeStyle = useAnimatedStyle(() => ({
    opacity: charge.value * 0.9,
    transform: [{ scale: 0.8 + charge.value * 0.5 }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.value,
    transform: [{ scale: 1 + flash.value * 0.6 }],
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(0.96, spring.snappy);
    charge.value = withTiming(1, { duration: 520 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, spring.snappy);
    charge.value = withTiming(0, { duration: 220 });
  };

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    flash.value = withSequence(
      withTiming(1, { duration: 140 }),
      withTiming(0, { duration: 340 }),
    );
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <Animated.View style={[styles.buttonWrap, animatedStyle]}>
        <LinearGradient
          colors={['#6B4C9A', '#8B7CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Animated.View style={[styles.charge, chargeStyle]} pointerEvents="none" />
          <Text style={styles.label}>{label}</Text>
        </LinearGradient>
        <Animated.View style={[styles.flash, flashStyle]} pointerEvents="none">
          <View style={styles.flashCore} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  buttonWrap: {
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#8B7CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  gradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  charge: {
    position: 'absolute',
    alignSelf: 'center',
    top: -20,
    bottom: -20,
    width: '70%',
    borderRadius: 999,
    backgroundColor: 'rgba(196,181,253,0.55)',
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashCore: {
    width: '60%',
    height: '180%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    letterSpacing: 0.5,
    color: '#FFFFFF',
  },
});
