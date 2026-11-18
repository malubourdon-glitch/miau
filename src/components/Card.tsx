import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function Card({ style, accent, ...rest }: ViewProps & { accent?: string }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: accent ?? colors.border,
          borderRadius: radius.lg,
          padding: spacing.lg,
        },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({ card: { borderWidth: 1.5, gap: 8 } });
