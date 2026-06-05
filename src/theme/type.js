// Nebulore — Typography system ("Instrument + Manuscript").
// Two families, two jobs: Newsreader (serif) for display + long-form reading,
// Inter for interface + data. Font names match those loaded in App.js.

export const fonts = {
  // Editorial serif — display & long-form.
  serif: 'Newsreader_400Regular',
  serifMedium: 'Newsreader_500Medium',
  serifSemibold: 'Newsreader_600SemiBold',
  // Interface sans — Inter.
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
};

// Modular scale (ratio 1.25, base 16). Each token is a ready-to-spread style.
export const type = {
  display: {
    fontFamily: fonts.serifMedium,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.5,
  },
  h1: {
    fontFamily: fonts.serifSemibold,
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.3,
  },
  titleCard: {
    fontFamily: fonts.serifMedium,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.2,
  },
  readBody: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 30,
    letterSpacing: 0,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  eyebrow: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  metric: {
    fontFamily: fonts.sansBold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  caption: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
};

export default type;
