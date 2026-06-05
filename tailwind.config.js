/** @type {import('tailwindcss').Config} */
// NOTE: tailwind.config runs in CommonJS/Node and cannot import the ESM token
// files in src/theme. These values MIRROR src/theme/colors.js + type.js — keep
// them in sync. src/theme/* remains the source of truth for raw StyleSheet.
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Structural void ladder (true-black first).
        void: '#000000',
        'void-0': '#050507',
        'void-1': '#0A0A0F',
        'void-2': '#101019',
        'void-3': '#16161F',
        nebula: {
          violet: '#6B4C9A',
          blue: '#3D5A80',
          glow: '#8B7CF6',
          glowHi: '#C4B5FD',
          mist: '#1A1035',
          cyan: '#22D3EE',
          gold: '#F5C24B',
        },
      },
      fontFamily: {
        inter: ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
        serif: ['Newsreader_400Regular'],
        'serif-medium': ['Newsreader_500Medium'],
        'serif-semibold': ['Newsreader_600SemiBold'],
      },
    },
  },
  plugins: [],
};
