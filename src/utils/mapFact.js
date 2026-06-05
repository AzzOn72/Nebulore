const FACT_THEMES = [
  {
    category: 'Light & Time',
    accent: ['#1A0A2E', '#2D1B69', '#050505'],
    glow: '#8B7CF6',
  },
  {
    category: 'Quantum Reality',
    accent: ['#0A1628', '#1E3A5F', '#050505'],
    glow: '#60A5FA',
  },
  {
    category: 'Spacetime',
    accent: ['#1A1035', '#4C1D95', '#050505'],
    glow: '#A78BFA',
  },
  {
    category: 'Cosmic Scale',
    accent: ['#0C1445', '#1E1B4B', '#050505'],
    glow: '#818CF8',
  },
  {
    category: 'Dark Universe',
    accent: ['#0F0A1A', '#312E81', '#050505'],
    glow: '#6366F1',
  },
];

export function mapSupabaseFact(row, index = 0) {
  const theme = FACT_THEMES[index % FACT_THEMES.length];

  return {
    id: String(row.id),
    title: row.title,
    body: row.description,
    category: row.category ?? theme.category,
    accent: theme.accent,
    glow: theme.glow,
  };
}
