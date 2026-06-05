import { CATEGORY_MAP } from '../config/categories';

const FALLBACK_THEMES = [
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

const CATEGORY_THEMES = {
  cosmos: { accent: ['#1A0A2E', '#2D1B69', '#050505'], glow: '#8B7CF6' },
  markets: { accent: ['#0A1A15', '#065F46', '#050505'], glow: '#34D399' },
  biology: { accent: ['#1A0A0A', '#7F1D1D', '#050505'], glow: '#F87171' },
  probability: { accent: ['#1A1608', '#78350F', '#050505'], glow: '#FBBF24' },
  tech: { accent: ['#081A22', '#0C4A6E', '#050505'], glow: '#38BDF8' },
};

export function mapSupabaseFact(row, index = 0) {
  const catKey = row.category;
  const catConfig = catKey ? CATEGORY_MAP[catKey] : null;
  const catTheme = catKey ? CATEGORY_THEMES[catKey] : null;

  const fallback = FALLBACK_THEMES[index % FALLBACK_THEMES.length];

  return {
    id: String(row.id),
    title: row.title,
    body: row.description,
    category: catConfig?.short ?? fallback.category,
    categoryKey: catKey ?? null,
    accent: catTheme?.accent ?? fallback.accent,
    glow: catTheme?.glow ?? fallback.glow,
  };
}
