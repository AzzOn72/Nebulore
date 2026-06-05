import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const springConfig = {
  damping: 15,
  stiffness: 400,
  mass: 0.4,
};

export default function ActionButton({
  icon: Icon,
  label,
  onPress,
  active = false,
  iconFill = 'transparent',
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.85, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="items-center gap-1.5"
    >
      <Animated.View
        style={animatedStyle}
        className={`h-12 w-12 items-center justify-center rounded-full border ${
          active
            ? 'border-nebula-glow/60 bg-nebula-glow/20'
            : 'border-white/20 bg-white/10'
        }`}
      >
        <Icon
          size={22}
          color={active ? '#C4B5FD' : '#FFFFFF'}
          fill={iconFill}
          strokeWidth={1.75}
        />
      </Animated.View>
      <Animated.Text
        style={animatedStyle}
        className="font-inter-medium text-[10px] tracking-wider text-white/60"
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
}
