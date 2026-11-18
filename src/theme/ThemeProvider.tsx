import React, { createContext, useContext, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  baseFontSizes,
  darkPalette,
  FontVariant,
  highContrastPalette,
  Palette,
  radius,
  spacing,
  touchTarget,
} from './tokens';

export interface Theme {
  colors: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  touchTarget: typeof touchTarget;
  fontScale: number;
  highContrast: boolean;
  reduceMotion: boolean;
  /** Retorna o tamanho de fonte já escalado pela preferência do usuário. */
  font: (variant: FontVariant) => number;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { fontScale, highContrast, reduceMotion } = useAppStore((s) => s.settings);

  const theme = useMemo<Theme>(
    () => ({
      colors: highContrast ? highContrastPalette : darkPalette,
      spacing,
      radius,
      touchTarget,
      fontScale,
      highContrast,
      reduceMotion,
      font: (variant) => Math.round(baseFontSizes[variant] * fontScale),
    }),
    [fontScale, highContrast, reduceMotion],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve ser usado dentro de <ThemeProvider>');
  return ctx;
}
