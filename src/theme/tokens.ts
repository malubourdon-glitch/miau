/**
 * Design tokens do SpotFinder.
 * Contrastes verificados contra o fundo (WCAG 2.2):
 *  - text (#F5F7FA) / bg (#060B1A) ≈ 18.6:1 (AAA)
 *  - textMuted (#9AA4B5) / bg ≈ 7.9:1 (AAA)
 *  - accent (#00E5A0) / bg ≈ 12.4:1 (AAA)
 *  - priority (#4C9AFF) / bg ≈ 6.9:1 (AA+)
 */
export const darkPalette = {
  bg: '#060B1A',
  surface: '#0E1630',
  surfaceAlt: '#16213F',
  border: '#24304F',
  metal: '#5B6680',
  text: '#F5F7FA',
  textMuted: '#9AA4B5',
  textOnAccent: '#04130D',
  accent: '#00E5A0', // verde neon/esmeralda — livre / rota acessível
  accentSoft: 'rgba(0,229,160,0.14)',
  occupied: '#FF5468',
  occupiedSoft: 'rgba(255,84,104,0.16)',
  priority: '#4C9AFF',
  prioritySoft: 'rgba(76,154,255,0.16)',
  warning: '#FFB020',
  warningSoft: 'rgba(255,176,32,0.16)',
  route: '#00E5A0',
  focus: '#FFD84D',
};

/** Variante de alto contraste: preto puro, bordas brancas, cores saturadas. */
export const highContrastPalette: Palette = {
  ...darkPalette,
  bg: '#000000',
  surface: '#000000',
  surfaceAlt: '#111111',
  border: '#FFFFFF',
  metal: '#BFBFBF',
  text: '#FFFFFF',
  textMuted: '#E6E6E6',
  accent: '#00FF9C',
  occupied: '#FF6B6B',
  priority: '#6BB0FF',
  warning: '#FFD000',
  route: '#00FF9C',
};

export type Palette = typeof darkPalette;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;

/** Alvo mínimo de toque: 48dp (Material) / 44pt (Apple) → usamos 56 por padrão. */
export const touchTarget = { min: 48, comfortable: 56, large: 64 } as const;

/** Tamanhos base (já generosos) — multiplicados pelo fontScale do usuário. */
export const baseFontSizes = {
  caption: 14,
  body: 17,
  bodyLarge: 19,
  title: 22,
  headline: 28,
  display: 36,
} as const;

export type FontVariant = keyof typeof baseFontSizes;

export const FONT_SCALE_MIN = 1;
export const FONT_SCALE_MAX = 1.6;
export const FONT_SCALE_STEP = 0.15;
