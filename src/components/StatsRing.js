import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

/**
 * Skia-rendered donut chart of category reads. Renders statically (no per-frame
 * work) so it stays at 60fps. `data` = [{ key, label, value, color }].
 */
export default function StatsRing({ data = [], size = 200, strokeWidth = 22 }) {
  const total = useMemo(() => data.reduce((s, d) => s + (d.value || 0), 0), [data]);

  const { trackPath, segments } = useMemo(() => {
    const oval = Skia.XYWHRect(
      strokeWidth / 2,
      strokeWidth / 2,
      size - strokeWidth,
      size - strokeWidth,
    );

    const track = Skia.Path.Make();
    track.addOval(oval);

    const active = data.filter((d) => (d.value || 0) > 0);
    const segs = [];
    let start = -90;

    active.forEach((d) => {
      const sweep = (d.value / total) * 360;
      const path = Skia.Path.Make();
      // Small gap between segments for definition; keep a minimum sweep so a
      // single dominant category still reads as a ring.
      const gap = active.length > 1 ? 3 : 0;
      path.addArc(oval, start, Math.max(sweep - gap, 0.5));
      segs.push({ key: d.key, path, color: d.color });
      start += sweep;
    });

    return { trackPath: track, segments: segs };
  }, [data, total, size, strokeWidth]);

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={{ flex: 1 }}>
        <Path
          path={trackPath}
          style="stroke"
          strokeWidth={strokeWidth}
          color="rgba(255,255,255,0.06)"
        />
        {segments.map((seg) => (
          <Path
            key={seg.key}
            path={seg.path}
            style="stroke"
            strokeWidth={strokeWidth}
            strokeCap="round"
            color={seg.color}
          />
        ))}
      </Canvas>

      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <Text style={styles.total}>{total}</Text>
        <Text style={styles.caption}>Deep Dives</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  total: {
    fontFamily: 'Inter_700Bold',
    fontSize: 44,
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  caption: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
});
