import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { glass as glassTokens } from '../theme';

// Spatial Glass — a single, top-lit translucent surface. `variant` selects the
// thin/regular/thick recipe from the design system. Children render above the
// glass; pass a `borderColor` override for accent-lit edges (e.g. active pills).
export default function GlassSurface({
  variant = 'regular',
  style,
  borderColor,
  children,
  pointerEvents,
}) {
  const g = glassTokens[variant] ?? glassTokens.regular;

  return (
    <View
      pointerEvents={pointerEvents}
      style={[
        styles.base,
        {
          backgroundColor: g.fill,
          borderColor: borderColor ?? g.border,
        },
        style,
      ]}
    >
      <BlurView intensity={g.blur} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[g.topLight, g.bottomLight]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    borderWidth: 1,
  },
});
