// Nebulore — Cosmic color system ("Spectral Lines").
// Single source of truth for every color in the app. Depth is encoded as a
// black-on-black elevation ladder; accents appear as light, never as paint.

export const colors = {
  // Structural neutrals — the void ladder (cool-tinted toward indigo).
  void: {
    abyss: '#000000', // true base, behind everything
    0: '#050507', // lowest raised surface
    1: '#0A0A0F', // card base / sheet background
    2: '#101019', // raised glass fill
    3: '#16161F', // hover / pressed elevation
  },

  // Hairlines / borders.
  hairline: 'rgba(255,255,255,0.06)',
  hairlineLum: 'rgba(255,255,255,0.12)',

  // Text ramp — never pure white on black (it vibrates).
  text: {
    primary: '#F2F2F7',
    secondary: 'rgba(235,235,245,0.62)',
    tertiary: 'rgba(235,235,245,0.34)',
    ghost: 'rgba(235,235,245,0.16)',
  },

  // Cosmic accents — the supernova palette.
  accent: {
    core: '#8B7CF6', // system brand
    coreHi: '#C4B5FD', // luminous brand highlight
    deep: '#6B4C9A', // abyssal violet
  },
  nebula: {
    cyan: '#22D3EE', // hyper-luminous cyan
    gold: '#F5C24B', // event-horizon gold
  },
};

// Convenience flat aliases used by raw StyleSheet call-sites.
export const C = {
  abyss: colors.void.abyss,
  void0: colors.void[0],
  void1: colors.void[1],
  void2: colors.void[2],
  void3: colors.void[3],
  hairline: colors.hairline,
  hairlineLum: colors.hairlineLum,
  textPrimary: colors.text.primary,
  textSecondary: colors.text.secondary,
  textTertiary: colors.text.tertiary,
  textGhost: colors.text.ghost,
  accent: colors.accent.core,
  accentHi: colors.accent.coreHi,
  accentDeep: colors.accent.deep,
  cyan: colors.nebula.cyan,
  gold: colors.nebula.gold,
};

export default colors;
