import { useCallback } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { spring } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Universal tactile press feedback: every tappable element seats to `pressScale`
// on press-in and springs back on release. Cheap, UI-thread, massive perceived
// quality lift.
export default function PressableScale({
  children,
  style,
  pressScale = 0.97,
  onPressIn,
  onPressOut,
  ...rest
}) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(
    (e) => {
      scale.value = withSpring(pressScale, spring.snappy);
      onPressIn?.(e);
    },
    [scale, pressScale, onPressIn],
  );

  const handlePressOut = useCallback(
    (e) => {
      scale.value = withSpring(1, spring.snappy);
      onPressOut?.(e);
    },
    [scale, onPressOut],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
