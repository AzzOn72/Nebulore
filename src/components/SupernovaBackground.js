import { memo, useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  RadialGradient,
  vec,
} from '@shopify/react-native-skia';
import { Gyroscope } from 'expo-sensors';
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');

const STAR_COUNT = 90;
const NEBULA_COUNT = 3;
const PARALLAX_SENSITIVITY = 8;
const PARALLAX_DECAY = 0.92;

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateStars(count) {
  const rng = seededRandom(42);
  return Array.from({ length: count }, () => ({
    x: rng() * W * 1.3 - W * 0.15,
    y: rng() * H * 1.3 - H * 0.15,
    r: 0.4 + rng() * 1.8,
    opacity: 0.15 + rng() * 0.55,
  }));
}

function generateNebulae() {
  return [
    { cx: W * 0.2, cy: H * 0.15, r: W * 0.45, color: 'rgba(99,102,241,0.04)' },
    { cx: W * 0.8, cy: H * 0.55, r: W * 0.55, color: 'rgba(139,124,246,0.035)' },
    { cx: W * 0.5, cy: H * 0.85, r: W * 0.4, color: 'rgba(107,76,154,0.03)' },
  ];
}

function SupernovaBackground() {
  const stars = useMemo(() => generateStars(STAR_COUNT), []);
  const nebulae = useMemo(() => generateNebulae(), []);

  const gyroX = useSharedValue(0);
  const gyroY = useSharedValue(0);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  useEffect(() => {
    Gyroscope.setUpdateInterval(50);
    const sub = Gyroscope.addListener(({ x, y }) => {
      gyroX.value = x;
      gyroY.value = y;
    });
    return () => sub.remove();
  }, [gyroX, gyroY]);

  useFrameCallback(() => {
    offsetX.value =
      (offsetX.value + gyroY.value * PARALLAX_SENSITIVITY) * PARALLAX_DECAY;
    offsetY.value =
      (offsetY.value + gyroX.value * PARALLAX_SENSITIVITY) * PARALLAX_DECAY;
  });

  const transform = useDerivedValue(() => [
    { translateX: offsetX.value },
    { translateY: offsetY.value },
  ]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Nebula blobs */}
        {nebulae.map((n, i) => (
          <Circle key={`neb-${i}`} cx={n.cx} cy={n.cy} r={n.r} opacity={1}>
            <RadialGradient
              c={vec(n.cx, n.cy)}
              r={n.r}
              colors={[n.color, 'transparent']}
            />
          </Circle>
        ))}

        {/* Star field with parallax */}
        <Group transform={transform}>
          {stars.map((s, i) => (
            <Circle
              key={`star-${i}`}
              cx={s.x}
              cy={s.y}
              r={s.r}
              color={`rgba(229,229,229,${s.opacity})`}
            />
          ))}
        </Group>
      </Canvas>
    </View>
  );
}

export default memo(SupernovaBackground);
