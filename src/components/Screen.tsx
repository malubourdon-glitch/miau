import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  footer?: React.ReactNode;
}

/** Container padrão: safe area, fundo do tema, rolagem opcional e rodapé fixo. */
export function Screen({ children, scroll = true, contentStyle, footer }: ScreenProps) {
  const { colors, spacing } = useTheme();
  const padding = { padding: spacing.lg, gap: spacing.lg };
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      {scroll ? (
        <ScrollView contentContainerStyle={[padding, contentStyle]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.root, padding, contentStyle]}>{children}</View>
      )}
      {footer ? (
        <View style={[styles.footer, { padding: spacing.lg, borderTopColor: colors.border, backgroundColor: colors.bg }]}>
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  footer: { borderTopWidth: 1, gap: 10 },
});
