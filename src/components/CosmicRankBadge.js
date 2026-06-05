import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BlurMask,
  Canvas,
  Group,
  Text as SkiaText,
  useFont,
} from '@shopify/react-native-skia';

const RANK_FONT = require('@expo-google-fonts/inter/900Black/Inter_900Black.ttf');

/**
 * Premium glowing rank title rendered with Skia: a soft colored halo behind a
 * crisp core, for a neon "cosmic" feel. Falls back to glowing RN text while the
 * Skia font loads.
 */
export default function CosmicRankBadge({ label, color = '#8B7CF6', fontSize = 30 }) {
  const font = useFont(RANK_FONT, fontSize);
  const text = (label || '').toUpperCase();

  const layout = useMemo(() => {
    const padX = 20;
    const padY = 16;
    const width = (font ? font.getTextWidth(text) : text.length * fontSize * 0.64) + padX * 2;
    const height = fontSize + padY * 2;
    return { width, height, x: padX, baseline: fontSize + padY * 0.55 };
  }, [font, text, fontSize]);

  if (!font) {
    return (
      <Text
        style={[
          styles.fallback,
          { color, fontSize, textShadowColor: color },
        ]}
      >
        {text}
      </Text>
    );
  }

  return (
    <View style={{ width: layout.width, height: layout.height }}>
      <Canvas style={{ flex: 1 }}>
        <Group>
          <SkiaText
            x={layout.x}
            y={layout.baseline}
            text={text}
            font={font}
            color={color}
            opacity={0.85}
          >
            <BlurMask blur={20} style="normal" />
          </SkiaText>
        </Group>
        <Group>
          <SkiaText
            x={layout.x}
            y={layout.baseline}
            text={text}
            font={font}
            color={color}
          >
            <BlurMask blur={7} style="normal" />
          </SkiaText>
        </Group>
        <SkiaText
          x={layout.x}
          y={layout.baseline}
          text={text}
          font={font}
          color="#FFFFFF"
        />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
});
