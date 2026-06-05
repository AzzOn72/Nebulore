import { useEffect, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Line,
  RadialGradient,
  Text as SkiaText,
  vec,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// ─── Polar star layout ────────────────────────────────────────────────────────
// 5 categories placed on a circle, offset by 90° so the first star is at top.
function polarToXY(cx, cy, r, angleRad) {
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function buildStars(cx, cy, orbitR, categories) {
  return categories.map((cat, i) => {
    const angleDeg = (360 / categories.length) * i - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    return { ...cat, ...polarToXY(cx, cy, orbitR, angleRad) };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
/**
 * NeuralMapCanvas
 * Props:
 *   categories — array of { key, short, accent, glow }
 *   perCategory — { [key]: number }  (deep-dive count per category)
 *   size       — canvas dimension (square)
 */
export default function NeuralMapCanvas({ categories, perCategory, size: propSize }) {
  const { width: screenW } = useWindowDimensions();
  const size = propSize ?? screenW - 48;
  const cx = size / 2;
  const cy = size / 2;
  const orbitR = size * 0.36;
  const MAX_R = 14; // max star outer radius
  const MIN_R = 5;  // star radius when count = 0 (still visible, dim)

  const maxCount = useMemo(
    () => Math.max(...categories.map((c) => perCategory[c.key] || 0), 1),
    [categories, perCategory],
  );

  const stars = useMemo(
    () => buildStars(cx, cy, orbitR, categories),
    [cx, cy, orbitR, categories],
  );

  // Pulse: breathe loop starts on mount
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200 }),
        withTiming(0, { duration: 2200 }),
      ),
      -1,
      false,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Canvas style={{ width: size, height: size }}>
      {/* ── Constellation lines (drawn between explored stars) ── */}
      {stars.map((star, i) => {
        const countA = perCategory[star.key] || 0;
        if (countA === 0) return null;
        return stars.slice(i + 1).map((other) => {
          const countB = perCategory[other.key] || 0;
          if (countB === 0) return null;
          const opacity = Math.min((countA + countB) / (maxCount * 2 + 1), 0.4) + 0.1;
          return (
            <Line
              key={`${star.key}-${other.key}`}
              p1={vec(star.x, star.y)}
              p2={vec(other.x, other.y)}
              strokeWidth={1}
              color={`rgba(255,255,255,${opacity.toFixed(2)})`}
            />
          );
        });
      })}

      {/* ── Central nexus ── */}
      <Circle cx={cx} cy={cy} r={4} color="rgba(255,255,255,0.20)" />
      <Circle cx={cx} cy={cy} r={1.5} color="rgba(255,255,255,0.70)" />

      {/* ── Nexus-to-star spokes (very subtle) ── */}
      {stars.map((star) => {
        const count = perCategory[star.key] || 0;
        if (count === 0) return null;
        return (
          <Line
            key={`spoke-${star.key}`}
            p1={vec(cx, cy)}
            p2={vec(star.x, star.y)}
            strokeWidth={0.5}
            color="rgba(255,255,255,0.06)"
          />
        );
      })}

      {/* ── Stars ── */}
      {stars.map((star) => {
        const count = perCategory[star.key] || 0;
        const t = count / maxCount;
        const r = MIN_R + (MAX_R - MIN_R) * t;
        const glowR = r * 3.2;
        const explored = count > 0;

        return (
          <Group key={star.key}>
            {/* Outer glow */}
            <Circle cx={star.x} cy={star.y} r={glowR}>
              <RadialGradient
                c={vec(star.x, star.y)}
                r={glowR}
                colors={[
                  explored ? `${star.glow}55` : 'rgba(255,255,255,0.03)',
                  'transparent',
                ]}
              />
            </Circle>

            {/* Inner bright core */}
            <Circle
              cx={star.x}
              cy={star.y}
              r={r}
              color={explored ? star.accent : 'rgba(255,255,255,0.18)'}
            />

            {/* Specular highlight */}
            <Circle
              cx={star.x - r * 0.3}
              cy={star.y - r * 0.3}
              r={r * 0.28}
              color="rgba(255,255,255,0.55)"
            />
          </Group>
        );
      })}

      {/* ── Labels — rendered below each star ── */}
      {stars.map((star) => {
        const count = perCategory[star.key] || 0;
        const explored = count > 0;
        // Skia text: no font = system default; label placed 22px below star center
        const labelY = star.y + MAX_R + 18;
        const labelColor = explored
          ? `${star.accent}EE`
          : 'rgba(255,255,255,0.28)';

        return (
          <Group key={`label-${star.key}`}>
            <SkiaText
              x={star.x - star.short.length * 3.6}
              y={labelY}
              text={star.short}
              color={labelColor}
              font={null}
            />
            {count > 0 && (
              <SkiaText
                x={star.x - String(count).length * 3}
                y={labelY + 13}
                text={String(count)}
                color={`${star.accent}99`}
                font={null}
              />
            )}
          </Group>
        );
      })}
    </Canvas>
  );
}
