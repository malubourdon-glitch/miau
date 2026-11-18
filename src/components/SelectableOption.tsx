import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { Icon, IconName } from './Icon';

interface Props {
  title: string;
  description?: string;
  icon?: IconName;
  selected: boolean;
  onSelect: () => void;
  /** 'radio' para escolha única (perfis), 'checkbox' para múltipla. */
  role?: 'radio' | 'checkbox';
  compact?: boolean;
}

export function SelectableOption({ title, description, icon, selected, onSelect, role = 'radio', compact }: Props) {
  const { colors, radius, spacing, touchTarget } = useTheme();
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { selected, checked: selected } : { checked: selected }}
      accessibilityLabel={description ? `${title}. ${description}` : title}
      onPress={onSelect}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: compact ? touchTarget.min : touchTarget.large,
          borderRadius: radius.md,
          padding: compact ? spacing.md : spacing.lg,
          backgroundColor: selected ? colors.accentSoft : colors.surface,
          borderColor: selected ? colors.accent : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: selected ? colors.accent : colors.surfaceAlt }]}>
          <Icon name={icon} size={compact ? 22 : 30} color={selected ? colors.textOnAccent : colors.text} />
        </View>
      ) : null}
      <View style={styles.text}>
        <AppText variant={compact ? 'body' : 'bodyLarge'} weight="700">
          {title}
        </AppText>
        {description ? (
          <AppText variant="caption" tone="muted">
            {description}
          </AppText>
        ) : null}
      </View>
      <Icon
        name={selected ? (role === 'radio' ? 'check-circle' : 'check-decagram') : 'chevron-right'}
        size={26}
        color={selected ? colors.accent : colors.metal}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 2 },
  iconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
