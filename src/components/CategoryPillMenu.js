import { memo, useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Canvas, RoundedRect, Shadow } from '@shopify/react-native-skia';
import { CATEGORIES } from '../config/categories';
import { useFactsStore } from '../store/useFactsStore';
import PressableScale from './PressableScale';
import { C, type as T } from '../theme';

function GlowBorder({ color, width, height }) {
  const r = (height - 2) / 2;
  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <RoundedRect x={0} y={0} width={width} height={height} r={r} color="transparent">
        <Shadow dx={0} dy={0} blur={10} color={color} />
      </RoundedRect>
      <RoundedRect
        x={0.5}
        y={0.5}
        width={width - 1}
        height={height - 1}
        r={r}
        color="transparent"
        style="stroke"
        strokeWidth={1.5}
      >
        <Shadow dx={0} dy={0} blur={6} color={color} />
      </RoundedRect>
    </Canvas>
  );
}

const PILL_HEIGHT = 36;

function Pill({ category, isActive, onPress }) {
  const [pillWidth, setPillWidth] = useState(120);

  const handleLayout = useCallback((e) => {
    setPillWidth(e.nativeEvent.layout.width);
  }, []);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(category.key);
  }, [onPress, category.key]);

  return (
    <PressableScale onPress={handlePress} onLayout={handleLayout}>
      <View
        style={[
          styles.pill,
          isActive && {
            borderColor: `${category.accent}55`,
            backgroundColor: `${category.accent}14`,
          },
        ]}
      >
        <BlurView
          intensity={isActive ? 32 : 18}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        {isActive && (
          <GlowBorder
            color={category.accent}
            width={pillWidth}
            height={PILL_HEIGHT}
          />
        )}
        <View style={styles.pillRow}>
          {isActive && (
            <View style={[styles.dot, { backgroundColor: category.accent }]} />
          )}
          <Text
            style={[
              styles.label,
              isActive && { color: category.accent, opacity: 1 },
            ]}
          >
            {category.short}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
}

function CategoryPillMenu() {
  const activeCategory = useFactsStore((s) => s.activeCategory);
  const setCategory = useFactsStore((s) => s.setCategory);

  const handlePress = useCallback(
    (key) => {
      setCategory(activeCategory === key ? null : key);
    },
    [activeCategory, setCategory],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scroll}
    >
      {CATEGORIES.map((cat) => (
        <Pill
          key={cat.key}
          category={cat}
          isActive={activeCategory === cat.key}
          onPress={handlePress}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 10,
    paddingVertical: 8,
  },
  pill: {
    height: PILL_HEIGHT,
    paddingHorizontal: 18,
    borderRadius: PILL_HEIGHT / 2,
    borderWidth: 1,
    borderColor: C.hairlineLum,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  label: {
    ...T.label,
    color: C.textTertiary,
  },
});

export default memo(CategoryPillMenu);
