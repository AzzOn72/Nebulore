import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Fill,
  Shader,
  Skia,
  useClock,
} from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

// Volumetric nebula via fractal-brownian-motion noise tinted by a category's
// `mesh` triplet. Replaces flat LinearGradient + shadow "glow orb" with a
// non-linear, breathing cosmic field (the banned-gradient antidote).
const SOURCE = Skia.RuntimeEffect.Make(`
uniform float2 u_resolution;
uniform float  u_time;
uniform float3 u_c0; // deep
uniform float3 u_c1; // mid
uniform float3 u_c2; // bright

float hash(float2 p) {
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(float2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    v += amp * noise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return v;
}

half4 main(float2 xy) {
  float2 uv = xy / u_resolution;
  float2 p = uv * 3.0;
  p.x += u_time * 0.02;
  p.y -= u_time * 0.012;
  float n = fbm(p + fbm(p));

  float3 col = mix(u_c0, u_c1, smoothstep(0.20, 0.60, n));
  col = mix(col, u_c2, smoothstep(0.62, 0.95, n));

  // Single focal bloom (one light source per screen).
  float d = distance(uv, float2(0.72, 0.26));
  float glow = smoothstep(0.95, 0.0, d);
  col += u_c2 * glow * 0.35;

  float vig = smoothstep(1.25, 0.25, length(uv - 0.5));
  return half4(col * vig, 1.0);
}
`);

function hexToVec3(hex) {
  const h = (hex || '#000000').replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return [r, g, b];
}

const FALLBACK_MESH = ['#1B1145', '#4C3A8F', '#8B7CF6'];

function NebulaField({ mesh = FALLBACK_MESH, width, height, animated = true }) {
  const clock = useClock();

  const c0 = useMemo(() => hexToVec3(mesh[0]), [mesh]);
  const c1 = useMemo(() => hexToVec3(mesh[1]), [mesh]);
  const c2 = useMemo(() => hexToVec3(mesh[2]), [mesh]);

  const uniforms = useDerivedValue(() => ({
    u_resolution: [width, height],
    u_time: animated ? clock.value / 1000 : 0,
    u_c0: c0,
    u_c1: c1,
    u_c2: c2,
  }), [width, height, c0, c1, c2, animated]);

  if (!SOURCE) {
    // Shader failed to compile (extremely old runtime) — degrade gracefully.
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: mesh[0] }]} />;
  }

  return (
    <Canvas style={{ width, height }} mode={animated ? 'continuous' : 'default'}>
      <Fill>
        <Shader source={SOURCE} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}

export default memo(NebulaField);
