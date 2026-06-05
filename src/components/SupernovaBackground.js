import { memo, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  RadialGradient,
  vec,
} from '@shopify/react-native-skia';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { useGyro } from '../hooks/useGyro';

const { width: W, height: H } = Dimensions.get('window');

const PARALLAX_SENSITIVITY = 8;
const PARALLAX_DECAY = 0.92;

// Three parallax planes — depth via differential motion (near moves most).
const LAYERS = [
  { count: 50, depth: 0.35, rMin: 0.3, rMax: 1.0, opMin: 0.1, opMax: 0.3, seed: 42 },
  { count: 34, depth: 0.75, rMin: 0.6, rMax: 1.6, opMin: 0.2, opMax: 0.5, seed: 1337 },
  { count: 16, depth: 1.3, rMin: 1.0, rMax: 2.4, opMin: 0.35, opMax: 0.75, seed: 7 },
];

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateLayer({ count, rMin, rMax, opMin, opMax, seed }) {
  const rng = seededRandom(seed);
  return Array.from({ length: count }, () => ({
    x: rng() * W * 1.4 - W * 0.2,
    y: rng() * H * 1.4 - H * 0.2,
    r: rMin + rng() * (rMax - rMin),
    opacity: opMin + rng() * (opMax - opMin),
  }));
}

function StarLayer({ stars, depth, offsetX, offsetY }) {
  const transform = useDerivedValue(() => [
    { translateX: offsetX.value * depth },
    { translateY: offsetY.value * depth },
  ]);

  return (
    <Group transform={transform}>
      {stars.map((s, i) => (
        <Circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r}
          color={`rgba(235,235,245,${s.opacity})`}
        />
      ))}
    </Group>
  );
}

function SupernovaBackground() {
  const layers = useMemo(() => LAYERS.map((l) => ({ depth: l.depth, stars: generateLayer(l) })), []);
  const nebulae = useMemo(
    () => [
      { cx: W * 0.2, cy: H * 0.15, r: W * 0.5, color: 'rgba(99,102,241,0.05)' },
      { cx: W * 0.82, cy: H * 0.55, r: W * 0.6, color: 'rgba(139,124,246,0.04)' },
      { cx: W * 0.5, cy: H * 0.88, r: W * 0.45, color: 'rgba(107,76,154,0.035)' },
    ],
    [],
  );

  const { gyroX, gyroY } = useGyro();
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  useFrameCallback(() => {
    offsetX.value = (offsetX.value + gyroY.value * PARALLAX_SENSITIVITY) * PARALLAX_DECAY;
    offsetY.value = (offsetY.value + gyroX.value * PARALLAX_SENSITIVITY) * PARALLAX_DECAY;
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        {nebulae.map((n, i) => (
          <Circle key={`neb-${i}`} cx={n.cx} cy={n.cy} r={n.r} opacity={1}>
            <RadialGradient c={vec(n.cx, n.cy)} r={n.r} colors={[n.color, 'transparent']} />
          </Circle>
        ))}

        {layers.map((layer, i) => (
          <StarLayer
            key={`layer-${i}`}
            stars={layer.stars}
            depth={layer.depth}
            offsetX={offsetX}
            offsetY={offsetY}
          />
        ))}
      </Canvas>
    </View>
  );
}

export default memo(SupernovaBackground);
