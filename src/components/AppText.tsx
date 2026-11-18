import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { FontVariant } from '../theme/tokens';

type Tone = 'default' | 'muted' | 'accent' | 'danger' | 'warning' | 'priority' | 'onAccent';

export interface AppTextProps extends TextProps {
  variant?: FontVariant;
  tone?: Tone;
  weight?: '400' | '500' | '600' | '700' | '800';
  center?: boolean;
}

/**
 * Texto base do app: aplica o fontScale do usuário E respeita a fonte do
 * sistema (allowFontScaling), limitando o multiplicador total para não quebrar layout.
 */
export function AppText({ variant = 'body', tone = 'default', weight, center, style, ...rest }: AppTextProps) {
  const { colors, font } = useTheme();
  const color = {
    default: colors.text,
    muted: colors.textMuted,
    accent: colors.accent,
    danger: colors.occupied,
    warning: colors.warning,
    priority: colors.priority,
    onAccent: colors.textOnAccent,
  }[tone];
  const size = font(variant);
  const defaultWeight = variant === 'display' || variant === 'headline' ? '800' : variant === 'title' ? '700' : '400';
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={1.6}
      style={[
        styles.base,
        { color, fontSize: size, lineHeight: Math.round(size * 1.35), fontWeight: weight ?? defaultWeight },
        center && styles.center,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: { letterSpacing: 0.2 },
  center: { textAlign: 'center' },
});
