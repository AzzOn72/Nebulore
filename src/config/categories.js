export const CATEGORIES = [
  {
    key: 'cosmos',
    label: 'Cosmos & Quantum Physics',
    short: 'Cosmos',
    accent: '#8B7CF6',
    glow: '#6366F1',
    prompt:
      'astrophysics, quantum mechanics, cosmology, spacetime, or particle physics',
  },
  {
    key: 'markets',
    label: 'Market Psychology & Economics',
    short: 'Markets',
    accent: '#34D399',
    glow: '#10B981',
    prompt:
      'institutional trading behavior, game theory, macro-economic shifts, or market psychology',
  },
  {
    key: 'biology',
    label: 'Human Performance & Biology',
    short: 'Biology',
    accent: '#F87171',
    glow: '#EF4444',
    prompt:
      'extreme muscle physiology, biomechanics, longevity science, or human performance optimization',
  },
  {
    key: 'probability',
    label: 'Probability & Quantitative Models',
    short: 'Probability',
    accent: '#FBBF24',
    glow: '#F59E0B',
    prompt:
      'statistical anomalies, predictive systems, Bayesian inference, or quantitative modeling',
  },
  {
    key: 'tech',
    label: 'Virtual Realms & Emerging Tech',
    short: 'Tech',
    accent: '#38BDF8',
    glow: '#0EA5E9',
    prompt:
      'spatial computing, digital constructs, virtual reality, or emerging technology paradigms',
  },
];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);
export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));
