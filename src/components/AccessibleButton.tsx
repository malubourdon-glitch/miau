import * as Haptics from 'expo-haptics';
import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { Icon, IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface AccessibleButtonProps {
  label: string;
  onPress: () => void;
  /** Descreve o resultado da ação para o leitor de tela. */
  hint?: string;
  icon?: IconName;
  variant?: Variant;
  size?: 'md' | 'lg';
  disabled?: boolean;
  busy?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  /** Rótulo alternativo quando o texto visível não é suficiente. */
  accessibilityLabel?: string;
}

export function AccessibleButton({
  label,
  onPress,
  hint,
  icon,
  variant = 'primary',
  size = 'lg',
  disabled,
  busy,
  fullWidth = true,
  style,
  accessibilityLabel,
}: AccessibleButtonProps) {
  const { colors, radius, touchTarget, spacing, highContrast } = useTheme();
  const haptics = useAppStore((s) => s.settings.haptics);
  const inactive = disabled || busy;

  const palette = {
    primary: { bg: colors.accent, fg: colors.textOnAccent, border: colors.accent },
    secondary: { bg: colors.surfaceAlt, fg: colors.text, border: colors.border },
    ghost: { bg: 'transparent', fg: colors.accent, border: highContrast ? colors.border : 'transparent' },
    danger: { bg: colors.occupiedSoft, fg: colors.occupied, border: colors.occupied },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!inactive, busy: !!busy }}
      disabled={inactive}
      hitSlop={8}
      onPress={() => {
        if (haptics && Platform.OS !== 'web') Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
        styles.base,
        {
          minHeight: size === 'lg' ? touchTarget.comfortable : touchTarget.min,
          backgroundColor: palette.bg,
          borderColor: focused ? colors.focus : palette.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.lg,
          opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        fullWidth && styles.full,
        style,
      ]}
    >
      <View style={styles.row}>
        {busy ? (
          <ActivityIndicator color={palette.fg} />
        ) : icon ? (
          <Icon name={icon} size={size === 'lg' ? 26 : 22} color={palette.fg} />
        ) : null}
        <AppText variant={size === 'lg' ? 'bodyLarge' : 'body'} weight="700" style={{ color: palette.fg }}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  full: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
