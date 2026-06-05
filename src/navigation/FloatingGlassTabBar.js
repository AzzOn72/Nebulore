import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Bookmark, Gauge, MessageSquarePlus, Orbit } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_ICONS = {
  Discover: Orbit,
  Saved: Bookmark,
  Dashboard: Gauge,
  Request: MessageSquarePlus,
};

const springConfig = { damping: 14, stiffness: 320, mass: 0.45 };

function TabButton({ route, isFocused, onPress }) {
  const Icon = TAB_ICONS[route.name];
  const scale = useSharedValue(isFocused ? 1.14 : 1);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.14 : 1, springConfig);
  }, [isFocused, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={route.name}
      style={styles.tabButton}
    >
      <Animated.View
        style={[
          animatedStyle,
          styles.iconWrap,
          isFocused && {
            shadowColor: '#8B7CF6',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 14,
          },
        ]}
      >
        <Icon
          size={23}
          color={isFocused ? '#C4B5FD' : 'rgba(255,255,255,0.45)'}
          strokeWidth={isFocused ? 2.25 : 1.75}
          fill={isFocused && route.name === 'Saved' ? '#C4B5FD' : 'transparent'}
        />
      </Animated.View>
      {isFocused && <View style={styles.activeDot} />}
    </Pressable>
  );
}

export default function FloatingGlassTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { bottom: insets.bottom + 20 }]}
    >
      <View style={styles.pill}>
        <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.tabRow}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TabButton
                key={route.key}
                route={route}
                isFocused={isFocused}
                onPress={onPress}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 28,
    right: 28,
    alignItems: 'center',
    zIndex: 100,
  },
  pill: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    marginTop: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#A78BFA',
  },
});
