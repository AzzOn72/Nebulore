// Category taxonomy reframed as "emission spectra". Each category carries an
// `accent` (luminance-tuned for OLED parity), a `glow`, and a `mesh` triplet
// (deep -> mid -> bright) consumed by the Skia NebulaField shader.
export const CATEGORIES = [
  {
    key: 'cosmos',
    label: 'Cosmos & Quantum Physics',
    short: 'Cosmos',
    accent: '#8B7CF6',
    glow: '#6366F1',
    mesh: ['#1B1145', '#4C3A8F', '#8B7CF6'],
    prompt:
      'astrophysics, quantum mechanics, cosmology, spacetime, or particle physics',
  },
  {
    key: 'markets',
    label: 'Market Psychology & Economics',
    short: 'Markets',
    accent: '#34D399',
    glow: '#10B981',
    mesh: ['#06231C', '#0E5C45', '#34D399'],
    prompt:
      'institutional trading behavior, game theory, macro-economic shifts, or market psychology',
  },
  {
    key: 'biology',
    label: 'Human Performance & Biology',
    short: 'Biology',
    accent: '#FB7185',
    glow: '#F43F5E',
    mesh: ['#2A0E16', '#7A2235', '#FB7185'],
    prompt:
      'extreme muscle physiology, biomechanics, longevity science, or human performance optimization',
  },
  {
    key: 'probability',
    label: 'Probability & Quantitative Models',
    short: 'Probability',
    accent: '#FBBF24',
    glow: '#F59E0B',
    mesh: ['#2A1E05', '#7A5410', '#FBBF24'],
    prompt:
      'statistical anomalies, predictive systems, Bayesian inference, or quantitative modeling',
  },
  {
    key: 'tech',
    label: 'Virtual Realms & Emerging Tech',
    short: 'Tech',
    accent: '#38BDF8',
    glow: '#0EA5E9',
    mesh: ['#06202E', '#0C5379', '#38BDF8'],
    prompt:
      'spatial computing, digital constructs, virtual reality, or emerging technology paradigms',
  },
];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);
export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));
