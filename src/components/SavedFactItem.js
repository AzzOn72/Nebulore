import { Pressable, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
  Layout,
} from 'react-native-reanimated';
import { useFactStore } from '../store/useFactStore';
import { useUiStore } from '../store/useUiStore';

export default function SavedFactItem({ fact, index }) {
  const removeFact = useFactStore((state) => state.removeFact);
  const openDeepDive = useUiStore((state) => state.openDeepDive);

  const handleRemove = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeFact(fact.id);
  };

  const handleOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openDeepDive(fact);
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify().damping(18)}
      exiting={FadeOutDown.duration(320).springify().damping(16)}
      layout={Layout.springify().damping(18)}
      className="mb-4 w-full"
    >
      <BlurView
        intensity={35}
        tint="dark"
        style={{
          overflow: 'hidden',
          borderRadius: 20,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        <LinearGradient
          colors={[
            `${fact.glow}18`,
            'rgba(255,255,255,0.04)',
            'rgba(255,255,255,0.02)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 20 }}
        >
          <Pressable
            onPress={handleOpen}
            accessibilityRole="button"
            accessibilityLabel={`Open ${fact.title}`}
          >
            <View className="mb-3 flex-row items-center gap-2 pr-9">
              <View
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: fact.glow }}
              />
              <Text className="font-inter-medium text-[10px] uppercase tracking-[2.5px] text-white/45">
                {fact.category}
              </Text>
            </View>

            <Text
              className="mb-2 font-inter-semibold text-lg leading-6 text-white"
              numberOfLines={2}
            >
              {fact.title}
            </Text>

            <Text
              className="font-inter text-sm leading-5 text-white/55"
              numberOfLines={3}
            >
              {fact.body}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleRemove}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Remove from saved"
            style={{ position: 'absolute', top: 16, right: 16 }}
            className="h-7 w-7 items-center justify-center rounded-full bg-white/10"
          >
            <X size={14} color="rgba(255,255,255,0.6)" strokeWidth={2} />
          </Pressable>
        </LinearGradient>
      </BlurView>
    </Animated.View>
  );
}
