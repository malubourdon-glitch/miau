import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { Icon, IconName } from './Icon';

interface Action {
  icon: IconName;
  label: string;
  onPress: () => void;
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  actions = [],
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: Action[];
}) {
  const { colors, radius } = useTheme();
  const btn = (a: Action) => (
    <Pressable
      key={a.label}
      accessibilityRole="button"
      accessibilityLabel={a.label}
      onPress={a.onPress}
      style={({ pressed }) => [
        styles.iconBtn,
        { borderColor: colors.border, borderRadius: radius.md, backgroundColor: pressed ? colors.surfaceAlt : colors.surface },
      ]}
    >
      <Icon name={a.icon} size={26} color={colors.text} />
    </Pressable>
  );
  return (
    <View style={styles.row}>
      {onBack ? btn({ icon: 'arrow-left', label: 'Voltar', onPress: onBack }) : null}
      <View style={styles.titles}>
        <AppText variant="title" accessibilityRole="header" numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actions.map(btn)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titles: { flex: 1 },
  iconBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
});
